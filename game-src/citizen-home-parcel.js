import {Group,BoxGeometry,MeshStandardMaterial,Mesh,Vector3,Quaternion} from 'three';

/** A strapped delivery parcel keeps both hands available for other work. */
export function createWelcomeParcel({scene}={}){
  const root=new Group();root.name='WelcomeDeliveryParcel';root.visible=false;scene?.add(root);
  const materials=new Map(),geometry=new BoxGeometry(1,1,1),position=new Vector3(),rotation=new Quaternion();
  function box(name,color,p,size){
    if(!materials.has(color))materials.set(color,new MeshStandardMaterial({color,roughness:.9}));
    const mesh=new Mesh(geometry,materials.get(color));mesh.name=name;mesh.position.fromArray(p);mesh.scale.fromArray(size);mesh.castShadow=true;root.add(mesh);
  }
  box('WrappedParcel','#d5b67d',[0,0,-.09],[.43,.43,.26]);
  box('PaperLabel','#f2ead0',[0,.02,-.225],[.23,.15,.012]);
  box('ParcelTape','#8f7651',[0,0,-.232],[.045,.43,.015]);
  for(const side of [-1,1]){
    box('ShoulderStrap','#566d60',[side*.16,.16,.025],[.045,.52,.045]);
    box('StrapOverShoulder','#566d60',[side*.16,.41,.16],[.045,.045,.31]);
  }
  let disposed=false;
  return {root,update(actor,carrying){
    if(disposed)return;root.visible=!!carrying&&!!actor?.figure;if(!root.visible)return;
    actor.figure.updateWorldMatrix(true,false);position.set(0,1.12,-.22);actor.figure.localToWorld(position);
    root.position.copy(position);actor.figure.getWorldQuaternion(rotation);root.quaternion.copy(rotation);
  },dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometry.dispose();for(const material of materials.values())material.dispose();}};
}
