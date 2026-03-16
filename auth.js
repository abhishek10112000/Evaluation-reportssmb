/* ═══════════════════════════════════════════════
   EPIC Cars — auth.js
   v4 — completely rewritten, no seed-on-read bug
   ═══════════════════════════════════════════════ */

/* ── Storage Keys ── */
var EPIC_USERS_KEY   = 'epic_users_v4';
var EPIC_SESSION_KEY = 'epic_session_v2';
var EPIC_PDFS_KEY    = 'epic_pdfs_v2';
var EPIC_RECS_KEY    = 'epic_records_v2';
var EPIC_SEEDED_KEY  = 'epic_seeded_v4';   /* one-time flag */

/* ── Role Permissions ── */
var EPIC_PERMS = {
  admin:     { edit:true, delete:true,  viewAll:true,  manageUsers:true,  pdf:true },
  staff:     { edit:true, delete:false, viewAll:false, manageUsers:false, pdf:true },
  evaluator: { edit:true, delete:false, viewAll:false, manageUsers:false, pdf:true },
  sales:     { edit:false,delete:false, viewAll:false, manageUsers:false, pdf:false }
};

/* ══════════════════════════════════════
   USER STORAGE
   epicGetUsers  — ONLY reads, never seeds
   epicSaveUsers — ONLY writes
   epicBootUsers — seeds defaults ONCE,
                   called at boot only
══════════════════════════════════════ */

function epicGetUsers() {
  /* Pure read — never writes, never seeds */
  try {
    var raw = localStorage.getItem(EPIC_USERS_KEY);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch(e) {
    console.error('[EPIC] epicGetUsers parse error', e);
    return [];
  }
}

function epicSaveUsers(arr) {
  /* Pure write */
  try {
    localStorage.setItem(EPIC_USERS_KEY, JSON.stringify(arr));
    return true;
  } catch(e) {
    console.error('[EPIC] epicSaveUsers write error', e);
    return false;
  }
}

function epicBootUsers() {
  /* Called ONCE at page load.
     Seeds only if the seeded-flag has never been set.
     Never runs again after first boot. */
  if (localStorage.getItem(EPIC_SEEDED_KEY)) return;

  /* ── Migration: copy users from any old key into new key ── */
  var migrated = [];
  var oldKeys  = ['epic_users_v2', 'epic_users_v3', 'epic_users'];
  for (var k = 0; k < oldKeys.length; k++) {
    try {
      var raw = localStorage.getItem(oldKeys[k]);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          migrated = parsed;
          console.log('[EPIC] Migrated', parsed.length, 'users from', oldKeys[k]);
          break;
        }
      }
    } catch(e) {}
  }

  if (migrated.length > 0) {
    /* Use migrated users — keep all existing users including added ones */
    epicSaveUsers(migrated);
    localStorage.setItem(EPIC_SEEDED_KEY, '1');
    console.log('[EPIC] Migration complete. Users:', migrated.map(function(u){ return u.username; }).join(', '));
    return;
  }

  var existing = epicGetUsers();
  if (existing.length > 0) {
    localStorage.setItem(EPIC_SEEDED_KEY, '1');
    return;
  }

  /* First ever run — write defaults */
  var defaults = [
    { id:1, name:'Administrator', username:'admin',  email:'admin@epiccars.in',    password:'admin123', role:'admin' },
    { id:2, name:'Staff User 1',  username:'staff1', email:'staff1@epiccars.in',   password:'staff123', role:'staff' }
  ];
  epicSaveUsers(defaults);
  localStorage.setItem(EPIC_SEEDED_KEY, '1');
  console.log('[EPIC] Default users seeded');
}

