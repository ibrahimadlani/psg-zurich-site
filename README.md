# PSG Zurich — site de l'association

Site de l'association officielle des supporters du Paris Saint-Germain à Zurich ([psg-zurich.ch](https://psg-zurich.ch)).

Une seule application Next.js (front, API, back-office) qui tourne dans **un seul process Node**, conçue pour l'hébergement Web mutualisé d'Infomaniak : le build se fait sur GitHub Actions, le serveur se contente de lancer `node server.js`.

| Domaine | Choix |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components), TypeScript strict, `output: "standalone"` |
| Base de données | MariaDB / MySQL via Drizzle ORM + `mysql2`, migrations `drizzle-kit` |
| Authentification | Better Auth (adapter Drizzle), e-mail + mot de passe (réinitialisation par e-mail), rôles `member` / `admin` / `superadmin` |
| i18n | next-intl, FR (défaut), EN et DE, URL préfixées : `/fr/…`, `/en/…`, `/de/…` |
| UI | Tailwind CSS v4 + shadcn/ui (Radix), police Virage (PSG), thème clair/sombre |
| Formulaires | Zod 4 + React Hook Form |
| E-mails | Nodemailer (SMTP Infomaniak) + React Email |
| Runtime | Node 24 (`.nvmrc`), npm |

---

## Installation locale

Prérequis : Node 24 (`nvm use` ou `fnm use`), npm, Docker.

```bash
git clone git@github.com:ibrahimadlani/psg-zurich-site.git
cd psg-zurich-site
npm ci
cp .env.example .env            # puis remplacer BETTER_AUTH_SECRET : openssl rand -base64 32
docker compose up -d            # MariaDB (port 3306) + Mailpit (SMTP 1025, interface http://localhost:8025)
npm run db:migrate              # crée les tables
npm run dev                     # http://localhost:3000
```

Les e-mails envoyés en local (réinitialisation de mot de passe…) arrivent dans Mailpit : <http://localhost:8025>.
Si `SMTP_HOST` est vide, ils sont simplement affichés dans la console.

### Devenir administrateur

Les comptes se créent uniquement via le parcours d'adhésion (`/fr/adhesion`, l'inscription Better Auth publique est désactivée) et les rôles ne sont jamais modifiables depuis le client. Pour créer le premier compte :

```sql
INSERT INTO `user` (id, name, email, email_verified, role)
VALUES (UUID(), 'Prénom Nom', 'vous@exemple.ch', 1, 'superadmin');
```

Puis ouvrir `/fr/connexion/mot-de-passe-oublie` avec cette adresse : le lien reçu par e-mail permet de choisir le mot de passe. Pour un compte existant : `UPDATE user SET role = 'superadmin' WHERE email = '…';`

(en local : `docker compose exec mariadb mariadb -upsg -ppsg psg_zurich`, en production : phpMyAdmin depuis le Manager.)

## Site public et identité visuelle

- **Bannière d'annonce** en haut de toutes les pages (maintenance, info, urgence), pilotée depuis `/fr/admin` → « Bannière d'annonce » : titre en gras et message sur une ligne (FR obligatoire, EN/DE facultatifs), lien et date de fin facultatifs. Une seule annonce active à la fois ; chaque visiteur peut la masquer (✕), elle réapparaît dès qu'une nouvelle annonce est publiée. API : `/api/v1/announcements` (admin). Au premier déploiement, la migration `0002` active le message « Site en maintenance ».
- Connexion : `/fr/connexion` (+ `mot-de-passe-oublie`, `nouveau-mot-de-passe`) ; `/espace-membre` et `/admin` y redirigent sans session.
- L'accueil (`/fr`, `/en`, `/de`) est la page **« Bientôt ouvert »** (design Claude Design) : écusson + wordmark *Official Supporters Club Zurich*, sélecteur de langue, bascule clair/sombre. Les autres pages restent accessibles par URL (`/fr/espace-membre`, `/fr/admin`…).
- Police **Virage** (fichiers dans `src/fonts/`, chargés via `next/font/local`) : `font-sans` (texte), `font-wide` et `font-narrow` (titres).
- Thème : choix mémorisé dans `localStorage` (`psgz-theme`), sinon préférence du système ; appliqué avant le premier rendu par `ThemeScript`, sans flash.
- La langue est détectée depuis le navigateur à la première visite (`/` → `/fr`, `/en` ou `/de`).

