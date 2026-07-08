// ── Visual FX: custom cursor + scroll-reveal ──────────────────────────────────
// Cursor = violet dot + a ring locked to the same point (they stay together,
// including over buttons where the ring grows concentrically). A click plays a
// one-shot expand-and-return pulse on the ring. Desktop (fine pointer) only;
// skipped entirely for touch devices and for users who prefer reduced motion.

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
  const inner = document.createElement('div');   // holds the visible circle so its
  inner.className = 'cursor-ring-inner';          // click pulse multiplies with the
  ring.appendChild(inner);                        // ring's hover scale
  dot.className  = 'cursor-dot';
  ring.className = 'cursor-ring';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring);

  // Dot and ring share one position — they never drift apart.
  window.addEventListener('mousemove', (e) => {
    const t = `translate(${e.clientX}px,${e.clientY}px)`;
    dot.style.transform = t;
    ring.style.transform = t;
    if (!dot.classList.contains('is-active')) {
      dot.classList.add('is-active');
      ring.classList.add('is-active');
    }
  });

  const HOVER = 'a,button,[onclick],label,select,.dtile,.creator-card,.plan-card,.role-card,.nav-user,.swipe-card,.job-card';
  const TEXT  = 'input,textarea';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(TEXT))       ring.classList.add('is-text');
    else if (e.target.closest(HOVER)) ring.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(TEXT))  ring.classList.remove('is-text');
    if (e.target.closest(HOVER)) ring.classList.remove('is-hover');
  });

  // Click → replay the expand-and-return pulse (retrigger via reflow so rapid
  // clicks each animate from the start).
  window.addEventListener('mousedown', () => {
    ring.classList.remove('is-click');
    void ring.offsetWidth;
    ring.classList.add('is-click');
  });
  ring.addEventListener('animationend', () => ring.classList.remove('is-click'));

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
