// CPU work only: does not claim WebGL/browser frame rates.
import {performance} from 'node:perf_hooks';
import {loadTestAvatars} from './avatar_v15_test_asset.mjs';
import {day2Scenario} from '../game-src/production-day2.js';
import {createProductionStage} from '../game-src/production-stage.js';
import {characterLabelAnchors,layoutCharacterLabels} from '../game-src/production-character-labels.js';
await loadTestAvatars();
const stage=await createProductionStage(day2Scenario()),results=[];
for(const id of ['S02','S05','S09','S21','S27']){
  const shot=stage.compiled.shots.find(s=>s.id===id),samples=[];
  for(let i=0;i<36;i++){
    const t=shot.start+shot.duration*(.3+i/100),a=performance.now();
    stage.pose(t);const b=performance.now(),anchors=characterLabelAnchors(stage);
    layoutCharacterLabels(anchors,{width:360,height:640,measure:(text,size)=>text.length*size*.54});
    const c=performance.now();if(i>=6)samples.push({pose:b-a,labels:c-b});
  }
  const stats=key=>{const values=samples.map(s=>s[key]).sort((a,b)=>a-b);return {medianMs:+values[15].toFixed(2),p95Ms:+values[28].toFixed(2)};};
  results.push({shot:id,pose:stats('pose'),labels:stats('labels')});
}
stage.dispose();console.log(JSON.stringify({actors:49,kind:'CPU only; GPU not measured',results},null,2));
