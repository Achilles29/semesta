import {displaySpeechText} from './production-speech-text.js';

const cache=new WeakMap();
/** Phrase groups use measured word boundaries, never estimated word spacing. */
export function captionGroups(clip){
  if(cache.has(clip))return cache.get(clip);
  const words=[];
  for(let i=0;i<clip.words.length;i++){
    const word={...clip.words[i]};
    if(word.text.toLowerCase()==='weka'){
      while(clip.words[i+1]?.text.toLowerCase()==='weka'){word.end=clip.words[++i].end;}
      word.text='Wkwkwk';
    }
    words.push(word);
  }
  const groups=[];let group=[];
  for(const word of words){
    const previous=group.at(-1);
    if(previous&&(group.length>=6||word.start-previous.end>.23)){groups.push(group);group=[];}
    group.push(word);
  }
  if(group.length)groups.push(group);
  const result=groups.map((words,i)=>({words,start:words[0].start,end:Math.min(clip.duration,groups[i+1]?.[0].start??words.at(-1).end+.18)}));cache.set(clip,result);return result;
}
function plate(ctx,x,y,w,h,color){ctx.fillStyle=color;if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(14,h/4));ctx.fill();}else ctx.fillRect(x,y,w,h);}
export function drawSeriesFrame(ctx,scenario,time,duration){
  const {width:w,height:h}=ctx.canvas,scale=Math.min(w/1080,h/1080),pad=w*.07;
  ctx.save();
  // Only the top and bottom carry colour; the middle stays unobstructed.
  for(const [edge,end] of [[0,h*.27],[h,h*.72]]){
    const gradient=ctx.createLinearGradient(0,edge,0,end);
    gradient.addColorStop(0,'rgba(119,18,36,.88)');
    gradient.addColorStop(.42,'rgba(157,28,49,.52)');
    gradient.addColorStop(1,'rgba(157,28,49,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,Math.min(edge,end),w,Math.abs(end-edge));
  }
  ctx.textBaseline='middle';ctx.textAlign='left';ctx.font=`800 ${25*scale}px Arial`;
  ctx.fillStyle='#fff';ctx.shadowColor='rgba(37,6,13,.45)';ctx.shadowBlur=5*scale;
  ctx.fillText((scenario.title.match(/Day\s*\d+/i)?.[0]||'STUDIO').toUpperCase(),pad,h*.065);
  ctx.textAlign='right';ctx.font=`800 ${22*scale}px Arial`;
  ctx.fillText('REPUBLIK WKWKWK',w-pad,h*.065);
  ctx.restore();
}
export function drawDialogue(ctx,{clip,caption,speaker,speechTime}){
  const {width:w,height:h}=ctx.canvas,scale=Math.min(w/1080,h/1080);
  let words;
  if(clip){const group=captionGroups(clip).find(g=>speechTime>=g.start&&speechTime<g.end);if(!group)return;words=group.words;}
  else words=displaySpeechText(caption).split(/\s+/).map(text=>({text}));
  const size=58*scale,width=w*.76,lineHeight=size*1.2,lines=[[]];ctx.save();ctx.font=`800 ${size}px Arial`;
  const gap=ctx.measureText(' ').width;
  for(const word of words){let line=lines.at(-1);const used=line.reduce((sum,v)=>sum+ctx.measureText(v.text).width+gap,0);if(line.length&&used+ctx.measureText(word.text).width>width){line=[];lines.push(line);}line.push(word);}
  const bottom=h*.78,top=bottom-lines.length*lineHeight-18*scale;
  plate(ctx,w*.1,top-8*scale,w*.8,lines.length*lineHeight+36*scale,'rgba(10,24,29,.9)');
  ctx.fillStyle='#ffe07a';ctx.fillRect(w*.1,top-8*scale,5*scale,lines.length*lineHeight+36*scale);
  ctx.textBaseline='middle';ctx.textAlign='left';
  if(speaker){ctx.font=`800 ${23*scale}px Arial`;const labelWidth=ctx.measureText(speaker).width+32*scale;plate(ctx,w*.1,top-44*scale,labelWidth,34*scale,'#ffe07a');ctx.fillStyle='#193138';ctx.fillText(speaker,w*.1+16*scale,top-27*scale);}
  ctx.font=`800 ${size}px Arial`;
  lines.forEach((line,index)=>{
    const length=line.reduce((sum,v)=>sum+ctx.measureText(v.text).width,0)+gap*(line.length-1);let x=(w-length)/2;
    for(const word of line){const active=clip&&speechTime>=word.start&&speechTime<word.end;ctx.fillStyle=active?'#ffe07a':'#fffaf0';ctx.fillText(word.text,x,top+18*scale+(index+.5)*lineHeight);x+=ctx.measureText(word.text).width+gap;}
  });ctx.restore();
}
