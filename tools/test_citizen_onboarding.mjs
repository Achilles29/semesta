import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Window } from 'happy-dom';
import { professions, professionRecommendation, nextOnboardingAvatar } from '../game-src/citizen-professions.js';
import { validateAvatarConfig, normalizeAvatarConfig, mountAvatarEditor, presets, catalog } from '../game-src/avatar-v15-config.js';
import { renderIdentityCard, renderAuthAvailability } from '../game-src/citizen-identity.js';

const seeded = fs.readFileSync(new URL('./setup_database.php', import.meta.url),'utf8').split("'occupation' => array(")[1].split('\n        )')[0];
const keys = [...seeded.matchAll(/'([^']+)'=>'/g)].map(m=>m[1]);
assert.deepEqual(Object.keys(professions).sort(), keys.sort(), 'Every seeded occupation must have an authored set');
for (const role of keys) for (const gender of ['laki-laki','perempuan']) {
  const suggestion = professionRecommendation(role,gender);
  assert.deepEqual(validateAvatarConfig(suggestion.config),suggestion.config);
  assert.ok(suggestion.known && suggestion.note.length>20);
  assert.equal(suggestion.config.profileId.startsWith('female'),gender==='perempuan');
}
for(const role of Object.values(professions)) {
  for(const field of ['hairMale','hairFemale'])if(role[field])assert.ok(Object.hasOwn(catalog.fields.hairStyle.options,role[field]),`${field} must be a supported wardrobe value`);
  if(role.hand)assert.ok(Object.hasOwn(catalog.fields.handAccessory.options,role.hand),'Role hand setting must be supported');
}
assert.equal(professionRecommendation('polri','perempuan').config.appearance.topStyle,'police');
assert.equal(professionRecommendation('konstruksi','laki-laki').config.appearance.topStyle,'operator');
assert.equal(professionRecommendation('new-admin-job','perempuan').known,false);
assert.equal(professionRecommendation('guru','tidak-menyebutkan'),null,'Non-disclosed gender must not pick an arbitrary body');
const custom=professionRecommendation('guru','perempuan').config;
assert.equal(nextOnboardingAvatar(custom,true,'polri','laki-laki'),custom,'Manual choice must survive new profession and gender');

