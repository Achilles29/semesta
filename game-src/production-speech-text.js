// Speech spelling is independent from the on-screen brand name.
export const displaySpeechText=text=>text.replace(/Weka Weka(?: Weka)?/g,'Wkwkwk').replaceAll('Wekawekaweka','Wkwkwk').replaceAll('Dei Dua','Day Dua');
