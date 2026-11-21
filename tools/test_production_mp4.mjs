// Real MP4 mux/decoder smoke test. FFmpeg supplies encoded fixture packets;
// it does not substitute for browser WebCodecs or verify WebGL rendering.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as media from 'mediabunny';
import {encodeMp4} from '../game-src/production-export.js';
const python=spawnSync('python',['-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],{encoding:'utf8'});
const ffmpeg=process.env.FFMPEG_PATH||python.stdout?.trim();
assert.ok(ffmpeg,'Set FFMPEG_PATH or install Python imageio_ffmpeg for this test.');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'semesta-mp4-test-'));
function run(args){const result=spawnSync(ffmpeg,args,{encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(result.status,0,result.stderr);return result;}
for(const [width,height] of [[1080,1920],[1920,1080],[1080,1080]]){
  const file=path.join(temp,`fixture-${width}-${height}.mp4`);
  run(['-v','error','-f','lavfi','-i',`testsrc2=size=${width}x${height}:rate=30:duration=1`,'-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=1','-c:v','libx264','-preset','ultrafast','-crf','24','-pix_fmt','yuv420p','-bf','0','-c:a','aac','-ac','2','-shortest',file]);
  const input=new media.Input({source:new media.BufferSource(await fs.readFile(file)),formats:media.ALL_FORMATS});
  const video=await input.getPrimaryVideoTrack(),audio=await input.getPrimaryAudioTrack();
  const videoConfig=await video.getDecoderConfig(),audioConfig=await audio.getDecoderConfig();
  const videoPackets=[],audioPackets=[];
  for await(const p of new media.EncodedPacketSink(video).packets())videoPackets.push(p);
  for await(const p of new media.EncodedPacketSink(audio).packets())audioPackets.push(p);
  let count=0;
  class EncodedCanvas extends media.EncodedVideoPacketSource{
    constructor(){super('avc');}
    async add(timestamp,duration){const packet=videoPackets[count++];assert.equal(Math.round(packet.timestamp*30),Math.round(timestamp*30));assert.ok(Math.abs(packet.duration-duration)<.001);return super.add(packet,{decoderConfig:videoConfig});}
  }
  class EncodedSound extends media.EncodedAudioPacketSource{
    constructor(){super('aac');}
    async add(){for(const packet of audioPackets)await super.add(packet,{decoderConfig:audioConfig});}
  }
  const blob=await encodeMp4({canvas:{width,height},duration:1,audio:{},renderFrame:()=>{}},{...media,CanvasSource:EncodedCanvas,AudioBufferSource:EncodedSound,canEncodeVideo:async()=>true,canEncodeAudio:async()=>true});
  const outputPath=path.join(temp,`output-${width}-${height}.mp4`),bytes=Buffer.from(await blob.arrayBuffer());await fs.writeFile(outputPath,bytes);
  const inspect=new media.Input({source:new media.BufferSource(bytes),formats:media.ALL_FORMATS});
  const v=await inspect.getPrimaryVideoTrack(),a=await inspect.getPrimaryAudioTrack();
  assert.equal(v.codec,'avc');assert.equal(a.codec,'aac');assert.equal(v.displayWidth,width);assert.equal(v.displayHeight,height);
  assert.ok(Math.abs(await inspect.computeDuration()-1)<.08);assert.equal(count,30);
  assert.ok(bytes.indexOf(Buffer.from('moov'))<bytes.indexOf(Buffer.from('mdat')),'Fast-start metadata precedes media');
  run(['-v','error','-i',outputPath,'-f','null','-']);
  input.dispose();inspect.dispose();
  console.log(`PASS: decoded MP4 H.264/AAC ${width}x${height}, 30 frames, ~1s, fast start.`);
}
console.log(`Technical fixtures only (not Day 1): ${temp}`);