const win=new Window({url:'http://localhost/project/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
for(const key of ['document','location','history','HTMLElement','Element','Event','CustomEvent','FormData'])Object.defineProperty(globalThis,key,{value:win[key],configurable:true});
globalThis.window=win;
Object.defineProperty(globalThis,'Option',{configurable:true,value:function(text,value){const el=document.createElement('option');el.textContent=text;el.value=value;return el;}});
const php=process.env.PHP_BINARY || (process.platform==='win32'?'C:\\xampp\\php\\php.exe':'php');
const markup=execFileSync(php,['-r',`define('FCPATH',getcwd().'/');function base_url($p=''){return 'http://localhost/project/'.$p;}include 'application/views/game.php';`],{encoding:'utf8'});
document.body.innerHTML=markup;
// Evaluate the real CSS cascade: the label must not inherit the icon's 23px box.
const authStyles=document.createElement('style');authStyles.textContent=['style.css','citizen-auth.css'].map(name=>fs.readFileSync(new URL('../game-src/'+name,import.meta.url),'utf8')).join('\n');document.head.append(authStyles);
const q=s=>document.querySelector(s);
const googleIconStyle=win.getComputedStyle(q('.google-sso-icon')),googleLabelStyle=win.getComputedStyle(q('#googleSsoLabel'));
assert.equal(googleIconStyle.width,'23px');assert.notEqual(googleLabelStyle.width,'23px','Google label must not be squeezed into icon dimensions');
assert.notEqual(googleLabelStyle.height,'23px');assert.notEqual(googleLabelStyle.borderRadius,'50%');assert.equal(googleLabelStyle.fontSize,'14px');
let currentCitizen=null, posted=[];
const options={gender:[{value:'laki-laki',label:'Laki-laki'},{value:'perempuan',label:'Perempuan'}],occupation:keys.map(value=>({value,label:professions[value].label}))};
globalThis.fetch=async(url,params)=>{
  if(params?.method==='POST') { const body=JSON.parse(params.body); posted.push(body);if(currentCitizen && body.action==='update')currentCitizen={...currentCitizen,occupation:body.occupation,gender:body.gender,avatar_config:body.avatarConfig?JSON.stringify(body.avatarConfig):currentCitizen.avatar_config};return {ok:true,json:async()=>({citizen:currentCitizen})}; }
  const resource=new URL(url).searchParams.get('resource');
  return {ok:true,json:async()=>resource==='citizen_options'?{options}:resource==='citizen'?{citizen:currentCitizen}:{emailRegistrationAvailable:true,emailVerificationRequired:false,emailDeliveryAvailable:false,googleAvailable:false}};
};
const source=fs.readFileSync(new URL('../game-src/main.js',import.meta.url),'utf8');
const init=source.slice(source.indexOf('async function initCitizen()'),source.indexOf('\nfunction initExploreAvatarCustomizer()'));
const create=new Function('professionRecommendation','renderIdentityCard','renderAuthAvailability',`
 const $=s=>document.querySelector(s),API_URL='http://localhost/project/api',houseNames={};
 let activeCitizen=null,updateCitizenHeader=()=>{},authMode='login',pendingAvatarConfig=null,pendingAvatarManuallyChosen=false;
 const saveGameState=()=>{},renderAvatarPreview=()=>{},parsedAvatarConfig=v=>typeof v==='string'?JSON.parse(v):v;
 ${init}
 return {init:initCitizen,get:()=>({pendingAvatarConfig,pendingAvatarManuallyChosen,activeCitizen}),manual:()=>{pendingAvatarManuallyChosen=true;}};
`);
const harness=create(professionRecommendation,renderIdentityCard,renderAuthAvailability);
await harness.init();q('#profileButton').click();
assert.equal(q('#headerAvatar').textContent,'↗');assert.equal(q('#worldCitizenStatus').textContent,'TAMU · PETA TERBUKA');
assert.equal(q('#citizenForm').elements.password.required,true);
assert.equal(q('#citizenForm').elements.gender.required,false,'Login must not validate hidden profile fields');
assert.equal(q('#googleSsoButton').getAttribute('aria-disabled'),'true');
assert.equal(q('#googleSsoButton').hidden,false);assert.equal(q('#authServiceStatus').hidden,false);
q('[data-auth-mode="register"]').click();
const form=q('#citizenForm');
assert.equal(form.elements.gender.required,true);assert.equal(form.elements.occupation.required,true);
form.elements.gender.value='perempuan';form.elements.occupation.value='tenaga-kesehatan';form.elements.occupation.dispatchEvent(new Event('change'));
assert.equal(harness.get().pendingAvatarConfig.appearance.topStyle,'labcoat');
harness.manual();const manual=harness.get().pendingAvatarConfig;
form.elements.occupation.value='polri';form.elements.occupation.dispatchEvent(new Event('change'));
assert.equal(harness.get().pendingAvatarConfig,manual);
q('#useProfessionSuggestion').click();
assert.equal(harness.get().pendingAvatarConfig.appearance.topStyle,'police','Explicit recommendation must replace a manual draft');
assert.equal(posted.length,0,'Choosing a suggestion must not save it');
const explicit=harness.get().pendingAvatarConfig;
form.elements.occupation.value='guru';form.elements.occupation.dispatchEvent(new Event('change'));
assert.equal(harness.get().pendingAvatarConfig,explicit,'A following field change must preserve the explicit choice');
renderIdentityCard(q('#citizenIdentityCard'),{identity_card:{number:'RW-00000001',displayName:'<img src=x onerror=alert(1)>',occupation:'Guru',joinedAt:'2026-11-23',verification:'unverified',avatarConfig:null}});
assert.equal(q('[data-card-name]').textContent,'<img src=x onerror=alert(1)>');assert.equal(q('[data-card-name] img'),null);
assert.match(q('[data-card-verification]').textContent,/belum/);
renderIdentityCard(q('#citizenIdentityCard'),null);assert.equal(q('#citizenIdentityCard').children.length,0);

document.body.innerHTML=markup;
const savedConfig=professionRecommendation('guru','perempuan').config;
currentCitizen={id:41,display_name:'Warga Lama',username:'warga_lama',email_verified:1,gender:'perempuan',occupation:'guru',avatar:'guru',house:'rumah-kayu',profile_complete:true,avatar_config:JSON.stringify(savedConfig)};
const savedHarness=create(professionRecommendation,renderIdentityCard,renderAuthAvailability);
await savedHarness.init();q('#profileButton').click();
assert.equal(q('#googleSsoButton').hidden,true,'Authenticated profile must not offer login/account linking');assert.equal(q('#googleSsoButton').tabIndex,-1);
assert.equal(q('#authServiceStatus').hidden,true);assert.equal(q('#authServiceStatus').textContent,'');
assert.match(q('.citizen-intro').textContent,/atur karakter/);assert.equal(win.getComputedStyle(q('#googleSsoButton')).display,'none');
const savedForm=q('#citizenForm');savedForm.elements.occupation.value='polri';savedForm.elements.occupation.dispatchEvent(new Event('change'));
assert.equal(savedHarness.get().pendingAvatarConfig,null,'Changing an existing account profession must not replace the saved appearance');
q('#useProfessionSuggestion').click();const draft=savedHarness.get().pendingAvatarConfig;
assert.equal(draft.appearance.topStyle,'police');assert.equal(savedHarness.get().activeCitizen.avatar_config,JSON.stringify(savedConfig));
assert.equal(posted.length,0,'Existing citizen suggestion must remain a draft');
q('#closeCitizenPanel').click();q('#profileButton').click();
assert.equal(savedHarness.get().pendingAvatarConfig,draft);assert.equal(savedForm.elements.occupation.value,'polri','Reopening must retain the draft profession');
let editorEvent;window.addEventListener('semesta:avatar-customizer-open',event=>{editorEvent=event.detail;});q('#chooseRegistrationAvatar').click();
assert.equal(editorEvent.mode,'profile','Profile editor must stage changes until the profile is saved');
savedForm.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));await new Promise(resolve=>setTimeout(resolve,0));
assert.deepEqual(posted.at(-1).avatarConfig,draft);assert.equal(savedHarness.get().pendingAvatarConfig,null);
assert.deepEqual(JSON.parse(savedHarness.get().activeCitizen.avatar_config),draft);
document.body.innerHTML=markup;const reloadHarness=create(professionRecommendation,renderIdentityCard,renderAuthAvailability);await reloadHarness.init();
assert.deepEqual(JSON.parse(reloadHarness.get().activeCitizen.avatar_config),draft,'Fresh profile load must recover the saved recommendation');
const availabilityTargets={google:q('#googleSsoButton'),status:q('#authServiceStatus'),submit:q('#citizenSubmit'),registering:false};
renderAuthAvailability({googleAvailable:true,emailRegistrationAvailable:true},{...availabilityTargets,loggedIn:true});assert.equal(q('#googleSsoButton').hidden,true,'Enabled OAuth still stays out of an authenticated profile');
renderAuthAvailability({googleAvailable:true,emailRegistrationAvailable:true},availabilityTargets);assert.equal(q('#googleSsoButton').hidden,false,'Guest state restores Google login');assert.equal(q('#googleSsoButton').tabIndex,0);assert.equal(q('#authServiceStatus').hidden,false);
renderAuthAvailability({googleAvailable:false,emailRegistrationAvailable:true},{...availabilityTargets,loggedIn:true});assert.equal(q('#citizenSubmit').disabled,false,'Deferred Google does not block profile saving');

