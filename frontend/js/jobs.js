// ── Jobs board + Bumble-style applicant review ────────────────────────────────
// Brands post jobs → creators apply → the brand reviews applicants one card at
// a time with swipe left (pass) / swipe right (shortlist), tap for full detail.
// Persistence is localStorage for now (schema kept flat so it can move to
// Supabase tables later without reshaping).

import { state } from './state.js';
import { CREATORS, DOMAIN_META, DOMAIN_GRAD, ORDER } from './data.js';
import { makeAvatar } from './utils.js';

const LS_KEY = 'th_jobs_v1';

// db = { jobs: [...], decisions: { [jobId]: { [applicantHandle]: 'shortlist'|'pass' } } }
let db = null;
let jobDomain = 'all';        // active filter on the jobs grid

// Swipe session state
let deck = null;              // { job, queue: [applicants...], drag: {...} }

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── Storage ────────────────────────────────────────────────────────────────────
function load() {
  try { db = JSON.parse(localStorage.getItem(LS_KEY)); } catch (_) { db = null; }
  if (!db || !Array.isArray(db.jobs)) { db = { jobs: seedJobs(), decisions: {} }; save(); }
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (_) {}
}

function pickApplicants(domain, n) {
  return (CREATORS[domain] || []).slice(0, n).map((c) => ({
    name: c.name, handle: c.handle, domain,
    desc: c.desc, tags: c.tags, rank: c.rank, platforms: c.platforms,
  }));
}

