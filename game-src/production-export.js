export const EXPORT_FPS=30;
export const EXPORT_BITRATE=12_000_000;
export function frameCount(duration){return Math.ceil(duration*EXPORT_FPS);}
export async function encodeMp4({canvas,duration,renderFrame,audio=null,signal,onProgress=()=>{}},media){
  media ||= await import('mediabunny');
  const {Output,Mp4OutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality,canEncodeVideo,canEncodeAudio}=media;
  const quality=new Quality({bitrate:EXPORT_BITRATE});
  if(!await canEncodeVideo('avc',{width:canvas.width,height:canvas.height,frameRate:EXPORT_FPS,quality})){
    throw new Error('Encoder H.264 belum tersedia di browser ini. Gunakan Chrome/Edge dengan akselerasi grafis aktif melalui HTTPS atau localhost. Coba kualitas 720p bila 1080p tidak didukung.');
  }
  if(audio&&!await canEncodeAudio('aac',{sampleRate:48000,numberOfChannels:2}))throw new Error('Encoder audio AAC belum tersedia. Gunakan Chrome/Edge yang mendukung AAC untuk mengekspor dengan audio.');
  const target=new BufferTarget(),output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target});
  const video=new CanvasSource(canvas,{codec:'avc',quality,keyFrameInterval:2,latencyMode:'quality'});
  output.addVideoTrack(video,{frameRate:EXPORT_FPS});
  let sound;
  if(audio){sound=new AudioBufferSource({codec:'aac',quality:new Quality({bitrate:192_000})});output.addAudioTrack(sound);}
  const check=()=>{if(signal?.aborted)throw new DOMException('Ekspor dibatalkan.','AbortError');};
  try{
    check();await output.start();
    if(sound){await sound.add(audio);sound.close();}
    const total=frameCount(duration);
    for(let frame=0;frame<total;frame++){
      check();await renderFrame(frame/EXPORT_FPS);
      await video.add(frame/EXPORT_FPS,1/EXPORT_FPS);
      if(frame%6===0||frame===total-1){onProgress((frame+1)/total);await new Promise(resolve=>setTimeout(resolve,0));}
    }
    video.close();check();await output.finalize();check();
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
    const length=Math.min(track.buffer.duration,duration-track.offset),fade=Math.min(.12,length/3);
    gain.gain.setValueAtTime(0,track.offset);gain.gain.linearRampToValueAtTime(track.volume,track.offset+fade);
    gain.gain.setValueAtTime(track.volume,track.offset+length-fade);gain.gain.linearRampToValueAtTime(0,track.offset+length);
    source.connect(gain).connect(context.destination);source.start(track.offset,0,length);
  }
  const mixed=await context.startRendering();
  let peak=0;for(let c=0;c<mixed.numberOfChannels;c++)for(const value of mixed.getChannelData(c))peak=Math.max(peak,Math.abs(value));
  if(peak>.95)for(let c=0;c<mixed.numberOfChannels;c++){const samples=mixed.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]*=.95/peak;}
  return mixed;
}
