export const PRODUCTION_VIDEOS = Object.freeze([
  {
    id: 'day3',
    label: 'Day 3 · Sayur Dipinjam untuk Foto (draf)',
    title: 'Sayur Dipinjam untuk Foto',
    meta: 'DAY 3 · 1:32 · DRAF ALUR LAMA',
    description: 'Pratinjau Day 3 ini dibuat sebelum pemilihan Day 2 direvisi. Dialog pembuka tentang pita masih memakai alur lama dan perlu diselaraskan sebelum publikasi. Kotak Gufron kosong meski laporan sudah dicap “tersalurkan”; sayur petani dipajang untuk foto Kopdes tanpa dibeli. Untuk sound resmi “Oke Gas”, unduh versi khusus dan pasang sound lewat editor platform mulai detik 16,55 saat Prabowow masuk.',
    video: 'episode-004/release-v3/day3-final-20261118.mp4',
    platformVideo: 'episode-004/release-v3/day3-platform-20261118.mp4',
    soundUrl: 'https://www.youtube.com/watch?v=jwYRwOj9RdA',
    cover: 'episode-004/release-v3/day3-cover.png',
    subtitles: 'episode-004/release-v3/subtitles.srt',
    filename: 'republik-wkwkwk-day3.mp4',
    platformFilename: 'republik-wkwkwk-day3-tambah-sound-oke-gas.mp4',
    coverFilename: 'republik-wkwkwk-day3-cover.png',
    subtitleFilename: 'republik-wkwkwk-day3.srt',
  },
  {
    id: 'day2',
    label: 'Day 2 · Pagi Ditolak, Siang Lolos (revisi)',
    title: 'Pagi Ditolak, Siang Lolos',
    meta: 'DAY 2 · 2:10 · REVISI HOOK, SUARA, GERAK',
    description: 'Gibrun ditolak pagi karena berumur 36 tahun, lalu diterima siang setelah putusan MK WKWKWK. Cerita mundur memperlihatkan Gufron yang murung karena akun Kampung Komen baru mendapat dua follower tambahan dan jalan masih berlubang. Sepuluh penduduk terdaftar memilih 6–4. Gufron menagih jalan, sementara Bu Warung meminta warga memilih dokumen yang dibuka berikutnya. Suara Gufron memakai klon privat HeyGen; narator hanya suara. Tokoh, dokumen, pemilihan, dan dialog adalah fiksi parodi.',
    video: 'episode-003/release-v4-election/day2-final-v4-20261118.mp4',
    cover: 'episode-003/release-v4-election/day2-cover-v4.png',
    subtitles: 'episode-003/release-v4-election/subtitles.srt',
    filename: 'republik-wkwkwk-day2-v4-pagi-ditolak-siang-lolos.mp4',
    coverFilename: 'republik-wkwkwk-day2-v4-cover.png',
    subtitleFilename: 'republik-wkwkwk-day2-v4.srt',
  },
  {
    id: 'day1',
    label: 'Day 1 · Kampung Komen',
    title: 'Kampung Komen',
    meta: 'DAY 1 · 0:58 · SUDAH DIUNGGAH',
    description: 'Video Day 1 asli yang sebelumnya dibuat di PC lokal dan sudah diunggah.',
    video: 'episode-001/release-uploaded/day1-uploaded.mp4',
    cover: 'episode-001/release-uploaded/day1-cover.png',
    filename: 'kampung-komen-day1.mp4',
    coverFilename: 'kampung-komen-day1-cover.png',
  },
]);

