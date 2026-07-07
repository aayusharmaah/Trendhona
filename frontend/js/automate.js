// ── Content Automation Studio ─────────────────────────────────────────────────
// Creator pastes reference reels (link + that reel's script), picks a topic,
// tone and length, and gets Hook / Problem / Solution / CTA scripts they can
// assign to dates on a content calendar. Persists to localStorage.
//
// AI-SWAP POINT: buildScript() is the only place scripts are authored. To move
// to real AI later, replace its body with a fetch to a backend endpoint that
// calls the Claude API with the same params and returns {hook,problem,solution,cta}.

import { state } from './state.js';

const LS_KEY = 'th_automate_v1';

// db = { refs: [{link, script}], scripts: [...], schedule: {'YYYY-MM-DD': [id,...]} }
let db = null;
let assignMode = null;              // script id currently being assigned
let calOffset = 0;                  // months from current month
let selLen = 30;                    // selected script length in seconds (10–180)

const FORTES = [
  'Storytelling', 'Educating', 'Comedy / Humour', 'Hot Takes',
  'Tutorials', 'Reviews', 'Vlogs', 'Interviews',
];
// Forte → suggested script tone
const FORTE_TONE = {
  'Storytelling': 'story', 'Comedy / Humour': 'entertaining', 'Vlogs': 'entertaining',
  'Hot Takes': 'bold', 'Educating': 'educational', 'Tutorials': 'educational',
  'Reviews': 'educational', 'Interviews': 'story',
};

