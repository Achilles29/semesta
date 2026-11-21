import {DANCE_BPM} from './production-dance.js';

// Blocking draft only: deliberately not a complete episode or licensed audio release.
export function day1OpeningScenario(){
  return {
    version:1,title:'Day 1 · Prabowow — draf pembuka',notice:'DRAF · PARODI FIKTIF',kind:'rehearsal',set:'courtyard',props:['plants'],
    cast:[{id:'a',preset:'v15-prabowo-inspired',position:[0,0],yaw:0}],
    shots:[
      {id:'joget',label:'Prabowow masuk · delapan ketukan',duration:8*60/DANCE_BPM,camera:'medium',focus:'a',caption:'PRESIDEN SUDAH ADA.',actors:{a:{action:'Dance',yaw:0,bpm:DANCE_BPM}}},
      {id:'kosong',label:'Musik berhenti · belum ada rakyat',duration:2.3,camera:'wide',focus:'a',caption:'RAKYATNYA BELUM.',actors:{a:{action:'Idle',yaw:0}}},
      {id:'panggil',label:'Reaksi presiden · dialog rencana',duration:2.5,camera:'close',focus:'a',caption:'Prabowow: “Lho… rakyat saya mana?”',actors:{a:{action:'Point',yaw:0}}},
    ],
  };
}
