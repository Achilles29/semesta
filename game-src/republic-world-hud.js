/** Pixel regions shared by the outer map chrome and the live 3D HUD. */
export function worldHudLayout(width,height,{coarse=false}={}){
  const w=Math.max(320,width),h=Math.max(300,height),phone=w<620,landscape=h<=540&&w>=620,m=phone||landscape?10:16;
  const box=(x,y,width,height)=>({x,y,width,height});
  const mini=phone?100:landscape?88:w<1000?132:152;
  const miniY=phone?108:landscape?56:62,onlineY=phone?108:landscape?104:112;
  const leftWidth=phone?w-mini-3*m:landscape?240:320;
  const homeY=onlineY+(landscape?36:40),homeHeight=landscape?60:72;
  const activityY=phone?homeY+homeHeight+10:miniY+mini+12,activityWidth=phone?w-2*m:landscape?250:286;
  const activityBottom=landscape?h-144:phone?h-286:h-290;
  const joystick=box(m,h-112,96,96),run=box(w-m-64,h-80,64,64);
  const actionWidth=phone?Math.min(300,w-144):Math.min(300,w-250),actionY=landscape?h-138:phone?h-166:h-138;
  const chatWidth=phone?run.x-10-(joystick.x+joystick.width+10):Math.min(240,w-380);
  return {phone,landscape,touch:coarse||phone,regions:{
    header:box(0,0,w,52),nav:box(m,phone?58:landscape?56:62,phone?w-2*m:320,40),
    minimap:box(w-m-mini,miniY,mini,mini),online:box(m,onlineY,leftWidth,32),home:box(m,homeY,leftWidth,homeHeight),
    activity:box(phone?m:w-m-activityWidth,activityY,activityWidth,Math.max(60,Math.min(360,activityBottom-activityY))),
    action:box((w-actionWidth)/2,actionY,actionWidth,44),chatAction:box(phone?joystick.x+joystick.width+10:(w-chatWidth)/2,h-66,chatWidth,44),
    joystick,run,zoom:landscape?box(w-m-64-12-100,h-76,100,44):box(w-m-44,h-278,44,118),
    hint:box(m,h-48,Math.max(1,Math.min(430,(w-240)/2-m-12)),32),
    chat:box(phone?m:w-m-350,phone?108:112,phone?w-2*m:350,Math.max(130,h-(phone?108:112)-190))
  }};
}

export function applyWorldHudLayout(parent,width,height,options){
  const layout=worldHudLayout(width,height,options);parent.classList.add('rw-hud-active');
  parent.dataset.hudPhone=String(layout.phone);parent.dataset.hudLandscape=String(layout.landscape);parent.dataset.hudTouch=String(layout.touch);
  for(const [name,region] of Object.entries(layout.regions))for(const [key,value] of Object.entries(region))parent.style.setProperty(`--rw-${name}-${key}`,`${value}px`);
  // Keep the avatar visible on small screens. Opening the native details remains
  // an explicit player choice and is not undone by normal resize/keyboard events.
  if(layout.phone||layout.landscape)for(const card of parent.querySelectorAll('details.rc-card'))if(!card.dataset.hudCompactInitialized){card.open=false;card.dataset.hudCompactInitialized='true';}
  return layout;
}

/** Native click also supports Enter/Space. Toggle survives movement pointer-up,
 * but never a cancelled gesture, focus loss, hidden tab or paused scene. */
export function bindRunToggle(button,{signal,isPaused=()=>false,onChange=()=>{}}={}){
  let enabled=false,cancelled=false;
  const set=value=>{enabled=!!value;button.setAttribute('aria-pressed',String(enabled));button.title=enabled?'Mode lari aktif. Tekan untuk berjalan.':'Aktifkan mode lari; Shift juga dapat ditahan.';onChange(enabled);};
  const listen=(target,type,handler)=>target?.addEventListener(type,handler,{signal});
  button.type='button';button.setAttribute('aria-label','Mode lari');set(false);
  listen(button,'pointerdown',()=>cancelled=false);
  listen(button,'click',()=>{if(!cancelled&&!isPaused())set(!enabled);});
  listen(button,'pointercancel',()=>{cancelled=true;set(false);});
  listen(globalThis.window,'blur',()=>set(false));
  listen(globalThis.document,'visibilitychange',()=>{if(document.hidden)set(false);});
  return {reset:()=>set(false),get enabled(){return enabled;}};
}

