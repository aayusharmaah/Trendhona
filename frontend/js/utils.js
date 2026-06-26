import { DOMAIN_GRAD, YT_VERIFIED, IG_VERIFIED } from './data.js';
import { LIVE } from './api.js';

export function fmtN(n) {
  n = +n;
  if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return '' + n;
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function makeAvatar(c) {
  const initials = c.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const grad = DOMAIN_GRAD[c._domain] || DOMAIN_GRAD.all;
  const id = 'g' + Math.abs(c.name.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="58" height="58" viewBox="0 0 58 58">
    <defs>
      <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${grad[0]}"/>
        <stop offset="100%" stop-color="${grad[1]}"/>
      </linearGradient>
      <filter id="s${id}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${grad[0]}" flood-opacity="0.35"/>
      </filter>
    </defs>
    <rect width="58" height="58" rx="14" fill="url(#${id})" filter="url(#s${id})"/>
    <text x="29" y="38" font-family="Space Grotesk,Inter,sans-serif" font-size="21" font-weight="700"
      fill="white" text-anchor="middle" letter-spacing="-0.5">${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function ytUrl(c) {
  return (LIVE[c.name]?.url)
    || YT_VERIFIED[c.name]
    || 'https://www.youtube.com/results?search_query=' + encodeURIComponent(c.name + ' India');
}

export function igUrlSafe(c) {
  return IG_VERIFIED[c.name]
    || 'https://www.google.com/search?q=' + encodeURIComponent(c.name + ' Instagram India creator');
}
