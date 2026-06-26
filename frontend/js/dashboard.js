import { state } from './state.js';

// ── Sample data — replaced by real API data once connected ────────────────────
const DASH_DATA = {
  7:  { followers:'89.4K', dF:'+1.2K ↑ this week',   reach:'124K', dR:'+18% vs prev', eng:'6.8%', dE:'+0.4pp ↑', imp:'312K',  dI:'-3% vs prev',
    posts:[{type:'Reel',title:'Marathon training plan',reach:'34K',likes:'4.2K',saves:'890'},{type:'Carousel',title:'5 nutrition myths busted',reach:'28K',likes:'3.1K',saves:'740'},{type:'Reel',title:'5K race prep routine',reach:'21K',likes:'2.8K',saves:'610'}] },
  30: { followers:'89.4K', dF:'+4.8K ↑ this month',  reach:'486K', dR:'+22% vs prev', eng:'6.8%', dE:'+0.9pp ↑', imp:'1.2M',  dI:'-6% vs prev',
    posts:[{type:'Reel',title:'Marathon training plan',reach:'91K',likes:'11.2K',saves:'2.3K'},{type:'Carousel',title:'5 nutrition myths busted',reach:'74K',likes:'8.4K',saves:'1.9K'},{type:'Reel',title:'5K race prep routine',reach:'62K',likes:'7.1K',saves:'1.6K'}] },
  90: { followers:'89.4K', dF:'+11.2K ↑ in 90 days', reach:'1.4M', dR:'+31% vs prev', eng:'6.8%', dE:'+1.2pp ↑', imp:'3.6M',  dI:'-2% vs prev',
    posts:[{type:'Reel',title:'Marathon training plan',reach:'260K',likes:'32K',saves:'6.8K'},{type:'Carousel',title:'5 nutrition myths busted',reach:'210K',likes:'24K',saves:'5.4K'},{type:'Reel',title:'5K race prep routine',reach:'187K',likes:'20K',saves:'4.9K'}] },
};
const AGE_GROUPS = [['18–24',38],['25–34',44],['35–44',12],['45+',6]];
const CITIES     = [['Mumbai','22%'],['Delhi','18%'],['Bengaluru','14%'],['Hyderabad','9%'],['Pune','7%'],['Others','30%']];

function fmtN(n) {
  n = +n;
  if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return '' + n;
}

// ── Public API ─────────────────────────────────────────────────────────────────
export function renderDashboard() {
  const gate = document.getElementById('dash-gate');
  const main = document.getElementById('dash-main');
  if (!gate || !main) return;

  if (!state.currentUser) {
    gate.style.display = '';
    main.style.display = 'none';
    return;
  }
  gate.style.display = 'none';
  main.style.display = '';

  const name    = state.currentUser.user_metadata?.full_name || state.currentUser.email?.split('@')[0] || 'Creator';
  const avatar  = state.currentUser.user_metadata?.avatar_url;
  const ig      = state.userProfile?.ig_handle || '';
  const role    = state.userProfile?.role || 'creator';
  const domains = state.userProfile?.domains || [];

  const avEl = document.getElementById('dph-avatar');
  if (avEl) {
    avEl.innerHTML = avatar
      ? `<img src="${avatar}" alt="${name}" referrerpolicy="no-referrer">`
      : name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
  const nameEl   = document.getElementById('dph-name');   if (nameEl)   nameEl.textContent   = name;
  const handleEl = document.getElementById('dph-handle'); if (handleEl) handleEl.textContent = ig || state.currentUser.email;
  const chipsEl  = document.getElementById('dph-chips');
  if (chipsEl) {
    chipsEl.innerHTML =
      `<span class="dph-chip dph-role-chip">${role === 'creator' ? '🎬 Creator' : '🏢 Brand'}</span>` +
      domains.slice(0, 3).map(d => `<span class="dph-chip">${d}</span>`).join('');
  }

  dashUpdateStats();
  dashDrawCharts();
  dashDrawScore();
  dashRenderPosts();
  dashRenderAudience();
}

export function dashSetPeriod(p, btn) {
  state.dashPeriod = p;
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const labels  = { 7: 'last 7 days', 30: 'last 30 days', 90: 'last 90 days' };
  const slabels = { 7: '7d', 30: '30d', 90: '90d' };
  const plabels = { 7: 'this week', 30: 'this month', 90: 'last 3 months' };
  const cl = document.getElementById('chart-period-label'); if (cl) cl.textContent = labels[p];
  const rl = document.getElementById('ri-period-label');    if (rl) rl.textContent = slabels[p];
  const pl = document.getElementById('posts-period-label'); if (pl) pl.textContent = plabels[p];
  dashUpdateStats();
  dashDrawCharts();
  dashRenderPosts();
}

function dashUpdateStats() {
  const d = DASH_DATA[state.dashPeriod];
  [['ds-followers','dd-followers','followers','dF'],
   ['ds-reach',    'dd-reach',    'reach',    'dR'],
   ['ds-eng',      'dd-eng',      'eng',      'dE'],
   ['ds-imp',      'dd-imp',      'imp',      'dI']].forEach(([vid, did, key, delta]) => {
    const v  = document.getElementById(vid);
    const dd = document.getElementById(did);
    if (v)  v.textContent  = d[key];
    if (dd) { dd.textContent = d[delta]; dd.className = 'dstat-delta ' + (d[delta].includes('↑') ? 'delta-up' : 'delta-dn'); }
  });
}

function dashDrawCharts() {
  if (typeof Chart === 'undefined') { setTimeout(dashDrawCharts, 400); return; }
  const tcol = 'rgba(0,0,0,0.4)', gcol = 'rgba(0,0,0,0.06)';
  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtN(ctx.raw) } } },
    scales: {
      x: { ticks: { font: { size: 10 }, color: tcol, maxRotation: 0, maxTicksLimit: 7 }, grid: { color: gcol } },
      y: { ticks: { font: { size: 10 }, color: tcol, callback: v => fmtN(v) }, grid: { color: gcol } },
    },
  };
  const p    = state.dashPeriod;
  const pts  = p <= 7 ? 8 : p <= 30 ? 11 : 13;
  const step = p <= 7 ? 1 : p <= 30 ? 3  : 7;
  const labels = Array.from({ length: pts }, (_, i) => {
    const d = p - i * step;
    return d === 0 ? 'Today' : `${d}d ago`;
  }).reverse();
  const base = 84600, end = 89400;
  const growth = labels.map((_, i) => Math.round(base + (end - base) * (i / (pts - 1)) + (Math.random() - .4) * 280));
  const peak   = p === 7 ? 19000 : p === 30 ? 17000 : 15000;
  const reach  = labels.map(() => Math.round(peak * (.6 + Math.random() * .4)));
  const imps   = labels.map(() => Math.round(peak * (1.3 + Math.random() * .5)));

  if (state.dashGrowthChart) state.dashGrowthChart.destroy();
  if (state.dashReachChart)  state.dashReachChart.destroy();

  const gc = document.getElementById('dash-growth-chart');
  if (gc) state.dashGrowthChart = new Chart(gc, { type: 'line',
    data: { labels, datasets: [{ data: growth, borderColor: '#7C3AED', borderWidth: 2, pointRadius: 0, fill: true, backgroundColor: 'rgba(124,58,237,0.07)', tension: .38 }] },
    options: baseOpts });

  const rc = document.getElementById('dash-reach-chart');
  if (rc) state.dashReachChart = new Chart(rc, { type: 'bar',
    data: { labels, datasets: [
      { label: 'Impressions', data: imps,  backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 2 },
      { label: 'Reach',       data: reach, backgroundColor: 'rgba(124,58,237,0.55)', borderRadius: 2 },
    ] },
    options: { ...baseOpts, scales: { ...baseOpts.scales, x: { ...baseOpts.scales.x, stacked: false }, y: { ...baseOpts.scales.y, stacked: false } } } });
}

