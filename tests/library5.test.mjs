import test from 'node:test';
import assert from 'node:assert/strict';
import {filterTracks,parseTime,timeInput,normalizeRecipe} from '../web/library5.js';
import {Store} from '../web/store.js';
const tracks=[{id:'a',title:'Coastline',artist:'Luna',bpm:124,added:1},{id:'b',title:'Harbour',artist:'Coastline Crew',bpm:128,added:3},{id:'c',title:'Unknown',artist:'Luna',bpm:0,added:2},{id:'d',title:'Slow',artist:'Luna',bpm:90,added:4}];
test('structured BPM queries filter known values and preserve unknown option',()=>{
 assert.deepEqual(filterTracks(tracks,{query:'120–126 BPM',unknown:false}).map(t=>t.id),['a']);
 assert.deepEqual(filterTracks(tracks,{query:'Luna bpm:120-130',unknown:true}).map(t=>t.id),['c','a']);
 assert.deepEqual(filterTracks(tracks,{query:'128 BPM',unknown:false}).map(t=>t.id),['b']);
});
test('title and artist modes do not accidentally search the other field',()=>{
 assert.deepEqual(filterTracks(tracks,{query:'Coastline',mode:'title'}).map(t=>t.id),['a']);
 assert.deepEqual(filterTracks(tracks,{query:'Coastline',mode:'artist'}).map(t=>t.id),['b']);
});
test('manual crate order survives filtering while numeric BPM sort puts unknown last',()=>{
 assert.deepEqual(filterTracks([tracks[1],tracks[0],tracks[2]],{sort:'manual'}).map(t=>t.id),['b','a','c']);
 assert.deepEqual(filterTracks(tracks,{sort:'bpm'}).map(t=>t.id),['d','a','b','c']);
});
test('precise preparation times accept seconds and clock times but reject malformed values',()=>{
 assert.equal(parseTime('01:16.125'),76.125);assert.equal(parseTime('1:02:03.004'),3723.004);assert.equal(parseTime('16.5'),16.5);assert.equal(parseTime(''),null);
 for(const value of ['-1','01:60','NaN','1e3','10<script>'])assert.throws(()=>parseTime(value));
 assert.equal(timeInput(76.125),'01:16.125');assert.equal(timeInput(null),'');
});
test('recipe import validates schema, limits and preserves order without audio',()=>{
 const r=normalizeRecipe({format:'mixline-set',version:1,name:'Night set',bars:16,tracks:[{id:'b',title:'Second'},{id:'a',title:'First'}]});
 assert.deepEqual(r.ids,['b','a']);assert.equal(r.bars,16);assert.equal(r.refs.length,2);
 assert.throws(()=>normalizeRecipe({tracks:[]}));assert.throws(()=>normalizeRecipe({format:'mixline-set',version:1,tracks:[{id:45}]}));
 assert.throws(()=>normalizeRecipe({format:'mixline-set',version:1,tracks:Array(501).fill({id:'a'})}));
});
test('session-only source blobs use bounded transient cache without IndexedDB writes',async()=>{
 const s=new Store();s.transaction=async()=>assert.fail('Transient operations must not write persistent audio');const blob=new Blob(['audio']);
 const t=s.cacheTrack({id:'jamendo:1',title:'Online',capabilities:{offline:false}},blob);
 assert.equal(t.transient,true);assert.equal((await s.getTrack('jamendo:1')).blob,blob);
 await s.updateTrack('jamendo:1',{start:3});assert.equal((await s.getTrack('jamendo:1')).track.start,3);
 for(let i=2;i<10;i++)s.cacheTrack({id:`jamendo:${i}`},blob);
 assert.equal(s.transientTracks.size,6);assert.equal(s.transientTracks.has('jamendo:1'),false);
});
