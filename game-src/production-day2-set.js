import * as THREE from 'three';
import {day2Geometry,smooth01,resolveDay2Prop} from './production-day2-geometry.js';
import {buildRepublicSquare} from './republic-civic-center.js';
import {buildDay2Buildings} from './production-day2-buildings.js';

export const DAY2_ANCHORS=Object.freeze({
  stage:[-5,.6,-1],microphone:[-5,2.05,.11],stairsLow:[-1.3,0,-.3],stairsHigh:[-2.7,.6,-.3],
  stageTable:[-6.5,.6,-.5],ceremonyTable:[-1.45,0,-3.5],boardStand:[-3.25,.6,-1.7],
  koplak:[4,0,-7],koplakEntrance:[2.7,.24,-4.4],sppg:[-7,0,-9],sppgEntrance:[-5.4,.24,-5.9],
  sppgDelivery:[-3.45,.24,-5.9],ceremony:[0,0,-3],excavator:[9.2,0,-6.9],
});

/**
 * Absolute-time construction set. Resource ownership belongs to the caller.
 * shot.buildProgress: 0..8 or [from,to], never scale a completed building.
 * shot.props: board(carried/handover/stand), table(stage/moving/ceremony),
 * folder(open/closed), ribbon(hidden/ready/cut), scissors(tray/hand),
 * excavator(parked/digging), suitcase(hand/ground), phone(recording/down),
 * plan(held/table). Each value can also be {from,to,at,until}, with shot fractions.
 */