function seedJobs() {
  const day = 86400000, now = Date.now();
  return [
    {
      id: 'demo-1', demo: true, ownerId: 'demo',
      title: '3 Instagram Reels — UPI Cashback Launch',
      brand: 'PayZippy', domain: 'finance',
      budget: '₹25,000–₹40,000', type: 'Instagram Reels', location: 'Remote',
      desc: 'We are launching a UPI cashback feature and want punchy, myth-busting Reels that explain the offer without sounding like an ad. Creator keeps full creative control on the hook.',
      postedAt: now - 2 * day,
      applicants: pickApplicants('finance', 5),
    },
    {
      id: 'demo-2', demo: true, ownerId: 'demo',
      title: 'Smartphone Unboxing + 10-min Review',
      brand: 'NovaTech Mobiles', domain: 'tech',
      budget: '₹50,000–₹80,000', type: 'YouTube Integration', location: 'Remote',
      desc: 'Flagship launch in August. Looking for an honest long-form review plus one Short. Device is yours to keep. Hindi or Hinglish preferred, tech-first audience.',
      postedAt: now - 4 * day,
      applicants: pickApplicants('tech', 5),
    },
    {
      id: 'demo-3', demo: true, ownerId: 'demo',
      title: 'Festive Recipe Series — 4 posts',
      brand: 'SpiceTrail Foods', domain: 'food',
      budget: '₹15,000–₹30,000', type: 'UGC Content', location: 'Mumbai / Remote',
      desc: 'Four festive recipes using our new masala range — 2 Reels + 2 carousels across October. We amplify on our page too, so tag-along reach for the creator.',
      postedAt: now - 6 * day,
      applicants: pickApplicants('food', 5),
    },
  ];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const jobById   = (id) => db.jobs.find((j) => j.id === id);
const decisions = (id) => (db.decisions[id] = db.decisions[id] || {});

function canReview(job) {
  return job.demo || (state.currentUser && job.ownerId === state.currentUser.id);
}
function hasApplied(job) {
  const uid = state.currentUser?.id;
  return !!uid && job.applicants.some((a) => a.userId === uid);
}
function timeAgo(ts) {
  const d = Math.max(1, Math.round((Date.now() - ts) / 86400000));
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

// ── Jobs grid ──────────────────────────────────────────────────────────────────
export function initJobs() { load(); }

export function renderJobs() {
  const bar  = document.getElementById('jobs-filter');
  const grid = document.getElementById('jobs-grid');
  if (!bar || !grid) return;

  bar.innerHTML = ORDER.map((d) =>
    `<button class="jchip${d === jobDomain ? ' active' : ''}" onclick="jobsFilter('${d}')">${DOMAIN_META[d].label}</button>`
  ).join('');

  const jobs = db.jobs
    .filter((j) => jobDomain === 'all' || j.domain === jobDomain)
    .sort((a, b) => b.postedAt - a.postedAt);

  grid.innerHTML = jobs.length
    ? jobs.map(renderJobCard).join('')
    : `<div class="no-jobs">No jobs in this domain yet — be the first to post one!</div>`;
}

function renderJobCard(job) {
  const meta   = DOMAIN_META[job.domain] || DOMAIN_META.all;
  const grad   = DOMAIN_GRAD[job.domain] || DOMAIN_GRAD.all;
  const dec    = decisions(job.id);
  const nShort = Object.values(dec).filter((v) => v === 'shortlist').length;
  const nSeen  = Object.keys(dec).length;
  const nApp   = job.applicants.length;

  let action;
  if (canReview(job)) {
    const left = nApp - nSeen;
    action = nApp === 0
      ? `<button class="job-btn" disabled>No applicants yet</button>`
      : `<button class="job-btn primary" onclick="openSwipe('${job.id}')">${left > 0 ? `Review applicants (${left} new)` : 'Review again'} →</button>`;
  } else if (hasApplied(job)) {
    action = `<button class="job-btn" disabled>✓ Applied</button>`;
  } else {
    action = `<button class="job-btn primary" onclick="applyToJob('${job.id}')">Apply now →</button>`;
  }

  return `<article class="job-card">
    <div class="job-top">
      <div class="job-logo" style="background:linear-gradient(135deg,${grad[0]},${grad[1]})">${esc(job.brand[0] || '?')}</div>
      <div class="job-title-wrap">
        <div class="job-title">${esc(job.title)}</div>
        <div class="job-brand">${esc(job.brand)} · ${timeAgo(job.postedAt)}${job.demo ? ' · <span class="job-demo-tag">demo</span>' : ''}</div>
      </div>
    </div>
    <div class="job-meta">
      <span class="job-pill" style="background:${grad[0]}18;color:${grad[0]};border-color:${grad[0]}55">${meta.label}</span>
      <span class="job-pill">${esc(job.type)}</span>
      <span class="job-pill">${esc(job.location)}</span>
      <span class="job-pill budget">${esc(job.budget)}</span>
    </div>
    <p class="job-desc">${esc(job.desc)}</p>
    <div class="job-foot">
      <span class="job-applicants">👤 ${nApp} applicant${nApp === 1 ? '' : 's'}${nShort ? ` · ★ ${nShort} shortlisted` : ''}</span>
      ${action}
    </div>
  </article>`;
}

export function jobsFilter(d) { jobDomain = d; renderJobs(); }

// ── Posting a job ──────────────────────────────────────────────────────────────
export function openPostJob() {
  if (!state.currentUser) { location.hash = '#/auth?role=brand'; return; }
  const brandInput = document.getElementById('pj-brand');
  if (brandInput && !brandInput.value) brandInput.value = state.userProfile?.brand_name || '';
  document.getElementById('job-post-overlay').classList.add('show');
}
export function closePostJob() {
  document.getElementById('job-post-overlay').classList.remove('show');
}
export function submitJob() {
  const v = (id) => document.getElementById(id)?.value.trim() || '';
  const title = v('pj-title'), brand = v('pj-brand'), domain = v('pj-domain'), desc = v('pj-desc');
  if (!title || !brand || !domain || !desc) { alert('Please fill in the title, brand, domain and description.'); return; }
  db.jobs.push({
    id: 'job-' + Date.now(), demo: false, ownerId: state.currentUser.id,
    title, brand, domain,
    budget: v('pj-budget') || 'Negotiable',
    type: v('pj-type') || 'Instagram Reels',
    location: v('pj-location') || 'Remote',
    desc, postedAt: Date.now(), applicants: [],
  });
  save();
  closePostJob();
  ['pj-title', 'pj-budget', 'pj-location', 'pj-desc'].forEach((id) => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderJobs();
}

// ── Applying ───────────────────────────────────────────────────────────────────
export function applyToJob(jobId) {
  if (!state.currentUser) { location.hash = '#/auth?role=creator'; return; }
  const job = jobById(jobId);
  if (!job || hasApplied(job)) return;
  const name = state.currentUser.user_metadata?.full_name || state.currentUser.email?.split('@')[0] || 'Creator';
  job.applicants.push({
    userId: state.currentUser.id,
    name,
    handle: state.userProfile?.ig_handle || '@' + name.toLowerCase().replace(/\s+/g, ''),
    domain: (state.userProfile?.domains?.[0] || 'all').toLowerCase(),
    desc: 'Applied via Trendhona. Check out their profile for content style, audience and past collabs.',
    tags: state.userProfile?.domains || [],
    platforms: ['IG'],
  });
  save();
  renderJobs();
}

// ── Swipe deck ─────────────────────────────────────────────────────────────────
export function openSwipe(jobId) {
  const job = jobById(jobId);
  if (!job || !job.applicants.length) return;
  const dec  = decisions(jobId);
  let queue  = job.applicants.filter((a) => !dec[a.handle]);
  if (!queue.length) queue = [...job.applicants];          // review again → reset
  if (queue.length === job.applicants.length) db.decisions[jobId] = {};
  deck = { job, queue };
  document.getElementById('swipe-overlay').classList.add('show');
  document.addEventListener('keydown', onDeckKey);
  renderDeck();
}

export function closeSwipe() {
  deck = null;
  document.getElementById('swipe-overlay').classList.remove('show');
  document.removeEventListener('keydown', onDeckKey);
  save();
  renderJobs();
}

function onDeckKey(e) {
  if (!deck) return;
  if (e.key === 'ArrowLeft')  decide('pass');
  if (e.key === 'ArrowRight') decide('shortlist');
  if (e.key === 'Escape')     closeSwipe();
}

function renderDeck() {
  const box = document.getElementById('swipe-box');
  if (!box || !deck) return;
  const { job, queue } = deck;
  const total = job.applicants.length;
  const done  = total - queue.length;

  if (!queue.length) { renderDeckResults(box); return; }

  const cards = queue.slice(0, 3).map((a, i) => deckCardHTML(a, i)).reverse().join('');
  box.innerHTML = `
    <div class="swipe-head">
      <div>
        <div class="swipe-job-title">${esc(job.title)}</div>
        <div class="swipe-progress">${done + 1} of ${total} applicants · ← pass · shortlist →</div>
      </div>
      <button class="swipe-close" onclick="closeSwipe()" aria-label="Close">✕</button>
    </div>
    <div class="swipe-deck" id="swipe-deck">${cards}</div>
    <div class="swipe-actions">
      <button class="swipe-act no" onclick="swipeDecide('pass')" aria-label="Pass">✕</button>
      <button class="swipe-act info" onclick="openApplicantDetail()" aria-label="View details">i</button>
      <button class="swipe-act yes" onclick="swipeDecide('shortlist')" aria-label="Shortlist">★</button>
    </div>
    <div class="swipe-detail" id="swipe-detail"></div>`;
  attachDrag();
}

function deckCardHTML(a, i) {
  const grad   = DOMAIN_GRAD[a.domain] || DOMAIN_GRAD.all;
  const avatar = makeAvatar({ name: a.name, _domain: a.domain });
  const tags   = (a.tags || []).slice(0, 3).map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  return `<div class="swipe-card" data-depth="${i}" style="--i:${i}">
    <div class="swipe-card-banner" style="background:linear-gradient(135deg,${grad[0]},${grad[1]})"></div>
    <img class="swipe-avatar" src="${avatar}" alt="${esc(a.name)}">
    <div class="swipe-card-body">
      <div class="swipe-name">${esc(a.name)}</div>
      <div class="swipe-handle">${esc(a.handle)}${a.rank ? ` · #${a.rank} in ${esc(DOMAIN_META[a.domain]?.label || a.domain)}` : ''}</div>
      <p class="swipe-desc">${esc(a.desc)}</p>
      <div class="swipe-tags">${tags}</div>
      <div class="swipe-hint">Tap card for full profile</div>
    </div>
    <span class="stamp stamp-yes">SHORTLIST</span>
    <span class="stamp stamp-no">PASS</span>
  </div>`;
}

function attachDrag() {
  const card = document.querySelector('#swipe-deck .swipe-card[data-depth="0"]');
  if (!card) return;
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, moved = false;

  const onMove = (e) => {
    if (!dragging) return;
    dx = e.clientX - startX; dy = e.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
    card.style.transition = 'none';
    card.style.transform = `translate(${dx}px,${dy * 0.35}px) rotate(${dx * 0.07}deg)`;
    const yes = card.querySelector('.stamp-yes'), no = card.querySelector('.stamp-no');
    yes.style.opacity = Math.min(Math.max(dx, 0) / 90, 1);
    no.style.opacity  = Math.min(Math.max(-dx, 0) / 90, 1);
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    card.releasePointerCapture?.(card._pid);
    if (dx > 110)       decide('shortlist');
    else if (dx < -110) decide('pass');
    else {
      card.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1)';
      card.style.transform = '';
      card.querySelector('.stamp-yes').style.opacity = 0;
      card.querySelector('.stamp-no').style.opacity  = 0;
      if (!moved) openApplicantDetail();
    }
    dx = dy = 0;
  };

  card.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    card._pid = e.pointerId;
    card.setPointerCapture(e.pointerId);
  });
  card.addEventListener('pointermove', onMove);
  card.addEventListener('pointerup', onUp);
  card.addEventListener('pointercancel', onUp);
}

function decide(choice) {
  if (!deck || !deck.queue.length) return;
  const a    = deck.queue[0];
  const card = document.querySelector('#swipe-deck .swipe-card[data-depth="0"]');
  decisions(deck.job.id)[a.handle] = choice;
  save();
  if (card) {
    const dir = choice === 'shortlist' ? 1 : -1;
    card.style.transition = 'transform .4s ease, opacity .4s ease';
    card.style.transform  = `translate(${dir * 560}px,-40px) rotate(${dir * 28}deg)`;
    card.style.opacity    = '0';
    card.querySelector(choice === 'shortlist' ? '.stamp-yes' : '.stamp-no').style.opacity = 1;
    setTimeout(() => { if (!deck) return; deck.queue.shift(); renderDeck(); }, 320);
  } else {
    deck.queue.shift(); renderDeck();
  }
}
export function swipeDecide(choice) { decide(choice); }

// Detail panel — slides over the deck; also reachable by tapping the card
export function openApplicantDetail() {
  if (!deck || !deck.queue.length) return;
  const a      = deck.queue[0];
  const grad   = DOMAIN_GRAD[a.domain] || DOMAIN_GRAD.all;
  const avatar = makeAvatar({ name: a.name, _domain: a.domain });
  const panel  = document.getElementById('swipe-detail');
  if (!panel) return;
  panel.innerHTML = `
    <div class="sd-inner">
      <button class="swipe-close" onclick="closeApplicantDetail()" aria-label="Back">✕</button>
      <img class="swipe-avatar big" src="${avatar}" alt="${esc(a.name)}" style="box-shadow:5px 5px 0 ${grad[0]}">
      <div class="swipe-name">${esc(a.name)}</div>
      <div class="swipe-handle">${esc(a.handle)}</div>
      <div class="sd-stats">
        <div class="sd-stat"><strong>${a.rank ? '#' + a.rank : '—'}</strong><span>Domain rank</span></div>
        <div class="sd-stat"><strong>${(a.platforms || []).join(' + ') || 'IG'}</strong><span>Platforms</span></div>
        <div class="sd-stat"><strong>${esc(DOMAIN_META[a.domain]?.label || a.domain)}</strong><span>Domain</span></div>
      </div>
      <p class="swipe-desc">${esc(a.desc)}</p>
      <div class="swipe-tags">${(a.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div>
      <div class="sd-actions">
        <button class="job-btn" onclick="closeApplicantDetail();swipeDecide('pass')">✕ Pass</button>
        <button class="job-btn primary" onclick="closeApplicantDetail();swipeDecide('shortlist')">★ Shortlist</button>
      </div>
    </div>`;
  panel.classList.add('show');
}
export function closeApplicantDetail() {
  document.getElementById('swipe-detail')?.classList.remove('show');
}

function renderDeckResults(box) {
  const { job } = deck;
  const dec = decisions(job.id);
  const short = job.applicants.filter((a) => dec[a.handle] === 'shortlist');
  const rows = short.length
    ? short.map((a) => {
        const avatar = makeAvatar({ name: a.name, _domain: a.domain });
        return `<div class="sd-row"><img src="${avatar}" alt=""><div><strong>${esc(a.name)}</strong><span>${esc(a.handle)}</span></div><span class="sd-row-star">★</span></div>`;
      }).join('')
    : `<p class="swipe-desc" style="text-align:center">No one shortlisted this round — you can review again anytime.</p>`;
  box.innerHTML = `
    <div class="swipe-head">
      <div>
        <div class="swipe-job-title">All done! 🎉</div>
        <div class="swipe-progress">${short.length} of ${job.applicants.length} shortlisted for “${esc(job.title)}”</div>
      </div>
      <button class="swipe-close" onclick="closeSwipe()" aria-label="Close">✕</button>
    </div>
    <div class="sd-list">${rows}</div>
    <div class="sd-actions" style="padding:0 1.4rem 1.4rem">
      <button class="job-btn primary" style="width:100%" onclick="closeSwipe()">Done →</button>
    </div>`;
}
