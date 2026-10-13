# Pour l'assistant IA qui installe cette app

Tu aides une personne à mettre en ligne sa propre copie de « Qui vient quand » : une page où les invités d'un séjour disent quelles nuits ils viennent, et où tout le monde voit combien de lits il reste.

La personne n'est souvent pas développeuse. Parle-lui simplement, sans jargon, et dis-lui à chaque fois ce qu'elle doit faire elle-même (se connecter, cliquer) et pourquoi. Fais tout le reste toi-même.

Le but est atteint quand elle a en main **un lien qui marche**, à coller dans WhatsApp.

## Ta façon de travailler : tu fais, elle regarde

Tu enchaînes toutes les étapes toi-même, sans lui demander de taper une commande ni d'ouvrir un fichier. Dis-lui dès le début qu'elle n'aura que trois choses à faire :

1. Répondre à tes questions, posées une seule fois, toutes ensemble.
2. Créer son compte Cloudflare, ou s'y connecter, dans la page que tu ouvres pour elle.
3. Cliquer sur « Allow » pour t'autoriser à mettre son site en ligne.

Tout le reste est pour toi : vérifier et installer ce qui manque, remplir les réglages, mettre en ligne, récupérer le lien, vérifier, lui ouvrir sa page. Avance sans t'arrêter entre deux étapes et dis-lui en une phrase ce que tu viens de faire.

Deux choses que tu ne fais jamais à sa place : créer son compte et saisir son mot de passe. C'est son identité, et Cloudflare vérifie qu'un humain est là. Si tu peux piloter son navigateur, ouvre les bonnes pages et montre-lui où cliquer, sans remplir ces champs-là.

Pour ouvrir une page dans son navigateur : `start "" "ADRESSE"` sous Windows, `open "ADRESSE"` sous macOS, `xdg-open "ADRESSE"` sous Linux.

Si tu lis ce fichier avant d'avoir le dépôt sur son ordinateur : `git clone https://github.com/Melpopytips/qui-vient-quand` s'il y a git. Sinon, et c'est fréquent, télécharge `https://github.com/Melpopytips/qui-vient-quand/archive/refs/heads/main.zip` et décompresse-le. N'installe pas git juste pour ça.

## Comment c'est fait

- `evenement.json` : les réglages de son évènement. C'est **le seul fichier à modifier**.
- `wrangler.jsonc` : le nom du site (champ `name`).
- `public/` : la page, la police, les photos. `src/worker.js` : le serveur. Rien à y changer pour une installation.
- L'hébergement est Cloudflare (offre gratuite) : un Worker et une base D1. La base et ses tables se créent toutes seules à la mise en ligne.
- Il n'y a ni `npm install`, ni étape de construction, ni migration à lancer.

## Étape 1 — Poser les questions

Pose ces questions en une seule fois, en français courant. Propose les valeurs par défaut pour ce qu'elle ne sait pas encore : tout se change plus tard.

1. Le nom de l'évènement et le lieu.
2. La date de la première nuit et le nombre de nuits (1 à 14).
3. Le nombre de places pour dormir, canapés non compris.
4. Les pièces où l'on dort et ce qu'elles contiennent (par exemple « Chambre 1, un lit double »). Facultatif.
5. Si on dépasse : où dorment les personnes en plus (« sur les canapés », « sous la tente »…).
6. Y a-t-il des nuits où les enfants dorment tous ensemble ailleurs (un dortoir, le salon) ? Si oui, où. Facultatif.
7. Les infos pratiques à afficher : heure d'arrivée, heure de départ, adresse, ce qu'il faut apporter. Facultatif.
8. Des photos du lieu ? Facultatif. Seulement des photos qu'elle a le droit d'utiliser (les siennes) : celles d'une annonce appartiennent au propriétaire.
9. Un lien vers une annonce ou un plan ? Une couleur particulière ? Facultatif.
10. Le nom du site, qui apparaît dans l'adresse. Propose-lui-en un à partir de l'évènement et de l'année, par exemple `weekend-annecy-2027`.

Deux vérifications avant d'aller plus loin, parce qu'elles faussent le compte des lits :

- Le nombre de places doit correspondre au total des pièces. S'ils diffèrent, demande-lui lequel est juste.
- Si le dortoir des enfants est une pièce déjà comptée dans les places, dis-le-lui : ces nuits-là, les enfants ne sont pas comptés dans les lits, donc la page annoncera des lits libres qui sont en réalité ceux du dortoir. Le plus simple est de sortir cette pièce du nombre de places.