export function createDay2Set({owned,geometries,materials,textures}){
  const root=new THREE.Group();root.name='Day2ConstructionSet';owned.add(root);
  const occluders=[],g=day2Geometry({geometries,materials,textures,occluders});
  const {group,box,ball,cylinder,beam,sign,phase}=g;
  const groundShape=new THREE.Shape();groundShape.moveTo(-35,-30);groundShape.lineTo(35,-30);groundShape.lineTo(35,30);groundShape.lineTo(-35,30);groundShape.closePath();
  for(const [x,z,w,d] of [[4,-7,9.36,5.36],[-7,-9,9.36,6.36]]){
    const hole=new THREE.Path();hole.moveTo(x-w/2,-z-d/2);hole.lineTo(x-w/2,-z+d/2);hole.lineTo(x+w/2,-z+d/2);hole.lineTo(x+w/2,-z-d/2);hole.closePath();groundShape.holes.push(hole);
  }
  const ground=g.mesh(root,'Day2GroundWithExcavationOpenings',new THREE.ShapeGeometry(groundShape),g.material('#899775'));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
  const {stage,microphone,chair}=buildRepublicSquare(g,root);
  const buildings=buildDay2Buildings(g,root);
  const worksite=group(root,'Day2WorksiteSupplies');phase(worksite,1,7.65);
  for(const [x,z] of [[8.7,-3.1],[-11.8,-5.1]]){
    for(let row=0;row<4;row++)for(let col=0;col<5;col++)box(worksite,'StackedMasonry','#b78b63',[x+(col-2)*.24,row*.14+.07,z],[.22,.12,.35]);
    for(let i=0;i<4;i++)box(worksite,'CementSack','#bdc1ac',[x+.8,.08+i*.14,z],[.42,.14,.3]);
  }
  for(const x of [-11.9,8.9]){
    const scaffold=group(worksite,'Day2Scaffold',[x,0,-7.7]);phase(scaffold,3.4,6.5);
    for(const sx of [-.65,.65])for(const sz of [-.42,.42])beam(scaffold,'ScaffoldUpright','#717c7d',[sx,0,sz],[sx,3.0,sz],.027);
    for(const y of [.3,1.5,2.8]){box(scaffold,'ScaffoldPlank','#b79872',[0,y,0],[1.6,.055,1]);for(const sz of [-.42,.42])beam(scaffold,'ScaffoldCrossbrace','#7c8789',[-.65,y,sz],[.65,Math.min(3,y+1.2),sz],.018);}
  }
  const barriers=group(root,'Day2SafetyBoundary');phase(barriers,1,7.8);
  for(const x of [-11,-8,-5,1,4,7]){const cone=group(barriers,'SafetyCone',[x,0,-3.1]);box(cone,'ConeBase','#343b3d',[0,.035,0],[.32,.07,.32]);g.mesh(cone,'ConeOrange',g.geometry('cone',()=>new THREE.ConeGeometry(.13,.4,12)),g.material('#ea7c2b'),[0,.26,0]);cylinder(cone,'ConeReflector','#f5e5ca',[0,.28,0],.078,.055);}
  beam(barriers,'SafetyTape','#e2b83b',[-11,.52,-3.1],[-4,.52,-3.1],.014);beam(barriers,'SafetyTape','#e2b83b',[1,.52,-3.1],[8,.52,-3.1],.014);
  const shovel=group(worksite,'ConstructionShovel',[8.4,0,-3.6]);beam(shovel,'ShovelShaft','#9e8059',[0,.2,0],[.17,1.2,0],.022);const blade=box(shovel,'ShovelBlade','#7b898b',[0,.17,0],[.21,.3,.035]);blade.rotation.z=-.15;
  const measuring=group(root,'Day2SurveyMeasure');phase(measuring,1,3.1);cylinder(measuring,'TapeMeasureReel','#e3b94b',[6.3,.08,-4.45],.09,.08);beam(measuring,'SurveyTape','#ead884',[-.4,.045,-4.45],[6.3,.045,-4.45],.012);
  const excavator=buildExcavator(g,root);
  // Donation board, stand and the table persist after the transfer.
  const stand=group(root,'Day2DonationBoardStand',DAY2_ANCHORS.boardStand);
  for(const x of [-.6,.6]){beam(stand,'BoardStandLeg','#67523d',[x,0,-.22],[x,1.4,0],.03);beam(stand,'BoardStandBrace','#67523d',[x,0,.4],[x,1.05,0],.025);}box(stand,'BoardStandShelf','#8b6d49',[0,1.02,.045],[1.6,.07,.15]);
  const board=group(root,'Day2DonationBoard');sign(board,'SymbolicDonation',['SUMBANGAN PEMBANGUNAN REPUBLIK','5 T','climenzo_jr'],[0,0,0],[1.7,.72],{background:'#f5e4bd',color:'#244b53',font:74});board.userData.storyDonation='symbolic';
  const table=group(root,'Day2MovingTable');box(table,'TableTop','#866647',[0,.8,0],[1.25,.075,.65]);for(const x of [-.52,.52])for(const z of [-.24,.24])box(table,'TableLeg','#67543d',[x,.4,z],[.055,.8,.055]);
  const folder=makeFolder(g,root,'Day2CitizenProposalFolder','USULAN WARGA','#8c3b43');
  const school=makeFolder(g,root,'Day2SchoolFolder','SEKOLAH','#397886');
  const plan=makeFolder(g,root,'Day2ContractorPlan','DENAH KOPLAK + SPPG','#326283');
  const planCopy=makeFolder(g,table,'Day2PresidentPlanCopy','DENAH KOPLAK + SPPG','#326283');planCopy.root.position.set(.3,.85,0);planCopy.root.rotation.x=-Math.PI/2;
  const tray=group(table,'Day2ScissorsTray',[-.35,.855,0]);box(tray,'CeremonyTray','#adb3a8',[0,0,0],[.35,.025,.25],{metalness:.55,roughness:.3});
  const scissors=makeScissors(g,root),ribbon=makeRibbon(g,root);
  const suitcase=group(root,'Day2AuliaSuitcase');box(suitcase,'SuitcaseBody','#a65b61',[0,0,0],[.34,.47,.18]);for(const x of [-.11,.11]){cylinder(suitcase,'SuitcaseWheel','#303b3d',[x,-.25,0],.035,.035).rotation.z=Math.PI/2;beam(suitcase,'SuitcaseHandleRail','#b6bdba',[x,.24,0],[x,.42,0],.01);}beam(suitcase,'SuitcaseHandle','#303b3d',[-.11,.42,0],[.11,.42,0],.018);for(const x of [-.1,0,.1])box(suitcase,'SuitcaseRib','#ba7377',[x,0,.095],[.015,.38,.01]);
  const phone=group(root,'Day2SheazaPhone');box(phone,'PhoneCase','#202c36',[0,0,0],[.08,.16,.014]);box(phone,'PhoneScreen','#397380',[0,0,.009],[.069,.14,.004]);ball(phone,'PhoneLens','#0c1215',[.025,.057,-.009],[.012,.012,.004]);
  const tool=group(root,'Day2XelHammer');beam(tool,'HammerHandle','#9d754d',[0,-.18,0],[0,.14,0],.018);box(tool,'HammerHead','#697d82',[0,.14,0],[.16,.055,.055]);
  const roller=group(root,'Day2PaintRoller');beam(roller,'RollerHandle','#ba9259',[0,-.2,0],[0,.16,0],.017);beam(roller,'RollerMetalArm','#a8b8b5',[0,.16,0],[.08,.23,0],.008);const rollerHead=cylinder(roller,'WhitePaintRoller','#ecefe3',[0,.26,0],.037,.23);rollerHead.rotation.z=Math.PI/2;
  const paintPail=group(root,'Day2PaintPail',[7.9,0,-4.05]);phase(paintPail,5,7.4);cylinder(paintPail,'PaintPail','#d1d6ce',[0,.17,0],.16,.34);cylinder(paintPail,'PaintSurface','#eeeede',[0,.344,0],.14,.015);beam(paintPail,'PailHandle','#6d7b7d',[-.15,.25,0],[0,.43,0],.009);beam(paintPail,'PailHandle','#6d7b7d',[0,.43,0],[.15,.25,0],.009);
  const v=new THREE.Vector3(),q=new THREE.Quaternion(),temp=new THREE.Vector3();
  function actorPoint(actors,id,hand='handR',offset=[0,0,0]){
    const actor=actors?.get?.(id)||actors?.[id];if(!actor?.figure)return null;
    actor.figure.updateMatrixWorld(true);const grip=actor.figure.userData.getGrip?.(hand);
    if(grip){grip.updateWorldMatrix(true,false);grip.getWorldPosition(v);grip.getWorldQuaternion(q);}else{actor.figure.getWorldPosition(v);v.y+=1.05;actor.figure.getWorldQuaternion(q);}
    v.add(temp.fromArray(offset).applyQuaternion(q));return {position:v.clone(),quaternion:q.clone(),actor};
  }
  function hold(object,actors,id,hand,offset=[0,0,0],rotation=[0,0,0]){
    const point=actorPoint(actors,id,hand,offset);object.visible=!!point&&point.actor.figure.visible;if(!point)return;
    object.position.copy(point.position);object.quaternion.copy(point.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)));
  }
  function boardPose(state,actors){
    if(state==='stand')return {position:new THREE.Vector3(-3.25,1.97,-1.64),quaternion:new THREE.Quaternion()};
    const donor=actorPoint(actors,'climenzo','handL',[0,0,.06]),president=state==='handover'?actorPoint(actors,'pasca','handR',[0,0,.06]):null;
    if(donor){const p=donor.position.clone();if(president)p.lerp(president.position,.5);p.z+=.23;return {position:p,quaternion:new THREE.Quaternion()};}
    return {position:new THREE.Vector3(-3.4,1.55,.1),quaternion:new THREE.Quaternion()};
  }
  const staged=[],cutaways=[];root.traverse(o=>{if(Number.isFinite(o.userData.buildFrom))staged.push(o);if(o.userData.cutawayFor)cutaways.push(o);});
  function pose(sample,time=0,actors=new Map()){
    const shot=sample?.shot||{},elapsed=sample?.elapsed||0,u=Math.max(0,Math.min(1,elapsed/(shot.duration||1))),p=shot.props||{},number=Number(String(shot.id||'').match(/\d+/)?.[0]||0);
    let progress=shot.buildProgress??(number<15?0:number===15?1:number===16?2:number===17?3:number===18?4:number===19?5:number===20?6:number===21?7:8);
    if(Array.isArray(progress))progress=progress[0]+(progress[1]-progress[0])*smooth01(u);progress=Math.max(0,Math.min(8,Number(progress)||0));
    root.userData.buildProgress=progress;for(const item of cutaways)item.visible=true;for(const item of staged)item.visible=progress>=item.userData.buildFrom&&progress<item.userData.buildUntil;for(const item of cutaways)if(item.userData.cutawayFor===shot.interior)item.visible=false;
    const state=(key,fallback)=>resolveDay2Prop(p[key],fallback,u),chosen=s=>s.mix<.5?s.from:s.to;
    const boardState=state('board',number<9?'carried':number<=10?'handover':'stand'),bp0=boardPose(boardState.from,actors),bp1=boardPose(boardState.to,actors);
    board.position.lerpVectors(bp0.position,bp1.position,boardState.mix);board.quaternion.slerpQuaternions(bp0.quaternion,bp1.quaternion,boardState.mix);board.visible=chosen(boardState)==='stand'||!!sample?.actors?.climenzo?.visible;stand.visible=chosen(boardState)==='stand';
    const ts=state('table',number<22?'stage':number===22?'moving':'ceremony');
    const tablePoint=key=>new THREE.Vector3(...(key==='ceremony'?DAY2_ANCHORS.ceremonyTable:DAY2_ANCHORS.stageTable));
    if(chosen(ts)==='moving'){
      const carrier=actors.get?.('kasir');
      if(carrier){carrier.figure.getWorldPosition(table.position);table.position.y=Math.max(0,table.position.y);table.position.z+=.45;}
      else{const range=Array.isArray(p.tableProgress)?p.tableProgress:[0,1],fraction=range[0]+(range[1]-range[0])*smooth01(u);table.position.lerpVectors(tablePoint('stage'),tablePoint('ceremony'),fraction);}
    }else table.position.lerpVectors(tablePoint(ts.from),tablePoint(ts.to),ts.mix);
    table.rotation.set(0,0,0);table.updateMatrixWorld(true);
    const fs=state('folder',number<11||number>=28?'open':'closed');folder.root.position.copy(table.localToWorld(new THREE.Vector3(-.12,.858,.05)));folder.root.rotation.set(-Math.PI/2,0,0);folder.cover.rotation.y=-2.65*((fs.from==='open'?1:0)*(1-fs.mix)+(fs.to==='open'?1:0)*fs.mix);
    hold(school.root,actors,'eqa','handL',[0,-.025,.035],[0,0,.12]);school.cover.rotation.y=-.18;
    const planState=chosen(state('plan',number>=14&&number<=17?'held':'table'));hold(plan.root,actors,'xel','handL',[0,0,.045],[0,0,.1]);plan.root.visible=plan.root.visible&&planState==='held';plan.cover.rotation.y=-2.65;
    planCopy.root.visible=planState==='table';planCopy.cover.rotation.y=-1.9;
    const sc=state('scissors',number>=23&&number<28?'hand':'tray'),scissorsHand=chosen(sc)==='hand';
    if(scissorsHand)hold(scissors.root,actors,'pasca','handR',[0,-.01,.035],[Math.PI/2,0,0]);else{scissors.root.visible=true;scissors.root.position.copy(table.localToWorld(new THREE.Vector3(-.35,.9,0)));scissors.root.rotation.set(-Math.PI/2,0,.2);}
    const rs=state('ribbon',number<22?'hidden':number===22||number===23?'ready':'cut'),cut=(rs.from==='cut'?1:0)*(1-rs.mix)+(rs.to==='cut'?1:0)*rs.mix;
    ribbon.root.visible=chosen(rs)!=='hidden';ribbon.left.rotation.z=-.7*cut;ribbon.right.rotation.z=.7*cut;ribbon.left.position.y=ribbon.right.position.y=1-.3*cut;scissors.left.rotation.z=.24*(1-cut);scissors.right.rotation.z=-.24*(1-cut);
    const suitcaseState=chosen(state('suitcase',number<=3?'hand':'ground'));
    if(suitcaseState==='hand')hold(suitcase,actors,'aulia','handR',[0,-.42,0]);else{const actor=actors.get?.('aulia');suitcase.visible=!!actor?.figure.visible;if(actor){actor.figure.getWorldPosition(suitcase.position);suitcase.position.x+=.4;suitcase.position.y+=.27;suitcase.quaternion.identity();}}
    const phoneState=chosen(state('phone','recording'));hold(phone,actors,'sheaza','handR',[0,phoneState==='recording'?.035:-.02,.04],[0,0,0]);
    hold(tool,actors,'xel','handR',[0,-.035,0]);tool.visible=tool.visible&&progress>=3.1&&progress<5;hold(roller,actors,'xel','handR',[0,-.035,0]);roller.visible=roller.visible&&progress>=5&&progress<6.15;
    const machine=chosen(state('excavator',number===16?'digging':'parked'));excavator.pose(machine,elapsed,actors);
    root.updateMatrixWorld(true);
  }
  pose(null,0);
  return {root,buildings,occluders,anchors:DAY2_ANCHORS,excavator,props:{board,stand,table,folder:folder.root,school:school.root,plan:plan.root,scissors:scissors.root,ribbon:ribbon.root,suitcase,phone},pose};
}

