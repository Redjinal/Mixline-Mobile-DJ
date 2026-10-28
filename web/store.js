/** Durable local library. Audio blobs remain on the device in IndexedDB. */
const DB_NAME='mixline-studio-4',VERSION=1;
export class Store {
  constructor(){this.db=null;this.persistent=false;this._opening=null;}
  async init(){
    if(this.db)return this;
    if(this._opening)return this._opening;
    this._opening=new Promise((resolve,reject)=>{
      if(!globalThis.indexedDB){reject(new Error('Persistent storage is unavailable in this browser.'));return;}
      const req=indexedDB.open(DB_NAME,VERSION);
      req.onupgradeneeded=()=>{const db=req.result;
        for(const name of ['tracks','sessions','settings','recordings'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});
      };
      req.onerror=()=>reject(new Error('Could not open the local library. Check available device storage.'));
      req.onblocked=()=>reject(new Error('Close other Mixline tabs before upgrading local storage.'));
      req.onsuccess=()=>{this.db=req.result;this.persistent=true;this.db.onversionchange=()=>{this.db.close();this.db=null;this.persistent=false;};resolve(this);};
    });
    try{return await this._opening;}catch(e){this._opening=null;throw e;}
  }
  async transaction(name,mode,operation){
    await this.init();return new Promise((resolve,reject)=>{
      const tx=this.db.transaction(name,mode),store=tx.objectStore(name);let request,result;
      try{request=operation(store);}catch(e){reject(e);return;}
      if(request){request.onsuccess=()=>{result=request.result;};request.onerror=()=>{};}
      tx.oncomplete=()=>resolve(result);
      tx.onabort=tx.onerror=()=>reject(new Error(tx.error?.name==='QuotaExceededError'?'Device storage is full. Remove an import or recording, then try again.':tx.error?.message||'Could not save local data.'));
    });
  }
  async listTracks(){const rows=await this.transaction('tracks','readonly',s=>s.getAll());return rows.map(({blob,...track})=>track).sort((a,b)=>(b.added||0)-(a.added||0));}
  async getTrack(id){const row=await this.transaction('tracks','readonly',s=>s.get(id));if(!row)return null;const {blob,...track}=row;return {track,blob};}
  async saveTrack(track,blob){
    const id=track.id||globalThis.crypto.randomUUID();
    const old=await this.transaction('tracks','readonly',s=>s.get(id));
    const row={...old,...track,id,added:old?.added||Date.now(),updated:Date.now(),blob:blob||old?.blob};
    if(!row.blob&&!row.demo)throw new Error('Select an audio file before importing.');
    await this.transaction('tracks','readwrite',s=>s.put(row));const {blob:_,...meta}=row;return meta;
  }
  async updateTrack(id,updates){const current=await this.getTrack(id);if(!current)throw new Error('This track is no longer in the library.');return this.saveTrack({...current.track,...updates,id},current.blob);}
  async deleteTrack(id){return this.transaction('tracks','readwrite',s=>s.delete(id));}
  async saveSession(name,data,id){const record={id:id||globalThis.crypto.randomUUID(),name:String(name||'Untitled session').trim().slice(0,100),data,updated:Date.now()};await this.transaction('sessions','readwrite',s=>s.put(record));return record;}
  async listSessions(){return (await this.transaction('sessions','readonly',s=>s.getAll())).sort((a,b)=>b.updated-a.updated);}
  async getSession(id){return this.transaction('sessions','readonly',s=>s.get(id));}
  async deleteSession(id){return this.transaction('sessions','readwrite',s=>s.delete(id));}
  async getSetting(name,fallback=null){const row=await this.transaction('settings','readonly',s=>s.get(name));return row?row.value:fallback;}
  async setSetting(name,value){await this.transaction('settings','readwrite',s=>s.put({id:name,value}));return value;}
  async saveRecording(blob,name){const row={id:globalThis.crypto.randomUUID(),name:name||`Mixline ${new Date().toLocaleString()}`,blob,mime:blob.type,size:blob.size,created:Date.now()};await this.transaction('recordings','readwrite',s=>s.put(row));return row;}
  async listRecordings(){return (await this.transaction('recordings','readonly',s=>s.getAll())).sort((a,b)=>b.created-a.created);}
  async getRecording(id){return this.transaction('recordings','readonly',s=>s.get(id));}
  async deleteRecording(id){return this.transaction('recordings','readwrite',s=>s.delete(id));}
  async storageEstimate(){return globalThis.navigator?.storage?.estimate?.()||{};}
  async requestPersistence(){return globalThis.navigator?.storage?.persist?.()||false;}
}
export const store=new Store();
export default store;