/** One episode selector, one player, and downloads for the selected release. */
export function mountProductionVideoLibrary(host,{mediaRoot,signal}={}){
  const root=new URL(mediaRoot||'public/audio/produksi/',document.baseURI);
  host.innerHTML=`<div class="production-video-library">
    <label class="production-video-picker">Pilih video yang mau diputar
      <select data-production-video-select aria-label="Pilih episode video">${PRODUCTION_VIDEOS.map(v=>`<option value="${v.id}">${v.label}</option>`).join('')}</select>
    </label>
    <article class="production-video-card">
      <div class="production-video-media"><video data-production-video controls playsinline preload="metadata">Browser Anda tidak mendukung video.</video><button data-production-fullscreen type="button">⛶ Layar penuh</button></div>
      <div class="production-video-info"><span data-production-meta></span><h3 data-production-title></h3><p data-production-description></p>
        <div class="production-video-downloads"><a data-production-download-video download>↓ Unduh video MP4</a><a data-production-download-platform download>↓ Unduh versi untuk sound platform</a><a data-production-sound target="_blank" rel="noopener noreferrer">↗ Rujukan sound resmi</a><a data-production-download-cover download>↓ Unduh sampul</a><a data-production-download-subtitles download>↓ Unduh subtitle SRT</a></div>
      </div>
    </article>
  </div>`;
  const select=host.querySelector('[data-production-video-select]');
  const video=host.querySelector('[data-production-video]');
  const title=host.querySelector('[data-production-title]');
  const meta=host.querySelector('[data-production-meta]');
  const description=host.querySelector('[data-production-description]');
  const videoDownload=host.querySelector('[data-production-download-video]');
  const platformDownload=host.querySelector('[data-production-download-platform]');
  const soundLink=host.querySelector('[data-production-sound]');
  const coverDownload=host.querySelector('[data-production-download-cover]');
  const subtitlesDownload=host.querySelector('[data-production-download-subtitles]');
  const fullscreenButton=host.querySelector('[data-production-fullscreen]');
  const theater=document.createElement('dialog');theater.className='production-video-theater';
  theater.innerHTML='<button data-theater-close type="button" aria-label="Tutup layar penuh">✕ Tutup</button><video data-theater-video controls playsinline></video>';
  document.body.append(theater);
  const theaterVideo=theater.querySelector('[data-theater-video]');
  let nativeFullscreen=false;
  function closeTheater(){
    if(theater.open){if(document.fullscreenElement===theater){const ending=document.exitFullscreen?.();ending?.catch(()=>{});}theater.close?.();theater.open=false;}
    theaterVideo.pause?.();if(theaterVideo.currentTime>=0)video.currentTime=theaterVideo.currentTime;
    nativeFullscreen=false;
  }
  async function openTheater(){
    video.pause?.();theaterVideo.src=video.src;theaterVideo.poster=video.poster;theaterVideo.load?.();
    theaterVideo.currentTime=video.currentTime||0;
    if(theater.showModal)theater.showModal();else{theater.open=true;theater.hidden=false;}
    let fullscreenPromise;
    try{fullscreenPromise=theater.requestFullscreen?.();}catch{} // Dialog still fills the screen.
    try{await theaterVideo.play?.();}catch{}
    try{if(fullscreenPromise){await fullscreenPromise;nativeFullscreen=true;}}catch{} // Dialog remains open.
  }
  function choose(id){
    closeTheater();
    const item=PRODUCTION_VIDEOS.find(v=>v.id===id)||PRODUCTION_VIDEOS[0];
    video.pause?.();
    const videoUrl=new URL(item.video,root).href,coverUrl=new URL(item.cover,root).href;
    video.src=videoUrl;video.poster=coverUrl;video.setAttribute?.('aria-label',`Video ${item.label}`);video.load?.();
    title.textContent=item.title;meta.textContent=item.meta;description.textContent=item.description;
    videoDownload.href=videoUrl;videoDownload.download=item.filename;
    platformDownload.hidden=!item.platformVideo;
    if(item.platformVideo){platformDownload.href=new URL(item.platformVideo,root).href;platformDownload.download=item.platformFilename;}
    else{platformDownload.removeAttribute?.('href');platformDownload.removeAttribute?.('download');}
    soundLink.hidden=!item.soundUrl;
    if(item.soundUrl)soundLink.href=item.soundUrl;else soundLink.removeAttribute?.('href');
    coverDownload.href=coverUrl;coverDownload.download=item.coverFilename;
    subtitlesDownload.hidden=!item.subtitles;
    if(item.subtitles){subtitlesDownload.href=new URL(item.subtitles,root).href;subtitlesDownload.download=item.subtitleFilename;}
    else{subtitlesDownload.removeAttribute?.('href');subtitlesDownload.removeAttribute?.('download');}
    select.value=item.id;
  }
  select.addEventListener('change',()=>choose(select.value),signal?{signal}:undefined);
  fullscreenButton.addEventListener('click',openTheater,signal?{signal}:undefined);
  theater.querySelector('[data-theater-close]').addEventListener('click',closeTheater,signal?{signal}:undefined);
  theater.addEventListener('close',()=>{theaterVideo.pause?.();nativeFullscreen=false;},signal?{signal}:undefined);
  document.addEventListener?.('fullscreenchange',()=>{if(nativeFullscreen&&!document.fullscreenElement)closeTheater();},signal?{signal}:undefined);
  choose('day2');
  return {choose,pause(){video.pause?.();theaterVideo.pause?.();},dispose(){closeTheater();video.pause?.();theater.remove?.();}};
}
