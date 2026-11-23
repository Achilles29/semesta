// Every region of the new continuous world shares the same presence scope.
// The server still accepts legacy city/region scopes for older clients.
export const WORLD_PRESENCE_SCOPE=Object.freeze({destination:'republic',region:'world'});

export function createRepublicPresence({apiUrl=globalThis.SEMESTA_API_URL||'/api',fetchImpl=globalThis.fetch}={}){
  async function request(action,fields={},options={}){
    const response=await fetchImpl(apiUrl,{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({resource:'citizen_chat',action,...WORLD_PRESENCE_SCOPE,...fields}),
      ...options,
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Koneksi warga gagal (${response.status}).`);
    return data;
  }
  return {
    sync({x,z,targetId=0,after=0,signal}={}){return request('sync',{x,z,targetId,after},{signal});},
    send({targetId,message,signal}={}){return request('send',{targetId,message},{signal});},
    leave(){return request('leave',{}, {keepalive:true});},
  };
}
