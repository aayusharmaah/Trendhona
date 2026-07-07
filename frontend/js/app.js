// ── Main entry point ──────────────────────────────────────────────────────────
// Imports all modules, wires up the router, restores the session, and exposes
// the functions that HTML onclick= attributes call.

import { state } from './state.js';
import { sb, loadProfile, hydrateLiveData } from './api.js';
import { updateNav } from './nav.js';
import {
  signInWithGoogle, signOut, authMode, pickRole, showRolePick, proceedWithRole,
  toggleChip, showSuccess, submitCreator, submitBrand, submitSignIn,
  showOnboarding, closeOnboard, obPickRole, obNext, obBack, obSaveCreator, obSaveBrand,
  renderLeftPanel,
} from './auth.js';
import {
  buildRail, setBanner, render, getCreators, switchTab, handleSearch,
} from './directory.js';
import { renderDashboard, dashSetPeriod } from './dashboard.js';
import { DOMAIN_META } from './data.js';
import { initFX } from './fx.js';

// ── Expose functions for HTML onclick= handlers ───────────────────────────────
Object.assign(window, {
  // Auth
  signInWithGoogle, signOut, authMode, pickRole, showRolePick, proceedWithRole,
  toggleChip, showSuccess, submitCreator, submitBrand, submitSignIn,
  // Onboarding
  showOnboarding, closeOnboard, obPickRole, obNext, obBack, obSaveCreator, obSaveBrand,
  // Directory
  switchTab, handleSearch,
  // Dashboard
  dashSetPeriod,
  // Landing helpers
  goSearch(value) {
    const q = (value || '').trim();
    location.hash = '#/directory' + (q ? '?q=' + encodeURIComponent(q) : '');
  },
  goDomain(d) {
    location.hash = '#/directory?d=' + encodeURIComponent(d);
  },
  selectPlan(planId) {
    const labels = { monthly: 'Monthly (₹299/mo)', quarterly: 'Quarterly (₹149/mo)', annual: 'Annual (₹99/mo)' };
    alert(`Payments coming soon — you picked the ${labels[planId] || planId} plan. We'll email you when checkout is live.`);
  },
});

// ── Router ─────────────────────────────────────────────────────────────────────
function showPage(name) {
  document.getElementById('page-home').hidden      = (name !== 'home');
  document.getElementById('page-directory').hidden = (name !== 'directory');
  document.getElementById('page-auth').hidden      = (name !== 'auth');
  document.getElementById('page-dashboard').hidden = (name !== 'dashboard');
  document.getElementById('page-pricing').hidden   = (name !== 'pricing');
  window.scrollTo(0, 0);
  if (name === 'dashboard') renderDashboard();
}

function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  const [path, query] = raw.split('?');
  const params = new URLSearchParams(query || '');
  return { path: path || '/', params };
}

function router() {
  const { path, params } = parseHash();
  if (path.startsWith('/directory')) {
    showPage('directory');
    const d = params.get('d');
    if (d && DOMAIN_META[d]) {
      const tile = [...document.querySelectorAll('.dtile')]
        .find(b => b.getAttribute('aria-label') === DOMAIN_META[d].title);
      state.currentDomain = d;
      document.querySelectorAll('.dtile').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      if (tile) { tile.classList.add('active'); tile.setAttribute('aria-selected', 'true'); }
      setBanner(d);
    }
    const q   = params.get('q');
    const box = document.getElementById('globalSearch');
    if (q && box) {
      box.value = q;
      state.currentDomain = state.currentDomain || 'all';
      render(getCreators(state.currentDomain));
      handleSearch(q);
    } else {
      render(getCreators(state.currentDomain));
    }
  } else if (path.startsWith('/dashboard')) {
    showPage('dashboard');
  } else if (path.startsWith('/pricing')) {
    showPage('pricing');
  } else if (path.startsWith('/auth')) {
    showPage('auth');
    const mode = params.get('mode');
    const role = params.get('role');
    if (mode === 'signin') authMode('signin');
    else { authMode('signup'); if (role) { pickRole(role); proceedWithRole(); } }
  } else {
    showPage('home');
    const anchor = location.hash.split('#')[2];
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }
}

// ── Supabase auth state listener ───────────────────────────────────────────────
sb.auth.onAuthStateChange(async (event, session) => {
  state.currentUser = session?.user ?? null;
  if (state.currentUser) {
    await loadProfile();
    updateNav();
    const { path } = parseHash();
    if (path.startsWith('/dashboard')) renderDashboard();
    if (!state.userProfile && event === 'SIGNED_IN') showOnboarding();
    if (path.startsWith('/auth')) location.hash = '#/';
  } else {
    state.userProfile = null;
    updateNav();
    const { path } = parseHash();
    if (path.startsWith('/dashboard')) renderDashboard();
  }
});

// ── Init directory ─────────────────────────────────────────────────────────────
buildRail();
setBanner('all');
render(getCreators('all'));
hydrateLiveData(() => render(getCreators(state.currentDomain)));

// ── Init auth left panel ───────────────────────────────────────────────────────
renderLeftPanel('default');

// ── Init visual FX (custom cursor + scroll reveal) ─────────────────────────────
initFX();

// ── Hash-based routing ─────────────────────────────────────────────────────────
window.addEventListener('hashchange', router);

// Restore existing session BEFORE running the router so the dashboard gate
// never shows to a logged-in user on a page refresh.
(async () => {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      state.currentUser = session.user;
      await loadProfile();
      updateNav();
    }
  } catch (_) {}
  router();
})();
