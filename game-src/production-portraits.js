/** Stylized interpretations from cited photo references; isolated cast instances only. */
export function refineProductionPortrait(THREE,model,id){
  if(!['bahlil','mama-ghufron'].includes(id)||!model.head)return;
  const isGhufron=id==='mama-ghufron',figure=model.figure;
  const details=new THREE.Group();details.name=isGhufron?'MamaGhufronLongHair':'BahlilCroppedHair';figure.add(details);
  const sphere=new THREE.SphereGeometry(1,20,14),materials=new Map();
  function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.95}));return materials.get(color);}
  function oval(name,color,p,s){const o=new THREE.Mesh(sphere,mat(color));o.name=name;o.position.fromArray(p);o.scale.fromArray(s);o.castShadow=true;details.add(o);return o;}
  function strand(name,color,points,radius){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const geometry=new THREE.TubeGeometry(curve,20,radius,8,false);
    if(name.startsWith('Gondrong')){const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const t=Math.floor(i/9)/20,c=curve.getPointAt(t),taper=1-.75*Math.pow(t,4);p.setXYZ(i,c.x+(p.getX(i)-c.x)*taper,c.y+(p.getY(i)-c.y)*taper,c.z+(p.getZ(i)-c.z)*taper);}geometry.computeVertexNormals();}
    const o=new THREE.Mesh(geometry,mat(color));o.name=name;o.castShadow=true;details.add(o);return o;}
  // The default cartoon eye is too large for these mature portrait silhouettes.
  // Clone before editing; the player's/customizer's shared source is untouched.
  figure.traverse(node=>{
    if(node.isMesh&&/^Face_Iris/.test(node.name)){
      for(const m of Array.isArray(node.material)?node.material:[node.material])m.color.set('#49382b');
    }
    if(!node.isMesh||!/^Face_(Eye|Iris|Pupil|Highlight|Brow)/.test(node.name))return;
    node.geometry=node.geometry.clone();node.userData.sharedCharacterGeometry=false;
    const base=node.geometry.attributes.position;
    const sx=isGhufron?.88:.94,sy=isGhufron?.72:.8;
    for(let i=0;i<base.count;i++){
      const x=base.getX(i),center=x<0?-.068:.068;
      base.setXYZ(i,center+(x-center)*sx,1.68+(base.getY(i)-1.68)*sy,base.getZ(i)+.003);
    }
    for(const attr of node.geometry.morphAttributes.position??[]){
      for(let i=0;i<attr.count;i++)attr.setXYZ(i,attr.getX(i)*sx,attr.getY(i)*sy,attr.getZ(i));
    }
    base.needsUpdate=true;node.geometry.computeVertexNormals();node.geometry.computeBoundingBox();node.geometry.computeBoundingSphere();
  });
  if(isGhufron){
    // Shoulder-length layered curves, open at the face; grey is concentrated at temples.
    for(let i=0;i<19;i++){
      const a=.62+i*(Math.PI*2-1.24)/18,x=Math.sin(a),z=Math.cos(a);
      strand('GondrongLayer'+i,i%7===0?'#555d58':'#303532',[
        [x*.185,1.79,z*.157-.025],[x*.215,1.61,z*.18-.035],
        [x*(.23+.012*Math.sin(i)),1.4,z*.18-.05],[x*(.27+(i%3)*.012),1.22+(i%4)*.027,z*.20-.04]
      ],.019+(i%3)*.003);
    }
    for(const s of [-1,1]){
      for(let i=0;i<3;i++)strand('GreyTemple','#9c9d91',[[s*(.175+i*.009),1.78,.04],[s*(.205+i*.009),1.65,.055],[s*(.22+i*.008),1.55,.025]],.004);
      strand('GreyDroopingMoustache','#95988b',[[s*.006,1.595,.197],[s*.04,1.59,.194],[s*.075,1.565,.177]],.014);
      strand('CheekCrease','#9b775c',[[s*.067,1.6,.172],[s*.082,1.563,.155],[s*.073,1.535,.145]],.0025);
    }
  }else{
    // Follow the actual morphed head surface. An ellipsoid intersects the
    // authored head and leaves an unintended bald band across the forehead.
    const skin=figure.getObjectByName('Body_Skin'),points=[];
    if(skin){
      const g=skin.geometry,index=g.index,count=index?index.count:g.attributes.position.count;
      const hairDistance=p=>{const front=Math.max(0,Math.min(1,(p.z+.03)/.15));return p.y-(1.71+.065*front+.018*Math.min(1,(Math.abs(p.x)/.18)**2)*front);};
      for(let i=0;i<count;i+=3){
        let polygon=[0,1,2].map(j=>skin.getVertexPosition(index?index.getX(i+j):i+j,new THREE.Vector3()));
        const clipped=[];
        for(let j=0;j<polygon.length;j++){
          const a=polygon[j],b=polygon[(j+1)%polygon.length],da=hairDistance(a),db=hairDistance(b),inside=da>=0,next=db>=0;
          if(inside)clipped.push(a);
          if(inside!==next)clipped.push(a.clone().lerp(b,da/(da-db)));
        }
        for(let j=1;j<clipped.length-1;j++)for(const p of [clipped[0],clipped[j],clipped[j+1]]){
          const q=p.clone().add(p.clone().sub(new THREE.Vector3(0,1.65,0)).normalize().multiplyScalar(.006));points.push(...q.toArray());
        }
      }
      const scalp=new THREE.BufferGeometry();scalp.setAttribute('position',new THREE.Float32BufferAttribute(points,3));scalp.computeVertexNormals();
      const cap=new THREE.Mesh(scalp,mat('#252826'));cap.name='HighHairline';details.add(cap);
    }
    for(const s of [-1,1]){
      strand('DefinedBrow','#40382e',[[s*.025,1.718,.181],[s*.065,1.726,.177],[s*.105,1.717,.156]],.007);
      strand('SmileFold','#926248',[[s*.047,1.594,.184],[s*.066,1.566,.166],[s*.065,1.54,.15]],.0025);
    }
  }
  figure.updateWorldMatrix(true,true);model.head.attach(details);
  figure.userData.productionPortrait={revision:'reference-study-v7',id,notPhotorealistic:true};
}
