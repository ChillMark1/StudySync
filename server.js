'use strict';
// StudySync backend: no dependencies. Run with `node server.js`
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const DB = process.env.DB_FILE || path.join(__dirname, 'data.json');
const PUB = path.join(__dirname, 'public');
let db = { users: {}, sessions: {}, groups: {} };
try { db = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) { /* first run */ }
const save = () => { try { fs.writeFileSync(DB, JSON.stringify(db)); } catch (e) { console.error('save failed', e.message); } };
const rid = n => crypto.randomBytes(n).toString('hex');
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const clip = (s, n) => String(s || '').trim().slice(0, n);
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

function body(req) {
  return new Promise((ok, no) => {
    let d = ''; req.on('data', c => { d += c; if (d.length > 1e6) { req.destroy(); no(new Error('Too large')); } });
    req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { no(new Error('Bad JSON')); } });
  });
}
const progress = u => { const t = (db.users[u] && db.users[u].tasks) || []; return { done: t.filter(x => x.done).length, total: t.length }; };
const groupView = g => ({
  id: g.id, name: g.name, code: g.code, owner: g.owner, materials: g.materials.slice().reverse(),
  members: g.members.map(m => ({ name: db.users[m].name, ...progress(m) }))
});

async function api(req, res, url) {
  const route = req.method + ' ' + url.pathname.replace(/^\/api/, '');
  const b = req.method === 'GET' || req.method === 'DELETE' ? {} : await body(req);

  if (route === 'POST /register' || route === 'POST /login') {
    const name = clip(b.username, 20), key = name.toLowerCase(), pw = String(b.password || '');
    if (route === 'POST /register') {
      if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return send(res, 400, { error: 'Username: 3-20 letters, numbers or _' });
      if (pw.length < 4) return send(res, 400, { error: 'Password needs at least 4 characters' });
      if (db.users[key]) return send(res, 409, { error: 'That username is taken' });
      const salt = rid(8);
      db.users[key] = { name, salt, hash: hash(pw, salt), subjects: [{ id: 's1', name: 'General', color: '#2f6fed' }], tasks: [] };
    } else {
      const u = db.users[key];
      if (!u || !crypto.timingSafeEqual(Buffer.from(hash(pw, u.salt)), Buffer.from(u.hash))) return send(res, 401, { error: 'Wrong username or password' });
    }
    const token = rid(24); db.sessions[token] = key; save();
    return send(res, 200, { token, username: db.users[key].name });
  }

  const me = db.sessions[(req.headers.authorization || '').replace('Bearer ', '')];
  if (!me || !db.users[me]) return send(res, 401, { error: 'Please log in' });
  const user = db.users[me];

  if (route === 'GET /me') return send(res, 200, { username: user.name });
  if (route === 'GET /data') return send(res, 200, { subjects: user.subjects, tasks: user.tasks });
  if (route === 'PUT /data') {
    user.subjects = (Array.isArray(b.subjects) ? b.subjects : []).slice(0, 50).map(s => ({ id: clip(s.id, 20), name: clip(s.name, 40), color: /^#[0-9a-f]{6}$/i.test(s.color) ? s.color : '#2f6fed' }));
    user.tasks = (Array.isArray(b.tasks) ? b.tasks : []).slice(0, 1000).map(t => ({
      id: clip(t.id, 20), title: clip(t.title, 100), subjectId: clip(t.subjectId, 20), deadline: clip(t.deadline, 20),
      priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium', notes: clip(t.notes, 200), done: !!t.done
    }));
    save(); return send(res, 200, { ok: true });
  }
  if (route === 'GET /groups') return send(res, 200, Object.values(db.groups).filter(g => g.members.includes(me)).map(groupView));
  if (route === 'POST /groups') {
    const name = clip(b.name, 50); if (!name) return send(res, 400, { error: 'Give the group a name' });
    const g = { id: rid(4), name, code: rid(3).toUpperCase(), owner: me, members: [me], materials: [] };
    db.groups[g.id] = g; save(); return send(res, 200, groupView(g));
  }
  if (route === 'POST /groups/join') {
    const g = Object.values(db.groups).find(x => x.code === clip(b.code, 10).toUpperCase());
    if (!g) return send(res, 404, { error: 'No group with that code' });
    if (!g.members.includes(me)) g.members.push(me);
    save(); return send(res, 200, groupView(g));
  }
  const m = url.pathname.match(/^\/api\/groups\/(\w+)(?:\/(leave|materials)(?:\/(\w+))?)?$/);
  const g = m && db.groups[m[1]];
  if (m && (!g || !g.members.includes(me))) return send(res, 404, { error: 'Group not found' });
  if (m && m[2] === 'leave' && req.method === 'POST') {
    g.members = g.members.filter(x => x !== me);
    if (!g.members.length) delete db.groups[g.id]; else if (g.owner === me) g.owner = g.members[0];
    save(); return send(res, 200, { ok: true });
  }
  if (m && m[2] === 'materials' && req.method === 'POST') {
    const title = clip(b.title, 100), content = clip(b.content, 5000), kind = b.kind === 'link' ? 'link' : 'note';
    if (!title || !content) return send(res, 400, { error: 'Title and content are required' });
    if (kind === 'link' && !/^https?:\/\//i.test(content)) return send(res, 400, { error: 'Links must start with http:// or https://' });
    if (g.materials.length >= 500) return send(res, 400, { error: 'This group is full of material' });
    g.materials.push({ id: rid(4), title, content, kind, by: user.name, byKey: me, at: Date.now() });
    save(); return send(res, 200, groupView(g));
  }
  if (m && m[2] === 'materials' && req.method === 'DELETE') {
    const i = g.materials.findIndex(x => x.id === m[3]);
    if (i < 0 || (g.materials[i].byKey !== me && g.owner !== me)) return send(res, 403, { error: 'Only the author or group owner can delete this' });
    g.materials.splice(i, 1); save(); return send(res, 200, groupView(g));
  }
  send(res, 404, { error: 'Not found' });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let file = path.join(PUB, path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUB, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { send(res, 400, { error: e.message }); }
}).listen(PORT, () => console.log('StudySync running at http://localhost:' + PORT));
