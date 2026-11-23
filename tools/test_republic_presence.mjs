import assert from 'node:assert/strict';
import {createRepublicPresence,WORLD_PRESENCE_SCOPE} from '../game-src/republic-presence.js';

const positions=new Map(),messages=[];
function client(id){
  const fetchImpl=async (url,options)=>{
    assert.equal(url,'/api');assert.equal(options.credentials,'same-origin');
    const body=JSON.parse(options.body);assert.equal(body.resource,'citizen_chat');
    assert.equal(body.destination,WORLD_PRESENCE_SCOPE.destination);assert.equal(body.region,WORLD_PRESENCE_SCOPE.region);
    if(body.action==='leave'){positions.delete(id);return {ok:true,json:async()=>({ok:true})};}
    if(body.action==='sync'){
      positions.set(id,{x:body.x,z:body.z});
      const players=[...positions].filter(([other,p])=>other!==id&&Math.hypot(p.x-body.x,p.z-body.z)<=55).map(([other,p])=>({id:other,displayName:`Warga ${other}`,x:p.x,z:p.z}));
      const target=positions.get(body.targetId),canChat=!!target&&Math.hypot(target.x-body.x,target.z-body.z)<=5;
      return {ok:true,json:async()=>({players,canChat,messages:canChat?messages.filter(m=>m.id>body.after):[]})};
    }
    assert.equal(body.action,'send');assert.ok(positions.has(body.targetId));
    const message={id:messages.length+1,sender_id:id,sender_name:`Warga ${id}`,message:body.message};messages.push(message);
    return {ok:true,json:async()=>({ok:true,message})};
  };
  return createRepublicPresence({apiUrl:'/api',fetchImpl});
}
const a=client(1),b=client(2);
assert.equal((await a.sync({x:0,z:7})).players.length,0);
assert.deepEqual((await b.sync({x:1,z:7})).players.map(p=>p.id),[1]);
const meeting=await a.sync({x:0,z:7,targetId:2});assert.deepEqual(meeting.players.map(p=>p.id),[2]);assert.equal(meeting.canChat,true);
await a.send({targetId:2,message:'Halo, warga!'});
assert.equal((await b.sync({x:1,z:7,targetId:1})).messages[0].message,'Halo, warga!');
await b.leave();assert.equal((await a.sync({x:0,z:7})).players.length,0);
console.log('PASS republic presence: two accounts share one world, meet nearby, exchange a message and disappear on leave.');
