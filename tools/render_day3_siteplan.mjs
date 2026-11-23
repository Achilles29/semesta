import {writeFile} from 'node:fs/promises';
import {CIVIC_FACILITIES,DEVELOPMENT_ROADS} from '../game-src/civic-development-layout.js';
import {CAPITAL_LAYOUT} from '../game-src/republic-world-layout.js';
import {STORY_HOMES,STORY_ROADS} from '../game-src/citizen-story-homes.js';
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const x=n=>(n+140)*2,z=n=>(n+110)*2+80;
const colors={worship:'#e8cf91',education:'#aecadf',health:'#b3d7cf',sport:'#99c998',safety:'#d4b8a0',economy:'#d9bd81'};
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="820" height="1220" viewBox="0 0 820 1220"><rect width="820" height="1220" fill="#e6edde"/><g font-family="Arial,sans-serif" fill="#203e3d"><text x="28" y="36" font-size="24" font-weight="bold">JAKARTAWA · RENCANA DAY 3</text><text x="28" y="60" font-size="13">Denah staging produksi — belum publikasi gedung atau layanan game</text>';
for(const r of [...CAPITAL_LAYOUT.roads,...STORY_ROADS,...DEVELOPMENT_ROADS])svg+=`<path d="M${x(r.from[0])} ${z(r.from[1])}L${x(r.to[0])} ${z(r.to[1])}" stroke="#baa98b" stroke-width="${r.width*2}" fill="none"/>`;
const rect=(f,fill)=>`<rect x="${x(f.x-f.width/2)}" y="${z(f.z-f.depth/2)}" width="${f.width*2}" height="${f.depth*2}" fill="${fill}" stroke="#577064"/><title>${xml(f.name||f.id)}</title>`;
for(const h of STORY_HOMES)svg+=`<g>${rect(h,'#bd936f')}</g>`;
for(const h of CAPITAL_LAYOUT.housingPlots)svg+=`<g>${rect(h,'#c5c6ac')}</g>`;
for(const id of ['stage','koplak','sppg']){const f=CAPITAL_LAYOUT[id];svg+=`<g>${rect(f,'#94aeb3')}<text x="${x(f.x)}" y="${z(f.z)-15}" text-anchor="middle" font-size="10">${{stage:'Panggung',koplak:'Koplak',sppg:'SPPG'}[id]}</text></g>`;}
svg+=`<text x="${x(175)}" y="${z(43)}" text-anchor="middle" font-size="12">48 rumah perintis · A–F</text>`;
for(const f of CIVIC_FACILITIES){svg+=`<g>${rect(f,colors[f.category])}`;const lines=f.name.split(' ');let row=0;for(let i=0;i<lines.length;i+=2)svg+=`<text x="${x(f.x)}" y="${z(f.z)-7+(row++)*11}" text-anchor="middle" font-size="9">${xml(lines.slice(i,i+2).join(' '))}</text>`;svg+='</g>';}
svg+='<text x="28" y="1160" font-size="13">Utara ↑ · Rumah perintis tetap pada alamat register.</text><text x="28" y="1183" font-size="13">Tapak fasilitas tidak memotong jalan atau permukiman.</text><text x="28" y="1206" font-size="13">republikwkwkwk.com · Subsidi dan ekonomi mengikuti roadmap 08.</text></g></svg>';
await writeFile('docs/world/day3-siteplan.svg',svg);console.log('Wrote deterministic Day 3 siteplan from shared coordinates.');