## Étape 2 — Remplir les réglages

Écris ses réponses dans `evenement.json`, en remplaçant tout l'exemple : retire les infos qu'elle n'a pas données et ne laisse aucun « À compléter ». Garde tous les accents.

| Champ | Ce que c'est |
|---|---|
| `nom`, `lieu` | Affichés en haut de la page. |
| `premiere_nuit` | Date de la première nuit, au format `AAAA-MM-JJ`. |
| `nombre_de_nuits` | Entier de 1 à 14. Un week-end du vendredi au dimanche = 2 nuits. |
| `couchages` | Nombre de places pour dormir. Le dépasser n'est pas une erreur : les personnes en plus sont comptées à part. |
| `appoint` | Où dorment les personnes en plus, écrit pour finir la phrase « 2 … » : `"sur les canapés"`. |
| `dortoir_enfants` | `{ "lieu": "dans le salon", "nuits": [2] }` : un interrupteur par nuit « Les enfants dorment dans le salon », déjà activé pour les nuits listées (1 = première nuit). Ces nuits-là, les enfants ne prennent pas de lit. Mettre `null` s'il n'y en a pas. |
| `pieces` | Liste de `{ "nom", "detail" }`. Chacun pourra écrire sur la page qui dort où. Liste vide = pas d'onglet « Couchages ». |
| `infos` | Liste de `{ "titre", "texte" }`. Liste vide = pas d'onglet « Infos ». |
| `lien` | `{ "texte", "url" }` vers une annonce ou un plan. `url` vide = pas de lien. |
| `photos` | Noms des fichiers rangés dans `public/photos/`, par exemple `["salon.jpg"]`. Plusieurs photos = elles défilent. Liste vide = le titre seul, c'est très bien aussi. Réduis les photos à 1600 px de large au plus. |
| `couleur` | Couleur d'accent, au format `#rrggbb`. |

Puis donne un nom au site dans `wrangler.jsonc`, champ `name` : minuscules, chiffres et tirets, par exemple `weekend-annecy-2027`. Ce nom apparaît dans l'adresse. Deux évènements = deux noms différents, sinon le second écrase le premier.

## Étape 3 — Mettre en ligne

Il faut Node.js 20 ou plus (`node --version`). S'il manque, installe-le toi-même après lui avoir demandé son accord : `winget install OpenJS.NodeJS.LTS` sous Windows, `brew install node` sous macOS si Homebrew est présent. Sinon ouvre-lui nodejs.org et guide-la. Après l'installation, repars d'un terminal neuf pour que `node` soit reconnu.

Si elle n'a pas encore de compte Cloudflare, ouvre-lui `https://dash.cloudflare.com/sign-up` et attends qu'elle te dise que le compte est créé et son e-mail validé. Aucune carte bancaire n'est demandée.

```bash
npx wrangler@4 login     # ouvre le navigateur : elle clique sur « Allow »
npx wrangler@4 deploy    # met en ligne et affiche l'adresse du site
```

Avant `login`, préviens-la : une page Cloudflare va s'ouvrir, elle se connecte si besoin puis clique sur « Allow ». C'est son dernier geste.

Si `npx` demande « Ok to proceed? », réponds oui, ou écris `npx --yes wrangler@4 …`.

`deploy` crée la base tout seul et l'appelle `NOM-DU-SITE-db`. Il ne modifie pas `wrangler.jsonc`.

Cas à connaître :

- **Elle met en ligne depuis un autre continent que ses invités** (en voyage, expatriée) : la base est créée près de l'ordinateur qui lance `deploy`. Pour des invités en Europe, crée-la d'abord en Europe, puis seulement lance `deploy` :
  ```bash
  npx wrangler@4 d1 create NOM-DU-SITE-db --location weur
  ```
  et recopie l'identifiant affiché dans `wrangler.jsonc` : `"d1_databases": [{ "binding": "DB", "database_name": "NOM-DU-SITE-db", "database_id": "…" }]`.
