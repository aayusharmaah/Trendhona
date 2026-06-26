import { sb } from './api.js';
import { state } from './state.js';
import { updateNav } from './nav.js';

// ── Error display ──────────────────────────────────────────────────────────────
export function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  else alert(msg);
}

// ── Google OAuth ───────────────────────────────────────────────────────────────
export async function signInWithGoogle() {
  if (state.selectedRole) sessionStorage.setItem('trendhona_pending_role', state.selectedRole);
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error) showAuthError('Google sign-in failed: ' + error.message);
}

export async function signOut() {
  await sb.auth.signOut();
  state.currentUser = null;
  state.userProfile = null;
  updateNav();
  location.hash = '#/';
}

// ── Auth page UI ───────────────────────────────────────────────────────────────
export function authMode(mode) {
  document.getElementById('form-signup').style.display = mode === 'signup' ? '' : 'none';
  document.getElementById('form-signin').style.display = mode === 'signin' ? '' : 'none';
  document.getElementById('tab-signup').classList.toggle('active', mode === 'signup');
  document.getElementById('tab-signin').classList.toggle('active', mode === 'signin');
  document.getElementById('tab-signup').setAttribute('aria-selected', String(mode === 'signup'));
  document.getElementById('tab-signin').setAttribute('aria-selected', String(mode === 'signin'));
  if (mode === 'signin') renderLeftPanel('default');
  else { showRolePick(); renderLeftPanel(state.selectedRole || 'default'); }
}

export function pickRole(role) {
  state.selectedRole = role;
  document.getElementById('pick-creator').classList.toggle('selected', role === 'creator');
  document.getElementById('pick-brand').classList.toggle('selected', role === 'brand');
  renderLeftPanel(role);
}

export function showRolePick() {
  document.getElementById('signup-role-pick').style.display = '';
  document.getElementById('signup-creator').style.display   = 'none';
  document.getElementById('signup-brand').style.display     = 'none';
  document.getElementById('signup-success').style.display   = 'none';
}

export function proceedWithRole() {
  if (!state.selectedRole) { alert('Please select Creator or Brand to continue.'); return; }
  sessionStorage.setItem('trendhona_pending_role', state.selectedRole);
  signInWithGoogle();
}

export function toggleChip(el) { el.classList.toggle('on'); }
export function showSuccess()   {}
export function submitCreator() { signInWithGoogle(); }
export function submitBrand()   { signInWithGoogle(); }
export function submitSignIn()  { signInWithGoogle(); }

// ── Left panel copy ────────────────────────────────────────────────────────────
const LEFT_CONTENT = {
  creator: {
    heading: 'Grow your creator\n<em>career in India.</em>',
    desc: 'Trendhona puts your profile in front of brands actively searching for creators in your niche. Get discovered, track your growth, and manage collaborations — all from one dashboard.',
    bullets: [
      'Get discovered by brands searching your domain',
      'Track YouTube + Instagram performance in one place',
      'Receive and manage brand collab requests',
      'Improve your Trendhona Score to rank higher',
      'Build credibility with a verified creator profile',
    ],
  },
  brand: {
    heading: 'Connect with India\'s\n<em>best creators.</em>',
    desc: 'Stop scrolling through Instagram looking for the right creator. Trendhona\'s ranked directory gives you instant access to India\'s top voices across Finance, Tech, Fashion, Food, Gaming and Fitness.',
    bullets: [
      'Search ranked creators by domain and audience size',
      'Filter by platform, follower count, and engagement',
      'Connect directly and manage campaign briefs',
      'Track campaign performance across creators',
      'Reach the right audience at the right scale',
    ],
  },
  default: {
    heading: 'India\'s creator\n<em>intelligence platform.</em>',
    desc: 'Whether you\'re a creator wanting to grow, or a brand looking to connect — Trendhona is where India\'s creator economy comes together.',
    bullets: [
      '51 ranked Indian content creators',
      '6 professional domains covered',
      'YouTube + Instagram in one directory',
      'Verified profiles and live data',
      'Free to explore, powerful to use',
    ],
  },
};

