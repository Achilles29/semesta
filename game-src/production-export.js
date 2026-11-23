export const EXPORT_FPS=30;
export const EXPORT_BITRATE=12_000_000;
export function frameCount(duration){return Math.ceil(duration*EXPORT_FPS);}
export async function encodeMp4({canvas,duration,renderFrame,audio=null,signal,onProgress=()=>{},onStage=()=>{}},media){
  const check=()=>{if(signal?.aborted)throw signal.reason||new DOMException('Ekspor dibatalkan.','AbortError');};
  check();onStage('Memeriksa dukungan MP4');
  media ||= await import('mediabunny');
  check();
  const {Output,Mp4OutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality,canEncodeVideo,canEncodeAudio}=media;
  const quality=new Quality({bitrate:EXPORT_BITRATE});
  const videoOptions={codec:'avc',quality,keyFrameInterval:2,latencyMode:'quality'};
  if(!await canEncodeVideo('avc',{width:canvas.width,height:canvas.height,frameRate:EXPORT_FPS,quality,latencyMode:videoOptions.latencyMode})){
    throw new Error('Encoder H.264 belum tersedia di browser ini. Gunakan Chrome/Edge dengan akselerasi grafis aktif melalui HTTPS atau localhost. Coba kualitas 720p bila 1080p tidak didukung.');
  }
  const audioQuality=new Quality({bitrate:192_000});
  if(audio){
    const audioOptions={sampleRate:audio.sampleRate||48000,numberOfChannels:audio.numberOfChannels||2,quality:audioQuality};
    if(!await canEncodeAudio('aac',audioOptions)){
      check();onStage('Menyiapkan encoder audio AAC');
      const {registerAacEncoder}=media.registerAacEncoder?media:await import('@mediabunny/aac-encoder');
      registerAacEncoder();
      if(!await canEncodeAudio('aac',audioOptions))throw new Error('Encoder audio AAC tidak berhasil disiapkan di browser ini.');
    }
  }
  check();
  // A completed download is a regular MP4. Write media as it arrives instead
  // of retaining every compressed chunk again until the end of a long episode.
  const target=new BufferTarget(),output=new Output({format:new Mp4OutputFormat({fastStart:false}),target});
  const video=new CanvasSource(canvas,videoOptions);
  output.addVideoTrack(video,{frameRate:EXPORT_FPS});
  let sound;
  if(audio){sound=new AudioBufferSource({codec:'aac',quality:audioQuality});output.addAudioTrack(sound);}
  try{
    check();await output.start();
    if(sound){onStage('Menyimpan suara ke MP4');await sound.add(audio);sound.close();check();}
    onStage('Merender video');
    const total=frameCount(duration);
    for(let frame=0;frame<total;frame++){
      check();await renderFrame(frame/EXPORT_FPS);
      await video.add(frame/EXPORT_FPS,1/EXPORT_FPS);
      if(frame%6===0||frame===total-1){onProgress((frame+1)/total);await new Promise(resolve=>setTimeout(resolve,0));}
    }
    video.close();check();onStage('Menyelesaikan file MP4');await output.finalize();check();
    return new Blob([target.buffer],{type:'video/mp4'});
  }catch(error){await output.cancel().catch(()=>{});throw error;}
}

/** The same mixed buffer is used for preview and export, including offsets. */
export async function mixProductionAudio(tracks,duration){
  const active=tracks.filter(t=>t.buffer&&t.offset<duration);
  if(!active.length||duration<=0)return null;
  const context=new OfflineAudioContext(2,Math.ceil(frameCount(duration)/EXPORT_FPS*48000),48000);
  for(const track of active){
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=track.buffer;
    const sourceOffset=Math.max(0,track.sourceOffset||0),length=Math.min(track.duration??Infinity,track.buffer.duration-sourceOffset,duration-track.offset);
    if(length<=0)continue;
    const fade=Math.min(track.fade??.025,length/3);
    const points=track.volumePoints||[{time:0,volume:track.volume}];
    const valueAt=t=>{let prior=points[0];for(const point of points.slice(1)){if(point.time>t){const alpha=(t-prior.time)/(point.time-prior.time);return prior.volume+(point.volume-prior.volume)*Math.max(0,alpha);}prior=point;}return prior.volume;};
    gain.gain.setValueAtTime(0,track.offset);gain.gain.linearRampToValueAtTime(valueAt(fade),track.offset+fade);
    for(const point of points)if(point.time>fade&&point.time<length-fade)gain.gain.linearRampToValueAtTime(point.volume,track.offset+point.time);
    gain.gain.linearRampToValueAtTime(valueAt(length-fade),track.offset+length-fade);gain.gain.linearRampToValueAtTime(0,track.offset+length);
    source.connect(gain).connect(context.destination);source.start(track.offset,sourceOffset,length);
  }
  const mixed=await context.startRendering();
  let peak=0;for(let c=0;c<mixed.numberOfChannels;c++)for(const value of mixed.getChannelData(c))peak=Math.max(peak,Math.abs(value));
  if(peak>.95)for(let c=0;c<mixed.numberOfChannels;c++){const samples=mixed.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]*=.95/peak;}
  return mixed;
}
