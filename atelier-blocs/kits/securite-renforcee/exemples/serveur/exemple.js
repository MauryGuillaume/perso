/* exemples/serveur/exemple.js — serveur minimal protégé :  PORT=3000 node exemples/serveur/exemple.js */
'use strict';
const http = require('http');
const securite = require('./securite');

const proteger = securite.creer({ origines: ['https://monapp.fr'], hsts: process.env.NODE_ENV === 'production' });

http.createServer(async (req, res) => {
  if (proteger(req, res)) return;
  try {
    if (req.method === 'POST' && req.url === '/api/contact') {
      const corps = await securite.lireJson(req, 10000);
      const email = String(corps.email || '').trim();
      if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email)) throw Object.assign(new Error('Email invalide'), { statut: 400 });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end('{"ok":true}');
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Introuvable');
  } catch (e) { securite.erreur(res, e); }
}).listen(process.env.PORT || 3000);
