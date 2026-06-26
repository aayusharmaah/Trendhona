import { CREATORS, DOMAIN_META, ICONS, ORDER, YT_VERIFIED, IG_VERIFIED } from './data.js';
import { state } from './state.js';
import { makeAvatar, cssVar, ytUrl, igUrlSafe } from './utils.js';
import { LIVE } from './api.js';

const YT_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5a3 3 0 0 0-2.1-2.1C19 4.9 12 4.9 12 4.9s-7 0-8.9.5A3 3 0 0 0 1 7.5 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5A3 3 0 0 0 23 16.5 31 31 0 0 0 23.5 12 31 31 0 0 0 23 7.5ZM9.8 15.3V8.7l5.7 3.3Z"/></svg>';
const IG_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.1.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.1-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.1-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.1 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.8-11.1a1.5 1.5 0 1 0 1.5 1.5 1.5 1.5 0 0 0-1.5-1.5Z"/></svg>';

export function getCreators(domain) {
  if (domain === 'all') {
    return Object.entries(CREATORS).flatMap(([d, list]) => list.map(c => ({ ...c, _domain: d })));
  }
  return CREATORS[domain].map(c => ({ ...c, _domain: domain }));
}

function renderCreator(c) {
  const accent  = cssVar(DOMAIN_META[c._domain]?.var || '--c-all');
  const isTop3  = c.rank <= 3;
  const platTags = c.platforms.map(p => {
    const isYT    = p === 'YT';
    const url     = isYT ? ytUrl(c) : igUrlSafe(c);
    const verified = isYT ? !!YT_VERIFIED[c.name] : !!IG_VERIFIED[c.name];
    const cls     = isYT ? 'yt-tag' : 'ig-tag';
    const svg     = isYT ? YT_SVG : IG_SVG;
    const label   = isYT ? 'YouTube' : 'Instagram';
    const tip     = verified ? `Visit ${c.name} on ${label}` : `Search ${c.name} on ${label}`;
    return `<a class="platform-tag ${cls}" href="${url}" target="_blank" rel="noopener" title="${tip}" aria-label="${tip}">${svg}${label}</a>`;
  }).join('');
  const chips   = c.tags.map(t => `<span class="chip">${t}</span>`).join('');
  const live    = LIVE[c.name];
  const ytSubs  = live?.subs || c.yt;
  const metrics = c.platforms.includes('YT') && c.platforms.includes('IG')
    ? `<div class="metric"><div class="metric-val">${ytSubs}</div><div class="metric-lbl">YT subscribers</div></div><div class="metric"><div class="metric-val">${c.ig}</div><div class="metric-lbl">IG followers</div></div>`
    : c.platforms.includes('YT')
    ? `<div class="metric"><div class="metric-val">${ytSubs}</div><div class="metric-lbl">YT subscribers</div></div>`
    : `<div class="metric"><div class="metric-val">${c.ig}</div><div class="metric-lbl">IG followers</div></div>`;
  const fallback    = makeAvatar(c);
  const photoSrc    = live?.photo || fallback;
  const verifiedDot = live?.photo ? '<span class="live-dot" title="Live photo from YouTube"></span>' : '';

  return `<article class="creator-card${isTop3 ? ' top3' : ''}" style="--card-accent:${accent}" itemscope itemtype="https://schema.org/Person" aria-label="${c.name}, ${c.handle}">
    <div class="rank-badge">${isTop3 ? '★ ' : '#'}${c.rank}</div>
    <div class="creator-card-top">
      <div class="avatar-wrap">
        <img class="avatar-img" src="${photoSrc}" alt="${c.name}" itemprop="image" width="58" height="58"
             referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallback}'">
        ${verifiedDot}
      </div>
      <div class="creator-info">
        <div class="creator-name" itemprop="name">${c.name}</div>
        <div class="creator-handle" itemprop="alternateName">${c.handle}</div>
        <div class="creator-platforms">${platTags}</div>
      </div>
    </div>
    <p class="creator-desc" itemprop="description">${c.desc}</p>
    <div class="creator-chips">${chips}</div>
    <div class="creator-metrics">${metrics}</div>
  </article>`;
}

export function buildRail() {
  const rail = document.getElementById('domain-rail');
  rail.innerHTML = ORDER.map(d => {
    const m     = DOMAIN_META[d];
    const count = getCreators(d).length;
    return `<button class="dtile${d === 'all' ? ' active' : ''}" role="tab" aria-selected="${d === 'all'}"
      style="--tile:var(${m.var});--tile-soft:var(${m.var}-soft)" onclick="switchTab('${d}',this)" aria-label="${m.title}">
      <span class="dtile-ic" aria-hidden="true">${ICONS[d]}</span>
      <span class="dtile-label">${m.label}</span>
      <span class="dtile-count">${count}</span>
    </button>`;
  }).join('');
}

export function setBanner(domain) {
  const m = DOMAIN_META[domain];
  const c = cssVar(m.var);
  document.getElementById('banner-title').textContent = m.title;
  document.getElementById('banner-desc').textContent  = m.desc;
  document.getElementById('domain-banner').style.setProperty('--banner-bg',
    `linear-gradient(110deg, ${c}, color-mix(in srgb, ${c} 55%, #6C3FF5))`);
}

export function render(list) {
  const grid = document.getElementById('grid-main');
  grid.innerHTML = list.map(renderCreator).join('');
  document.getElementById('no-results').classList.toggle('show', list.length === 0);
  document.getElementById('count-pill').textContent = list.length + ' creators';
}

export function switchTab(domain, btn) {
  state.currentDomain = domain;
  document.querySelectorAll('.dtile').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  document.getElementById('globalSearch').value = '';
  setBanner(domain);
  render(getCreators(domain));
}

export function handleSearch(q) {
  const query = q.toLowerCase().trim();
  const base  = getCreators(state.currentDomain);
  if (!query) { render(base); return; }
  render(base.filter(c =>
    c.name.toLowerCase().includes(query) ||
    c.handle.toLowerCase().includes(query) ||
    c.desc.toLowerCase().includes(query) ||
    c.tags.some(t => t.toLowerCase().includes(query))
  ));
}
