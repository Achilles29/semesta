import schema from './avatar-farmer-schema.json' with { type: 'json' };

export const FARMER_SCHEMA = schema;
export const FARMER_PRESET = Object.freeze({skin:'sawo',hair:'pendek',hairColor:'coklat',top:'petani',bottom:'jeans',headwear:'topi',accessory:'tas-anyaman',facialHair:'tanpa',special:'farmer-ps2'});

// Keep the old profile fields intact; V11's independent choices live in `farmer`.
export function farmerAppearance(config = {}, palette = {}) {
  const source = config.farmer || {};
  const legacy = {
    outfit: {petani:'overalls',kaos:'tee',kemeja:'work-shirt',flanel:'work-shirt',jas:'blazer',batik:'batik',koko:'koko',kebaya:'kebaya',hoodie:'hoodie'}[config.top],
    bottomStyle: {cargo:'cargo',sarung:'sarong',rok:'skirt'}[config.bottom] || 'relaxed',
    hairStyle: {pendek:'short',cepak:'short',panjang:'bob',kuncir:'tied',botak:'none'}[config.hair],
    headwear: config.hair === 'hijab' ? 'hijab' : {topi:'cap',peci:'peci',tanpa:'none'}[config.headwear],
    accessory: {ransel:'backpack','tas-anyaman':'satchel',selempang:'satchel',syal:'scarf',tanpa:'none'}[config.accessory],
  };
  const appearance = Object.fromEntries(Object.entries(schema.fields).map(([key, field]) => {
    const value = source[key] ?? legacy[key];
    return [key, Object.hasOwn(field.options, value) ? value : field.default];
  }));
  const legacyColors = {skin:palette.skin?.[config.skin],hair:palette.hair?.[config.hairColor],shirt:palette.top?.[config.top],trousers:palette.bottom?.[config.bottom]};
  appearance.colors = Object.fromEntries(Object.entries(schema.colors).map(([key, field]) => {
    const color = source.colors?.[key] ?? legacyColors[key];
    return [key, typeof color === 'string' && /^#[\da-f]{6}$/i.test(color) ? color.toLowerCase() : field.default];
  }));
  return appearance;
}

export function farmerCharacterOptions(config, palette) {
  const appearance = farmerAppearance(config, palette);
  return {...appearance, ...appearance.colors, ps2Farmer:true};
}

// Shared controls in the player customizer and admin studio, without duplicate names.
export function mountFarmerEditor(form, onChange) {
  const section = document.createElement('fieldset');
  section.className = 'farmer-editor'; section.hidden = true;
  const legend = document.createElement('legend'); legend.textContent = 'Avatar V11 · tubuh, wajah, pakaian'; section.append(legend);
  const note = document.createElement('p'); note.textContent = 'Semua postur tersedia untuk cowok dan cewek. Hijab menyembunyikan rambut tanpa menghapus pilihannya.'; section.append(note);
  const fields = new Map(), colors = new Map();
  const groups={};
  for(const [key,title,open] of [['body','01 · Postur tubuh',true],['wardrobe','02 · Pakaian & aksesori',true],['face','03 · Wajah & ekspresi',false],['colors','04 · Palet warna',false]]){
    const details=document.createElement('details');details.className='farmer-control-group';details.open=open;
    const summary=document.createElement('summary');summary.textContent=title;
    const grid=document.createElement('div');grid.className='farmer-control-grid';details.append(summary,grid);section.append(details);groups[key]=grid;
  }
  for (const [key, field] of Object.entries(schema.fields)) {
    const label = document.createElement('label'); label.textContent = field.label;
    const select = document.createElement('select'); select.name = `farmer-${key}`;
    for (const [value, text] of Object.entries(field.options)) select.add(new Option(text, value));
    const group=['bodyFrame','bodyType'].includes(key)?'body':['faceShape','eyeStyle','noseStyle','mouthStyle'].includes(key)?'face':'wardrobe';
    label.append(select); groups[group].append(label); fields.set(key, select);
  }
  for (const [key, field] of Object.entries(schema.colors)) {
    const label = document.createElement('label'); label.textContent = field.label;
    const input = document.createElement('input'); input.type = 'color'; input.name = `farmer-color-${key}`;
    label.append(input); groups.colors.append(label); colors.set(key, input);
  }
  section.addEventListener('change', onChange); form.prepend(section);
  return {
    set(config, palette) {
      const appearance = farmerAppearance(config, palette);
      for (const [key, select] of fields) select.value = appearance[key];
      for (const [key, input] of colors) input.value = appearance.colors[key];
    },
    get() { return {...Object.fromEntries([...fields].map(([key, el]) => [key, el.value])), colors:Object.fromEntries([...colors].map(([key, el]) => [key, el.value]))}; },
    show(visible) { section.hidden = !visible; for (const el of section.querySelectorAll('select,input')) el.disabled = !visible; },
  };
}