/* ══════════════════════════════
   SESSION
══════════════════════════════ */
function epicGetSession() {
  try {
    var raw = sessionStorage.getItem(EPIC_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function epicSetSession(user) {
  var s = { id:user.id, username:user.username, role:user.role, name:user.name };
  sessionStorage.setItem(EPIC_SESSION_KEY, JSON.stringify(s));
  return s;
}

function epicClearSession() {
  sessionStorage.removeItem(EPIC_SESSION_KEY);
}

/* Public helpers used by the rest of the app */
function currentUser() { return epicGetSession(); }

function can(perm) {
  var u = currentUser();
  if (!u) return false;
  var perms = EPIC_PERMS[u.role];
  return perms ? !!perms[perm] : false;
}

/* ══════════════════════════════
   LOGIN / LOGOUT
══════════════════════════════ */
function doLogin(username, password) {
  var users = epicGetUsers();
  var input = (username || '').trim().toLowerCase();

  console.log('[EPIC] Login attempt:', input);
  console.log('[EPIC] Users in storage (' + users.length + '):', users.map(function(u){ return u.username; }).join(', '));

  var found = null;
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    /* Match by username OR email — case insensitive */
    var unMatch    = u.username.trim().toLowerCase() === input;
    var emailMatch = u.email && u.email.trim().toLowerCase() === input;
    var pMatch     = u.password === password;
    if ((unMatch || emailMatch) && pMatch) {
      found = u;
      break;
    }
  }

  if (!found) {
    console.log('[EPIC] Login failed — no match');
    return null;
  }

  console.log('[EPIC] Login success:', found.username, '/', found.role);
  return epicSetSession(found);
}

function doLogout() {
  epicClearSession();
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-root').style.display     = 'none';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent    = '';
}

/* ══════════════════════════════
   SCREEN SWITCHING
══════════════════════════════ */
function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-root').style.display     = 'none';
}

function showApp(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-root').style.display     = 'flex';

  var nameEl   = document.getElementById('hdr-name');
  var roleEl   = document.getElementById('hdr-role');
  var avatarEl = document.getElementById('hdr-avatar');
  if (nameEl)   nameEl.textContent   = user.name;
  if (roleEl) { roleEl.textContent   = user.role.toUpperCase();
                roleEl.className     = 'role-badge role-' + user.role; }
  if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();

  applyPerms(user.role);
}

function applyPerms(role) {
  var p = EPIC_PERMS[role] || {};

  /* Users & Password nav — visible to ALL */
  var navEl = document.getElementById('nav-usermgmt');
  if (navEl) navEl.style.display = '';

  /* Admin-only cards hidden for staff */
  setTimeout(function() {
    document.querySelectorAll('.admin-only-card').forEach(function(el) {
      el.style.display = p.manageUsers ? '' : 'none';
    });
  }, 150);

  /* Clear All btn — admin only */
  var clearBtn = document.getElementById('btn-clear-records');
  if (clearBtn) clearBtn.style.display = p.delete ? '' : 'none';

  /* Staff notice banners */
  document.querySelectorAll('.staff-only-notice').forEach(function(el) {
    el.style.display = p.viewAll ? 'none' : 'flex';
  });
}

/* ══════════════════════════════
   LOGIN FORM HANDLERS
══════════════════════════════ */
function handleLogin() {
  var un  = (document.getElementById('login-username').value || '').trim();
  var pw  = document.getElementById('login-password').value  || '';
  var err = document.getElementById('login-error');
  err.textContent = '';

  if (!un || !pw) {
    err.textContent = 'Please enter username and password.';
    return;
  }

  var sess = doLogin(un, pw);
  if (!sess) {
    err.textContent = 'Incorrect username or password.';
    var box = document.getElementById('login-box');
    if (box) {
      box.classList.remove('shake');
      void box.offsetWidth;
      box.classList.add('shake');
    }
    return;
  }
  showApp(sess);
}

function togglePw() {
  var f = document.getElementById('login-password');
  if (f) f.type = (f.type === 'password') ? 'text' : 'password';
}

/* ══════════════════════════════
   USER MANAGEMENT
══════════════════════════════ */
function toggleNewUserPw() {
  var f   = document.getElementById('nu-password');
  var eye = document.getElementById('nu-pw-eye');
  if (!f) return;
  f.type = (f.type === 'password') ? 'text' : 'password';
  if (eye) eye.textContent = (f.type === 'text') ? '🙈' : '👁';
}

function renderUserTable() {
  var tb = document.getElementById('users-tbody');
  if (!tb) return;
  var users = epicGetUsers();
  if (!users.length) {
    tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;">No users found.</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var actions = (u.username === 'admin')
      ? '<span style="color:var(--muted);font-size:11px;">Protected</span>'
      : '<button class="btn btn-secondary" style="padding:4px 10px;font-size:11px;" onclick="resetPW(' + u.id + ')">🔑 Reset PW</button>'
        + ' <button class="btn btn-ghost" style="padding:4px 10px;font-size:11px;color:#ef4444;border-color:#ef444440;" onclick="removeUser(' + u.id + ')">✕ Delete</button>';
    html += '<tr>'
      + '<td>' + u.name + '</td>'
      + '<td><code style="color:var(--accent)">' + u.username + '</code></td>'
      + '<td><span class="role-badge role-' + u.role + '">' + u.role.toUpperCase() + '</span></td>'
      + '<td style="display:flex;gap:6px;flex-wrap:wrap;">' + actions + '</td>'
      + '</tr>';
  }
  tb.innerHTML = html;
}

function addUser() {
  var nameEl = document.getElementById('nu-name');
  var unEl   = document.getElementById('nu-username');
  var pwEl   = document.getElementById('nu-password');
  var roleEl = document.getElementById('nu-role');
  var err    = document.getElementById('nu-error');

  var name = nameEl.value.trim();
  var un   = unEl.value.trim().toLowerCase();
  var pw   = pwEl.value;
  var role = roleEl.value;

  err.textContent = '';
  err.style.color = 'var(--accent)';

  /* Validate */
  if (!name) { err.textContent = 'Full name is required'; return; }
  if (!un)   { err.textContent = 'Username is required'; return; }
  if (!pw)   { err.textContent = 'Password is required'; return; }
  if (pw.length < 4) { err.textContent = 'Password must be at least 4 characters'; return; }
  if (!/^[a-z0-9_]+$/.test(un)) {
    err.textContent = 'Username: only lowercase letters, numbers, underscores';
    return;
  }

  /* Check duplicate */
  var users = epicGetUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === un) {
      err.textContent = 'Username "' + un + '" already exists';
      return;
    }
  }

  /* Build & push new user */
  var newUser = {
    id:       Date.now(),
    name:     name,
    username: un,
    email:    document.getElementById('nu-email') ? document.getElementById('nu-email').value.trim().toLowerCase() : '',
    password: pw,
    role:     role
  };
  users.push(newUser);

  /* Save */
  var ok = epicSaveUsers(users);
  if (!ok) {
    err.textContent = '⚠ Storage write failed. Are you in Incognito mode?';
    return;
  }

  /* Verify by reading back */
  var readback = epicGetUsers();
  var match    = null;
  for (var j = 0; j < readback.length; j++) {
    if (readback[j].username === un) { match = readback[j]; break; }
  }

  if (!match) {
    err.textContent = '⚠ Save did not persist. Try a normal browser window.';
    return;
  }

  if (match.password !== pw) {
    err.textContent = '⚠ Password mismatch in storage. Try again.';
    return;
  }

  /* Success */
  nameEl.value = '';
  unEl.value   = '';
  pwEl.value   = '';
  renderUserTable();

  err.style.color = '#22c55e';
  err.textContent = '✓ User added! They can login with: ' + un + ' / ' + pw;
  setTimeout(function() { err.textContent = ''; }, 8000);

  console.log('[EPIC] User added:', un, '/ role:', role);
  console.log('[EPIC] All users now:', epicGetUsers().map(function(u){ return u.username; }).join(', '));
}

