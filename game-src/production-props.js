import * as THREE from 'three';

export function productionProps({geometries,materials}){
  const materialsByColor=new Map();
  const mesh=(parent,geometry,color,pos,scale=[1,1,1])=>{
    geometries.add(geometry);let material=materialsByColor.get(color);
    if(!material){material=new THREE.MeshStandardMaterial({color,roughness:.65});materialsByColor.set(color,material);materials.add(material);}
    const m=new THREE.Mesh(geometry,material);m.position.fromArray(pos);m.scale.fromArray(scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  };
  const ball=(p,c,v,s)=>mesh(p,new THREE.SphereGeometry(1,18,12),c,v,s);
  const box=(p,c,v,s)=>mesh(p,new THREE.BoxGeometry(...s),c,v);
  const tube=(p,c,points,r)=>mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),24,r,8,false),c,[0,0,0]);
  function guitar(actor){
    const root=new THREE.Group();root.name='ProductionBackGuitar';actor.figure.add(root);
    root.position.set(.05,1.04,-.24);root.rotation.z=-.4;
    const outline=new THREE.Shape();outline.moveTo(0,-.25);outline.bezierCurveTo(-.27,-.26,-.25,-.01,-.12,.03);outline.bezierCurveTo(-.18,.15,-.12,.25,-.045,.16);outline.lineTo(.045,.16);outline.bezierCurveTo(.12,.25,.18,.15,.12,.03);outline.bezierCurveTo(.25,-.01,.27,-.26,0,-.25);
    mesh(root,new THREE.ExtrudeGeometry(outline,{depth:.065,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:3,steps:1,curveSegments:18}),'#9c252c',[0,0,-.035]);
    box(root,'#3a261b',[0,.39,0],[.05,.55,.048]);box(root,'#b68754',[0,.72,0],[.075,.15,.05]);
    for(const z of [-.052,.052]){
      box(root,'#15191c',[0,-.015,z],[.11,.14,.008]);box(root,'#ccd3d4',[0,-.12,z],[.1,.024,.012]);
      for(let i=0;i<6;i++)tube(root,'#b9bec1',[[i*.005-.0125,-.14,z],[i*.005-.0125,.75,z]],.0007);
      for(let i=0;i<11;i++)box(root,'#a9adb2',[0,.14+i*.045,z*.5],[.055,.003,.003]);
    }
    for(let i=0;i<3;i++)for(const side of [-1,1])ball(root,'#bfc4c7',[side*.05,.68+i*.04,0],[.017,.012,.012]);
    const strap=new THREE.Group();strap.name='ProductionGuitarStrap';actor.figure.add(strap);
    const curve=new THREE.CatmullRomCurve3([[-.23,1.48,-.13],[-.21,1.49,.12],[.08,1.21,.22],[.24,.93,.1],[.16,1.02,-.25]].map(p=>new THREE.Vector3(...p))),positions=[],indices=[];
    for(let i=0;i<=48;i++){
      const center=curve.getPoint(i/48),across=curve.getTangent(i/48).cross(new THREE.Vector3(0,0,1)).normalize().multiplyScalar(.026);
      positions.push(...center.clone().add(across).toArray(),...center.clone().sub(across).toArray());
      if(i)indices.push(i*2-2,i*2-1,i*2,i*2-1,i*2+1,i*2);
    }
    const ribbon=new THREE.BufferGeometry();ribbon.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));ribbon.setIndex(indices);ribbon.computeVertexNormals();
    const belt=mesh(strap,ribbon,'#292a2b',[0,0,0]);belt.material.side=THREE.DoubleSide;
    actor.figure.updateMatrixWorld(true);
    const chest=actor.figure.getObjectByName('chest')||actor.figure.getObjectByName('spine2')||actor.figure.getObjectByName('spine');
    if(!chest)throw new Error('Guitar attachment requires a torso bone');chest.attach(root);chest.attach(strap);
    return root;
  }
  function animals(parent){
    const animals={};
    for(const kind of ['chicken','cat']){
      const root=new THREE.Group();root.name='Production_'+kind;parent.add(root);root.visible=false;
      const body=new THREE.Group();root.add(body);const legs=[],head=new THREE.Group();body.add(head);
      if(kind==='chicken'){
        ball(body,'#f3ead8',[0,.25,0],[.17,.19,.22]);head.position.set(0,.44,.13);
        ball(head,'#fff6e1',[0,0,0],[.095,.105,.09]);
        const beak=mesh(head,new THREE.ConeGeometry(.035,.1,4),'#de9d30',[0,-.01,.115]);beak.rotation.x=Math.PI/2;
        for(let i=0;i<3;i++)ball(head,'#c23c37',[0,.09+i*.008,-.04+i*.035],[.022,.035,.026]);
        ball(head,'#c23c37',[0,-.08,.05],[.025,.045,.023]);
        for(const side of [-1,1]){ball(head,'#181f24',[side*.074,.02,.05],[.015,.019,.012]);const wing=ball(body,'#d6c5a5',[side*.145,.25,-.025],[.045,.13,.15]);wing.rotation.z=side*.1;}
        for(let i=-1;i<=1;i++){const feather=ball(body,'#cebea3',[i*.035,.33,-.18],[.035,.17,.06]);feather.rotation.x=-.65;}
      }else{
        ball(body,'#d5944a',[0,.27,0],[.14,.15,.25]);head.position.set(0,.4,.19);
        ball(head,'#e6a85e',[0,0,0],[.13,.115,.11]);
        for(const side of [-1,1]){
          const ear=mesh(head,new THREE.ConeGeometry(.055,.12,3),'#cb8d49',[side*.085,.11,0]);ear.rotation.z=side*-.2;
          ball(head,'#f6d6a1',[side*.04,-.03,.09],[.05,.038,.035]);ball(head,'#283d32',[side*.052,.018,.096],[.018,.025,.009]);ball(head,'#10191a',[side*.052,.018,.104],[.006,.02,.004]);
          for(let i=0;i<3;i++)tube(head,'#f3e5c9',[[side*.035,-.025,.12],[side*.16,-.04+i*.025,.11]],.0015);
        }
        ball(head,'#9e6b65',[0,-.02,.127],[.016,.01,.008]);
        const tail=new THREE.Group();tail.position.set(0,.28,-.2);body.add(tail);tube(tail,'#c27e36',[[0,0,0],[.03,.12,-.15],[.05,.32,-.2],[.02,.39,-.12]],.028);root.userData.tail=tail;
        for(let i=0;i<3;i++){const stripe=ball(body,'#a56530',[0,.36,-.14+i*.1],[.144,.025,.017]);stripe.rotation.z=.05;}
      }
      for(const z of kind==='cat'?[-.14,.14]:[0])for(const side of [-1,1]){
        const pivot=new THREE.Group();pivot.position.set(side*(kind==='cat'?.075:.065),.18,z);root.add(pivot);
        ball(pivot,kind==='cat'?'#cb8941':'#d5a04a',[0,-.08,0],kind==='cat'?[.035,.09,.04]:[.012,.09,.012]);
        ball(pivot,kind==='cat'?'#e6b979':'#d5a04a',[0,-.16,.025],[.045,.025,.065]);legs.push(pivot);
      }
      animals[kind]={root,body,head,legs};
    }
    return {items:animals,pose(sample,time){for(const [kind,a] of Object.entries(animals)){
      const cue=sample?.extras[kind];a.root.visible=!!cue?.visible;if(!cue)continue;
      a.root.position.set(cue.position[0],0,cue.position[1]);a.root.rotation.y=cue.moving?Math.atan2(cue.to[0]-cue.from[0],cue.to[1]-cue.from[1]):kind==='chicken'?.2:-.3;
      const stride=cue.moving?Math.sin(sample.elapsed*11):0;
      a.legs.forEach((leg,i)=>leg.rotation.x=stride*(i%2?1:-1)*.55);
      a.body.position.y=cue.moving?Math.abs(stride)*.018:Math.sin(time*2.4)*.004;
      a.head.rotation.x=cue.action==='sad'?.23:cue.action==='proud'?-.15:Math.sin(time*2)*.04;
      a.head.rotation.z=cue.action==='sad'?.13:Math.sin(time*1.4)*.03;
      if(a.root.userData.tail)a.root.userData.tail.rotation.z=Math.sin(time*3)*.22;
    }}};
  }
  return {guitar,animals};
}
