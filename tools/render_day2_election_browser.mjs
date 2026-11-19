// Render Day 2 election's actual Three.js game set through Chrome.
// Serves the repository locally while capturing the real browser scene.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const WIDTH=720,HEIGHT=1280,FPS=24;
const root=path.resolve(import.meta.dirname,'..');
const release='release-v3-election';
const out=path.join(root,'public/audio/produksi/episode-003',release);
const timeline=JSON.parse(fs.readFileSync(path.join(out,'timeline.json'),'utf8'));
const DURATION=timeline.duration;
fs.mkdirSync(out,{recursive:true});
const port=9234;
const onlyStills=process.argv.includes('--stills');
const rangeArg=process.argv.find(x=>x.startsWith('--range='));
const [fromFrame,toFrame]=rangeArg?rangeArg.slice(8).split(',').map(Number):[0,Math.round(DURATION*FPS)];
if(!Number.isInteger(fromFrame)||!Number.isInteger(toFrame)||fromFrame<0||toFrame<=fromFrame||toFrame>Math.round(DURATION*FPS))throw Error('Invalid --range=startFrame,endFrame');
const server=spawn('python3',['-m','http.server','5185','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
for(let i=0;i<60;i++){try{const r=await fetch('http://127.0.0.1:5185/tools/preview-production-day2-election.html');if(r.ok)break}catch{}if(i===59)throw Error('Local source server unavailable');await new Promise(r=>setTimeout(r,100))}
const chrome=spawn('/usr/bin/google-chrome',[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--disable-background-networking',
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
  '--force-device-scale-factor=1',`--window-size=${WIDTH},${HEIGHT}`,
  `--remote-debugging-port=${port}`,'--remote-allow-origins=*','about:blank'
],{stdio:['ignore','ignore','pipe']});
chrome.stderr.on('data',d=>{const s=d.toString();if(s.includes('ERROR')&&!s.includes('dbus'))process.stderr.write(s.slice(0,400))});
let ffmpeg;
async function waitPage(){for(let i=0;i<100;i++){try{const list=await(await fetch(`http://127.0.0.1:${port}/json`)).json();const p=list.find(x=>x.type==='page');if(p)return p}catch{}await new Promise(r=>setTimeout(r,150))}throw Error('Chrome debugging endpoint unavailable')}
const page=await waitPage();
const ws=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
let seq=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)}});
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
function evalJS(expression){return call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}).then(r=>{if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value})}
try{
 await call('Page.enable');await call('Runtime.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:WIDTH,height:HEIGHT,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:5185/tools/preview-production-day2-election.html'});
 for(let i=0;i<120;i++){const state=await evalJS('({ready:!!window.DAY2_READY,error:window.DAY2_ERROR||null})');if(state?.error)throw Error(state.error);if(state?.ready)break;if(i===119)throw Error('Day 2 preview did not load');await new Promise(r=>setTimeout(r,250))}
 await evalJS('document.body.classList.add("filming")');
 async function capture(t,name){
   const state=await evalJS(`window.renderDay2Frame(${t})`);if(!state?.ready)throw Error('Scene render failed');
   const shot=await call('Page.captureScreenshot',{format:onlyStills?'png':'jpeg',quality:onlyStills?undefined:95,captureBeyondViewport:false,fromSurface:true});
   const bytes=Buffer.from(shot.data,'base64');if(name)fs.writeFileSync(path.join(out,name),bytes);
   return bytes;
 }
 if(onlyStills){const custom=process.argv.find(x=>x.startsWith('--times='));const moments=custom?custom.slice(8).split(',').map(Number):timeline.scenes.map(s=>[s.start+.6,(s.start+s.end)/2]).flat();for(const [i,t] of moments.entries()){await capture(t,`${custom?'mouth':'review'}-${String(i).padStart(2,'0')}.png`);process.stdout.write(`still ${i} ${t.toFixed(1)}\n`)}}
 else{
   const visual=path.join(out,rangeArg?`day2-patch-${fromFrame}-${toFrame}.mp4`:'day2-visual.mp4');
   ffmpeg=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-vcodec','mjpeg','-i','pipe:0','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-r',String(FPS),'-movflags','+faststart',visual],{stdio:['pipe','inherit','inherit']});
   const frames=toFrame-fromFrame;
   for(let i=0;i<frames;i++){
      const b=await capture((fromFrame+i)/FPS);
      if(!ffmpeg.stdin.write(b))await once(ffmpeg.stdin,'drain');
      if(i%120===0)process.stdout.write(`frame ${i}/${frames}\n`);
   }
   ffmpeg.stdin.end();const [code]=await once(ffmpeg,'exit');if(code!==0)throw Error(`ffmpeg exited ${code}`);
   process.stdout.write(`${visual}\n`);
 }
}finally{ws.close();chrome.kill('SIGTERM');server.kill('SIGTERM');if(ffmpeg&&!ffmpeg.killed&&ffmpeg.exitCode===null)ffmpeg.kill('SIGTERM')}