function makeFolder(g,parent,name,label,color){
  const root=g.group(parent,name),cover=g.group(root,name+'Cover',[-.21,0,0]);
  g.box(root,name+'Paper','#f2f1e3',[0,0,.005],[.405,.28,.018]);g.sign(cover,name+'Title',[label],[.21,0,.026],[.43,.3],{background:color,color:'#ffffff'});
  if(label.startsWith('DENAH')){
    for(const [x,w] of [[-.105,.15],[.09,.16]]){g.box(root,'PlanFootprint','#456a83',[x,0,.019],[w,.16,.002]);g.box(root,'PlanRoom','#edf0e4',[x,0,.022],[w-.018,.14,.002]);}
  }
  return {root,cover};
}

function makeScissors(g,parent){
  const root=g.group(parent,'Day2CeremonyScissors'),left=g.group(root,'ScissorsBladeL'),right=g.group(root,'ScissorsBladeR');
  for(const [part,side] of [[left,-1],[right,1]]){
    const blade=g.box(part,'ScissorSteelBlade','#c5cecd',[0,.095,.004*side],[.018,.22,.008],{metalness:.8,roughness:.2});blade.rotation.z=side*.05;
    const ring=g.mesh(part,'ScissorHandle',g.geometry('scissorRing',()=>new THREE.TorusGeometry(.038,.008,6,16)),g.material('#a68438'),[0,-.075,0]);ring.scale.y=1.25;
  }
  g.ball(root,'ScissorPivot','#b2b8b2',[0,0,.012],[.012,.012,.008]);return {root,left,right};
}

