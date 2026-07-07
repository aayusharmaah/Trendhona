// ── Visual FX: custom cursor + scroll-reveal ──────────────────────────────────
// Cursor = instant violet dot + lazily-trailing ring that grows over anything
// clickable. Desktop (fine pointer) only; skipped entirely for touch devices
// and for users who prefer reduced motion.

export function initFX() {
  initReveal();

  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  initCursor();
}

function initCursor() {
  document.documentElement.classList.add('fx-cursor');

  const dot  = document.createElement('div');
  const ring = document.createElement('div');
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring);

  let mx = -100, my = -100;   // real mouse position
  let rx = -100, ry = -100;   // ring position (lerps toward mouse)

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px,${my}px)`;
    if (!dot.classList.contains('is-active')) {
      rx = mx; ry = my;
      dot.classList.add('is-active');
      ring.classList.add('is-active');
    }
  });

  (function follow() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(follow);
  })();

  const HOVER = 'a,button,[onclick],label,select,.dtile,.creator-card,.plan-card,.role-card,.nav-user';
  const TEXT  = 'input,textarea';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(TEXT))       ring.classList.add('is-text');
    else if (e.target.closest(HOVER)) ring.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(TEXT))  ring.classList.remove('is-text');
    if (e.target.closest(HOVER)) ring.classList.remove('is-hover');
  });
  window.addEventListener('mousedown', () => ring.classList.add('is-down'));
  window.addEventListener('mouseup',   () => ring.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => { dot.classList.remove('is-active'); ring.classList.remove('is-active'); });
}

// Fade-and-lift cards in as they scroll into view (static sections only —
// creator cards re-render dynamically and are left alone).
function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  document
    .querySelectorAll('.feature-card,.pitch-point,.seo-block,.plan-card,.dstat')
    .forEach((el) => { el.classList.add('reveal'); io.observe(el); });
}
