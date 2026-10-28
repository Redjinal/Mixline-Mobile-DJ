import assert from 'node:assert/strict';
import {fitWaveWindow,zoomWaveWindow,timeAtWavePoint} from '../web/wave5.js';
const cases=[
 ['fit limits long spans',()=>assert.deepEqual(fitWaveWindow(10,4,30),{start:0,span:10})],
 ['zoom stays anchored',()=>assert.deepEqual(zoomWaveWindow(100,{start:20,span:20},.5,.25),{start:22.5,span:10})],
 ['zoom limits at beginning',()=>assert.deepEqual(zoomWaveWindow(100,{start:0,span:20},2,.5),{start:0,span:40})],
 ['zoom limits at end',()=>assert.deepEqual(zoomWaveWindow(100,{start:90,span:10},2,.5),{start:80,span:20})],
 ['empty track is finite',()=>assert.deepEqual(fitWaveWindow(0,10,20),{start:0,span:0})],
 ['subsecond audio remains within duration',()=>assert.deepEqual(fitWaveWindow(.1,0,.001),{start:0,span:.1})],
 ['seek from detail position',()=>assert.equal(timeAtWavePoint({start:60,span:20},.75,100),75)],
 ['seek clips outside pointer coordinates',()=>assert.equal(timeAtWavePoint({start:90,span:20},2,100),100)],
];
for(const [name,test] of cases){test();console.log('PASS',name);}
console.log(`${cases.length} wave window tests passed`);