function removeUser(id) {
  if (!confirm('Delete this user?')) return;
  var users = epicGetUsers().filter(function(u) { return u.id !== id; });
  epicSaveUsers(users);
  renderUserTable();
  showToast('User deleted');
}

function resetPW(id) {
  var pw = prompt('Enter new password (min 4 chars):');
  if (!pw) return;
  if (pw.length < 4) { alert('Too short — minimum 4 characters'); return; }
  var users = epicGetUsers().map(function(u) {
    return (u.id === id) ? Object.assign({}, u, { password: pw }) : u;
  });
  epicSaveUsers(users);
  showToast('Password updated');
}

/* ══════════════════════════════
   CHANGE MY OWN PASSWORD
══════════════════════════════ */
function changeMyPassword() {
  var current = document.getElementById('cp-current').value;
  var newPw   = document.getElementById('cp-new').value;
  var confirm = document.getElementById('cp-confirm').value;
  var errEl   = document.getElementById('cp-error');
  var okEl    = document.getElementById('cp-success');

  errEl.textContent  = '';
  okEl.style.display = 'none';

  var user = currentUser();
  if (!user) { errEl.textContent = 'Not logged in'; return; }

  var users   = epicGetUsers();
  var matched = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === user.id && users[i].password === current) {
      matched = users[i]; break;
    }
  }

  if (!matched)         { errEl.textContent = 'Current password is incorrect'; return; }
  if (!newPw)           { errEl.textContent = 'New password cannot be empty'; return; }
  if (newPw.length < 4) { errEl.textContent = 'New password must be at least 4 characters'; return; }
  if (newPw !== confirm) { errEl.textContent = 'Passwords do not match'; return; }
  if (newPw === current) { errEl.textContent = 'New password must be different from current'; return; }

  epicSaveUsers(users.map(function(u) {
    return (u.id === user.id) ? Object.assign({}, u, { password: newPw }) : u;
  }));

  document.getElementById('cp-current').value = '';
  document.getElementById('cp-new').value     = '';
  document.getElementById('cp-confirm').value = '';
  okEl.style.display = 'block';
  setTimeout(function() { okEl.style.display = 'none'; }, 4000);
  showToast('Password changed!');
}

