// Qui vient quand — le serveur.
// Il fait trois choses : vérifier la clé du lien, servir la page, enregistrer les réponses.
// Les réglages de l'évènement viennent de evenement.json (le seul fichier à modifier).

import evenement from '../evenement.json';

const MAX_GROUPES = 200;
const MAX_NUITS = 14;
const MAX_PIECES = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/* ---------- les réglages ---------- */

// Renvoie la liste des problèmes de evenement.json, en clair. Liste vide = tout va bien.
function verifier(e) {
  const p = [];
  const texte = (v) => typeof v === 'string' && v.trim().length > 0;
  if (!e || typeof e !== 'object') return ['evenement.json est vide ou illisible.'];
  if (!texte(e.nom)) p.push('« nom » : le nom de l\'évènement manque.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.premiere_nuit || '') || isNaN(Date.parse(e.premiere_nuit)))
    p.push('« premiere_nuit » : la date doit s\'écrire AAAA-MM-JJ, par exemple 2027-02-12.');
  if (!Number.isInteger(e.nombre_de_nuits) || e.nombre_de_nuits < 1 || e.nombre_de_nuits > MAX_NUITS)
    p.push(`« nombre_de_nuits » : un nombre entier entre 1 et ${MAX_NUITS}.`);
  if (!Number.isInteger(e.couchages) || e.couchages < 1 || e.couchages > 500)
    p.push('« couchages » : le nombre de places pour dormir, un nombre entier.');
  if (e.pieces !== undefined && (!Array.isArray(e.pieces) || e.pieces.length > MAX_PIECES || e.pieces.some((x) => !x || !texte(x.nom))))
    p.push(`« pieces » : une liste de ${MAX_PIECES} pièces au plus, chacune avec un « nom ».`);
  if (e.dortoir_enfants && !texte(e.dortoir_enfants.lieu))
    p.push('« dortoir_enfants » : il faut un « lieu » (par exemple « dans le salon »), ou retirer ce réglage.');
  if (e.photos !== undefined && (!Array.isArray(e.photos) || e.photos.some((x) => !texte(x))))
    p.push('« photos » : une liste de noms de fichiers rangés dans public/photos.');
  return p;
}

const PROBLEMES = verifier(evenement);
const N = PROBLEMES.length ? 0 : evenement.nombre_de_nuits;
const NB_PIECES = Array.isArray(evenement.pieces) ? evenement.pieces.length : 0;
const nuitsValides = (s) => typeof s === 'string' && s.length === N && /^[01]+$/.test(s);

/* ---------- la base ---------- */

// Les tables sont créées au premier appel : aucune commande à lancer à la main.
let tablesPretes;
function tables(db) {
  tablesPretes ||= db
    .batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS groupes (
        id TEXT PRIMARY KEY, nom TEXT NOT NULL, adultes INTEGER NOT NULL, enfants INTEGER NOT NULL,
        nuits TEXT NOT NULL, cree_le TEXT NOT NULL DEFAULT (datetime('now')), maj_le TEXT NOT NULL DEFAULT (datetime('now')))`),
      db.prepare(`CREATE TABLE IF NOT EXISTS notes (
        cle TEXT PRIMARY KEY, valeur TEXT NOT NULL DEFAULT '', maj_le TEXT NOT NULL DEFAULT (datetime('now')))`),
      db.prepare(`CREATE TABLE IF NOT EXISTS reglages (cle TEXT PRIMARY KEY, valeur TEXT NOT NULL)`),
    ])
    .catch((err) => {
      tablesPretes = null;
      throw err;
    });
  return tablesPretes;
}

/* ---------- la clé du lien ---------- */

// La clé est créée à la toute première visite et rangée dans la base.
// Pour imposer la vôtre : un secret ACCESS_KEY (npx wrangler secret put ACCESS_KEY).
let cleConnue;
async function lireCle(env) {
  if (env.ACCESS_KEY) return env.ACCESS_KEY;
  if (cleConnue) return cleConnue;
  const r = await env.DB.prepare("SELECT valeur FROM reglages WHERE cle = 'cle'").first();
  if (r) cleConnue = r.valeur;
  return r ? r.valeur : null;
}
// Lettres et chiffres seulement : un lien qui finirait par un tiret peut être coupé par une messagerie.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
async function creerCle(env) {
  const o = crypto.getRandomValues(new Uint8Array(24));
  const neuve = Array.from(o, (x) => ALPHABET[x % ALPHABET.length]).join('');
  await env.DB.prepare("INSERT OR IGNORE INTO reglages (cle, valeur) VALUES ('cle', ?)").bind(neuve).run();
  return lireCle(env); // relue : si deux visites arrivent ensemble, une seule clé gagne
}
function pareil(a, b) {
  if (typeof a !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* ---------- les réponses ---------- */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const pageSimple = (titre, lignes, status) =>
  new Response(
    `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${titre}</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#f7f6f3;color:#17191c;font:300 20px/1.5 system-ui,sans-serif;padding:24px"><div style="max-width:34rem">${lignes.map((l) => `<p>${l}</p>`).join('')}</div></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } }
  );

const html = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const entier = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : null);

function periode() {
  const [a, m, j] = evenement.premiere_nuit.split('-').map(Number);
  const f = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return `du ${f.format(new Date(Date.UTC(a, m - 1, j, 12)))} au ${f.format(new Date(Date.UTC(a, m - 1, j + N, 12)))}`;
}

/* ---------- les données ---------- */

