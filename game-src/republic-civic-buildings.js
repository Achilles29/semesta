import {addRepublicBGNEmblem,BGN_PALETTE} from './republic-building-identity.js';

/** Distinct architecture adapted from the inspected Pacul / Tanuharjo references.
 * Dimensions are metres. Facades face +Z. Construction is assembled by component;
 * no whole-building scaling is used at any time.
 */
export function buildRepublicCivicBuildings(g,parent){
  const {group,box,beam,sign,triangle,phase,cylinder}=g;
  const buildings=[];
  for(const spec of [{id:'koplak',center:[4,0,-7],width:9,depth:5},{id:'sppg',center:[-7,0,-9],width:9,depth:6}]){
    const {id,width:w,depth:d}=spec,root=group(parent,'Day2Building_'+id,spec.center),h=id==='koplak'?3.15:3.1;
    root.userData.building=id;root.userData.footprint=[w,d];buildings.push(root);
    const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
    // Surface closures disappear for excavation; trench bottoms stay below grade.
    if(id==='koplak'){
      // A service-zone strip footing also gives the bucket a real open trench.
      box(root,id+'_site_soil_left','#a28c6d',[-1.385,-.045,0],[5.87,.08,d-.36]);
      box(root,id+'_site_soil_right','#a28c6d',[3.285,-.045,0],[2.07,.08,d-.36]);
      phase(box(root,'Koplak_internal_ground','#a28c6d',[1.9,-.035,0],[.7,.07,d]),0,1.01);
      phase(box(root,'Koplak_internal_trench','#614e39',[1.9,-.245,0],[.7,.045,d]),1.01,3.1);
      for(const x of [1.55,2.25])phase(box(root,'Koplak_internal_trench_side','#8c7355',[x,-.12,0],[.025,.25,d]),1.01,3.1);
      phase(box(root,'Koplak_internal_footing','#8b8d86',[1.9,.035,0],[.48,.38,d]),2.9);
      for(const x of [1.76,2.04])phase(beam(root,'Koplak_internal_rebar','#534f47',[x,.25,-d/2],[x,.25,d/2],.012),2.5,4);
    }else box(root,id+'_site_soil','#a28c6d',[0,-.045,0],[w-.36,.08,d-.36]);
    for(let i=0;i<4;i++){
      const a=corners[i],b=corners[(i+1)%4],horizontal=a[1]===b[1],length=horizontal?w:d;
      const p=[(a[0]+b[0])/2,0,(a[1]+b[1])/2],size=horizontal?[length,.07,.36]:[.36,.07,length];
      phase(box(root,id+'_unbroken_ground_'+i,'#a28c6d',[p[0],-.035,p[2]],size),0,1.12+i*.16);
      phase(box(root,id+'_trench_floor_'+i,'#614e39',[p[0],-.245,p[2]],[size[0],.045,size[2]]),1.12+i*.16,3.1);
      for(const offset of [-.18,.18])phase(box(root,id+'_trench_side_'+i+'_'+offset,'#8c7355',[p[0]+(horizontal?0:offset),-.12,p[2]+(horizontal?offset:0)],horizontal?[length,.25,.025]:[.025,.25,length]),1.12+i*.16,3.1);
      phase(box(root,id+'_foundation_'+i,'#8b8d86',[p[0],.035,p[2]],horizontal?[length,.38,.34]:[.34,.38,length]),2.55+i*.11);
      for(const side of [-.10,.10])phase(beam(root,id+'_rebar_'+i+'_'+side,'#534f47',[a[0]+(horizontal?0:side),.25,a[1]+(horizontal?side:0)],[b[0]+(horizontal?0:side),.25,b[1]+(horizontal?side:0)],.012),2.2+i*.09,4);
      const stake=group(root,id+'_stake_'+i,[a[0],0,a[1]]);phase(stake,.16+i*.15,6);box(stake,'wood_stake','#c69d69',[0,.24,0],[.055,.48,.055]);
      phase(beam(root,id+'_survey_string_'+i,'#f0db7a',[a[0],.35,a[1]],[b[0],.35,b[1]],.009),.3+i*.13,3.8);
    }
    phase(box(root,id+'_floor_slab','#c9ccc8',[0,.16,0],[w,.16,d]),3.02);
    const walls=group(root,id+'_walls');
    const rects=[];
    // Side and rear walls remain whole surfaces, front openings are genuine gaps.
    rects.push({x:-w/2,z:0,w:.17,d,low:.24,high:h},{x:w/2,z:0,w:.17,d,low:.24,high:h},{x:0,z:-d/2,w,d:.17,low:.24,high:h});
    const openings=id==='koplak'?[{x:-3.25,w:1.7,low:.68,high:2.55},{x:-1.3,w:1.35,low:.24,high:2.55},{x:.7,w:1.75,low:.68,high:2.55}]:[{x:-2.9,w:1.2,low:1.25,high:2.22},{x:-.6,w:1.15,low:1.25,high:2.22},{x:1.6,w:1.45,low:.24,high:2.5},{x:3.55,w:1.05,low:.24,high:2.5}];
    let cursor=-w/2;
    for(const o of openings){
      const left=o.x-o.w/2,right=o.x+o.w/2;
      if(left>cursor)rects.push({x:(cursor+left)/2,z:d/2,w:left-cursor,d:.17,low:.24,high:h});
      if(o.low>.24)rects.push({x:o.x,z:d/2,w:o.w,d:.17,low:.24,high:o.low});
      rects.push({x:o.x,z:d/2,w:o.w,d:.17,low:o.high,high:h});cursor=right;
    }
    if(cursor<w/2)rects.push({x:(cursor+w/2)/2,z:d/2,w:w/2-cursor,d:.17,low:.24,high:h});
    rects.forEach((r,i)=>{
      const rows=Math.ceil((r.high-r.low)/.48);
      for(let j=0;j<rows;j++){
        const bottom=r.low+(r.high-r.low)*j/rows,top=r.low+(r.high-r.low)*(j+1)/rows;
        const brick=phase(box(walls,id+'_masonry_'+i+'_'+j,j%2?'#ac9c85':'#b6a58c',[r.x,(bottom+top)/2,r.z],[r.w,top-bottom-.012,r.d]),3.15+.7*(j+1)/rows+i*.001,5.12);if(r.z===d/2)brick.userData.cutawayFor=id;
      }
      const finish=phase(box(walls,id+'_finished_wall_'+i,id==='sppg'?BGN_PALETTE.sky:'#f3f2ec',[r.x,(r.low+r.high)/2,r.z],[r.w+.006,r.high-r.low,r.d+.012]),5.12);if(r.z===d/2)finish.userData.cutawayFor=id;
    });
    for(const x of [-w/2,0,w/2])for(const z of [-d/2,d/2])phase(box(root,id+'_column_'+x+'_'+z,'#a4a69d',[x,(h+.24)/2,z],[.22,h-.24,.22]),3.12);
    const frames=group(root,id+'_glazing_and_frames');phase(frames,5.35);frames.userData.cutawayFor=id;
    for(const o of openings){
      for(const x of [o.x-o.w/2,o.x+o.w/2])box(frames,id+'_opening_jamb','#fafbf6',[x,(o.low+o.high)/2,d/2+.03],[.055,o.high-o.low,.11]);
      for(const y of [o.low,o.high])box(frames,id+'_opening_rail','#fafbf6',[o.x,y,d/2+.03],[o.w,.055,.11]);
      if(o.low>.3){box(frames,id+'_window_glass','#6a969e',[o.x,(o.low+o.high)/2,d/2],[o.w-.07,o.high-o.low-.05,.025],{transparent:true,opacity:.48,roughness:.2,depthWrite:false});box(frames,id+'_window_mullion','#f2f3ed',[o.x,(o.low+o.high)/2,d/2+.03],[.04,o.high-o.low,.075]);}
      else {const leaf=group(frames,id+'_open_door',[o.x-o.w/2,o.low,d/2]);leaf.rotation.y=-.75;box(leaf,id+'_door_leaf','#e3e9e3',[o.w*.47,(o.high-o.low)/2,0],[o.w*.94,o.high-o.low,.055]);box(leaf,id+'_door_glass','#63888f',[o.w*.47,(o.high-o.low)*.62,.034],[o.w*.72,(o.high-o.low)*.54,.018],{transparent:true,opacity:.5,depthWrite:false});beam(leaf,id+'_door_handle','#59656a',[o.w*.83,.8,.09],[o.w*.83,1.03,.09],.014);}
    }
    const roof=group(root,id+'_roof');roof.userData.cutawayFor=id;
    if(id==='koplak'){
      for(let z=-d/2;z<=d/2+.01;z+=1)phase(beam(roof,'Koplak_roof_frame','#697378',[-4.6,3.5-z*.04,z],[4.6,3.5-z*.04,z],.035),4.12+(z+d/2)*.05);
      for(let i=0;i<9;i++){const panel=box(roof,'Koplak_metal_roof_panel_'+i,'#adb3b0',[-4+i,3.5,0],[1.03,.07,d+.4]);panel.rotation.x=-.04;phase(panel,4.58+i*.045);}
      phase(box(root,'Koplak_tall_fascia','#bd2537',[0,3.43,d/2+.06],[9.25,.49,.17]),5.3);
      phase(box(root,'Koplak_white_fascia_band','#fff9ee',[0,3.22,d/2+.16],[9.25,.08,.06]),5.3);
      phase(box(root,'Koplak_dark_ventilation','#29363c',[0,3.11,d/2+.105],[8.8,.19,.05]),5.3);
      for(let i=0;i<42;i++)phase(box(root,'Koplak_vent_louver','#667074',[-4.3+i*.21,3.11,d/2+.13],[.025,.18,.035]),5.3);
      const canopy=group(root,'Koplak_continuous_canopy');phase(canopy,5.52);box(canopy,'Koplak_canopy_roof','#b3b9b9',[-1.05,2.72,d/2+.62],[7.1,.1,1.36]);box(canopy,'Koplak_canopy_fascia','#bd2537',[-1.05,2.65,d/2+1.29],[7.15,.17,.055]);
      for(const x of [-4.35,-2.1,.15,2.4])beam(canopy,'Koplak_canopy_bracket','#7f8989',[x,2.16,d/2+.09],[x,2.68,d/2+1.12],.022);
      for(const x of [-2.22,-.42,1.68])phase(box(root,'Koplak_red_facade_pier','#b52c37',[x,1.48,d/2+.115],[.22,2.45,.06]),5.62);
      phase(sign(root,'Koplak_name',['KOPLAK DESA','GERAI WARGA'],[3.06,2.19,d/2+.12],[2.65,1.08],{background:'#bd2537',color:'#fff9ee',font:74}),5.8);
    }else{
      for(const z of [-3,-1.5,0,1.5,3]){
        phase(beam(roof,'SPPG_roof_tie','#8d9696',[-4.6,h,z],[4.6,h,z],.035),4.12+(z+3)*.04);
        for(const side of [-1,1])phase(beam(roof,'SPPG_gable_truss','#8b9697',[side*4.6,h,z],[0,4.47,z],.04),4.2+(z+3)*.04);
      }
      const slope=Math.atan2(1.37,4.6),length=Math.hypot(4.6,1.37);
      for(const side of [-1,1])for(let i=0;i<7;i++){const panel=box(roof,'SPPG_pitched_roof_'+side+'_'+i,'#456481',[side*2.3,3.785,-3.3+i*1.1],[length+.12,.075,1.13]);panel.rotation.z=-side*slope;phase(panel,4.58+i*.045);}
      for(const z of [-3.02,3.02])phase(triangle(root,'SPPG_front_gable',BGN_PALETTE.sky,[[-4.5,h,z],[4.5,h,z],[0,4.43,z]]),5);
      for(const side of [-1,1])phase(beam(root,'SPPG_blue_roof_edge',BGN_PALETTE.navy,[side*4.67,3.09,3.34],[0,4.48,3.34],.045),5.2);
      const canopy=group(root,'SPPG_white_front_canopy');phase(canopy,5.5);const slab=box(canopy,'SPPG_canopy_sheet','#648ca5',[.55,2.69,3.8],[8.05,.065,1.65]);slab.rotation.x=.035;
      for(const x of [-3.45,-.75,1.85,4.55]){box(canopy,'SPPG_canopy_post',BGN_PALETTE.navy,[x,1.37,4.57],[.065,2.74,.065]);beam(canopy,'SPPG_canopy_rafter','#f4f5ed',[x,2.7,3],[x,2.65,4.65],.027);}
      box(canopy,'SPPG_canopy_front_beam',BGN_PALETTE.navy,[.55,2.64,4.58],[8.1,.08,.07]);
      const identity=group(root,'SPPG_low_identity_sign',[-3.15,0,4.8]);phase(identity,5.8);box(identity,'SPPG_sign_plinth',BGN_PALETTE.navy,[0,.19,0],[2.45,.38,.4]);sign(identity,'SPPG_name',['SPPG','SATUAN PENGISI','PERUT GRATIS'],[0,.86,.05],[2.35,1.05],{background:'#eff8fa',color:BGN_PALETTE.navy,font:76});
      phase(addRepublicBGNEmblem(g,root,[0,3.64,3.13],.76),5.8);
      for(const x of [-4.51,4.51])phase(box(root,'SPPG_blue_side_plinth',BGN_PALETTE.navy,[x,.47,0],[.04,.46,6]),5.62);
      phase(box(root,'SPPG_blue_back_plinth',BGN_PALETTE.navy,[0,.47,-3.105],[9,.46,.04]),5.62);
      phase(box(root,'SPPG_blue_facade_left',BGN_PALETTE.navy,[-1.72,.47,3.105],[5.56,.46,.04]),5.62);
      for(let x=-4;x<=4;x+=.45)phase(box(root,'SPPG_facade_panel_seam','#d1d9d4',[x,2.8,3.105],[.012,.48,.008]),5.12);
    }
    const inside=group(root,id+'_interior');phase(inside,6.15);
    if(id==='koplak'){
      for(const [sx,sz] of [[-3.5,-1],[-.1,-1.7],[2.7,-1.7]]){
        const rack=group(inside,'Koplak_retail_shelf',[sx,.25,sz]);
        for(const x of [-.65,.65])box(rack,'Shelf_white_upright','#e9ece7',[x,.88,0],[.045,1.76,.42]);
        for(let row=0;row<4;row++){box(rack,'Shelf_white_level','#e4e8e3',[0,.2+row*.42,0],[1.35,.045,.44]);box(rack,'Shelf_red_lip','#c13039',[0,.225+row*.42,.23],[1.37,.055,.025]);for(let item=0;item<5;item++)box(rack,'Grocery_package','#d5b66f',[item*.23-.46,.33+row*.42,.01],[.16,.22,.18]);}
        sign(rack,'Sembako_category',['SEMBAKO'],[0,1.95,.1],[1.4,.27],{background:'#b72d37',color:'#ffffff'});
      }
      const counter=group(inside,'Koplak_checkout',[2,.24,1.25]);box(counter,'Checkout_red_front','#be303b',[0,.42,0],[1.8,.84,.67]);box(counter,'Checkout_gray_top','#555f61',[0,.87,0],[1.95,.075,.78]);box(counter,'Checkout_POS_foot','#252e34',[.45,.94,0],[.36,.04,.25]);box(counter,'Checkout_POS_arm','#293137',[.45,1.08,0],[.055,.25,.055]);const screen=box(counter,'Checkout_POS_screen','#1d2931',[.45,1.27,.02],[.44,.28,.035]);screen.rotation.x=-.18;sign(counter,'Checkout_label',['KASIR'],[-.4,.55,.35],[.7,.27],{background:'#be303b',color:'#ffffff'});
    }else{
      const stainless={metalness:.68,roughness:.27};
      for(const [x,z,w] of [[-2.5,-1.9,3.4],[1.4,-1.8,2.7],[0,.8,3.8]]){
        box(inside,'SPPG_stainless_worktop','#abb9bb',[x,1.08,z],[w,.065,.82],stainless);
        for(const dx of [-w/2+.1,w/2-.1])for(const dz of [-.32,.32])box(inside,'SPPG_worktop_leg','#95a4a8',[x+dx,.64,z+dz],[.055,.86,.055],stainless);
        box(inside,'SPPG_lower_shelf','#9aa8ad',[x,.43,z],[w-.1,.04,.72],stainless);
      }
      for(const x of [-3.5,-2.4,-1.3]){cylinder(inside,'SPPG_stove_burner','#353f43',[x,1.13,-1.9],.23,.06);cylinder(inside,'SPPG_cooking_pot','#aab7b7',[x,1.3,-1.9],.22,.30,stainless);}
      box(inside,'SPPG_long_extractor_hood','#aebbbe',[-2.45,2.25,-2.1],[3.9,.33,1],stainless);box(inside,'SPPG_exhaust_duct','#b7c1c0',[-2.45,2.82,-2.35],[.55,.8,.45],stainless);
      for(let i=0;i<10;i++)box(inside,'SPPG_hood_filter','#6f8187',[-4.08+i*.36,2.06,-1.77],[.27,.03,.52],stainless);
      for(let i=0;i<6;i++)box(inside,'SPPG_packing_tray','#d5ddda',[.5+(i%3)*.48,1.14, .65+Math.floor(i/3)*.33],[.42,.07,.27],stainless);
      for(let i=0;i<18;i++)box(inside,'SPPG_floor_drain','#6b7a7c',[-.12,.249,-2.7+i*.3],[.21,.01,.025]);
      sign(inside,'SPPG_preparation_label',['PERSIAPAN'],[-2.7,2.45,-2.88],[1.8,.3],{color:'#28566a'});sign(inside,'SPPG_packing_label',['PENGEMASAN'],[1.6,2.45,-2.88],[2.0,.3],{color:'#28566a'});
    }
    root.traverse(o=>{if(/canopy|fascia|ventilation|vent_louver|red_facade|front_gable|blue_roof_edge|blue_facade|name|facade_panel|identity_sign/i.test(o.name)&&!o.name.includes('medical'))o.userData.cutawayFor=id;if(o.name.startsWith(id+'_column_')&&o.position.z===d/2)o.userData.cutawayFor=id;});
    const apron=group(root,id+'_clean_front_apron');phase(apron,7.55);box(apron,id+'_apron','#bfc5be',[0,.025,d/2+.9],[w+.5,.05,1.8]);
  }
  return buildings;
}
