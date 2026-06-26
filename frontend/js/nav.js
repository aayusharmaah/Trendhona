import { state } from './state.js';

export function updateNav() {
  const area = document.getElementById('nav-auth-area');
  if (!area) return;
  if (state.currentUser) {
    const name    = state.currentUser.user_metadata?.full_name || state.currentUser.email?.split('@')[0] || 'You';
    const avatar  = state.currentUser.user_metadata?.avatar_url;
    const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    area.innerHTML = `
      <div class="nav-user" tabindex="0" role="button" aria-label="Account menu">
        ${avatar
          ? `<img class="nav-avatar" src="${avatar}" alt="${name}" referrerpolicy="no-referrer">`
          : `<div class="nav-avatar">${initials}</div>`}
        <span class="nav-user-name">${name.split(' ')[0]}</span>
        <div class="nav-user-menu">
          <a onclick="location.hash='#/'">Home</a>
          <a onclick="location.hash='#/directory'">Browse Creators</a>
          <a onclick="location.hash='#/dashboard'" style="color:var(--violet)">My Dashboard</a>
          <a class="sign-out" onclick="signOut()">Sign out</a>
        </div>
      </div>`;
  } else {
    area.innerHTML = `
      <button class="nav-sign-in" onclick="location.hash='#/auth?mode=signin'">Sign in</button>
      <button class="nav-cta" onclick="location.hash='#/auth'">Join Trendhona</button>`;
  }
}
