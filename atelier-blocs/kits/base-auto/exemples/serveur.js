/* exemples/serveur.js — branchement minimal de db/migrer.js (exemple du kit, sans framework)
   DATABASE_URL=postgres://… DB_CREER_BASE=1 node exemples/serveur.js   puis http://localhost:3000/api/clients */
'use strict';
const http = require('http');
const { Pool } = require('pg');
const migrer = require('../db/migrer');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === '1' ? { rejectUnauthorized: true } : undefined });

const serveur = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/clients') {
      const { rows } = await pool.query('select id, nom, email, actif from clients order by nom limit 200');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(rows));
    }
    res.writeHead(404).end();
  } catch (e) {
    console.error(e);                                   // le détail reste dans les journaux du serveur
    res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"erreur":"Erreur serveur"}');
  }
});

(async () => {
  await migrer();                                       // 1. la base et les tables d'abord
  serveur.listen(process.env.PORT || 3000, () => console.log('Serveur prêt sur le port ' + (process.env.PORT || 3000)));
})().catch(e => { console.error(e.message); process.exit(1); });   // migration refusée : le serveur ne démarre pas
