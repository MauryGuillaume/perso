// server.js — serveur minimal de l'exemple (les notes restent en mémoire ici ; une vraie app utilise DATABASE_URL).
const http = require('http'), fs = require('fs'), path = require('path');
const notes = [];
http.createServer((req, res) => {
  if (req.url === '/api/notes' && req.method === 'GET') return res.end(JSON.stringify(notes));
  if (req.url === '/api/notes' && req.method === 'POST') {
    let corps = '';
    req.on('data', c => { corps += c; if (corps.length > 1e4) req.destroy(); });
    return req.on('end', () => {
      let texte = '';
      try { texte = String(JSON.parse(corps).texte || '').trim().slice(0, 500); } catch (e) { texte = ''; }
      if (!texte) { res.statusCode = 400; return res.end(JSON.stringify({ erreur: 'La note est vide.' })); }
      notes.push({ texte, cree_le: new Date().toISOString() });
      res.end(JSON.stringify({ ok: true }));
    });
  }
  fs.readFile(path.join(__dirname, 'public', 'index.html'), (e, d) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(d); });
}).listen(process.env.PORT || 3000);
