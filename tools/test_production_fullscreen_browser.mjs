// Browser regression for the production player's fullscreen control.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const fixture=path.join(root,'tools','.production-fullscreen-fixture.html');
const port=5187,debugPort=9231;
fs.writeFileSync(fixture,`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/game-src/production-video-library.css"></head><body><div id="host"></div><script type="module">import {mountProductionVideoLibrary} from '/game-src/production-video-library.js';mountProductionVideoLibrary(document.getElementById('host'),{mediaRoot:'/public/audio/produksi/'});</script></body></html>`);
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
const chrome=spawn('/usr/bin/google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--window-size=720,1280',`--remote-debugging-port=${debugPort}`,'--remote-allow-origins=*','about:blank'],{stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let ws;
try{
  let page;
  for(let i=0;i<100;i++){
    try{const pages=await(await fetch(`http://127.0.0.1:${debugPort}/json`)).json();page=pages.find(p=>p.type==='page');if(page)break;}catch{}
    await delay(100);
  }
  if(!page)throw Error('Chrome unavailable');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  let next=0;const pending=new Map();
  ws.addEventListener('message',e=>{const message=JSON.parse(e.data);if(pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);message.error?p.reject(message.error):p.resolve(message.result)}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
  const evaluate=async(expression,userGesture=false)=>{
    const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture});
    if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call('Page.enable');await call('Runtime.enable');
  await call('Page.navigate',{url:`http://127.0.0.1:${port}/tools/.production-fullscreen-fixture.html`});
  for(let i=0;i<100;i++){
    if(await evaluate('!!document.querySelector("[data-production-fullscreen]")'))break;
    await delay(100);
  }
  const before=await evaluate('document.querySelector("[data-production-video]").src');
  if(!before.includes('release-v4-election/day2-final-v4-20261118.mp4'))throw Error('Day 2 player did not load');
  await evaluate('document.querySelector("[data-production-fullscreen]").click()',true);
  await delay(500);
  const opened=await evaluate(`(()=>{const d=document.querySelector('.production-video-theater'),r=d.getBoundingClientRect();return {open:d.open,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight,video:d.querySelector('video').src,fullscreen:!!document.fullscreenElement}})()`);
  if(!opened.open||opened.width<opened.viewportWidth-2||opened.height<opened.viewportHeight-2||opened.video!==before)throw Error('Fullscreen did not fill viewport: '+JSON.stringify(opened));
  await evaluate('document.querySelector("[data-theater-close]").click()',true);
  if(await evaluate('document.querySelector(".production-video-theater").open'))throw Error('Close button did not close fullscreen');
  process.stdout.write('PASS: production fullscreen opens '+(opened.fullscreen?'native fullscreen':'viewport dialog')+' and closes in Chrome.\n');
}finally{
  ws?.close();chrome.kill('SIGTERM');server.kill('SIGTERM');fs.rmSync(fixture,{force:true});
}
