import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FARMER_SCHEMA, FARMER_PRESET, farmerAppearance, farmerCharacterOptions} from '../game-src/avatar-farmer-config.js';
import {createHumanModel, setFarmerAsset} from '../game-src/avatar-character-3d.js';
import {FARMER_PRESETS, FARMER_COLLECTIONS} from '../game-src/avatar-farmer-presets.js';

const php = process.env.PHP_BINARY || (process.platform==='win32' ? 'C:/xampp/php/php.exe' : 'php');
const validate = input => {
  const result=spawnSync(php,['tools/test_farmer_config.php'],{input:JSON.stringify(input),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr); assert.equal(result.stderr,''); return JSON.parse(result.stdout);
};
const bytes=readFileSync('public/models/characters/semesta-farmer-v11.glb');
assert.deepEqual(bytes,readFileSync('ilustrasi/avatar-v2/farmer-v11-body-wardrobe/farmer-v11-body-wardrobe.glb'));
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
setFarmerAsset(asset);
const model=createHumanModel(THREE,farmerCharacterOptions(FARMER_PRESET));
for(const [key,field] of Object.entries(FARMER_SCHEMA.fields)) {
  assert.deepEqual([...model.figure.userData.avatarCapabilities[key]].sort(),Object.keys(field.options).sort(),key);
}
let cases=0;
for(const frame of ['male','female']) for(const body of Object.keys(FARMER_SCHEMA.fields.bodyType.options)) {
  const config={...FARMER_PRESET,farmer:farmerAppearance({farmer:{bodyFrame:frame,bodyType:body,outfit:'loose-tee',bottomStyle:'sarong',headwear:'peci',gloves:'none',colors:{skin:'#875533',footwear:'#123456'}}})};
  // Browser -> JSON/API whitelist -> stored JSON -> game model is lossless.
  const clean=validate(config.farmer); assert.deepEqual(clean,config.farmer);
  const restored=JSON.parse(JSON.stringify({...config,farmer:clean}));
  const state=model.figure.userData.setAppearance(farmerCharacterOptions(restored));
  assert.equal(state.bodyFrame,frame); assert.equal(state.bodyType,body); assert.equal(state.bottomStyle,'sarong');
  assert.equal(state.colors.footwear,'#123456'); assert.equal(state.footwearStyle,'sandals'); assert.deepEqual(state.warnings,[]);
  cases++;
}
assert.equal(farmerCharacterOptions(FARMER_PRESET).outfit,'overalls');
assert.equal(FARMER_PRESETS.length,20);
assert.equal(new Set(FARMER_PRESETS.map(p=>p.id)).size,20);
assert.equal(new Set(FARMER_PRESETS.map(p=>JSON.stringify(p.config.farmer))).size,20);
assert.equal(new Set(FARMER_PRESETS.map(p=>`${p.config.farmer.bodyFrame}/${p.config.farmer.bodyType}`)).size,16);
assert.deepEqual([...new Set(FARMER_PRESETS.map(p=>p.config.farmer.outfit))].sort(),Object.keys(FARMER_SCHEMA.fields.outfit.options).sort());
for(const preset of FARMER_PRESETS){
  assert.ok(FARMER_COLLECTIONS[preset.collection],preset.id);
  assert.ok(Buffer.byteLength(preset.name,'utf8')<=40,preset.name);
  assert.equal(preset.config.special,'farmer-ps2');
  assert.deepEqual(validate(preset.config.farmer),preset.config.farmer,preset.id);
  const state=model.figure.userData.setAppearance(farmerCharacterOptions(preset.config));
  assert.deepEqual(state.warnings,[],preset.id);
  for(const key of Object.keys(FARMER_SCHEMA.fields))assert.equal(state[key],preset.config.farmer[key],`${preset.id}/${key}`);
  assert.deepEqual(state.colors,preset.config.farmer.colors,preset.id);
}
assert.equal(farmerCharacterOptions(FARMER_PRESET).ps2Farmer,true);
assert.deepEqual(validate({}),farmerAppearance());
for(const bad of [null,42,'oops',{bodyFrame:'robot'},{bodyType:[]},{outfit:'invalid'},{colors:'red'},{colors:{skin:'#fff'}},{colors:{skin:[]}}, {colors:{skin:'#123456\n'}}]) assert.equal(validate(bad),false,JSON.stringify(bad));
assert.equal(validate({extra:'discard'}).extra,undefined);
const normalized=farmerAppearance({farmer:{bodyFrame:'invalid',colors:{skin:'invalid'}}}); assert.equal(normalized.bodyFrame,'male');
for(const clip of ['Idle','Walk','Run','Interact','Wave','Hoe','Watering','Harvest']) assert.ok(model.actions[clip],clip);
console.log(`PASS: public GLB matches approved V11; schema matches mesh; ${cases} body configs PHP/JSON/game round-trip; invalid input rejected; all 8 animation clips available.`);
console.log('PASS: 20 unique ready-made V11 presets; all 16 physiques and 10 outfits; PHP round-trip and game appearance applied without warnings.');