function dashDrawScore() {
  const canvas = document.getElementById('dash-score-ring');
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), cx = 45, cy = 45, r = 36, lw = 7;
  ctx.clearRect(0, 0, 90, 90);
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI * 2 - Math.PI / 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = lw; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, (82 / 100) * Math.PI * 2 - Math.PI / 2);
  ctx.strokeStyle = '#7C3AED'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r - lw - 2, -Math.PI / 2, (66 / 100) * Math.PI * 2 - Math.PI / 2);
  ctx.strokeStyle = '#00C48C'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
}

function dashRenderPosts() {
  const grid = document.getElementById('dash-posts-grid');
  if (!grid) return;
  const posts = DASH_DATA[state.dashPeriod].posts;
  const icons = {
    Reel:     '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14"/><rect x="2" y="6" width="13" height="12" rx="3"/></svg>',
    Carousel: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    Photo:    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  };
  grid.innerHTML = posts.map((p, i) => `
    <div class="post-card">
      <div class="post-card-type">${icons[p.type] || ''}${p.type} · #${i + 1} this period</div>
      <div class="post-card-title">${p.title}</div>
      <div class="post-card-stats">
        <div class="pcstat"><strong>${p.reach}</strong><span>Reach</span></div>
        <div class="pcstat"><strong>${p.likes}</strong><span>Likes</span></div>
        <div class="pcstat"><strong>${p.saves}</strong><span>Saves</span></div>
      </div>
    </div>`).join('');
}

function dashRenderAudience() {
  const ageBars = document.getElementById('aud-age-bars');
  if (ageBars) ageBars.innerHTML = AGE_GROUPS.map(([lbl, pct]) => `
    <div class="aud-bar-row">
      <span class="aud-label">${lbl}</span>
      <div class="aud-track"><div class="aud-fill" style="width:${pct}%"></div></div>
      <span class="aud-pct">${pct}%</span>
    </div>`).join('');
  const cities = document.getElementById('dash-cities');
  if (cities) cities.innerHTML = CITIES.map(([city, pct]) =>
    `<div class="city-row"><span>${city}</span><span>${pct}</span></div>`).join('');
}

// Load Chart.js on demand (dashboard only needs it)
if (typeof Chart === 'undefined') {
  const s   = document.createElement('script');
  s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  s.onload  = () => { if (document.getElementById('dash-growth-chart') && state.currentUser) dashDrawCharts(); };
  document.head.appendChild(s);
}