function fmtLen(s) {
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}m ${r}s` : `${m} min`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── Storage ────────────────────────────────────────────────────────────────────
function load() {
  try { db = JSON.parse(localStorage.getItem(LS_KEY)); } catch (_) { db = null; }
  if (!db || typeof db !== 'object') db = {};
  db.refs     = Array.isArray(db.refs) ? db.refs : [{ link: '', script: '' }];
  db.scripts  = Array.isArray(db.scripts) ? db.scripts : [];
  db.schedule = db.schedule && typeof db.schedule === 'object' ? db.schedule : {};
  db.profile  = db.profile && typeof db.profile === 'object' ? db.profile : {};
  db.profile.fortes = Array.isArray(db.profile.fortes) ? db.profile.fortes : [];
  db.profile.topics = typeof db.profile.topics === 'string' ? db.profile.topics : '';
  if (typeof db.profile.len === 'number') selLen = Math.min(180, Math.max(10, db.profile.len));
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (_) {}
}

export function initAutomate() { load(); }

// ── Page render ────────────────────────────────────────────────────────────────
export function renderAutomate() {
  const gate = document.getElementById('auto-gate');
  const main = document.getElementById('auto-main');
  if (!gate || !main) return;
  if (!state.currentUser) {
    gate.style.display = '';
    main.style.display = 'none';
    return;
  }
  gate.style.display = 'none';
  main.style.display = '';

  const topicEl = document.getElementById('auto-topic');
  if (topicEl && !topicEl.value) {
    topicEl.value = state.userProfile?.domains?.[0] || '';
  }
  const topicsEl = document.getElementById('auto-topics');
  if (topicsEl && !topicsEl.value) topicsEl.value = db.profile.topics;
  renderFortes();
  renderRefs();
  renderLenSlider();
  renderScripts();
  renderCalendar();
}

// ── Step 1: forte & topics ─────────────────────────────────────────────────────
function renderFortes() {
  const wrap = document.getElementById('auto-fortes');
  if (!wrap) return;
  wrap.innerHTML = FORTES.map((f) =>
    `<button class="jchip${db.profile.fortes.includes(f) ? ' active' : ''}" onclick="toggleForte('${f}')">${f}</button>`
  ).join('');
}

export function toggleForte(f) {
  const i = db.profile.fortes.indexOf(f);
  if (i === -1) db.profile.fortes.push(f); else db.profile.fortes.splice(i, 1);
  save();
  renderFortes();
  // Suggest a matching tone from the most recently picked forte
  if (i === -1 && FORTE_TONE[f]) {
    const toneEl = document.getElementById('auto-tone');
    if (toneEl) toneEl.value = FORTE_TONE[f];
  }
}

export function updateTopics(v) {
  db.profile.topics = v;
  save();
}

// ── Step 1: reference reels ────────────────────────────────────────────────────
function renderRefs() {
  const wrap = document.getElementById('ref-list');
  if (!wrap) return;
  wrap.innerHTML = db.refs.map((r, i) => `
    <div class="ref-row">
      <div class="ref-row-head">
        <input class="f-input" type="url" placeholder="https://instagram.com/reel/…" value="${esc(r.link)}"
               oninput="updateRef(${i},'link',this.value)">
        <button class="ref-del" onclick="removeRefRow(${i})" aria-label="Remove reference">✕</button>
      </div>
      <textarea class="f-input" rows="3" placeholder="Paste that reel's script / transcript here — the generator mines it for topics and phrasing…"
                oninput="updateRef(${i},'script',this.value)">${esc(r.script)}</textarea>
    </div>`).join('');
  const count = db.refs.filter((r) => r.script.trim()).length;
  const badge = document.getElementById('ref-count');
  if (badge) badge.textContent = count ? `${count} reference script${count === 1 ? '' : 's'} loaded` : 'No reference scripts yet';
}

export function updateRef(i, field, value) {
  if (!db.refs[i]) return;
  db.refs[i][field] = value;
  save();
  const count = db.refs.filter((r) => r.script.trim()).length;
  const badge = document.getElementById('ref-count');
  if (badge) badge.textContent = count ? `${count} reference script${count === 1 ? '' : 's'} loaded` : 'No reference scripts yet';
}
export function addRefRow()    { db.refs.push({ link: '', script: '' }); save(); renderRefs(); }
export function removeRefRow(i) { db.refs.splice(i, 1); if (!db.refs.length) db.refs.push({ link: '', script: '' }); save(); renderRefs(); }

// ── Keyword mining from pasted reference scripts ───────────────────────────────
const STOP = new Set(('a an the and or but if then this that these those i you your yours we our they them he she it its is are was were be been being do does did have has had will would can could should shall may might must not no yes so to of in on at by for with from as about into over after before between out up down off again once here there when where why how all any both each few more most other some such only own same than too very just dont cant wont im ive youre thats what which who whom while during also get got make makes made like want need one two three first because really going know see way time people thing things').split(' '));

function mineKeywords() {
  const text = db.refs.map((r) => r.script).join(' ').toLowerCase();
  const tokens = text.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const good = (w) => w.length > 3 && !STOP.has(w);
  const freq = {};
  tokens.forEach((w) => { if (good(w)) freq[w] = (freq[w] || 0) + 1; });

  // Prefer two-word phrases ("mutual funds") over lone words ("mutual") —
  // score a pair by its parts' frequencies so repeated concepts float up.
  const pairs = {};
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i], b = tokens[i + 1];
    if (good(a) && good(b)) {
      const key = a + ' ' + b;
      pairs[key] = (pairs[key] || 0) + freq[a] + freq[b];
    }
  }
  const bigrams = Object.entries(pairs).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k]) => k);
  const used = new Set(bigrams.flatMap((bg) => bg.split(' ')));
  const singles = Object.entries(freq)
    .filter(([w]) => !used.has(w))
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
  return [...bigrams, ...singles].slice(0, 6);
}

// ── Generation controls: drag slider for script length ────────────────────────
function renderLenSlider() {
  const slider = document.getElementById('auto-len-slider');
  const label  = document.getElementById('len-value');
  if (slider) slider.value = selLen;
  if (label)  label.textContent = fmtLen(selLen);
}
export function setAutoLen(s) {
  selLen = Math.min(180, Math.max(10, +s || 30));
  db.profile.len = selLen;
  save();
  const label = document.getElementById('len-value');
  if (label) label.textContent = fmtLen(selLen);
}

// ── The script engine (template-based; see AI-SWAP POINT at top) ───────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const cap  = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const HOOKS = {
  educational: [
    'If you’re serious about {topic}, stop scrolling — this one’s for you.',
    'Nobody teaches you this about {topic}, so I will right now.',
    'Here’s the {topic} framework I wish someone gave me when I started.',
    '{Kw1} is the most misunderstood part of {topic}. Let me fix that in one video.',
  ],
  bold: [
    'Everything you’ve been told about {topic} is wrong.',
    'Hot take: {kw1} is completely overrated — and I can prove it.',
    'I’m about to make a lot of {topic} gurus very uncomfortable.',
    'Stop doing {kw1}. Seriously. Here’s what to do instead.',
  ],
  entertaining: [
    'POV: you finally crack {topic} and your whole feed changes overnight.',
    'I tried {kw1} every day for 30 days so you don’t have to.',
    'Rating the worst {topic} advice on the internet — number 3 hurt me.',
    'Tell me you’re struggling with {topic} without telling me… I’ll go first.',
  ],
  story: [
    'Two years ago I knew nothing about {topic}. Last week a brand paid me to talk about it.',
    'One {kw1} mistake cost me six months of growth. Here’s the whole story.',
    'The DM that changed how I think about {topic} forever.',
    'I almost quit {topic} last year. This is what kept me going.',
  ],
};

const PROBLEM_INTRO = [
  'Here’s the problem: most people approach {topic} completely backwards.',
  'The truth? Most creators struggle with {kw1} because nobody breaks it down simply.',
  'Everyone wants results in {topic}, but almost no one fixes the thing actually holding them back.',
  'The hard part isn’t effort — it’s that the usual {topic} advice skips the fundamentals.',
];
const PROBLEM_MORE = [
  'They copy trends without understanding why those trends work.',
  'And the longer you wait, the harder {kw2} gets to catch up on.',
  'Scrolling for answers just leaves you with ten conflicting opinions.',
  'You post consistently, but consistency without direction is just noise.',
  'Meanwhile the algorithm rewards clarity — and punishes confusion.',
  'That gap between effort and results? It kills more creators than any algorithm change.',
];

const SOLUTION_INTRO = [
  'So here’s what actually works:',
  'Here’s the fix, step by step:',
  'Do this instead:',
];
const SOLUTION_STEPS = [
  'Start with {kw1} — nail the basics before anything fancy.',
  'Break {topic} into one clear idea per post. Confused audiences never follow.',
  'Study three top creators in {topic} and write down the first three seconds of every reel they post.',
  'Batch your content weekly so consistency stops depending on motivation.',
  'Track what your audience saves and shares — then double down on exactly those formats.',
  'Turn {kw2} into a recurring series. Familiarity is what builds a loyal audience.',
  'Rewrite every caption to answer one question: why should a stranger care in the first line?',
  'Spend as much time on your hook as on the rest of the video combined.',
];
const SOLUTION_CLOSE = [
  'Do this for 30 days straight and compare — the difference will shock you.',
  'None of this needs fancy gear. It needs you to start today.',
  'Small hinges swing big doors. This is the hinge.',
];

const CTAS = {
  educational: [
    'Follow for more {topic} breakdowns like this one.',
    'Save this so you don’t lose it — and send it to a friend who needs it.',
  ],
  bold: [
    'Disagree? Tell me in the comments — I read every one.',
    'Follow if you want {topic} advice nobody else will say out loud.',
  ],
  entertaining: [
    'Follow for part two — it gets worse before it gets better.',
    'Comment your worst {topic} moment. Best one gets a shoutout.',
  ],
  story: [
    'Follow to see how the next chapter goes.',
    'If this hit home, share it with someone at the start of their {topic} journey.',
  ],
};

function fill(tpl, ctx) {
  return tpl
    .replace(/\{topic\}/g, ctx.topic)
    .replace(/\{kw1\}/g, ctx.kw1)
    .replace(/\{Kw1\}/g, cap(ctx.kw1))
    .replace(/\{kw2\}/g, ctx.kw2);
}

function buildScript({ topic, tone, seconds, keywords }) {
  const kws = keywords.length ? keywords : ['consistency', 'engagement', 'growth'];
  const ctx = { topic, kw1: pick(kws), kw2: pick(kws) };
  if (ctx.kw2 === ctx.kw1 && kws.length > 1) ctx.kw2 = kws[(kws.indexOf(ctx.kw1) + 1) % kws.length];

  // Longer scripts get more problem agitation and more solution steps
  const nProblem = seconds <= 15 ? 0 : seconds <= 45 ? 1 : seconds <= 90 ? 2 : 3;
  const nSteps   = seconds <= 15 ? 1 : seconds <= 30 ? 2 : seconds <= 60 ? 3 : seconds <= 90 ? 4 : seconds <= 120 ? 5 : 6;

  const problemParts = [fill(pick(PROBLEM_INTRO), ctx)];
  const morePool = [...PROBLEM_MORE];
  for (let i = 0; i < nProblem; i++) {
    const idx = Math.floor(Math.random() * morePool.length);
    problemParts.push(fill(morePool.splice(idx, 1)[0], ctx));
  }

  const stepPool = [...SOLUTION_STEPS];
  const steps = [];
  for (let i = 0; i < nSteps; i++) {
    const idx = Math.floor(Math.random() * stepPool.length);
    steps.push((nSteps > 1 ? `${i + 1}. ` : '') + fill(stepPool.splice(idx, 1)[0], ctx));
  }
  const solutionParts = [fill(pick(SOLUTION_INTRO), ctx), ...steps];
  if (seconds >= 60) solutionParts.push(fill(pick(SOLUTION_CLOSE), ctx));

  return {
    hook:     fill(pick(HOOKS[tone] || HOOKS.educational), ctx),
    problem:  problemParts.join(' '),
    solution: solutionParts.join('\n'),
    cta:      fill(pick(CTAS[tone] || CTAS.educational), ctx),
  };
}

function wordCount(sc) {
  return [sc.hook, sc.problem, sc.solution, sc.cta].join(' ').split(/\s+/).filter(Boolean).length;
}

export function generateScriptsUI() {
  const manual = (document.getElementById('auto-topic')?.value || '').trim();
  const listed = db.profile.topics.split(/[,\n]/).map((t) => t.trim()).filter(Boolean);
  // Manual niche wins; otherwise rotate through the topics the creator listed
  const topics = manual ? [manual] : (listed.length ? listed : ['content creation']);
  const tone  = document.getElementById('auto-tone')?.value || 'educational';
  const keywords = mineKeywords();
  // If no reference scripts were mined, fall back to words from their listed topics
  if (!keywords.length) {
    listed.join(' ').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w)).slice(0, 4)
      .forEach((w) => keywords.push(w));
  }
  const refCount = db.refs.filter((r) => r.script.trim()).length;

  for (let i = 0; i < 3; i++) {
    const topic = topics[i % topics.length];
    const body = buildScript({ topic, tone, seconds: selLen, keywords });
    db.scripts.unshift({
      id: 's' + Date.now() + '-' + i,
      topic, tone, seconds: selLen, refCount,
      fortes: [...db.profile.fortes],
      ...body,
      createdAt: Date.now(),
    });
  }
  save();
  renderScripts();
  document.getElementById('auto-scripts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Script cards ───────────────────────────────────────────────────────────────
const lenLabel = fmtLen;

function scheduledDatesFor(id) {
  return Object.entries(db.schedule)
    .filter(([, ids]) => ids.includes(id))
    .map(([date]) => date)
    .sort();
}

function renderScripts() {
  const wrap = document.getElementById('auto-scripts');
  if (!wrap) return;
  if (!db.scripts.length) {
    wrap.innerHTML = '<div class="no-jobs">No scripts yet — add your references above and hit Generate.</div>';
    return;
  }
  wrap.innerHTML = db.scripts.map((sc) => {
    const words = wordCount(sc);
    const est   = Math.round(words / 2.4);
    const dates = scheduledDatesFor(sc.id);
    const dateChips = dates.map((d) => `<span class="sc-date">📅 ${d}</span>`).join('');
    return `<article class="script-card">
      <div class="sc-meta">
        <span class="job-pill" style="background:var(--violet-xlight);color:var(--violet);border-color:var(--violet-light)">${esc(sc.topic)}</span>
        <span class="job-pill">${lenLabel(sc.seconds)} target</span>
        <span class="job-pill">≈ ${est}s spoken · ${words} words</span>
        <span class="job-pill">${esc(sc.tone)}</span>
        ${sc.refCount ? `<span class="job-pill">${sc.refCount} refs mined</span>` : ''}
      </div>
      <div class="sc-section"><span class="sc-tag hook">🎬 Hook</span><p>${esc(sc.hook)}</p></div>
      <div class="sc-section"><span class="sc-tag problem">⚠️ Problem</span><p>${esc(sc.problem)}</p></div>
      <div class="sc-section"><span class="sc-tag solution">✅ Solution</span><p>${esc(sc.solution).replace(/\n/g, '<br>')}</p></div>
      <div class="sc-section"><span class="sc-tag cta">📣 CTA</span><p>${esc(sc.cta)}</p></div>
      ${dateChips ? `<div class="sc-dates">${dateChips}</div>` : ''}
      <div class="sc-actions">
        <button class="job-btn primary" onclick="assignScript('${sc.id}')">📅 Assign to date</button>
        <button class="job-btn" onclick="copyScript('${sc.id}', this)">Copy</button>
        <button class="job-btn" onclick="regenScript('${sc.id}')">↻ Regenerate</button>
        <button class="job-btn" onclick="deleteScript('${sc.id}')">🗑</button>
      </div>
    </article>`;
  }).join('');
}

export function copyScript(id, btn) {
  const sc = db.scripts.find((s) => s.id === id);
  if (!sc) return;
  const text = `🎬 HOOK\n${sc.hook}\n\n⚠️ PROBLEM\n${sc.problem}\n\n✅ SOLUTION\n${sc.solution}\n\n📣 CTA\n${sc.cta}`;
  navigator.clipboard?.writeText(text).then(() => {
    if (btn) { const t = btn.textContent; btn.textContent = '✓ Copied'; setTimeout(() => { btn.textContent = t; }, 1400); }
  });
}

export function regenScript(id) {
  const i = db.scripts.findIndex((s) => s.id === id);
  if (i === -1) return;
  const old = db.scripts[i];
  const body = buildScript({ topic: old.topic, tone: old.tone, seconds: old.seconds, keywords: mineKeywords() });
  db.scripts[i] = { ...old, ...body };
  save();
  renderScripts();
}

export function deleteScript(id) {
  db.scripts = db.scripts.filter((s) => s.id !== id);
  Object.keys(db.schedule).forEach((d) => {
    db.schedule[d] = db.schedule[d].filter((x) => x !== id);
    if (!db.schedule[d].length) delete db.schedule[d];
  });
  if (assignMode === id) cancelAssign();
  save();
  renderScripts();
  renderCalendar();
}

// ── Step 4: content calendar ───────────────────────────────────────────────────
export function assignScript(id) {
  assignMode = id;
  const banner = document.getElementById('auto-assign-banner');
  if (banner) {
    const sc = db.scripts.find((s) => s.id === id);
    banner.hidden = false;
    banner.querySelector('span').textContent = `Pick a date for: “${sc ? sc.hook.slice(0, 60) : ''}…”`;
  }
  document.getElementById('auto-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderCalendar();
}
export function cancelAssign() {
  assignMode = null;
  const banner = document.getElementById('auto-assign-banner');
  if (banner) banner.hidden = true;
  renderCalendar();
}

export function calPrev() { calOffset--; renderCalendar(); }
export function calNext() { calOffset++; renderCalendar(); }

export function calClickDay(dateStr) {
  if (assignMode) {
    db.schedule[dateStr] = db.schedule[dateStr] || [];
    if (!db.schedule[dateStr].includes(assignMode)) db.schedule[dateStr].push(assignMode);
    save();
    cancelAssign();
    renderScripts();
    renderCalendar();
  }
}

function renderCalendar() {
  const grid  = document.getElementById('cal-grid');
  const title = document.getElementById('cal-title');
  if (!grid || !title) return;

  const now   = new Date();
  const view  = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
  const year  = view.getFullYear(), month = view.getMonth();
  title.textContent = view.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const firstDay    = (new Date(year, month, 1).getDay() + 6) % 7;  // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ids = db.schedule[dateStr] || [];
    const chips = ids.map((id) => {
      const sc = db.scripts.find((s) => s.id === id);
      if (!sc) return '';
      return `<button class="cal-chip" onclick="event.stopPropagation();openScriptModal('${id}','${dateStr}')" title="${esc(sc.hook)}">${esc(sc.hook.slice(0, 22))}…</button>`;
    }).join('');
    const cls = ['cal-day'];
    if (dateStr === todayStr) cls.push('today');
    if (assignMode) cls.push('assignable');
    html += `<div class="${cls.join(' ')}" onclick="calClickDay('${dateStr}')"><span class="cal-num">${d}</span>${chips}</div>`;
  }
  grid.innerHTML = html;
}

// ── Script modal (from calendar chips) ─────────────────────────────────────────
export function openScriptModal(id, dateStr) {
  const sc = db.scripts.find((s) => s.id === id);
  const overlay = document.getElementById('script-modal');
  if (!sc || !overlay) return;
  overlay.querySelector('.onboard-box').innerHTML = `
    <h2>📅 ${esc(dateStr)}</h2>
    <p>${lenLabel(sc.seconds)} · ${esc(sc.tone)} · ${esc(sc.topic)}</p>
    <div class="sc-section"><span class="sc-tag hook">🎬 Hook</span><p>${esc(sc.hook)}</p></div>
    <div class="sc-section"><span class="sc-tag problem">⚠️ Problem</span><p>${esc(sc.problem)}</p></div>
    <div class="sc-section"><span class="sc-tag solution">✅ Solution</span><p>${esc(sc.solution).replace(/\n/g, '<br>')}</p></div>
    <div class="sc-section"><span class="sc-tag cta">📣 CTA</span><p>${esc(sc.cta)}</p></div>
    <div class="sc-actions" style="margin-top:1rem">
      <button class="job-btn" onclick="copyScript('${sc.id}', this)">Copy</button>
      <button class="job-btn" onclick="unassignScript('${sc.id}','${esc(dateStr)}')">Remove from this date</button>
      <button class="job-btn primary" onclick="closeScriptModal()">Done</button>
    </div>`;
  overlay.classList.add('show');
}
export function closeScriptModal() {
  document.getElementById('script-modal')?.classList.remove('show');
}
export function unassignScript(id, dateStr) {
  if (db.schedule[dateStr]) {
    db.schedule[dateStr] = db.schedule[dateStr].filter((x) => x !== id);
    if (!db.schedule[dateStr].length) delete db.schedule[dateStr];
  }
  save();
  closeScriptModal();
  renderScripts();
  renderCalendar();
}
