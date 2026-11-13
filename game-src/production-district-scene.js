import { PRODUCTION_DISTRICT as SITE, PRODUCTION_CAST } from './production-district.js';
import { farmerCharacterOptions } from './avatar-farmer-config.js';
import { buildProductionNeighborhood } from './production-neighborhood.js';
import { refineProductionPortrait } from './production-portraits.js';

/** Add only new objects; never mutate the admin's stored world scene. */
export function buildProductionDistrict(THREE,{world,makeHuman,makeText,addCollider,createWorldAsset}) {
  const group=new THREE.Group();group.name='BalaiProduksiWkWkWk';world.add(group);
  const box=new THREE.BoxGeometry(1,1,1);
  const sphere=new THREE.SphereGeometry(1,16,12);
  const materials=new Map();
  const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return materials.get(color);};
  const mesh=(parent,geometry,color,pos,scale)=>{const m=new THREE.Mesh(geometry,mat(color));m.position.set(...pos);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
  const block=(color,x,y,z,w,h,d,solid=false)=>{
    const m=mesh(group,box,color,[x,y,z],[w,h,d]);
    if(solid)addCollider(x,z,w/2,d/2,'production');return m;
  };
  const labels=[];
  const sign=(text,x,y,z,width=6)=>{
    const source=makeText(text,'fff8e9','20545a');
    const s=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:source.material.map,transparent:true,side:THREE.DoubleSide}));
    source.material.dispose();s.position.set(x,y,z);s.scale.set(width,width*.12,1);group.add(s);labels.push(s);return s;
  };
  const signs=[];
  for(let i=1;i<SITE.route.length;i++){
    const [ax,az]=SITE.route[i-1],[bx,bz]=SITE.route[i];
    block('#c5b08c',(ax+bx)/2,.014,(az+bz)/2,Math.abs(bx-ax)+4.4,.025,Math.abs(bz-az)+4.4);
  }
  // Ground-level courtyard stays walkable: no invisible box around the whole hall.
  block('#d3c3a2',-48,.025,-100,38,.04,42);
  block('#eae1ca',-48,.055,-103,23,.04,20);
  block('#286269',-48,2.5,-113,23,5,.25,true);
  block('#b88b52',-48,5.1,-113,24,.18,.8);
  for(const x of [-59.5,-36.5])for(const z of [-94,-112]){
    block('#805d42',x,2.5,z,.3,5,.3,true);
  }
  // Open pergola: front/back camera views and walking remain unobstructed.
  block('#936e4b',-48,5.1,-112,24,.16,.18);
  sign('BALAI PRODUKSI WKWKWK',-48,4,-112.65,10);
  sign('PARODI · BUKAN PENCALONAN NYATA',-48,2.5,-112.6,10);
  for(const x of [-62,-34]){
    block('#4b6556',x,1.9,-80,.25,3.8,.25,true);
  }
  sign('BALAI PRODUKSI · MASUK',-62,2.5,-80,6.5);
  const waypoints=[
    {x:-20,z:-2,label:'Balai Produksi: barat, lalu utara',text:'← BALAI PRODUKSI'},
    {x:-51,z:-4,label:'Balai Produksi di utara; Kota Warga di timur',text:'UTARA ↑ BALAI PRODUKSI'},
    {x:-51,z:-43,label:'Terus ke utara menuju Balai Produksi',text:'↑ BALAI PRODUKSI'},
    {x:-51,z:-76,label:'Kota Warga: ke selatan lalu timur',text:'↓ KEMBALI KE KOTA'},
  ];
  for(const s of waypoints){block('#805d42',s.x,.8,s.z,.12,1.6,.12);sign(s.text,s.x,1.9,s.z,4.8);signs.push(s);}
  // Auditorium furniture is individually solid, with wide aisles between rows.
  function chair(x,z,hero=false){
    const color=hero?'#a94c43':'#8f7154';
    block(color,x,.55,z,hero?1.35:.9,.16,.9);
    block(color,x,1.05,z-.4,hero?1.35:.9,1.05,.13);
    for(const dx of [-.36,.36])for(const dz of [-.32,.32])block('#5d5143',x+dx,.25,z+dz,.08,.5,.08);
    addCollider(x,z,hero?.7:.48,.5,'production');
  }
  chair(-48,-108,true);
  for(const x of [-56,-53,-43,-40])for(const z of [-91,-87])chair(x,z);
  block('#9d805b',-48,.82,-104,3,.15,1.2,true);
  for(const x of [-49.2,-46.8])block('#78604b',x,.4,-104,.15,.8,.9);
  // Comedy props, not official documents or insignia.
  for(const x of [-48.3,-47.7]){
    mesh(group,sphere,'#6d4e32',[x,.68,-108],[.18,.055,.32]);
    mesh(group,sphere,'#c7a86d',[x,.73,-108.03],[.17,.025,.06]);
  }
  block('#f7efdc',-47.2,.93,-104,.7,.05,.9);
  block('#f5ecd4',-40,.06,-98,1.1,.03,4.4);
  block('#805d42',-57,.75,-99,1,.12,1.8,true);
  mesh(group,new THREE.CylinderGeometry(.36,.36,.04,24),'#efe7d4',[-57,.84,-99],[1,1,1]);
  sign('USULAN WARGA · BUKAN PEMILIHAN',-58,2,-96,5.8);
  for(let z=-16;z>=-68;z-=18)for(const x of [-54,-42]){
    const lamp=createWorldAsset(THREE,'lamp');lamp.position.set(x,0,z);group.add(lamp);addCollider(x,z,.25,.25,'production');
  }
  for(const [x,z] of [[-65,-83],[-31,-83],[-65,-117],[-31,-117]]){
    const tree=createWorldAsset(THREE,'tree');tree.position.set(x,0,z);group.add(tree);addCollider(x,z,.6,.6,'production');
  }

  const cast=PRODUCTION_CAST.map(def=>{
    const root=new THREE.Group();root.name=`cast-${def.id}`;root.position.set(def.position[0],0,def.position[1]);group.add(root);
    const model=makeHuman(root,farmerCharacterOptions(def.config));
    refineProductionPortrait(THREE,model,def.id);
    const tag=makeText(def.name.toUpperCase(),'fff8e9',def.id==='mama-ghufron'?'6f563e':'20545a');
    tag.position.set(0,2.4,0);tag.scale.set(2.8,.54,1);tag.material.depthTest=true;root.add(tag);labels.push(tag);
    return {...def,root,model,collider:addCollider(root.position.x,root.position.z,.42,.42,'npc'),lineIndex:0,path:null};
  });
  const neighborhood=buildProductionNeighborhood(THREE,{group,makeHuman,addCollider});
  return {group,cast,signs,neighborhood,updateAtmosphere(time,options){neighborhood.update(time,options);},updateLabels(cameraDistance){labels.forEach(label=>{label.visible=cameraDistance>=10;});}};
}