## Variables d'environnement

Toutes documentées dans [`.env.example`](.env.example). Aucun secret n'est versionné.

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `DATABASE_URL` | oui | `mysql://UTILISATEUR:MOT_DE_PASSE@HÔTE:3306/BASE` (caractères spéciaux du mot de passe encodés en URL) |
| `BETTER_AUTH_SECRET` | oui | Secret aléatoire de 32+ caractères : `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | oui | URL publique, sans `/` final : `https://psg-zurich.ch` |
| `SMTP_HOST` | oui en prod | `mail.infomaniak.com` |
| `SMTP_PORT` | oui en prod | `465` (SSL) ou `587` (STARTTLS) |
| `SMTP_USER` | oui en prod | Adresse complète de la boîte d'envoi |
| `SMTP_PASSWORD` | oui en prod | Mot de passe de cette boîte |
| `MAIL_FROM` | oui en prod | Expéditeur, ex. `PSG Zurich <noreply@psg-zurich.ch>` (doit être autorisé par le compte SMTP) |
| `MAIL_REPLY_TO` | non | `contact@psg-zurich.ch` par défaut |
| `APP_VERSION` | non | Version affichée par `/api/health`. Laisser vide : le SHA du commit est injecté au build par la CI |
| `MIGRATE_ON_START` | non | `false` pour désactiver les migrations automatiques au démarrage (actives par défaut en production) |
| `HOSTNAME` | conseillé en prod | `0.0.0.0` : interface d'écoute du serveur standalone |
| `PORT` | fourni par l'hébergeur | Port d'écoute (Infomaniak l'injecte automatiquement) |

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (standalone dans `.next/standalone`) |
| `npm run start` | Sert le build localement (`next start`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Génère les types de routes puis `tsc --noEmit` |
| `npm run db:generate` | Génère une migration SQL dans `drizzle/` à partir de `src/db/schema.ts` |
| `npm run db:migrate` | Applique les migrations en attente (`scripts/migrate.mjs`, sans drizzle-kit) |
| `npm run db:studio` | Drizzle Studio |
| `scripts/bundle-standalone.sh [dossier]` | Assemble le bundle de déploiement après un build (utilisé par la CI) |

## Structure

```
src/
├── app/
│   ├── [locale]/              layout racine (polices, thème) + accueil « Bientôt ouvert »
│   │   ├── (site)/            pages avec la navigation : actualites, matchs, evenements,
│   │   │                      adhesion, contact, espace-membre, admin
│   │   └── not-found.tsx
│   ├── api/
│   │   ├── auth/[...all]/     Better Auth
│   │   ├── health/            { status, version, db, time } — teste réellement la base (SELECT 1)
│   │   └── v1/                une route par ressource (GET liste, POST réservé aux admins)
│   └── global-not-found.tsx   404 des URL hors routes
├── components/                logo, navigation, sélecteurs de langue et de thème, encadré
│                              « Statut du déploiement », ui/ (shadcn)
├── fonts/                     Virage (woff2), chargée par lib/fonts.ts
├── db/                        schema.ts (toutes les tables), index.ts (pool mysql2)
├── emails/                    templates React Email
├── i18n/                      routing, navigation, request (next/root-params)
├── lib/                       auth, auth-client, mail, permissions (requireRole), audit, api, validators
├── instrumentation.ts         migrations automatiques au démarrage du serveur
└── proxy.ts                   redirection vers /fr ou /de (next-intl)
messages/                      fr.json, en.json, de.json — tous les textes de l'interface
public/brand/                  écusson du PSG
drizzle/                       migrations SQL versionnées
scripts/                       migrate.mjs, bundle-standalone.sh
```

## API

Toutes les réponses ont la forme `{ "data": …, "error": null }` ou `{ "data": null, "error": { "code", "message", "details"? } }`.
Pagination : `?limit=20&offset=0` (max 100). Les créations sont validées par Zod et tracées dans `audit_log` (même transaction).

| Ressource | GET | POST |
| --- | --- | --- |
| `/api/v1/membership` | — | **public** : adhésion (compte + fiche membre `pending`, connecte le nouveau membre) |
| `/api/v1/posts` | public — articles publiés (`?locale=fr\|de`) | admin |
| `/api/v1/matches` | public | admin |
| `/api/v1/events` | public | admin |
| `/api/v1/documents` | selon le rôle (public / membres / admins) | admin |
| `/api/v1/polls` | membres (brouillons visibles des admins) | admin |
| `/api/v1/members` | admin (données personnelles) | admin |
| `/api/v1/subscribers` | admin | admin |
| `/api/v1/announcements` | admin | admin (+ `PATCH`/`DELETE` sur `/{id}`) |

Codes d'erreur : `400 validation_error | invalid_json`, `401 unauthorized`, `403 forbidden`, `409 conflict`, `500 internal_error`.

## Base de données

- Toutes les tables ont un `id` `varchar(36)` (UUID) et `created_at` / `updated_at` (`audit_log` est en ajout seul : pas d'`updated_at`).
- Les dates sont des `DATETIME` stockés en **UTC** (la connexion force `time_zone = '+00:00'`). Pas de `TIMESTAMP` : il est limité à 2038 et, sur MariaDB < 10.10, reçoit un `ON UPDATE CURRENT_TIMESTAMP` implicite.
- MariaDB ne supporte pas les requêtes relationnelles Drizzle avec `with: {…}` (LATERAL joins) : utiliser des `select` / `join` explicites.
- Modifier le schéma : éditer `src/db/schema.ts` → `npm run db:generate` → committer le fichier généré dans `drizzle/`. La migration s'appliquera toute seule au prochain démarrage en production.

## CI/CD

- **`ci.yml`** — sur chaque PR et chaque push : `npm ci`, lint, typecheck, build.
- **`deploy.yml`** — sur chaque push sur `main` (ou à la main via *Run workflow*) :
  1. lint, typecheck, build standalone (le SHA du commit est injecté dans la version) ;
  2. assemble le bundle : `.next/standalone` + `public/` + `.next/static` + `scripts/migrate.mjs` + `drizzle/`, sans `sharp` ni dépendances de dev, avec un `package.json` sans dépendances ;
  3. **smoke test** du bundle, isolé du dépôt, contre MariaDB 10.6 : démarrage, migrations automatiques, `/api/health` (base `ok` + bon SHA), pages FR/EN/DE ;
  4. publie le bundle sur la branche **`deploy`** (un commit par déploiement, historique linéaire).

---

## Déploiement Infomaniak

Le serveur ne fait **aucun build** : il clone la branche `deploy` (déjà compilée, ~30 Mo avec ses `node_modules` de production) et lance `node server.js`.

### 1. Préparer la base et l'e-mail (Manager Infomaniak)

1. **Hébergement → Bases de données** : créer une base MariaDB et un utilisateur ayant tous les droits dessus. Noter l'hôte (ex. `xxxx.myd.infomaniak.com`), le nom de la base, l'utilisateur et le mot de passe → `DATABASE_URL`.
2. **Service Mail** : créer l'adresse d'envoi (ex. `noreply@psg-zurich.ch`) → `SMTP_USER` / `SMTP_PASSWORD`.

### 2. Donner accès au dépôt privé

Infomaniak clone les dépôts privés en HTTPS avec authentification dans l'URL. Créer sur GitHub un **fine-grained personal access token** : *Repository access* → uniquement `psg-zurich-site`, *Permissions* → `Contents: Read-only`.

URL à fournir à Infomaniak :

```
https://ibrahimadlani:<TOKEN>@github.com/ibrahimadlani/psg-zurich-site.git
```

### 3. Créer le site Node.js

Manager → Hébergement Web → **Ajouter** → Node.js (version **24**) → domaine `psg-zurich.ch` → installation **Personnalisée** → **Git**, avec l'URL ci-dessus.

Puis, dans **Manage advanced settings → Node.js** :

| Champ du Manager | Valeur |
| --- | --- |
| Node.js version | `24` |
| Run command | `node server.js` |
| Listening port | `3000` (transmis à l'app via `PORT`) |
| Use a build command | coché |
| Build command | `git fetch origin deploy && git reset --hard FETCH_HEAD` |

La « build command » ne compile rien : elle remplace le code par le dernier bundle de la branche `deploy`. Ça marche quelle que soit la branche clonée à l'installation : le formulaire ne propose pas de choix de branche.

> ⚠️ Ne pas utiliser les valeurs proposées pour un projet Next.js classique (`npm ci && npm run build` et `node .next/standalone/server.js`). Elles compilent sur le serveur, ce que ce projet évite volontairement. Sur la branche `deploy`, `npm ci` échoue faute de lockfile, et `server.js` est à la racine. Un `.npmrc` (`dry-run=true`) empêche aussi qu'un `npm install` accidentel efface les `node_modules` embarqués.

### 4. Variables d'environnement

À renseigner dans le Manager si une interface de variables d'environnement est disponible :

```
DATABASE_URL=mysql://UTILISATEUR:MOT_DE_PASSE@HÔTE.myd.infomaniak.com:3306/NOM_BASE
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://psg-zurich.ch
SMTP_HOST=mail.infomaniak.com
SMTP_PORT=465
SMTP_USER=noreply@psg-zurich.ch
SMTP_PASSWORD=<mot de passe de la boîte>
MAIL_FROM=PSG Zurich <noreply@psg-zurich.ch>
MAIL_REPLY_TO=contact@psg-zurich.ch
HOSTNAME=0.0.0.0
```

Sinon (l'onglet Node.js n'en propose pas), créer un fichier **`.env`** avec ce contenu à la racine du site, via **Open the SSH console** :

```bash
cd /srv/customer/sites/psg-zurich.ch
nano .env          # coller les variables, enregistrer
chmod 600 .env
```

`server.js` le charge au démarrage. Il est ignoré par Git, et la build command ne l'efface pas.

> ⚠️ Next.js remplace `$NOM` par une variable d'environnement dans les valeurs du `.env`, même entre apostrophes : un mot de passe contenant `$` doit l'écrire `\$`, sinon il est tronqué en silence.

Activer ensuite le certificat SSL et **démarrer** l'application.

### 5. Vérifier

```bash
curl -s https://psg-zurich.ch/api/health
```

Doit renvoyer `"status":"ok"`, `"db":"ok"` et, dans `version`, le SHA du dernier commit de `main`. <https://psg-zurich.ch> affiche la page « Bientôt ouvert » ; une fois connecté en admin, l'encadré **Statut du déploiement** est aussi visible sur `/fr/admin`.

### Migrations

- **Automatiques** : à chaque démarrage, le serveur applique les migrations en attente (log `[migrate] database is up to date`). Désactivable avec `MIGRATE_ON_START=false`. En cas d'échec, le site démarre quand même et `/api/health` indique `db: "error"`.
- **À la demande** (SSH, dans le dossier du site) :

  ```bash
  node --env-file=.env scripts/migrate.mjs
  ```

  ou `DATABASE_URL='mysql://…' node scripts/migrate.mjs`. Le script est idempotent et n'a besoin que des modules déjà présents dans le bundle.

### Mettre à jour le site

1. Pousser (ou merger une PR) sur `main`.
2. Attendre le workflow **Deploy** (onglet *Actions*) : il met à jour la branche `deploy`.
3. Dans le Manager : relancer la **construction** (qui fait le `git fetch` / `git reset`), puis **redémarrer** l'application.
4. Vérifier le SHA renvoyé par `/api/health` (ou l'encadré « Statut du déploiement » de `/fr/admin`).

Pour revenir en arrière : *Revert* du commit sur `main` (nouveau déploiement), ou `git reset --hard <commit-de-deploy>` en SSH puis redémarrage.

### Dépannage

| Symptôme | Piste |
| --- | --- |
| 502 / site injoignable | Vérifier que le port du Manager est bien celui transmis via `PORT` et que `HOSTNAME=0.0.0.0` ; consulter la console d'exécution |
| Encadré « Dégradé », base en erreur | `DATABASE_URL` (hôte `…myd.infomaniak.com`, mot de passe encodé en URL), droits de l'utilisateur sur la base |
| E-mail de réinitialisation non reçu | Variables `SMTP_*` et `MAIL_FROM` (l'expéditeur doit correspondre au compte SMTP), logs `[mail]` |
| `Invalid origin` à la connexion | `BETTER_AUTH_URL` doit être exactement l'URL publique (`https://psg-zurich.ch`) |