/* ══════════════════════════════
   PDF STORAGE
══════════════════════════════ */
function epicGetAllPDFs() {
  try {
    var raw = localStorage.getItem(EPIC_PDFS_KEY);
    var p   = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch(e) { return []; }
}

function epicGetMyPDFs() {
  var all  = epicGetAllPDFs();
  var user = currentUser();
  if (!user) return [];
  if (user.role === 'admin' || can('viewAll')) return all;
  return all.filter(function(p) { return Number(p.uid) === Number(user.id); });
}

function storePDF(meta) {
  var all = epicGetAllPDFs();
  all.unshift(meta);
  try {
    localStorage.setItem(EPIC_PDFS_KEY, JSON.stringify(all.slice(0, 50)));
  } catch(e) {
    var lite = all.map(function(p) { var c = Object.assign({}, p); delete c.data; return c; });
    try { localStorage.setItem(EPIC_PDFS_KEY, JSON.stringify(lite.slice(0, 50))); } catch(e2) {}
    showToast('Storage full — PDF listed without re-download');
  }
}

function deletePDF(id) {
  if (!can('delete')) { showToast('No permission'); return; }
  var filtered = epicGetAllPDFs().filter(function(p) { return p.id !== id; });
  localStorage.setItem(EPIC_PDFS_KEY, JSON.stringify(filtered));
  renderPDFList();
  showToast('PDF deleted');
}

function redownloadPDF(id) {
  var pdfs = epicGetAllPDFs();
  var p    = null;
  for (var i = 0; i < pdfs.length; i++) {
    if (pdfs[i].id === id) { p = pdfs[i]; break; }
  }
  if (!p || !p.data) { showToast('Data not available — please regenerate the PDF'); return; }
  try {
    var bytes = atob(p.data);
    var arr   = new Uint8Array(bytes.length);
    for (var j = 0; j < bytes.length; j++) arr[j] = bytes.charCodeAt(j);
    var url = URL.createObjectURL(new Blob([arr], { type:'application/pdf' }));
    var a   = document.createElement('a');
    a.href = url; a.download = p.filename || 'report.pdf';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) { showToast('Download failed — please regenerate the PDF'); }
}

function renderPDFList() {
  var tbody = document.getElementById('pdfs-tbody');
  if (!tbody) return;
  var list = epicGetMyPDFs();
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:28px;">No PDFs saved yet.</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var p      = list[i];
    var delBtn = can('delete')
      ? '<button class="btn btn-ghost" style="padding:4px 10px;font-size:11px;color:#ef4444;border-color:#ef444440;" onclick="deletePDF(' + p.id + ')">✕</button>'
      : '';
    html += '<tr>'
      + '<td>' + (i + 1) + '</td>'
      + '<td><strong>' + (p.name || '—') + '</strong><br>'
      + '<span style="font-size:11px;color:var(--muted)">' + (p.regno || '') + '</span></td>'
      + '<td>' + (p.by || '—') + '</td>'
      + '<td>' + (p.at ? new Date(p.at).toLocaleString('en-IN') : '—') + '</td>'
      + '<td style="display:flex;gap:6px;flex-wrap:wrap;">'
      + '<button class="btn btn-secondary" style="padding:4px 10px;font-size:11px;" onclick="redownloadPDF(' + p.id + ')">⬇ Download</button>'
      + delBtn + '</td></tr>';
  }
  tbody.innerHTML = html;
}

/* ══════════════════════════════
   BOOT — runs once on DOMContentLoaded
══════════════════════════════ */
window.addEventListener('DOMContentLoaded', function() {
  /* Step 1: seed default users if first ever run */
  epicBootUsers();

  /* Step 2: enter key shortcuts on login form */
  var unField = document.getElementById('login-username');
  var pwField = document.getElementById('login-password');
  if (unField) unField.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && pwField) pwField.focus();
  });
  if (pwField) pwField.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleLogin();
  });

  /* Step 3: check existing session */
  var sess = epicGetSession();
  if (sess) {
    /* Verify user still exists in storage (not deleted) */
    var stillExists = epicGetUsers().some(function(u) { return u.id === sess.id; });
    if (stillExists) { showApp(sess); return; }
    epicClearSession();
  }
  showLogin();
});
