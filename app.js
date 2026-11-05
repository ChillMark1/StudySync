'use strict';
/* ========== DATA LAYER: storage + task/subject/group objects ========== */
const Data = {
  KEY: 'studysync.v1',
  seed() {
    return {
      subjects: [
        { id: 's1', name: 'Mathematics', color: '#3a5bd9' },
        { id: 's2', name: 'Programming', color: '#1f9d63' },
        { id: 's3', name: 'English', color: '#e0831f' }
      ],
      tasks: [], groups: []
    };
  },
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : this.seed();
    } catch (e) { return this.seed(); }
  },
  save(state) {
    try { localStorage.setItem(this.KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }
};
let state = Data.load();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const commit = () => { Data.save(state); UI.render(); };

/* ========== SERVICE LAYER: scheduling, reminders, progress ========== */
const PRI = { high: 0, medium: 1, low: 2 };
const Service = {
  subject: id => state.subjects.find(s => s.id === id),
  stats() {
    const t = state.tasks, done = t.filter(x => x.done).length, now = Date.now();
    const overdue = t.filter(x => !x.done && new Date(x.deadline) < now).length;
    return { total: t.length, done, open: t.length - done, overdue, pct: t.length ? Math.round(done / t.length * 100) : 0 };
  },
  bySubject() {
    return state.subjects.map(s => {
      const t = state.tasks.filter(x => x.subjectId === s.id), d = t.filter(x => x.done).length;
      return { s, total: t.length, done: d, pct: t.length ? Math.round(d / t.length * 100) : 0 };
    });
  },
  upcoming(n = 5) {
    return state.tasks.filter(x => !x.done).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, n);
  },
  reminders() {
    const now = Date.now(), day = 864e5;
    return state.tasks.filter(x => !x.done).map(x => ({ x, ms: new Date(x.deadline) - now }))
      .filter(r => r.ms < day).sort((a, b) => a.ms - b.ms);
  },
  list({ status, subject, sort }) {
    let t = state.tasks.filter(x => (status === 'all' || (status === 'done') === x.done) && (subject === 'all' || x.subjectId === subject));
    t.sort((a, b) => sort === 'priority'
      ? PRI[a.priority] - PRI[b.priority] || new Date(a.deadline) - new Date(b.deadline)
      : new Date(a.deadline) - new Date(b.deadline));
    return t;
  },
  removeSubject(id) {
    state.subjects = state.subjects.filter(s => s.id !== id);
    state.tasks = state.tasks.filter(t => t.subjectId !== id);
    state.groups.forEach(g => { if (g.subjectId === id) g.subjectId = ''; });
  }
};

/* ========== UI LAYER ========== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const empty = msg => `<li class="empty">${msg}</li>`;
let view = 'dashboard';

const UI = {
  show(v) {
    view = v;
    document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== 'view-' + v);
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    this.render();
  },
  subjectOptions(sel, withAll) {
    const cur = sel.value;
    sel.innerHTML = (withAll ? '<option value="all">All subjects</option>' : '') +
      state.subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
  },
  taskItem(t, actions) {
    const s = Service.subject(t.subjectId), late = !t.done && new Date(t.deadline) < Date.now();
    return `<li class="item ${t.done ? 'done' : ''}" style="--c:${s ? s.color : '#888'}">
      <input type="checkbox" data-act="toggle" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Mark done">
      <div class="grow"><div class="title">${esc(t.title)}</div>
        <div class="meta"><span class="tag ${t.priority}">${t.priority}</span>${s ? esc(s.name) : 'No subject'} · <span class="${late ? 'late' : ''}">${late ? 'Overdue: ' : ''}${fmt(t.deadline)}</span>${t.notes ? ' · ' + esc(t.notes) : ''}</div></div>
      ${actions ? `<div class="actions"><button class="ghost small" data-act="edit" data-id="${t.id}">Edit</button><button class="danger small" data-act="del" data-id="${t.id}">Delete</button></div>` : ''}</li>`;
  },
  render() {
    this.subjectOptions($('tSubject')); this.subjectOptions($('gSubject')); this.subjectOptions($('fSubject'), true);
    this.alerts();
    if (view === 'dashboard') this.dashboard();
    if (view === 'tasks') $('taskList').innerHTML = Service.list({ status: $('fStatus').value, subject: $('fSubject').value, sort: $('fSort').value }).map(t => this.taskItem(t, true)).join('') || empty('No tasks here. Add one above.');
    if (view === 'subjects') $('subjectList').innerHTML = Service.bySubject().map(r => `<li class="item" style="--c:${r.s.color}"><div class="grow"><div class="title">${esc(r.s.name)}</div><div class="meta">${r.done}/${r.total} tasks done</div></div><button class="danger small" data-act="delSubject" data-id="${r.s.id}">Delete</button></li>`).join('') || empty('No subjects yet. Add your first one above.');
    if (view === 'groups') $('groupList').innerHTML = state.groups.map(g => { const s = Service.subject(g.subjectId); return `<li class="item" style="--c:${s ? s.color : '#888'}"><div class="grow"><div class="title">${esc(g.name)}</div><div class="meta">${s ? esc(s.name) : 'No subject'} · ${g.members.length ? g.members.map(esc).join(', ') : 'No members listed'}</div></div><button class="danger small" data-act="delGroup" data-id="${g.id}">Delete</button></li>`; }).join('') || empty('No study groups yet.');
  },
  alerts() {
    const r = Service.reminders();
    $('alerts').innerHTML = r.slice(0, 3).map(({ x, ms }) => `<div class="alert ${ms < 0 ? 'bad' : ''}"><b>${esc(x.title)}</b> ${ms < 0 ? 'is overdue' : 'is due within 24 hours'} (${fmt(x.deadline)})</div>`).join('') +
      (r.length > 3 ? `<div class="alert">+ ${r.length - 3} more tasks need attention</div>` : '');
  },
  dashboard() {
    const s = Service.stats();
    $('ring').style.setProperty('--p', s.pct); $('ringText').textContent = s.pct + '%';
    $('heroTitle').textContent = s.total ? `${s.done} of ${s.total} tasks done` : 'Start by adding a task';
    $('heroSub').textContent = s.overdue ? `${s.overdue} overdue. Tackle those first.` : s.open ? `${s.open} still open. You're on track.` : 'Nothing pending.';
    $('stats').innerHTML = [['Total', s.total], ['Open', s.open], ['Done', s.done], ['Overdue', s.overdue]].map(([l, v]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
    $('subjectBars').innerHTML = Service.bySubject().map(r => `<div class="bar"><div class="t"><span>${esc(r.s.name)}</span><span>${r.done}/${r.total}</span></div><div class="track"><div class="fill" style="width:${r.pct}%;background:${r.s.color}"></div></div></div>`).join('') || '<p class="muted">Add subjects to see progress.</p>';
    $('upcoming').innerHTML = Service.upcoming().map(t => this.taskItem(t, false)).join('') || empty('No open tasks.');
  }
};

/* ---------- events ---------- */
$('nav').onclick = e => { if (e.target.dataset.view) UI.show(e.target.dataset.view); };
['fStatus', 'fSubject', 'fSort'].forEach(id => $(id).onchange = () => UI.render());

