'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const empty = m => `<div class="empty">${m}</div>`;
const S = { token: localStorage.getItem('ss.token'), user: '', subjects: [], tasks: [], groups: [], gid: null, view: 'dashboard', editId: null };

/* ---------- API + storage ---------- */
async function api(method, url, body) {
  const r = await fetch('/api' + url, { method, headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && S.token) { logout(); throw new Error('Please log in again'); }
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}
let pt;
const persist = () => { clearTimeout(pt); pt = setTimeout(() => api('PUT', '/data', { subjects: S.subjects, tasks: S.tasks }).catch(e => toast(e.message)), 300); };
function toast(m) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(t.h); t.h = setTimeout(() => t.hidden = true, 3500); }
const guard = fn => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message); } };

/* ---------- auth ---------- */
$('authForm').onsubmit = async e => {
  e.preventDefault(); $('aErr').textContent = '';
  try {
    const r = await api('POST', '/' + e.submitter.value, { username: $('aUser').value, password: $('aPass').value });
    S.token = r.token; localStorage.setItem('ss.token', r.token); S.user = r.username; await enter();
  } catch (err) { $('aErr').textContent = err.message; }
};
function logout() { localStorage.removeItem('ss.token'); S.token = null; $('app').hidden = true; $('auth').hidden = false; clearInterval(S.poll); }
$('logout').onclick = logout;
async function enter() {
  const [me, d] = await Promise.all([api('GET', '/me'), api('GET', '/data')]);
  S.user = me.username; S.subjects = d.subjects; S.tasks = d.tasks;
  $('whoName').textContent = '@' + S.user; $('auth').hidden = true; $('app').hidden = false;
  await loadGroups(); show('dashboard');
  clearInterval(S.poll); S.poll = setInterval(() => { if (S.view === 'groups' && !document.hidden && !document.activeElement.matches('input,textarea,select')) loadGroups().then(render); }, 8000);
}
const loadGroups = async () => { S.groups = await api('GET', '/groups'); };

/* ---------- service logic ---------- */
const PRI = { high: 0, medium: 1, low: 2 };
const subj = id => S.subjects.find(s => s.id === id);
const stats = () => { const t = S.tasks, d = t.filter(x => x.done).length; return { total: t.length, done: d, open: t.length - d, overdue: t.filter(x => !x.done && new Date(x.deadline) < Date.now()).length, pct: t.length ? Math.round(d / t.length * 100) : 0 }; };
const bySubject = () => S.subjects.map(s => { const t = S.tasks.filter(x => x.subjectId === s.id), d = t.filter(x => x.done).length; return { s, total: t.length, done: d, pct: t.length ? Math.round(d / t.length * 100) : 0 }; });
const byDeadline = (a, b) => new Date(a.deadline) - new Date(b.deadline);

