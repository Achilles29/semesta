export function renderIdentityCard(container, citizen) {
  const card = citizen?.identity_card;
  container.hidden = !card;
  if (!card) { container.replaceChildren(); return; }
  container.innerHTML = `<div class="identity-card-head"><span class="identity-seal" aria-hidden="true">RW</span><div><small>REPUBLIK WKWKWK</small><b>KARTU WARGA</b></div><span class="identity-game">IDENTITAS GAME</span></div><div class="identity-card-body"><div class="identity-portrait"><img id="identityAvatarPreview" alt="Avatar warga"><span>WARGA REPUBLIK</span></div><div class="identity-details"><small>NOMOR WARGA</small><strong data-card-number></strong><h3 data-card-name></h3><dl><div><dt>Profesi</dt><dd data-card-profession></dd></div><div><dt>Bergabung</dt><dd data-card-joined></dd></div></dl><span class="identity-verification" data-card-verification></span></div></div><p class="identity-card-foot">Identitas karakter dalam permainan · Republik Wkwkwk</p>`;
  const set = (selector, text) => { container.querySelector(selector).textContent = text; };
  set('[data-card-number]', card.number);
  set('[data-card-name]', card.displayName);
  set('[data-card-profession]', card.occupation);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(card.joinedAt || '') ? new Date(`${card.joinedAt}T12:00:00`) : null;
  set('[data-card-joined]', date && !Number.isNaN(+date) ? date.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : '—');
  const verified = card.verification === 'email-verified';
  set('[data-card-verification]', verified ? '✓ Email terverifikasi' : '○ Email belum terverifikasi');
  container.querySelector('[data-card-verification]').classList.toggle('verified', verified);
  const image = container.querySelector('img');
  image.src = new URL('portrait.png', window.SEMESTA_AVATAR_V15_BASE || new URL('public/models/characters/v15/', document.baseURI)).href;
  image.hidden = !card.avatarConfig;
}

export function renderAuthAvailability(options, { google, status, submit, registering, loggedIn = false }) {
  const available = !!options?.googleAvailable;
  google.hidden = status.hidden = loggedIn;
  google.setAttribute('aria-disabled', String(!available));
  google.classList.toggle('unavailable', !available);
  google.tabIndex = available && !loggedIn ? 0 : -1;
  if (loggedIn) { status.textContent = ''; submit.disabled = false; return; }
  status.textContent = !options ? 'Layanan akun belum dapat diperiksa. Coba muat ulang.'
    : !options.emailRegistrationAvailable ? 'Pendaftaran email sedang disiapkan. Gunakan Google jika tersedia.'
    : options.emailVerificationRequired ? 'Email perlu diverifikasi sebelum mulai bermain.'
    : 'Daftar dengan email untuk menyimpan karakter dan kartu warga Anda.';
  if (!available) status.textContent += ' Google belum tersedia saat ini.';
  submit.disabled = !!registering && (!options || !options.emailRegistrationAvailable);
}
