/** Offline listening copy of the actual Day 2 track schedule.
 * It uses the runtime's accepted speech, music, Foley, gain points and fades.
 * FFmpeg decoding/resampling differs from browser Web Audio; this is a review
 * aid, not a claim that MP4 or browser playback has been watched/listened to.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {day2Scenario} from '../game-src/production-day2.js';
import {compileScenario} from '../game-src/production-scenario.js';
import {loadStoryAudio} from '../game-src/production-story-audio.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.resolve(process.argv[2]||path.join(os.tmpdir(),'day2-r2-mix-review.wav'));
const located=spawnSync('python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'});
if(located.status!==0)throw new Error('Install imageio-ffmpeg to create the offline review copy. '+located.stderr);
const ffmpeg=located.stdout.trim(),rate=48000,sources=new WeakMap();
const context={
  decodeAudioData:async bytes=>{
    const decoded=spawnSync(ffmpeg,['-v','error','-i',sources.get(bytes),'-f','f32le','-ar',String(rate),'-ac','2','pipe:1'],{maxBuffer:128*1024*1024});
    if(decoded.status!==0)throw new Error(decoded.stderr.toString());
    const interleaved=new Float32Array(decoded.stdout.buffer.slice(decoded.stdout.byteOffset,decoded.stdout.byteOffset+decoded.stdout.byteLength));
    const channels=[new Float32Array(interleaved.length/2),new Float32Array(interleaved.length/2)];
    for(let i=0;i<channels[0].length;i++){channels[0][i]=interleaved[i*2];channels[1][i]=interleaved[i*2+1];}
    return {duration:channels[0].length/rate,sampleRate:rate,numberOfChannels:2,getChannelData:c=>channels[c]};
  },
  createBuffer:(count,length,sampleRate)=>{const channels=Array.from({length:count},()=>new Float32Array(length));return {duration:length/sampleRate,sampleRate,numberOfChannels:count,getChannelData:c=>channels[c]};},
};
const fetcher=async url=>{
  const filename=path.join(root,new URL(url).pathname.replace(/^\/project\//,'')),bytes=await fs.readFile(filename);
  return {ok:true,arrayBuffer:async()=>{const ab=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);sources.set(ab,filename);return ab;}};
};
const scenario=day2Scenario(),compiled=compileScenario(scenario),tracks=await loadStoryAudio(scenario,context,{fetcher});
const frames=Math.ceil(Math.ceil(compiled.duration*30)/30*rate),mixed=[new Float32Array(frames),new Float32Array(frames)];
const valueAt=(points,t)=>{let prior=points[0];for(const point of points.slice(1)){if(point.time>t){const alpha=(t-prior.time)/(point.time-prior.time);return prior.volume+(point.volume-prior.volume)*Math.max(0,alpha);}prior=point;}return prior.volume;};
for(const track of tracks){
  const sourceOffset=Math.max(0,track.sourceOffset||0),length=Math.min(track.duration??Infinity,track.buffer.duration-sourceOffset,compiled.duration-track.offset),start=Math.round(track.offset*rate);
  if(length<=0)continue;
  const fade=Math.min(track.fade??.025,length/3),points=track.volumePoints||[{time:0,volume:track.volume}];
  const gains=[{time:0,volume:0},{time:fade,volume:valueAt(points,fade)},...points.filter(p=>p.time>fade&&p.time<length-fade),{time:length-fade,volume:valueAt(points,length-fade)},{time:length,volume:0}];
  const channels=[track.buffer.getChannelData(0),track.buffer.getChannelData(Math.min(1,track.buffer.numberOfChannels-1))];
  let segment=0;
  for(let i=0;i<Math.floor(length*rate)&&start+i<frames;i++){
    const t=i/rate;while(segment<gains.length-2&&t>=gains[segment+1].time)segment++;
    const a=gains[segment],b=gains[segment+1],alpha=b.time===a.time?1:(t-a.time)/(b.time-a.time),gain=a.volume+(b.volume-a.volume)*alpha;
    const source=(sourceOffset+t)*track.buffer.sampleRate,j=Math.floor(source),fraction=source-j;
    for(let c=0;c<2;c++){const data=channels[c],v=(data[j]||0)*(1-fraction)+(data[j+1]||0)*fraction;mixed[c][start+i]+=v*gain;}
  }
}
let peak=0;for(const data of mixed)for(const value of data)peak=Math.max(peak,Math.abs(value));
const scale=peak>.95?.95/peak:1,pcm=Buffer.alloc(frames*4),header=Buffer.alloc(44);
for(let i=0;i<frames;i++)for(let c=0;c<2;c++)pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,mixed[c][i]*scale))*32767),i*4+c*2);
header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,Buffer.concat([header,pcm]));
await fs.writeFile(output.replace(/\.wav$/i,'.json'),JSON.stringify({title:scenario.title,duration:compiled.duration,sourcePeak:peak,gainScale:scale,reviewStatus:'Listening pending; offline copy, browser/MP4 still needs review',tracks:tracks.map(({buffer,...track})=>({...track,bufferDuration:buffer.duration}))},null,2));
console.log(`Wrote ${output}: ${compiled.duration}s, ${tracks.length} tracks, ${tracks.filter(t=>t.key).length} voice cues, peak scale ${scale.toFixed(4)}. Listening pending.`);
