import {farmerCharacterOptions,FARMER_PRESET} from './avatar-farmer-config.js';

// Scenery and non-speaking extras belong only to the added production district.
// Absolute-time sampling makes pause, replay and seek deterministic.
export function buildProductionNeighborhood(THREE,{group,makeHuman,addCollider}){
  const scenery=new THREE.Group();scenery.name='ProductionNeighborhood';group.add(scenery);
  const cube=new THREE.BoxGeometry(1,1,1),materials=new Map();
  const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.95}));return materials.get(color);};
  function block(parent,color,x,y,z,w,h,d){const mesh=new THREE.Mesh(cube,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;}
  const buildings=[];
  function house(name,x,z,color){
    const root=new THREE.Group();root.name=name;root.position.set(x,0,z);scenery.add(root);buildings.push(root);
    block(root,color,0,1.5,0,4.6,3,2.8);
    block(root,'#55453a',0,.95,1.43,.8,1.9,.06);
    for(const dx of [-1.5,1.5]){block(root,'#a1c8cc',dx,1.7,1.43,.85,.95,.07);block(root,'#f3dfb6',dx,1.7,1.49,.05,1,.04);}
    const roof=new THREE.Mesh(new THREE.ConeGeometry(3.65,1.2,4),material('#955d49'));
    roof.position.y=3.6;roof.rotation.y=Math.PI/4;roof.scale.z=.72;root.add(roof);
    block(root,'#e4cfaa',0,.08,1.8,4.9,.16,.8);
    addCollider(x,z,2.3,1.4,'production');
  }
  house('RumahTerasHijau',-55.8,-110,'#8da98a');
  house('RumahTerasKuning',-40.2,-110,'#d6b477');
  house('RumahLatarBiru',-48,-117,'#96b3bb');
  function stall(name,x,z,color){
    const root=new THREE.Group();root.name=name;root.position.set(x,0,z);scenery.add(root);buildings.push(root);
    block(root,'#956e4b',0,.65,0,2.1,1.3,.8);
    for(const dx of [-1,1])block(root,'#655041',dx,1.25,-.35,.08,2.5,.08);
    for(let i=0;i<6;i++)block(root,i%2?color:'#f1dfbb',-.95+i*.38,2.45,.1,.38,.12,1.5);
    for(let i=0;i<4;i++)block(root,['#b77c40','#e3cb8c','#ad593a','#9bba65'][i],-.65+i*.43,1.4,0,.32,.16,.35);
    addCollider(x,z,1.05,.4,'production');
  }
  stall('WarungPrasmanan',-53,-106.5,'#a64b43');
  stall('KiosMinuman',-43,-106.5,'#448a87');
  // Small overhead bunting adds depth without text in the recording.
  for(let i=0;i<13;i++){
    const flag=new THREE.Mesh(new THREE.ConeGeometry(.14,.38,3),material(i%2?'#dc9c55':'#d9e4ce'));
    flag.position.set(-55+i*1.15,3.45-Math.sin(i/12*Math.PI)*.4,-108.3);flag.rotation.z=Math.PI;scenery.add(flag);
  }
  const places=[[-50.3,-103.2],[-45.7,-103.2],[-51.2,-105.2],[-44.8,-105.2],[-52.6,-108],[-43.4,-108],[-50.5,-110],[-45.5,-110]];
  const extras=places.map(([x,z],i)=>{
    const root=new THREE.Group();root.name=`WargaFiguran${i+1}`;root.position.set(x,0,z);group.add(root);
    const model=makeHuman(root,farmerCharacterOptions({...FARMER_PRESET,farmer:{
      bodyFrame:i%3===0?'female':'male',bodyType:['slender','mature','full','skinny'][i%4],
      outfit:['loose-tee','batik','koko','tunic'][i%4],bottomStyle:i%2?'sarong':'relaxed',
      headwear:i%4===0?'hijab':i%4===2?'peci':'none',hairStyle:'short',accessory:'none',gloves:'none',footwearStyle:'sandals',
      colors:{skin:['#d5a782','#c99b78','#e3bf9b'][i%3],hair:'#302820',shirt:['#b37b55','#66867e','#b49b66','#8e7f9c'][i%4],trousers:'#5a6263',headwearColor:'#777e65'},
    }}));
    model.figure.traverse(n=>{if(n.isMesh)n.castShadow=false;});
    const collider=addCollider(x,z,.34,.34,'production-extra');
    return {id:root.name,root,model,x,z,index:i,collider};
  });
  function update(time,{quiet=false}={}){
    for(const e of extras){
      const phase=(time+e.index*2.7)%19;
      const walking=e.index===2||e.index===5;
      // Slow walkers stay in short dedicated lanes behind the speakers.
      const offset=walking?.32*Math.sin(time*.32+e.index):0;
      e.root.position.set(e.x+offset,0,e.z);e.collider.x=e.root.position.x;e.collider.z=e.root.position.z;
      e.root.rotation.y=walking?(Math.cos(time*.32+e.index)>0?Math.PI/2:-Math.PI/2):Math.sign(-48-e.x)*.42;
      const clip=walking?'Walk':!quiet&&phase>13&&phase<14.1?'Interact':'Idle';
      const action=e.model.actions?.[clip];
      if(action&&e.model.mixer){
        if(e.model.activeAction!==clip){e.model.mixer.stopAllAction();action.reset().play();e.model.activeAction=clip;}
        const duration=action.getClip().duration;action.time=((time*.65+e.index*.43)%duration+duration)%duration;e.model.mixer.update(0);
      }
    }
  }
  return {scenery,buildings,extras,update};
}