function resetTaskForm() {
  $('taskForm').reset(); $('tId').value = ''; $('tSave').textContent = 'Add task'; $('tCancel').hidden = true;
}
$('tCancel').onclick = resetTaskForm;
$('taskForm').onsubmit = e => {
  e.preventDefault();
  const data = { title: $('tTitle').value.trim(), subjectId: $('tSubject').value, deadline: $('tDeadline').value, priority: $('tPriority').value, notes: $('tNotes').value.trim() };
  if (!data.title) return;
  const id = $('tId').value, t = state.tasks.find(x => x.id === id);
  if (t) Object.assign(t, data); else state.tasks.push({ id: uid(), done: false, ...data });
  resetTaskForm(); commit();
};
$('subjectForm').onsubmit = e => {
  e.preventDefault();
  const name = $('sName').value.trim();
  if (!name || state.subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) return;
  state.subjects.push({ id: uid(), name, color: $('sColor').value }); $('sName').value = ''; commit();
};
$('groupForm').onsubmit = e => {
  e.preventDefault();
  state.groups.push({ id: uid(), name: $('gName').value.trim(), subjectId: $('gSubject').value, members: $('gMembers').value.split(',').map(m => m.trim()).filter(Boolean) });
  $('groupForm').reset(); commit();
};
document.querySelector('main').onclick = e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = b.dataset.id, act = b.dataset.act, t = state.tasks.find(x => x.id === id);
  if (act === 'toggle' && t) { t.done = b.checked; commit(); }
  if (act === 'del' && confirm('Delete this task?')) { state.tasks = state.tasks.filter(x => x.id !== id); commit(); }
  if (act === 'edit' && t) {
    $('tId').value = t.id; $('tTitle').value = t.title; $('tSubject').value = t.subjectId; $('tDeadline').value = t.deadline;
    $('tPriority').value = t.priority; $('tNotes').value = t.notes || ''; $('tSave').textContent = 'Save changes'; $('tCancel').hidden = false;
    $('tTitle').focus(); window.scrollTo({ top: 0 });
  }
  if (act === 'delSubject' && confirm('Delete this subject and all its tasks?')) { Service.removeSubject(id); commit(); }
  if (act === 'delGroup') { state.groups = state.groups.filter(g => g.id !== id); commit(); }
};

/* ---------- browser reminders (optional) ---------- */
const notified = new Set();
function checkNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  Service.reminders().filter(r => r.ms > 0 && r.ms < 36e5 && !notified.has(r.x.id)).forEach(({ x }) => {
    notified.add(x.id); new Notification('StudySync: due within an hour', { body: x.title });
  });
}
$('notifyBtn').onclick = () => {
  if (!('Notification' in window)) return alert('This browser does not support notifications.');
  Notification.requestPermission().then(p => { $('notifyBtn').textContent = p === 'granted' ? 'Browser reminders on' : 'Reminders blocked in browser settings'; });
};
if ('Notification' in window && Notification.permission === 'granted') $('notifyBtn').textContent = 'Browser reminders on';
setInterval(() => { checkNotifications(); UI.alerts(); }, 60000);

UI.show('dashboard');
