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

## Installation sur la TV

Dans TizenBrew : gestionnaire de modules, ajouter un module GitHub `vguyon-dev/tv-accueil`.
TizenBrew lit `package.json` par jsDelivr (`https://cdn.jsdelivr.net/gh/vguyon-dev/tv-accueil/`),
d'où un dépôt public. Sans version, jsDelivr sert la dernière étiquette Git : à chaque
version, monter `version`, poser l'étiquette `vX.Y.Z`, pousser, puis purger
(`https://purge.jsdelivr.net/gh/vguyon-dev/tv-accueil/<fichier>`).
