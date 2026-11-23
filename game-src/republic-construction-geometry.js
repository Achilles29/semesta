import * as THREE from 'three';

/** Small, neutral world geometry. Only a committed server snapshot selects stages. */
export function createConstructionGeometry({scene}={}){
  const root=new THREE.Group();root.name='SharedConstruction';scene?.add(root);
  const materials=new Map(),geometries=new Set(),projects=new Map(),colliders=[],occluders=[],surfaces=[];
  const unit=new THREE.BoxGeometry(1,1,1);geometries.add(unit);
  const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.84}));return materials.get(color);};
  const box=(parent,name,color,position,size)=>{const mesh=new THREE.Mesh(unit,material(color));mesh.name=name;mesh.position.set(...position);mesh.scale.set(...size);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const group=(parent,name,position=[0,0,0])=>{const value=new THREE.Group();value.name=name;value.position.set(...position);parent.add(value);return value;};
  const kit=(parent,name)=>{const value=group(parent,name);box(value,'KitCrate','#aa784a',[0,.24,0],[.65,.48,.46]);for(const x of [-.22,.22])box(value,'KitStrap','#4b6b65',[x,.245,0],[.065,.50,.48]);return value;};
  const carried=kit(root,'CarriedConstructionKit');carried.visible=false;
  let disposed=false;
  function build(project){
    const anchor=project.position,site=group(root,'Project_'+project.id,[anchor.x,.015,anchor.z]),stages=[];
    const stage=n=>{const value=group(site,'Installed_'+n);value.userData.installThreshold=n;stages.push(value);return value;};
    // The 5.6 × 5.2 m model stays inside the existing 8 × 8 m P01 plot.
    const markers=stage(0);for(const x of [-3.15,3.15])for(const z of [-3.05,3.05]){box(markers,'SiteStake','#a77a4d',[x,.42,z],[.07,.84,.07]);box(markers,'StakeCap','#e3af4c',[x,.73,z],[.09,.15,.09]);}
    const foundation=stage(1);box(foundation,'HouseSlab','#aaa99a',[0,.11,0],[5.6,.22,5.2]);
    const footings=stage(3);for(const x of [-2.68,2.68])for(const z of [-2.48,2.48])box(footings,'Footing','#9b9d92',[x,.30,z],[.38,.6,.38]);
    const posts=stage(4);for(const x of [-2.65,2.65])for(const z of [-2.45,2.45])box(posts,'TimberPost','#927455',[x,1.55,z],[.16,2.7,.16]);
    const beams=stage(6);for(const x of [-2.65,2.65])box(beams,'RoofBeam','#927455',[x,2.83,0],[.18,.20,5.1]);for(const z of [-2.45,2.45])box(beams,'RoofBeam','#927455',[0,2.83,z],[5.5,.20,.18]);
    const walls=stage(7),wallMeshes=[];
    const wall=(name,pos,size)=>{const mesh=box(walls,name,'#e2d7b5',pos,size);wallMeshes.push(mesh);};
    wall('BackWall',[0,1.51,-2.5],[5.5,2.6,.16]);
    for(const x of [-2.7,2.7]){
      wall('SideWallLower',[x,.67,0],[.16,.9,5]);wall('SideWallTop',[x,2.56,0],[.16,.5,5]);
      for(const z of [-1.8,1.8])wall('SideWindowPier',[x,1.73,z],[.16,1.22,1.4]);
      box(walls,'WindowSill','#526c63',[x,1.14,0],[.24,.08,2.25]);
    }
    const front=stage(9),frontMeshes=[];
    for(const x of [-1.68,1.68])frontMeshes.push(box(front,'FrontWall','#e2d7b5',[x,1.51,2.5],[2.14,2.6,.16]));
    frontMeshes.push(box(front,'DoorLintel','#e2d7b5',[0,2.57,2.5],[1.22,.48,.16]));
    for(const x of [-.65,.65])box(front,'DoorFrame','#526c63',[x,1.32,2.59],[.10,2.2,.14]);
    box(front,'DoorFrameTop','#526c63',[0,2.43,2.59],[1.4,.11,.14]);
    const roof=stage(10),roofMeshes=[];
    const gableShape=new THREE.Shape();gableShape.moveTo(-2.75,2.8);gableShape.lineTo(0,3.7);gableShape.lineTo(2.75,2.8);gableShape.closePath();
    const gableGeometry=new THREE.ExtrudeGeometry(gableShape,{depth:.16,bevelEnabled:false});geometries.add(gableGeometry);
    for(const z of [-2.5,2.5]){const panel=new THREE.Mesh(gableGeometry,material('#e2d7b5'));panel.name='GableWall';panel.position.z=z-.08;panel.castShadow=panel.receiveShadow=true;roof.add(panel);roofMeshes.push(panel);}
    for(const side of [-1,1]){const mesh=box(roof,'RoofSlope','#785b50',[side*1.43,3.27,0],[3.12,.16,5.8]);mesh.rotation.z=-side*.30;roofMeshes.push(mesh);}
    const finish=stage(12);box(finish,'Ridge','#53685f',[0,3.74,0],[.18,.18,5.85]);box(finish,'FrontStep','#b5b5a1',[0,.09,2.95],[1.8,.18,.7]);
    const depot=group(root,'ConstructionDepot_'+project.id,[project.depot.x,0,project.depot.z]);box(depot,'Pallet','#97714d',[0,.10,0],[1.8,.2,1.5]);
    for(let i=0;i<4;i++){const crate=kit(depot,'DepotKit');crate.position.set((i%2-.5)*.76,.20,Math.floor(i/2)*.57-.29);}
    box(depot,'DepotPost','#526e64',[-1,1,0],[.1,2,.1]);box(depot,'DepotBoard','#d2a65b',[-1,1.83,0],[.85,.48,.08]);
    const stock=group(site,'DeliveredMaterials',[2.95,0,2.65]),stockKits=[];for(let i=0;i<4;i++){const crate=kit(stock,'DeliveredKit');crate.position.set(0,Math.floor(i/2)*.5,(i%2-.5)*.5);stockKits.push(crate);}
    const work=group(root,'AssemblyPoint_'+project.id,[project.workPoint.x,0,project.workPoint.z]);
    const ringGeometry=new THREE.RingGeometry(.62,.72,32);geometries.add(ringGeometry);const ring=new THREE.Mesh(ringGeometry,material('#d7b75b'));ring.rotation.x=-Math.PI/2;ring.position.y=.045;work.add(ring);
    const tool=group(work,'AssemblyTool',[0,.75,0]);box(tool,'Handle','#ac855c',[0,0,0],[.07,.65,.07]);box(tool,'HammerHead','#5d6a67',[.07,.32,0],[.40,.17,.19]);tool.visible=false;
    return {id:project.id,site,depot,work,tool,stages,wallMeshes,frontMeshes,roofMeshes,stockKits,project};
  }
  function applySnapshot(snapshot){
    if(disposed)return;const rows=Array.isArray(snapshot?.projects)?snapshot.projects:[];const wanted=new Set(rows.map(p=>p.id));
    for(const [id,entry] of projects)if(!wanted.has(id)){entry.site.removeFromParent();entry.depot.removeFromParent();entry.work.removeFromParent();projects.delete(id);}
    colliders.length=occluders.length=surfaces.length=0;
    for(const project of rows){
      if(!project?.position||!project?.depot||!project?.workPoint)continue;
      let entry=projects.get(project.id);if(!entry){entry=build(project);projects.set(project.id,entry);}entry.project=project;
      const active=['active','paused','completed'].includes(project.status),installed=Math.max(0,Math.min(12,Number(project.installed)||0));
      entry.site.visible=entry.work.visible=active;entry.depot.visible=active&&project.status!=='completed';
      for(const stage of entry.stages)stage.visible=installed>=stage.userData.installThreshold&&(stage.userData.installThreshold!==0||project.status!=='completed');
      const remaining=Math.max(0,(Number(project.delivered)||0)-installed);entry.stockKits.forEach((crate,i)=>crate.visible=i<Math.min(4,remaining));
      if(!active)continue;const {x,z}=project.position;
      if(entry.depot.visible)colliders.push({minX:project.depot.x-.9,maxX:project.depot.x+.9,minZ:project.depot.z-.75,maxZ:project.depot.z+.75,maxY:.8});
      if(installed>=1)surfaces.push({minX:x-2.8,maxX:x+2.8,minZ:z-2.6,maxZ:z+2.6,y:.235});
      if(installed>=4&&installed<7)for(const dx of [-2.65,2.65])for(const dz of [-2.45,2.45])colliders.push({x:x+dx,z:z+dz,radius:.09,maxY:2.9});
      if(installed>=7){occluders.push(...entry.wallMeshes);colliders.push({minX:x-2.8,maxX:x-2.6,minZ:z-2.6,maxZ:z+2.6,maxY:2.9},{minX:x+2.6,maxX:x+2.8,minZ:z-2.6,maxZ:z+2.6,maxY:2.9},{minX:x-2.8,maxX:x+2.8,minZ:z-2.6,maxZ:z-2.4,maxY:2.9});}
      if(installed>=9){occluders.push(...entry.frontMeshes);for(const side of [-1,1])colliders.push({minX:x+(side<0?-2.8:.62),maxX:x+(side<0?-.62:2.8),minZ:z+2.4,maxZ:z+2.6,maxY:2.9});}
      if(installed>=10)occluders.push(...entry.roofMeshes);
      if(installed>=12)surfaces.push({minX:x-.9,maxX:x+.9,minZ:z+2.6,maxZ:z+3.3,y:.195});
    }
  }
  function tick({position,yaw=0,carryingProjectId,installing=false,now=0}={}){
    if(disposed)return;carried.visible=!!carryingProjectId&&!!position;
    if(carried.visible){carried.position.set(position.x+Math.sin(yaw)*.48,(position.y||0)+.68,position.z+Math.cos(yaw)*.48);carried.rotation.y=yaw;}
    for(const entry of projects.values()){entry.work.visible=entry.site.visible&&(entry.project.status!=='completed'||carryingProjectId===entry.id);entry.tool.visible=installing&&entry.project.status==='active';if(entry.tool.visible)entry.tool.rotation.z=Math.sin(now*.014)*.35;}
  }
  function dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const geometry of geometries)geometry.dispose();for(const material of materials.values())material.dispose();projects.clear();colliders.length=occluders.length=surfaces.length=0;}
  return {root,colliders,occluders,surfaces,applySnapshot,tick,dispose};
}
