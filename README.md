# tv-accueil

Accueil maison de la TV Samsung du salon, sous forme de module TizenBrew (`packageType: app`).
Une page plein écran avec les applis de la maison rangées par usage (Regarder, En direct,
Écouter, Plus : magasin d'applis Samsung et TizenBrew), pilotée aux flèches et à OK de la
télécommande.

- YouTube ouvre le module TizenBrew TizenTube (`npm/@foxreis/tizentube`) par le service local de
  TizenBrew (`ws://localhost:8081`, événements `GetModules` = 4 et `LaunchModule` = 5) ; à défaut,
  l'appli YouTube native.
- La tuile du store affiche le chemin (Accueil, puis Applications) : la TV refuse de lancer le store par identifiant.
- Les autres tuiles lancent l'appli native par `tizen.application.launch(<id>)`, ou à défaut par
  l'API locale de la TV (`POST http://127.0.0.1:8001/api/v2/applications/<id>`). Les identifiants
  sont en tête de `app/index.html`.

## Installation sur la TV

Dans TizenBrew : gestionnaire de modules, ajouter un module GitHub `vguyon-dev/tv-accueil`.
TizenBrew lit `package.json` par jsDelivr (`https://cdn.jsdelivr.net/gh/vguyon-dev/tv-accueil/`),
d'où un dépôt public. Après un push, jsDelivr peut garder l'ancienne version en cache
quelques heures.