function makeRibbon(g,parent){
  const root=g.group(parent,'Day2InaugurationRibbon',[0,0,-3]);
  for(const x of [-1.6,1.6]){g.cylinder(root,'RibbonStanchion','#a88c4d',[x,.53,0],.028,1.06);g.cylinder(root,'RibbonStandBase','#788588',[x,.035,0],.13,.07);g.ball(root,'RibbonFinial','#d9b65d',[x,1.08,0],[.052,.052,.052]);}
  const left=g.group(root,'RibbonLeft',[-1.6,1,0]),right=g.group(root,'RibbonRight',[1.6,1,0]);
  g.box(left,'RibbonRedLeft','#c63441',[.8,0,0],[1.6,.095,.014]);g.box(right,'RibbonRedRight','#c63441',[-.8,0,0],[1.6,.095,.014]);return {root,left,right};
}

function buildExcavator(g,parent){
  const {group,box,cylinder,beam,ball}=g,root=group(parent,'Day2Excavator',DAY2_ANCHORS.excavator);root.rotation.y=-Math.PI/2;
  const trackWheels=[];
  for(const side of [-1,1]){
    const track=group(root,'ExcavatorTrack',[side*.88,.37,0]);box(track,'RubberTrackBelt','#2a3233',[0,0,0],[.45,.52,2.6]);
    for(let i=0;i<5;i++){const wheel=cylinder(track,'TrackRoadWheel','#5c6562',[0,0,-1.04+i*.52],.24,.48);wheel.rotation.z=Math.PI/2;trackWheels.push(wheel);}
    for(let i=0;i<15;i++)for(const y of [-.285,.285])box(track,'TrackTread','#45504e',[0,y,-1.2+i*.17],[.49,.045,.11]);
  }
  box(root,'ExcavatorUndercarriage','#53605a',[0,.63,0],[1.65,.26,2]);cylinder(root,'ExcavatorSlewBearing','#434e4b',[0,.82,0],.62,.18);
  const turret=group(root,'ExcavatorTurret',[0,.91,0]);box(turret,'ExcavatorYellowHousing','#e9ad25',[.28,.28,-.2],[1.64,.55,1.9]);box(turret,'ExcavatorRearCounterweight','#d79a20',[.25,.37,-1.06],[1.75,.6,.45]);
  for(let i=0;i<7;i++)box(turret,'EngineVent','#4e5550',[1.11,.35,-.9+i*.12],[.018,.27,.055]);
  const cabin=group(turret,'ExcavatorCabin',[-.57,0,.05]);box(cabin,'CabinFloor','#505b57',[0,.18,0],[.89,.15,1.1]);box(cabin,'CabinRoof','#edb629',[0,1.69,0],[1.02,.105,1.25]);
  for(const x of [-.43,.43])for(const z of [-.53,.53])box(cabin,'CabinFrame','#34454b',[x,.95,z],[.055,1.42,.055]);
  for(const z of [-.54,.54])box(cabin,'CabinWindow','#8fb5ba',[0,1.07,z],[.81,1.13,.016],{transparent:true,opacity:.22,roughness:.15,depthWrite:false});
  box(cabin,'OperatorSeat','#374747',[0,.75,-.05],[.46,.13,.43]);box(cabin,'OperatorSeatBack','#374747',[0,1.04,-.25],[.46,.55,.10]);
  for(const x of [-.28,.28]){box(cabin,'ControlConsole','#4f6267',[x,.79,.22],[.14,.36,.26]);beam(cabin,'ControlJoystick','#202c31',[x,.98,.25],[x,1.16,.18],.016);}
  const operatorAnchor=group(cabin,'OperatorRootAnchor',[0,.255,-.08]);
  const boom=group(turret,'ExcavatorBoomPivot',[.48,.55,.48]);
  beam(boom,'ExcavatorMainBoom','#e7ac23',[0,0,0],[0,1.65,1.25],.16);beam(boom,'BoomHydraulic','#6d7776',[.12,.08,.12],[.12,1.16,1.1],.052);beam(boom,'BoomPiston','#bcc7c8',[.12,1.1,1.05],[.12,1.55,1.2],.031);
  const arm=group(boom,'ExcavatorStickPivot',[0,1.65,1.25]);beam(arm,'ExcavatorStick','#dfa021',[0,0,0],[0,-1.58,1.05],.12);beam(arm,'StickHydraulic','#747f7c',[-.1,-.08,.07],[-.1,-1.22,.85],.045);
  const bucket=group(arm,'ExcavatorBucketPivot',[0,-1.58,1.05]);box(bucket,'BucketBack','#56605a',[0,-.10,.11],[.72,.44,.10]);box(bucket,'BucketFloor','#59655f',[0,-.32,.35],[.72,.08,.6]);for(const x of [-.35,.35])box(bucket,'BucketSide','#65716a',[x,-.13,.35],[.055,.4,.6]);for(let i=0;i<5;i++)box(bucket,'BucketTooth','#919b87',[-.29+i*.145,-.32,.72],[.07,.07,.20]);
  const load=ball(bucket,'BucketSoilLoad','#8b714f',[0,-.1,.36],[.28,.19,.27]);
  const soil=group(parent,'ExcavatorVisibleSpoilPile',[9.05,0,-3.9]);for(let i=0;i<6;i++)ball(soil,'ExcavatedSoil','#8c7451',[Math.sin(i*2.4)*.48,.18+(i%2)*.08,Math.cos(i*2.4)*.4],[.53,.28,.5]);
  g.phase(soil,1.28,7.8);
  const falling=[];for(let i=0;i<8;i++)falling.push(ball(parent,'FallingBucketSoil','#8e7657',[0,0,0],[.045,.04,.05]));
  const world=new THREE.Vector3();
  function pose(mode,time,actors){
    const active=mode==='digging',cycle=((time%5)+5)%5/5;
    // Dig, lift, slew, release, return: each movement is derived from time.
    const lift=smooth01((cycle-.17)/.24)-smooth01((cycle-.79)/.21),slew=smooth01((cycle-.4)/.16)-smooth01((cycle-.77)/.2);
    turret.rotation.y=active?1.5*slew:0;boom.rotation.x=active?.59-.64*lift:.04;arm.rotation.x=active?-.22+.38*lift:.15;bucket.rotation.x=active?-.15-.75*smooth01((cycle-.61)/.09)+.75*smooth01((cycle-.76)/.16):-.35;
    load.visible=active&&cycle>.16&&cycle<.68;
    root.updateMatrixWorld(true);bucket.localToWorld(world.set(0,-.28,.64));
    falling.forEach((clod,i)=>{const drop=(cycle-.64)*6+i*.025;clod.visible=active&&cycle>.64&&cycle<.79;clod.position.set(world.x+Math.sin(i*2.4)*.16,Math.max(.09,world.y-drop*drop*1.8),world.z+Math.cos(i*2.4)*.14);});
    const operator=actors?.get?.('ardhy');if(active&&operator?.figure){operatorAnchor.getWorldPosition(operator.figure.position);operator.figure.rotation.y=root.rotation.y+turret.rotation.y;operator.figure.updateMatrixWorld(true);}
  }
  return {root,turret,boom,arm,bucket,operatorAnchor,pose};
}
