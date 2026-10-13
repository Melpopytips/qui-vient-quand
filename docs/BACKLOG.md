# Backlog — Qui vient quand

## ✅ ÉTAT LIVE — maj 2026-10-13

- Installation suivie de bout en bout par un assistant qui découvrait le dépôt (Claude Code, Windows, compte Cloudflare déjà connecté) : réglages remplis, mise en ligne, base créée automatiquement, lien obtenu, vérifications passées.
- Parcours invité rejoué au format iPhone dans deux moteurs (Safari et Chrome) : première visite, saisie d'un groupe, rechargement, suppression.

## 🔧 Dettes & correctifs en suspens

- [ ] **Installation jamais essayée avec Codex** (constaté 2026-10-13) — qui le voit : les personnes qui collent le prompt dans Codex · impact : inconnu, à mesurer par un essai réel · bloqué par : un essai · où : `AGENTS.md`
- [ ] **Installation jamais essayée sans navigateur** (session dans le cloud, jeton `CLOUDFLARE_API_TOKEN`) (constaté 2026-10-13) — qui le voit : les personnes qui utilisent un assistant en ligne · impact : inconnu ; les droits exacts du jeton sont décrits de mémoire · bloqué par : un essai · où : `AGENTS.md`, « Cas à connaître »
- [ ] **Installation jamais essayée sur un compte Cloudflare tout neuf** (constaté 2026-10-13) — qui le voit : la plupart des nouveaux utilisateurs · impact : inconnu ; le choix du sous-domaine `workers.dev` peut bloquer la première mise en ligne · bloqué par : un essai avec un compte neuf · où : `AGENTS.md`, « Cas à connaître »
- [ ] **Consignes « tu fais, elle regarde » ajoutées sans nouvel essai à froid** (constaté 2026-10-13) — qui le voit : toute personne qui colle le prompt · impact : inconnu ; l'archive ZIP et le paquet `winget` de Node existent (vérifié), mais l'installation de Node par l'assistant, l'ouverture des pages et la réponse à la question du sous-domaine n'ont pas été rejouées · bloqué par : un essai par une personne non développeuse, sur son ordinateur, avec un compte Cloudflare neuf · où : `AGENTS.md`, « Ta façon de travailler » et « Étape 3 »
- [ ] **Commandes d'entretien non essayées** (changer la clé, tout supprimer) (constaté 2026-10-13) — qui le voit : l'organisateur, rarement · impact : inconnu · bloqué par : un essai · où : `AGENTS.md`, « Entretien »
- [ ] **Bouton WhatsApp et message « Pas de connexion » non essayés sur un vrai téléphone** (constaté 2026-10-13) — qui le voit : les invités · impact : inconnu · bloqué par : un essai réel · où : `public/index.html`
- [ ] **L'essai en local échoue dans un dossier au chemin très long sous Windows** (constaté 2026-10-13) — qui le voit : qui lance `wrangler dev` · impact : erreur interne, la mise en ligne n'est pas touchée ; cause supposée : la limite Windows de 260 caractères, non confirmée · bloqué par : rien · où : `AGENTS.md` (un chemin court est conseillé)
- [ ] **Changer les dates après les premières inscriptions décoche les nuits** (constaté 2026-10-13) — qui le voit : les invités déjà inscrits · impact : ils doivent recocher leurs nuits ; l'assistant est prévenu dans `AGENTS.md`, la page ne le dit pas · bloqué par : rien · où : `src/worker.js`, `public/index.html`
- [ ] **Deux personnes qui modifient le même groupe en même temps** (constaté 2026-10-13) — qui le voit : les invités, rarement · impact : la dernière saisie écrase l'autre, sans avertissement · bloqué par : rien, accepté pour un outil entre proches · où : `src/worker.js`
