# tv-accueil

Accueil maison de la TV Samsung du salon, sous forme de module TizenBrew (`packageType: app`).
Une page plein écran avec les applis de la maison rangées par usage (Regarder, En direct,
Écouter, Plus : magasin d'applis Samsung et TizenBrew), pilotée aux flèches et à OK de la
télécommande.

- YouTube ouvre le module TizenBrew TizenTube (`npm/@foxreis/tizentube`) par le service local de
  TizenBrew (`ws://localhost:8081`, événements `GetModules` = 4 et `LaunchModule` = 5) ; à défaut,
  l'appli YouTube native.
- La tuile du store affiche le chemin (Accueil, puis Applications) : la TV refuse de lancer le store par identifiant.
- Les autres tuiles : la page d'un module TizenBrew n'a pas l'API `tizen`. Elle demande donc le
  lancement au service du module (`service/service.js`, exécuté par TizenBrew en Node 4.4.3 avec
  l'objet `tizen` du service) sur `http://127.0.0.1:8095/lancer/<identifiant Tizen>`. En secours :
  l'API locale de la TV (`POST http://127.0.0.1:8001/api/v2/applications/<identifiant Samsung>`).
  Les deux identifiants sont en tête de `app/index.html` (relevés par `sdb shell 0 vd_applist`).
- Démarrage : à chaque ouverture, l'Accueil se déclare module de démarrage de TizenBrew
  (`ModuleAction` autolaunch). La tuile TizenBrew efface ce réglage puis revient au menu de
  TizenBrew (`history.back()`), qui sinon relancerait aussitôt l'Accueil.
- Mise au point : la page envoie son journal en requêtes d'image vers `192.168.1.99:8099` (PC du
  salon) ; sans écoute sur ce port, rien ne se passe.

## Fichiers

- `app/index.html` : coquille FIXE (ne plus la modifier) qui charge `app/accueil.css` et
  `app/accueil.js` depuis la branche `main` sur raw.githubusercontent.com à chaque ouverture
  (cache de 5 min au plus), et sa propre copie en secours.
- `app/accueil.css`, `app/accueil.js` : l'accueil lui-même. Un push sur `main` suffit : la TV
  prend la nouvelle version à l'ouverture suivante, sans réinstaller le module.
- `service/service.js` : service Node du module (lancement des applis).

## Installation sur la TV

Dans TizenBrew : gestionnaire de modules, ajouter un module GitHub `vguyon-dev/tv-accueil@v1.0.9`
(version épinglée : sans elle, jsDelivr sert des copies périmées d'un serveur à l'autre et limite
les purges). TizenBrew lit `package.json` par jsDelivr, d'où un dépôt public. L'Accueil retire
de lui-même l'ancienne inscription non épinglée et se déclare module de démarrage.
