import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EPISODE_DURATION as D} from '../game-src/production-episode.js';
import {createProductionVoice} from '../game-src/production-voice-playback.js';

function fixture({duration=D,blocked=false,failLoad=false}={}){
  let loads=0;const sources=[];
  const ctx={currentTime:0,state:'suspended',destination:{},
    async resume(){this.state=blocked?'suspended':'running';},async close(){this.state='closed';},
    createGain(){return {gain:{value:1},connect(){},disconnect(){}};},
    async decodeAudioData(){return {duration};},
    createBufferSource(){const source={stopped:false,connect(){},disconnect(){},start(...args){this.args=args;},stop(){this.stopped=true;}};sources.push(source);return source;},
  };
  const clock=createProductionVoice({url:'fixture.wav',createContext:()=>ctx,load:async()=>{loads++;if(failLoad)throw new Error('Audio HTTP 404');return new ArrayBuffer(2);}});
  return {ctx,sources,clock,get loads(){return loads;}};
}
const f=fixture(),{clock,ctx,sources}=f;
assert.equal(await clock.start(),true);assert.deepEqual(sources[0].args,[3,0,D]);
assert.equal(clock.time,0);clock.tick(0);ctx.currentTime=2;assert.equal(clock.time,0);
// Audio time, not accumulated render time, drives the displayed shot.
ctx.currentTime=5;clock.tick(100);assert.equal(clock.time,2);
await clock.pause();assert.equal(clock.state,'paused');assert.ok(sources[0].stopped);
ctx.currentTime=50;assert.equal(clock.time,2);await clock.pause();
assert.deepEqual(sources[1].args,[50,2,D-2]);ctx.currentTime=51;clock.tick(200);assert.equal(clock.time,3);
clock.seek(29);assert.ok(sources[1].stopped);assert.deepEqual(sources[2].args,[51,29,D-29]);
ctx.currentTime=51.1;clock.tick(300);ctx.currentTime=55;clock.tick(4000);
assert.equal(clock.state,'paused');assert.ok(Math.abs(clock.time-29.1)<1e-9,'Stall returns audio and picture to last displayed time');
await clock.start(29,40);assert.equal(f.loads,1,'Decoded master is reused on replay');
assert.deepEqual(sources.at(-1).args,[58,29,11]);
ctx.currentTime=56;await clock.pause();ctx.currentTime=57;await clock.pause();
assert.deepEqual(sources.at(-1).args,[59,29,11],'Resume preserves remaining scene lead-in');
clock.tick(5000);ctx.currentTime=70;clock.tick(5100);assert.equal(clock.state,'finished');assert.equal(clock.time,40);assert.ok(sources.at(-1).stopped);
clock.seek(29);assert.equal(clock.state,'paused');await clock.pause();assert.equal(clock.state,'playing');
clock.tick(5200,true);assert.equal(clock.state,'paused');clock.stop();assert.equal(clock.active,false);
await clock.start();assert.ok(sources.filter(s=>!s.stopped).length===1,'Only one source is live');clock.dispose();assert.equal(ctx.state,'closed');
for(const options of [{duration:20},{duration:90},{blocked:true},{failLoad:true}]){
  const bad=fixture(options);await assert.rejects(()=>bad.clock.start());assert.equal(bad.clock.state,'idle');assert.ok(bad.sources.every(s=>s.stopped));
}
let release;const pending=fixture();const delayed=createProductionVoice({url:'fixture',createContext:()=>pending.ctx,load:()=>new Promise(resolve=>{release=resolve;})});
const starting=delayed.start();await Promise.resolve();delayed.stop();release(new ArrayBuffer(2));assert.equal(await starting,false);assert.ok(!delayed.active);
const view=readFileSync('application/views/game.php','utf8'),director=readFileSync('game-src/production-director.js','utf8');
assert.ok(view.includes("base_url('public/audio/produksi/episode-002/release-v10/episode-002-v10-master.wav')"));
assert.ok(director.includes('await clock.start'));assert.ok(director.includes('clock.dispose()'));
if(process.env.TEST_LOCAL_API==='1'){
  const res=await fetch('http://localhost/project/public/audio/produksi/episode-002/release-v10/episode-002-v10-master.wav');
  assert.equal(res.status,200);const bytes=Buffer.from(await res.arrayBuffer());assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WAVE');assert.ok(bytes.length>7_000_000);
  const html=await (await fetch('http://localhost/project/')).text();assert.ok(html.includes('window.SEMESTA_PRODUCTION_VO_URL'));
}
console.log('PASS: audio-clock sync, 3-second lead-in, full/selected scenes, pause/resume, seek, replay/cache, end hold, stall/hidden pause, stop/dispose, load/autoplay errors and canceled loading.');