- **Wrangler demande s'il faut relier une base existante ou en créer une** : crée toujours une base neuve. Relier celle d'un autre projet mélangerait les données.
- **Sous Windows**, range le dossier dans un chemin court (par exemple `C:\Users\elle\qui-vient-quand`). Dans un chemin très long, l'essai en local peut échouer avec une erreur interne.
- **Pas de navigateur** (session dans le cloud, serveur distant) : `login` ne peut pas aboutir. Demande-lui de créer un jeton sur dash.cloudflare.com (Mon profil, Jetons d'API, modèle « Modifier Cloudflare Workers », en y ajoutant le droit D1 en modification), puis utilise-le dans la variable d'environnement `CLOUDFLARE_API_TOKEN`. Ne l'écris dans aucun fichier.
- **Compte tout neuf** : Cloudflare demande une fois de choisir un sous-domaine `workers.dev`. Si la commande pose la question, réponds-y toi-même en proposant un nom court tiré du sien. Si tu ne peux pas y répondre, ouvre-lui `https://dash.cloudflare.com/?to=/:account/workers-and-pages`, où elle le choisit, puis relance `deploy`.
- **Plusieurs comptes Cloudflare** : choisis-en un avec elle et passe son identifiant dans `CLOUDFLARE_ACCOUNT_ID`.

## Étape 4 — Récupérer le lien et vérifier

La toute première visite du site crée la clé d'accès et renvoie vers le lien complet. Fais cette visite toi-même, tout de suite après la mise en ligne, pour que personne d'autre ne la fasse avant :

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}" https://ADRESSE-DU-SITE/
```

(Sous Windows PowerShell, écris `curl.exe`.) La réponse attendue est `302 https://…/?k=XXXXXXXX&bienvenue=1`. Le lien à partager est la partie `https://…/?k=XXXXXXXX`.

Si le code n'est pas 302, relance la commande sans `-o /dev/null` pour lire la page : une erreur qui cite `evenement.json` liste ce qu'il faut corriger. Corrige, relance `deploy`. Sur un compte tout neuf, l'adresse `workers.dev` peut aussi mettre une à deux minutes à répondre : attends et réessaie avant de conclure à une panne.

Vérifie ensuite, sans rien supposer :

1. L'adresse sans la clé répond 403 (« Ce lien n'est pas complet »).
2. Le lien complet répond 200 et la page porte le nom de son évènement : `curl -s "LIEN-COMPLET" | grep -o "<title>[^<]*</title>"`.

N'enregistre pas de groupe de test sur son site. Si tu en crées un pour vérifier, retire-le.

## Étape 5 — Lui donner la main

Ouvre le lien complet dans son navigateur, pour qu'elle voie sa page tout de suite. Puis donne-lui, dans cet ordre :

1. Le lien complet, seul sur une ligne.
2. Ce que c'est : le lien **est** la clé. Quiconque l'a peut voir et modifier les réponses. Il se partage dans le groupe WhatsApp, pas en public.
3. Comment changer quelque chose plus tard : elle te le demande, tu modifies `evenement.json` et tu relances `npx wrangler@4 deploy`. Les réponses déjà saisies sont gardées.

## Entretien

- **Changer les réglages** : modifier `evenement.json`, relancer `deploy`. Attention : changer `nombre_de_nuits` ou `premiere_nuit` après les premières inscriptions rend les nuits déjà cochées illisibles (elles s'affichent décochées). Préviens-la avant.
- **Le lien a fuité** : effacer la clé, puis redéployer pour que l'ancienne soit oubliée partout. La visite suivante en crée une neuve.
  ```bash
  npx wrangler@4 d1 execute NOM-DE-LA-BASE --remote --command "DELETE FROM reglages WHERE cle = 'cle'"
  npx wrangler@4 deploy
  ```
  La base s'appelle `NOM-DU-SITE-db` ; `npx wrangler@4 d1 list` le confirme.
- **Retrouver le lien perdu** : `npx wrangler@4 d1 execute NOM-DE-LA-BASE --remote --command "SELECT valeur FROM reglages WHERE cle = 'cle'"`.
- **Tout supprimer après le séjour** : `npx wrangler@4 delete`, puis supprimer la base avec `npx wrangler@4 d1 delete NOM-DE-LA-BASE`. C'est définitif : demande-lui confirmation avant.

## Essayer en local

```bash
npx wrangler@4 dev
```

Ouvre l'adresse affichée : la première visite crée une clé locale. Rien n'est mis en ligne.