/* ---------- views ---------- */
function show(v) {
  S.view = v;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  if (v === 'groups') loadGroups().then(render).catch(e => toast(e.message));
  render();
}
function render() {
  const r = S.tasks.filter(x => !x.done && new Date(x.deadline) - Date.now() < 864e5).sort(byDeadline);
  $('alerts').innerHTML = r.slice(0, 3).map(x => { const late = new Date(x.deadline) < Date.now(); return `<div class="alert ${late ? 'bad' : ''}"><b>${esc(x.title)}</b> ${late ? 'is overdue' : 'is due within 24 hours'} (${fmt(x.deadline)})</div>`; }).join('') + (r.length > 3 ? `<div class="alert">+ ${r.length - 3} more need attention</div>` : '');
  $('main').innerHTML = { dashboard, tasks, groups, focus }[S.view]();
  if (S.view === 'focus') tick();
}
function taskItem(t, actions) {
  const s = subj(t.subjectId), late = !t.done && new Date(t.deadline) < Date.now();
  return `<li class="item ${t.done ? 'done' : ''}" style="--c:${s ? s.color : '#888'}"><input type="checkbox" data-act="toggle" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Mark done">
    <div class="grow"><div class="title">${esc(t.title)}</div><div class="meta"><span class="tag ${t.priority}">${t.priority}</span>${s ? esc(s.name) : 'No subject'} · <span class="${late ? 'late' : ''}">${late ? 'Overdue: ' : ''}${fmt(t.deadline)}</span>${t.notes ? ' · ' + esc(t.notes) : ''}</div></div>
    ${actions ? `<div class="actions"><button class="ghost small" data-act="edit" data-id="${t.id}">Edit</button><button class="danger small" data-act="del" data-id="${t.id}">Delete</button></div>` : ''}</li>`;
}
function dashboard() {
  const s = stats();
  return `<div class="hero"><div class="ring" style="--p:${s.pct}"><span>${s.pct}%</span></div><div><h2>Hi, ${esc(S.user)}</h2>
    <p class="muted">${s.total ? `${s.done} of ${s.total} tasks done. ` + (s.overdue ? `${s.overdue} overdue, start with those.` : 'Nothing overdue.') : 'Add your first task in the Tasks tab.'}</p></div></div>
  <div class="stats">${[['Total', s.total], ['Open', s.open], ['Done', s.done], ['Overdue', s.overdue]].map(([l, v]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('')}</div>
  <div class="cols"><div class="panel"><h3>Progress by subject</h3>${bySubject().map(r => `<div class="bar"><div class="t"><span>${esc(r.s.name)}</span><span>${r.done}/${r.total}</span></div><div class="track"><div class="fill" style="width:${r.pct}%;background:${r.s.color}"></div></div></div>`).join('') || '<p class="muted">No subjects yet.</p>'}</div>
  <div class="panel"><h3>Coming up</h3><ul class="list">${S.tasks.filter(x => !x.done).sort(byDeadline).slice(0, 5).map(t => taskItem(t, false)).join('') || empty('No open tasks.')}</ul></div></div>`;
}
const F = { status: 'open', subject: 'all', sort: 'deadline' };
function tasks() {
  const e = S.tasks.find(t => t.id === S.editId) || {};
  const opts = (sel) => S.subjects.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  let list = S.tasks.filter(t => (F.status === 'all' || (F.status === 'done') === t.done) && (F.subject === 'all' || t.subjectId === F.subject));
  list.sort((a, b) => F.sort === 'priority' ? PRI[a.priority] - PRI[b.priority] || byDeadline(a, b) : byDeadline(a, b));
  return `<div class="panel"><h3>Subjects</h3><div class="chips">${S.subjects.map(s => `<span class="chip" style="--c:${s.color}">${esc(s.name)} <button data-act="delSubject" data-id="${s.id}" aria-label="Delete ${esc(s.name)}">×</button></span>`).join('')}</div>
    <form id="subjectForm" class="row" autocomplete="off"><input id="sName" required maxlength="40" placeholder="New subject" aria-label="Subject name"><input id="sColor" type="color" value="#2f6fed" aria-label="Colour"><button>Add subject</button></form></div>
  <form id="taskForm" class="panel grid" autocomplete="off"><h3>${e.id ? 'Edit task' : 'Add a task'}</h3>
    <label>Task<input id="tTitle" required maxlength="100" value="${esc(e.title || '')}"></label>
    <label>Subject<select id="tSubject" required>${opts(e.subjectId)}</select></label>
    <label>Deadline<input id="tDeadline" type="datetime-local" required value="${e.deadline || ''}"></label>
    <label>Priority<select id="tPriority">${['high', 'medium', 'low'].map(p => `<option ${(e.priority || 'medium') === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
    <label class="wide">Notes (optional)<input id="tNotes" maxlength="200" value="${esc(e.notes || '')}"></label>
    <div class="wide row"><button>${e.id ? 'Save changes' : 'Add task'}</button>${e.id ? '<button type="button" class="ghost" data-act="cancel">Cancel</button>' : ''}</div></form>
  <div class="filters"><select data-f="status"><option value="open" ${F.status === 'open' ? 'selected' : ''}>Open</option><option value="done" ${F.status === 'done' ? 'selected' : ''}>Done</option><option value="all" ${F.status === 'all' ? 'selected' : ''}>All</option></select>
    <select data-f="subject"><option value="all">All subjects</option>${opts(F.subject)}</select>
    <select data-f="sort"><option value="deadline">Sort by deadline</option><option value="priority" ${F.sort === 'priority' ? 'selected' : ''}>Sort by priority</option></select></div>
  <ul class="list">${list.map(t => taskItem(t, true)).join('') || empty('No tasks here.')}</ul>`;
}
function groups() {
  const g = S.groups.find(x => x.id === S.gid);
  if (g) {
    const top = g.members.slice().sort((a, b) => b.done - a.done);
    return `<button class="ghost small" data-act="back">← All groups</button>
    <div class="panel"><h2>${esc(g.name)}</h2><p class="muted">Invite code: <b class="code">${g.code}</b> <button class="ghost small" data-act="copy" data-id="${g.code}">Copy</button> · Share it with classmates so they can join.</p>
      <h3>Members (${g.members.length}) and tasks completed</h3><div class="chips">${top.map(m => `<span class="chip" style="--c:#2f6fed">${esc(m.name)}: ${m.done}/${m.total}</span>`).join('')}</div>
      <button class="danger small" data-act="leave" data-id="${g.id}">Leave group</button></div>
    <form id="matForm" class="panel grid" autocomplete="off"><h3>Share study material</h3>
      <label>Title<input id="mTitle" required maxlength="100" placeholder="e.g. Chapter 4 summary"></label>
      <label>Type<select id="mKind"><option value="note">Note (text)</option><option value="link">Link (URL)</option></select></label>
      <label class="wide">Content<textarea id="mContent" required rows="4" maxlength="5000" placeholder="Write your notes, or paste a link starting with https://"></textarea></label>
      <div class="wide"><button>Share with group</button></div></form>
    <ul class="list">${g.materials.map(m => `<li class="item"><div class="grow"><div class="title">${esc(m.title)} <span class="tag low">${m.kind}</span></div>
      <div class="meta">by @${esc(m.by)} · ${fmt(m.at)}</div>
      <div class="mat">${m.kind === 'link' ? `<a href="${esc(m.content)}" target="_blank" rel="noopener noreferrer">${esc(m.content)}</a>` : esc(m.content)}</div></div>
      ${m.byKey === undefined || m.by.toLowerCase() === S.user.toLowerCase() || g.owner === S.user.toLowerCase() ? `<button class="danger small" data-act="delMat" data-id="${m.id}">Delete</button>` : ''}</li>`).join('') || empty('Nothing shared yet. Be the first to post notes or a useful link.')}</ul>`;
  }
  return `<div class="cols"><form id="createForm" class="panel row" autocomplete="off"><input id="gName" required maxlength="50" placeholder="New group name" aria-label="Group name"><button>Create group</button></form>
    <form id="joinForm" class="panel row" autocomplete="off"><input id="gCode" required maxlength="10" placeholder="Invite code" aria-label="Invite code"><button class="ghost">Join group</button></form></div>
    <ul class="list">${S.groups.map(x => `<li class="item" style="--c:#2f6fed"><div class="grow"><div class="title">${esc(x.name)}</div><div class="meta">${x.members.length} members · ${x.materials.length} shared items</div></div><button class="small" data-act="open" data-id="${x.id}">Open</button></li>`).join('') || empty('You are not in a group yet. Create one or join with a code.')}</ul>`;
}
/* ---------- focus timer (pomodoro) ---------- */
const T = { mode: 'Focus', left: 25 * 60, run: false, h: null };
const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
function focus() {
  const n = localStorage.getItem('ss.sessions.' + new Date().toDateString()) || 0;
  return `<div class="panel center"><h2>${T.mode} time</h2><div class="clock" id="clock">${mmss(T.left)}</div>
    <div class="row cen"><button data-act="timer">${T.run ? 'Pause' : 'Start'}</button><button class="ghost" data-act="timerReset">Reset</button></div>
    <p class="muted">25 minutes focus, then a 5 minute break. Focus sessions finished today: <b id="sessions">${n}</b></p></div>`;
}
function tick() { const c = $('clock'); if (c) c.textContent = mmss(T.left); }
function timer() {
  T.run = !T.run; clearInterval(T.h);
  if (T.run) T.h = setInterval(() => {
    if (--T.left <= 0) {
      if (T.mode === 'Focus') { const k = 'ss.sessions.' + new Date().toDateString(); localStorage.setItem(k, (+localStorage.getItem(k) || 0) + 1); }
      T.mode = T.mode === 'Focus' ? 'Break' : 'Focus'; T.left = (T.mode === 'Focus' ? 25 : 5) * 60; toast(T.mode + ' time!'); if (S.view === 'focus') render();
    }
    tick();
  }, 1000);
  render();
}

/* ---------- events ---------- */
$('nav').onclick = e => { if (e.target.dataset.view) show(e.target.dataset.view); };
$('main').onchange = e => { if (e.target.dataset.f) { F[e.target.dataset.f] = e.target.value; render(); } };
$('main').onsubmit = guard(async e => {
  e.preventDefault(); const id = e.target.id;
  if (id === 'taskForm') {
    const d = { title: $('tTitle').value.trim(), subjectId: $('tSubject').value, deadline: $('tDeadline').value, priority: $('tPriority').value, notes: $('tNotes').value.trim() };
    const t = S.tasks.find(x => x.id === S.editId);
    if (t) Object.assign(t, d); else S.tasks.push({ id: uid(), done: false, ...d });
    S.editId = null; persist(); render();
  }
  if (id === 'subjectForm') {
    const n = $('sName').value.trim();
    if (S.subjects.some(s => s.name.toLowerCase() === n.toLowerCase())) return toast('That subject already exists');
    S.subjects.push({ id: uid(), name: n, color: $('sColor').value }); persist(); render();
  }
  if (id === 'createForm') { const g = await api('POST', '/groups', { name: $('gName').value }); await loadGroups(); S.gid = g.id; render(); }
  if (id === 'joinForm') { const g = await api('POST', '/groups/join', { code: $('gCode').value }); await loadGroups(); S.gid = g.id; render(); }
  if (id === 'matForm') { await api('POST', `/groups/${S.gid}/materials`, { title: $('mTitle').value, kind: $('mKind').value, content: $('mContent').value }); await loadGroups(); render(); toast('Shared with your group'); }
});
$('main').onclick = guard(async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id, t = S.tasks.find(x => x.id === id);
  if (a === 'toggle' && t) { t.done = b.checked; persist(); render(); }
  if (a === 'del' && confirm('Delete this task?')) { S.tasks = S.tasks.filter(x => x.id !== id); persist(); render(); }
  if (a === 'edit') { S.editId = id; render(); window.scrollTo(0, 0); }
  if (a === 'cancel') { S.editId = null; render(); }
  if (a === 'delSubject' && confirm('Delete this subject and its tasks?')) { S.subjects = S.subjects.filter(s => s.id !== id); S.tasks = S.tasks.filter(x => x.subjectId !== id); persist(); render(); }
  if (a === 'open') { S.gid = id; render(); }
  if (a === 'back') { S.gid = null; render(); }
  if (a === 'copy') { await navigator.clipboard.writeText(id); toast('Code copied'); }
  if (a === 'leave' && confirm('Leave this group?')) { await api('POST', `/groups/${id}/leave`); S.gid = null; await loadGroups(); render(); }
  if (a === 'delMat' && confirm('Delete this item?')) { await api('DELETE', `/groups/${S.gid}/materials/${id}`); await loadGroups(); render(); }
  if (a === 'timer') timer();
  if (a === 'timerReset') { clearInterval(T.h); Object.assign(T, { run: false, mode: 'Focus', left: 1500 }); render(); }
});

if (S.token) enter().catch(logout);