export function renderLeftPanel(role) {
  const content = LEFT_CONTENT[role] || LEFT_CONTENT.default;
  const lines   = content.heading.split('\n');
  const headingHtml = lines.map((l, i) => i === 0 ? l : `<br>${l}`).join('');
  const icon = role === 'creator'
    ? `<div style="width:48px;height:48px;background:rgba(124,58,237,.2);border-radius:13px;display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14"/><rect x="2" y="6" width="13" height="12" rx="3"/></svg></div>`
    : role === 'brand'
    ? `<div style="width:48px;height:48px;background:rgba(245,158,11,.15);border-radius:13px;display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg></div>`
    : '';
  document.getElementById('auth-panel-content').innerHTML = `
    ${icon}
    <h2>${headingHtml}</h2>
    <p>${content.desc}</p>
    <ul class="role-bullets">${content.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
}

// ── Onboarding overlay (post-OAuth profile setup) ──────────────────────────────
export function showOnboarding() {
  document.getElementById('onboard-overlay').classList.add('show');
  document.getElementById('ob-step1').style.display          = '';
  document.getElementById('ob-step2-creator').style.display  = 'none';
  document.getElementById('ob-step2-brand').style.display    = 'none';
  document.getElementById('ob-step3').style.display          = 'none';
  const pending = sessionStorage.getItem('trendhona_pending_role');
  if (pending) { obPickRole(pending); sessionStorage.removeItem('trendhona_pending_role'); }
}

export function closeOnboard() {
  document.getElementById('onboard-overlay').classList.remove('show');
}

export function obPickRole(role) {
  state.obRole = role;
  document.getElementById('ob-pick-creator').classList.toggle('selected', role === 'creator');
  document.getElementById('ob-pick-brand').classList.toggle('selected', role === 'brand');
}

export function obNext() {
  if (!state.obRole) { alert('Please choose Creator or Brand.'); return; }
  document.getElementById('ob-step1').style.display         = 'none';
  document.getElementById('ob-step2-creator').style.display = state.obRole === 'creator' ? '' : 'none';
  document.getElementById('ob-step2-brand').style.display   = state.obRole === 'brand'   ? '' : 'none';
}

export function obBack() {
  document.getElementById('ob-step1').style.display         = '';
  document.getElementById('ob-step2-creator').style.display = 'none';
  document.getElementById('ob-step2-brand').style.display   = 'none';
}

export async function obSaveCreator() {
  if (!state.currentUser) return;
  const ig      = document.getElementById('ob-ig').value.trim();
  const domains = [...document.querySelectorAll('#ob-c-domains .on')].map(e => e.textContent);
  const goals   = [...document.querySelectorAll('#ob-c-goals .on')].map(e => e.textContent);
  const { error } = await sb.from('profiles').upsert({
    id:        state.currentUser.id,
    role:      'creator',
    full_name: state.currentUser.user_metadata?.full_name || '',
    ig_handle: ig,
    yt_handle: document.getElementById('ob-yt').value.trim(),
    domains,
    goals,
  });
  if (error) { showAuthError('Could not save profile: ' + error.message); return; }
  state.userProfile = { role: 'creator', ig_handle: ig, domains, goals };
  document.getElementById('ob-step2-creator').style.display = 'none';
  document.getElementById('ob-step3').style.display          = '';
  document.getElementById('ob-success-title').textContent    = 'Creator profile created! 🎉';
  document.getElementById('ob-success-msg').textContent      = 'Welcome to Trendhona. Your profile is live. Watch for brand collab requests in your dashboard soon.';
}

export async function obSaveBrand() {
  if (!state.currentUser) return;
  const brand = document.getElementById('ob-brand').value.trim();
  if (!brand) { alert('Please enter your brand name.'); return; }
  const domains = [...document.querySelectorAll('#ob-b-domains .on')].map(e => e.textContent);
  const { error } = await sb.from('profiles').upsert({
    id:         state.currentUser.id,
    role:       'brand',
    full_name:  state.currentUser.user_metadata?.full_name || '',
    brand_name: brand,
    industry:   document.getElementById('ob-industry').value,
    domains,
    goals:      [],
  });
  if (error) { showAuthError('Could not save profile: ' + error.message); return; }
  state.userProfile = { role: 'brand', brand_name: brand, domains };
  document.getElementById('ob-step2-brand').style.display = 'none';
  document.getElementById('ob-step3').style.display        = '';
  document.getElementById('ob-success-title').textContent  = 'Brand account ready! 🚀';
  document.getElementById('ob-success-msg').textContent    = 'Welcome to Trendhona. Start browsing creators in the directory and connect with the right voices for your brand.';
}