// Exercise the real editor controls and customizer integration without WebGL.
const customizer=source.slice(source.indexOf('function initExploreAvatarCustomizer()'),source.indexOf('\nasync function start()'));
const configure=new Function('normalizeAvatarConfig','mountAvatarEditor','FARMER_PRESETS','AVATAR_V15_CATALOG','draft',`
 const $=s=>document.querySelector(s),avatarColors={},API_URL='/api';let activeCitizen={avatar_config:JSON.stringify(draft)},avatarCustomizerMode='account',pendingAvatarConfig=draft,pendingAvatarManuallyChosen=false;
 const parsedAvatarConfig=v=>v?JSON.parse(v):null,farmerPresetForAvatar=()=>FARMER_PRESETS[0],renderAvatarPreview=()=>{},updateCitizenHeader=()=>{};
 const loadAvatarProfile=()=>new Promise(()=>{}),farmerCharacterOptions=c=>({avatarConfig:c}),disposeAvatar=()=>{};
 ${customizer}
 return {init:initExploreAvatarCustomizer,get:()=>({pendingAvatarConfig,pendingAvatarManuallyChosen})};
`);
const editorHarness=configure(normalizeAvatarConfig,mountAvatarEditor,presets,catalog,draft);editorHarness.init();
window.dispatchEvent(new CustomEvent('semesta:avatar-customizer-open',{detail:{mode:'profile'}}));
assert.equal(q('[name="v15-topStyle"]').value,'police','Non-story recommendation must populate the actual editor');
q('[name="v15-hairColor"]').value='silver';q('[name="v15-hairColor"]').dispatchEvent(new Event('change',{bubbles:true}));
q('#selectAvatarPreset').click();
assert.equal(editorHarness.get().pendingAvatarConfig.appearance.hairColor,'silver');
assert.equal(editorHarness.get().pendingAvatarConfig.presetId,draft.presetId,'Editing appearance must preserve profession accessories');
assert.equal(posted.length,1,'Profile customizer must not perform an immediate account save');
await win.happyDOM.close();
console.log('PASS 23 professions × 2 bodies, explicit suggestion replacement, protected custom choices, saved-account draft/save/reload, real editor support for profession configs, Unicode UI, mode constraints, disabled Google, safe card rendering.');