async function api(request, env, chemin) {
  const m = request.method;
  const db = env.DB;

  if (m === 'GET' && chemin.length === 1 && chemin[0] === 'etat') {
    const g = await db.prepare('SELECT id, nom, adultes, enfants, nuits FROM groupes ORDER BY cree_le, id').all();
    const n = await db.prepare('SELECT cle, valeur FROM notes').all();
    return json({ groupes: g.results, notes: Object.fromEntries(n.results.map((x) => [x.cle, x.valeur])) });
  }

  if (chemin.length === 2 && chemin[0] === 'groupes' && UUID.test(chemin[1])) {
    const id = chemin[1];
    if (m === 'DELETE') {
      await db.prepare('DELETE FROM groupes WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
    if (m === 'PUT') {
      const b = (await request.json().catch(() => null)) || {};
      const nom = typeof b.nom === 'string' ? b.nom.trim().slice(0, 60) : '';
      const adultes = entier(b.adultes, 1, 30);
      const enfants = entier(b.enfants, 0, 30);
      if (!nom || adultes === null || enfants === null || !nuitsValides(b.nuits)) return json({ erreur: 'saisie' }, 400);
      const existe = await db.prepare('SELECT 1 FROM groupes WHERE id = ?').bind(id).first();
      if (!existe) {
        const c = await db.prepare('SELECT COUNT(*) AS n FROM groupes').first();
        if (c.n >= MAX_GROUPES) return json({ erreur: 'plein' }, 409);
      }
      await db
        .prepare(
          `INSERT INTO groupes (id, nom, adultes, enfants, nuits) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET nom = excluded.nom, adultes = excluded.adultes,
             enfants = excluded.enfants, nuits = excluded.nuits, maj_le = datetime('now')`
        )
        .bind(id, nom, adultes, enfants, b.nuits)
        .run();
      return json({ ok: true });
    }
  }

  if (m === 'PUT' && chemin.length === 2 && chemin[0] === 'notes') {
    const cle = chemin[1];
    const piece = /^piece(\d{1,2})$/.exec(cle);
    const b = (await request.json().catch(() => null)) || {};
    const valeur = typeof b.valeur === 'string' ? b.valeur.slice(0, 120) : null;
    const connue = (cle === 'dortoir' && nuitsValides(valeur)) || (piece && Number(piece[1]) < NB_PIECES);
    if (valeur === null || !connue) return json({ erreur: 'saisie' }, 400);
    await db
      .prepare(
        `INSERT INTO notes (cle, valeur) VALUES (?, ?)
         ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, maj_le = datetime('now')`
      )
      .bind(cle, valeur)
      .run();
    return json({ ok: true });
  }

  return json({ erreur: 'inconnu' }, 404);
}

/* ---------- l'aiguillage ---------- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const estApi = url.pathname.startsWith('/api/');
    const estPage = url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/index';
    if (!estApi && !estPage) return env.ASSETS.fetch(request); // police, photos

    try {
      if (PROBLEMES.length) {
        if (estApi) return json({ erreur: 'reglages' }, 500);
        return pageSimple('Réglages à corriger', ['Le fichier evenement.json est à corriger :', ...PROBLEMES.map(html)], 500);
      }
      if (!env.DB) {
        if (estApi) return json({ erreur: 'base' }, 500);
        return pageSimple('Base manquante', ['La base de données n\'est pas reliée (réglage « d1_databases » de wrangler.jsonc).'], 500);
      }

      await tables(env.DB);
      let cle = await lireCle(env);

      if (estApi) {
        if (!cle || !pareil(request.headers.get('x-cle'), cle)) return json({ erreur: 'cle' }, 403);
        return await api(request, env, url.pathname.slice(5).split('/').filter(Boolean));
      }

      // Toute première visite : on crée la clé et on envoie vers le lien complet.
      if (!cle) {
        cle = await creerCle(env);
        return new Response(null, {
          status: 302,
          headers: { location: `/?k=${cle}&bienvenue=1`, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' },
        });
      }
      if (!pareil(url.searchParams.get('k'), cle)) {
        return pageSimple('Lien incomplet', ['Ce lien n\'est pas complet.', 'Redemandez le lien à la personne qui organise.'], 403);
      }

      const page = await env.ASSETS.fetch(new Request(new URL('/', url)));
      // Les réglages sont glissés dans la page : elle s'affiche juste dès la première image.
      const BARRE = String.fromCharCode(92);
      const reglages = JSON.stringify(evenement).replace(/</g, BARRE + 'u003c');
      const description = [evenement.lieu, periode()].filter(Boolean).join(', ') + '. Dites quelles nuits vous venez.';
      const sortie = new HTMLRewriter()
        .on('title', { element: (e) => void e.setInnerContent(evenement.nom) })
        .on('meta[property="og:title"]', { element: (e) => void e.setAttribute('content', evenement.nom) })
        .on('meta[property="og:description"]', { element: (e) => void e.setAttribute('content', description) })
        .on('script#evenement', { element: (e) => void e.setInnerContent(reglages, { html: true }) })
        .transform(page);
      const reponse = new Response(sortie.body, sortie);
      reponse.headers.set('x-robots-tag', 'noindex, nofollow');
      reponse.headers.set('referrer-policy', 'no-referrer'); // la clé est dans l'adresse : elle ne doit pas partir ailleurs
      reponse.headers.set('cache-control', 'no-store');
      return reponse;
    } catch (err) {
      console.error('erreur', request.method, url.pathname, err && err.message);
      if (estApi) return json({ erreur: 'serveur' }, 500);
      return pageSimple('Souci technique', ['Le site a un souci technique. Réessayez dans un instant.'], 500);
    }
  },
};