export const WORLD_HUD_CSS=`
body.exploring:has(.rw-hud-active) .game-hud{left:auto;right:12px;top:6px}
body.exploring:has(.rw-hud-active) .game-hud .profile-button{min-height:40px;max-width:151px;font-size:11px}
body.exploring:has(.rw-hud-active) #headerCitizenName{max-width:100px;font-size:11px}
.rw-hud-active .republic-world-overlay [hidden],.rw-hud-active #citizenChat[hidden]{display:none!important}
.rw-hud-active .republic-world-overlay{position:absolute;inset:0;z-index:7;pointer-events:none;font-family:Inter,Arial,sans-serif;color:#fff;overflow:hidden}
.rw-hud-active .republic-world-overlay button:focus-visible,.rw-hud-active summary:focus-visible{outline:3px solid #f6d482;outline-offset:3px}
.rw-hud-active .explore-top{height:52px;padding:0 180px 0 12px;display:flex;justify-content:flex-start;gap:10px;z-index:14;overflow:visible}
.rw-hud-active .explore-top>.back-button{min-height:40px;font-size:11px;padding:0 12px;white-space:nowrap}
.rw-hud-active .explore-location{font-size:11px;min-width:0;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.rw-hud-active .rw-tools{position:relative;order:1;pointer-events:auto}.rw-hud-active .rw-tools>summary{display:grid;place-items:center;min-width:48px;height:40px;border:1px solid #ded9c7;border-radius:10px;background:#fffaf0;color:#365749;font:700 12px Arial;cursor:pointer;list-style:none}
.rw-hud-active .rw-tools>summary::-webkit-details-marker{display:none}.rw-hud-active .rw-tools .explore-top-actions{position:absolute;top:46px;left:0;display:grid;gap:6px;min-width:190px;padding:10px;border:1px solid #ded9c7;border-radius:12px;background:#fffaf0;box-shadow:0 8px 30px #173a4330}
.rw-hud-active .rw-tools:not([open]) .explore-top-actions{display:none}.rw-hud-active .rw-tools .capture-button{display:flex!important;align-items:center;gap:8px;min-height:40px;font-size:12px;padding:8px}.rw-hud-active .rw-tools .capture-button span{display:inline!important}.rw-hud-active .rw-tools .area-music-toggle{width:auto}.rw-hud-active .rw-tools .area-music-volume>summary{width:100%;height:40px}.rw-hud-active .rw-tools .area-music-popover{left:0;right:auto}
.rw-hud-active .explore-map-nav{left:var(--rw-nav-x);top:var(--rw-nav-y);width:var(--rw-nav-width);height:var(--rw-nav-height);right:auto;bottom:auto;display:flex;gap:8px;z-index:9}
.rw-hud-active .explore-map-nav button{flex:1;min-width:0;min-height:40px;padding:0 8px;font-size:11px;white-space:nowrap}
.rw-hud-active .rm-live-minimap{left:var(--rw-minimap-x);top:var(--rw-minimap-y);width:var(--rw-minimap-width);height:var(--rw-minimap-height);right:auto;bottom:auto;z-index:8}.rw-hud-active .rm-minimap-open>span{font-size:10px;padding:5px}.rw-hud-active .rm-minimap-open>b{font-size:11px}
.rw-hud-active .rw-online{position:absolute;box-sizing:border-box;left:var(--rw-online-x);top:var(--rw-online-y);width:var(--rw-online-width);height:var(--rw-online-height);padding:5px 9px;background:#173b43e8;border:1px solid #ffffff40;border-radius:9px;font-size:11px;line-height:1.1;overflow:hidden}
.rw-hud-active .rw-loading{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);background:#153b45ec;border:1px solid #ffffff3b;border-radius:16px;padding:18px 24px;text-align:center;font-size:14px}
.rw-hud-active .rw-label{position:absolute;transform:translate(-50%,-100%);padding:4px 9px;border:1px solid #ffffff40;border-radius:7px;background:#18333ae8;box-shadow:0 2px 8px #0003;white-space:nowrap;text-align:center;font-size:12px;font-weight:700;text-shadow:0 1px 2px #0005;line-height:1.2}.rw-hud-active .rw-label small{display:block;color:#d4e6de;font-size:10px;font-weight:400;margin-top:2px}.rw-hud-active .rw-label[data-self=true]{background:#3d6357d9;border-color:#bdd4a5}
.rw-hud-active .rw-zoom{position:absolute;left:var(--rw-zoom-x);top:var(--rw-zoom-y);width:var(--rw-zoom-width);height:var(--rw-zoom-height);right:auto;bottom:auto;display:flex;flex-direction:column;gap:5px;pointer-events:auto}.rw-hud-active .rw-zoom button{flex:0 0 44px;width:44px;height:44px;border:1px solid #ffffff80;border-radius:12px;color:#fff;background:#244d50ed;font:700 24px Arial;cursor:pointer}.rw-hud-active .rw-zoom button:disabled{opacity:.4}.rw-hud-active .rw-zoom output{text-align:center;font-size:11px;text-shadow:0 1px 4px #142f35}
.rw-hud-active .rw-run{position:absolute;display:grid;place-items:center;left:var(--rw-run-x);top:var(--rw-run-y);width:var(--rw-run-width);height:var(--rw-run-height);right:auto;bottom:auto;border-radius:50%;border:2px solid #fff3c5;background:#294e50ed;color:#fff;font:800 12px Arial;cursor:pointer;pointer-events:auto;touch-action:manipulation}.rw-hud-active .rw-run[aria-pressed=true]{background:#d5b761;color:#183f3d;box-shadow:0 0 0 4px #d5b76140}
.rw-hud-active .rw-touch-pad{position:absolute;display:none;left:var(--rw-joystick-x);top:var(--rw-joystick-y);width:var(--rw-joystick-width);height:var(--rw-joystick-height);bottom:auto;border:1px solid #ffffff75;border-radius:50%;background:#24464c55;pointer-events:auto;touch-action:none;box-shadow:inset 0 0 30px #ffffff10}.rw-hud-active[data-hud-touch=true] .rw-touch-pad{display:block}.rw-hud-active .rw-touch-knob{position:absolute;left:calc(50% - 22px);top:calc(50% - 22px);width:44px;height:44px;border-radius:50%;background:#eaf2e6b8;border:2px solid #fff;box-shadow:0 3px 10px #173b4355}
.rw-hud-active .rw-talk{position:absolute;pointer-events:auto;left:var(--rw-chatAction-x);top:var(--rw-chatAction-y);width:var(--rw-chatAction-width);height:var(--rw-chatAction-height);bottom:auto;transform:none;padding:6px 10px;border:1px solid #f5df9f80;border-radius:22px;background:#244d50ed;color:#fff;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
.rw-hud-active .rw-card{position:absolute;left:var(--rw-activity-x);top:var(--rw-activity-y);width:var(--rw-activity-width);max-height:var(--rw-activity-height);right:auto;bottom:auto;box-sizing:border-box;overflow:auto;pointer-events:auto;background:#173a43f2;border:1px solid #ffffff40;border-radius:14px;padding:12px;line-height:1.5}.rw-hud-active .rw-card h3{margin:0;font-size:18px}.rw-hud-active .rw-card p{font-size:12px;margin:8px 0 0}.rw-hud-active .rw-card small{color:#c7dfd4}.rw-hud-active .rw-card button{float:right;min-width:40px;min-height:40px;border:0;border-radius:50%;background:#ffffff20;color:white;font-size:20px;cursor:pointer}
.rw-hud-active .rw-hint{position:absolute;left:var(--rw-hint-x);top:var(--rw-hint-y);width:var(--rw-hint-width);height:var(--rw-hint-height);overflow:hidden;max-width:none;bottom:auto;box-sizing:border-box;padding:5px 9px;background:#173b43d9;border:1px solid #ffffff30;border-radius:10px;font-size:11px;line-height:1.2}
.rw-hud-active #citizenChat{left:var(--rw-chat-x);top:var(--rw-chat-y);width:var(--rw-chat-width);max-height:var(--rw-chat-height);right:auto;bottom:auto;z-index:18}.rw-hud-active .citizen-chat-head button{min-width:40px;min-height:40px}.rw-hud-active .citizen-chat-status{font-size:11px}.rw-hud-active .citizen-chat-head span{font-size:10px}.rw-hud-active .citizen-chat-form button{min-height:40px;font-size:11px}
.rw-hud-active:has(#citizenChat:not([hidden])) .rc-card,.rw-hud-active:has(#citizenChat:not([hidden])) .rw-card,.rw-hud-active:has(#citizenChat:not([hidden])) .rc-action{display:none!important}
.rw-hud-active:has(.rw-card:not([hidden])) .rc-card{display:none!important}
.rw-hud-active[data-hud-phone=true] .explore-location{display:none}.rw-hud-active[data-hud-phone=true] .explore-top{padding:0 170px 0 10px;gap:7px}.rw-hud-active[data-hud-phone=true] .explore-top>.back-button{padding:0 8px;font-size:10px}.rw-hud-active[data-hud-phone=true] .rw-tools>summary{min-width:44px}.rw-hud-active[data-hud-phone=true] .rw-hint,.rw-hud-active[data-hud-touch=true] .rw-hint,.rw-hud-active[data-hud-landscape=true] .rw-hint{display:none}
.rw-hud-active[data-hud-landscape=true] .rw-zoom{flex-direction:row;gap:8px}.rw-hud-active[data-hud-landscape=true] .rw-zoom output{display:none}
.capture-mode .rw-zoom,.capture-mode .rw-hint,.capture-mode .rw-online,.capture-mode .rw-touch-pad,.capture-mode .rw-run,.capture-mode .rw-talk,.capture-mode .rw-card{display:none!important}
`;
