// Service du module, exécuté par TizenBrew sur la TV (Node 4.4.3, avec l'objet tizen du service).
// La page n'a pas l'API tizen : elle demande ici le lancement d'une appli par son identifiant
// Tizen (colonne app_tizen_id de `sdb shell 0 vd_applist`), sur http://127.0.0.1:8095/lancer/<id>.
// Syntaxe ES5 seulement : Node 4 refuse let hors mode strict.
var http = require('http');

var PORT = 8095;

function repondre(res, objet) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(objet));
}

var serveur = http.createServer(function (req, res) {
    var m = req.url.match(/^\/lancer\/([^\/?]+)/);
    if (!m) return repondre(res, { ok: true, service: 'tv-accueil', tizen: typeof tizen !== 'undefined' });
    var id = decodeURIComponent(m[1]);
    try {
        tizen.application.launch(id,
            function () { repondre(res, { ok: true, id: id }); },
            function (e) { repondre(res, { ok: false, id: id, erreur: e.name + ' ' + e.message }); });
    } catch (e) {
        repondre(res, { ok: false, id: id, erreur: String(e) });
    }
});

// Un service relancé trouve le port déjà pris par l'instance précédente, qui répond toujours.
serveur.on('error', function () {});
serveur.listen(PORT, '127.0.0.1');
