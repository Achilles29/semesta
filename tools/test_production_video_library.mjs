import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {PRODUCTION_VIDEOS,mountProductionVideoLibrary} from '../game-src/production-video-library.js';

class Element extends EventTarget{
  constructor(){super();this.nodes=new Map();this.children=[];this.hidden=false;this.value='';this.currentTime=0;this.pauses=0;this.loads=0;}
  querySelector(key){if(!this.nodes.has(key))this.nodes.set(key,new Element());return this.nodes.get(key);}
  append(node){this.children.push(node);}
  pause(){this.pauses++;}
  async play(){}
  load(){this.loads++;}
  setAttribute(key,value){this[key]=value;}
  removeAttribute(key){delete this[key];}
}
globalThis.document={baseURI:'https://example.test/',body:new Element(),createElement:()=>new Element(),addEventListener(){}};
const host=new Element();
const library=mountProductionVideoLibrary(host,{mediaRoot:'https://example.test/public/audio/produksi/'});
const select=host.querySelector('[data-production-video-select]');
const player=host.querySelector('[data-production-video]');
const download=host.querySelector('[data-production-download-video]');
const platformDownload=host.querySelector('[data-production-download-platform]');
const soundLink=host.querySelector('[data-production-sound]');
const subtitles=host.querySelector('[data-production-download-subtitles]');
assert.equal(select.value,'day2');
assert.equal(player.src,'https://example.test/public/audio/produksi/episode-003/release-v4-election/day2-final-v4-20261118.mp4');
assert.equal(download.href,player.src);
assert.equal(download.download,'republik-wkwkwk-day2-v4-pagi-ditolak-siang-lolos.mp4');
assert.equal(platformDownload.hidden,true);
assert.equal(soundLink.hidden,true);
assert.equal(subtitles.hidden,false);
select.value='day3';select.dispatchEvent(new Event('change'));
assert.equal(player.src,'https://example.test/public/audio/produksi/episode-004/release-v3/day3-final-20261118.mp4');
assert.equal(platformDownload.href,'https://example.test/public/audio/produksi/episode-004/release-v3/day3-platform-20261118.mp4');
assert.equal(platformDownload.hidden,false);
assert.equal(soundLink.href,'https://www.youtube.com/watch?v=jwYRwOj9RdA');
assert.equal(subtitles.hidden,false);
host.querySelector('[data-production-fullscreen]').dispatchEvent(new Event('click'));
await new Promise(resolve=>setImmediate(resolve));
assert.equal(document.body.children[0].open,true,'fullscreen button opens the full-viewport theater even without native fullscreen support');
select.value='day1';select.dispatchEvent(new Event('change'));
assert.equal(document.body.children[0].open,false,'switching episodes closes fullscreen playback');
assert.equal(player.src,'https://example.test/public/audio/produksi/episode-001/release-uploaded/day1-uploaded.mp4');
assert.equal(download.href,player.src);
assert.equal(download.download,'kampung-komen-day1.mp4');
assert.equal(subtitles.hidden,true);
assert.equal(platformDownload.hidden,true);
assert.equal(soundLink.hidden,true);
assert.ok(player.pauses>=2&&player.loads>=2,'switching episodes stops the previous video and loads the selected one');
for(const episode of PRODUCTION_VIDEOS){
  assert.ok(existsSync('public/audio/produksi/'+episode.video),episode.id+' video exists');
  assert.ok(existsSync('public/audio/produksi/'+episode.cover),episode.id+' cover exists');
  if(episode.platformVideo)assert.ok(existsSync('public/audio/produksi/'+episode.platformVideo),episode.id+' platform video exists');
}
library.dispose();
console.log('PASS: Day 1/Day 2/Day 3 selection switches one player and updates MP4, cover, and subtitle downloads.');
