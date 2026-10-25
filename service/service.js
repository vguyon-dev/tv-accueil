// Service du module, exécuté par TizenBrew sur la TV (Node 4.4.3, avec l'objet tizen du service).
// La page n'a ni l'API tizen ni le droit d'appeler l'API locale de la TV (401 depuis la TV) :
//  - /lancer/<id> lance une appli par son identifiant Tizen (app_tizen_id de vd_applist) ;
//  - /eteindre envoie la touche Power par la télécommande réseau (wss 8002, jeton accordé une
//    fois sur la TV au client « Accueil », gardé dans /home/owner/share/tv-accueil-jeton.json).
// Syntaxe ES5 seulement : Node 4 refuse let hors mode strict. TizenBrew charge ce fichier seul,
// sans ses voisins : tout doit tenir ici. Chaque version du service écoute son propre port
// (PORT), pour ne pas buter sur l'instance précédente qui garde le sien jusqu'au redémarrage.
var http = require('http');

var PORT = 8097;
var JETON = '/home/owner/share/tv-accueil-jeton.json';

// Journal de mise au point, comme la page : requête vers le PC du salon, ignorée s'il est éteint.
function trace(msg) {
    try {
        http.get('http://192.168.1.99:8099/s?m=' + encodeURIComponent(msg) + '&r=' + Math.random())
            .on('error', function () {});
    } catch (e) {}
}

// Client minimal de la télécommande réseau Samsung (wss://<tv>:8002), sans dépendance, en ES5
// pour le Node 4.4.3 de TizenBrew. Ouvre la connexion, attend ms.channel.connect (qui porte le
// jeton accordé sur la TV), envoie une touche, referme. Le jeton est gardé dans un fichier.
var tls = require('tls');
var crypto = require('crypto');
var fs = require('fs');

var NOM = new Buffer('Accueil').toString('base64');

function lireJeton(fichier) {
    try { return JSON.parse(fs.readFileSync(fichier, 'utf8')).jeton || ''; } catch (e) { return ''; }
}

function ecrireJeton(fichier, jeton) {
    try { fs.writeFileSync(fichier, JSON.stringify({ jeton: jeton })); } catch (e) {}
}

// Trame texte client, masquée comme l'exige le protocole WebSocket.
function trame(texte) {
    var donnees = new Buffer(texte, 'utf8');
    var masque = crypto.randomBytes(4);
    var entete;
    if (donnees.length < 126) {
        entete = new Buffer([0x81, 0x80 | donnees.length]);
    } else {
        entete = new Buffer([0x81, 0x80 | 126, donnees.length >> 8, donnees.length & 0xff]);
    }
    var masquees = new Buffer(donnees.length);
    for (var i = 0; i < donnees.length; i++) masquees[i] = donnees[i] ^ masque[i % 4];
    return Buffer.concat([entete, masque, masquees]);
}

// Lit les trames texte serveur (non masquées) contenues dans un tampon.
function lireTrames(tampon) {
    var messages = [];
    var pos = 0;
    while (pos + 2 <= tampon.length) {
        var longueur = tampon[pos + 1] & 0x7f;
        var debut = pos + 2;
        if (longueur === 126) { longueur = tampon.readUInt16BE(pos + 2); debut = pos + 4; }
        else if (longueur === 127) { longueur = tampon.readUInt32BE(pos + 6); debut = pos + 10; }
        if (debut + longueur > tampon.length) break;
        if ((tampon[pos] & 0x0f) === 1) messages.push(tampon.slice(debut, debut + longueur).toString('utf8'));
        pos = debut + longueur;
    }
    return { messages: messages, reste: tampon.slice(pos) };
}

function envoyerTouche(options, touche, rappel) {
    var hote = options.hote || '127.0.0.1';
    var fichier = options.fichierJeton;
    var jeton = fichier ? lireJeton(fichier) : '';
    var chemin = '/api/v2/channels/samsung.remote.control?name=' + NOM + (jeton ? '&token=' + jeton : '');
    var fini = false;
    function terminer(erreur, info) { if (!fini) { fini = true; try { socket.end(); } catch (e) {} rappel(erreur, info); } }

    trace('tls connect ' + hote + ' jeton=' + (jeton ? 'oui' : 'non'));
    var socket = tls.connect({ host: hote, port: 8002, rejectUnauthorized: false }, function () {
        trace('tls connecté');
        socket.write('GET ' + chemin + ' HTTP/1.1\r\nHost: ' + hote + ':8002\r\nUpgrade: websocket\r\n' +
            'Connection: Upgrade\r\nSec-WebSocket-Key: ' + crypto.randomBytes(16).toString('base64') +
            '\r\nSec-WebSocket-Version: 13\r\n\r\n');
    });
    var tampon = new Buffer(0);
    var poigneeFaite = false;
    socket.on('data', function (morceau) {
        tampon = Buffer.concat([tampon, morceau]);
        trace('données ' + morceau.length + ' : ' + morceau.toString('utf8', 0, Math.min(120, morceau.length)));
        if (!poigneeFaite) {
            var fin = tampon.toString('binary').indexOf('\r\n\r\n');
            if (fin < 0) return;
            if (tampon.toString('utf8', 0, 12).indexOf('101') < 0) return terminer('poignée refusée : ' + tampon.toString('utf8', 0, fin));
            poigneeFaite = true;
            tampon = tampon.slice(fin + 4);
        }
        var lu = lireTrames(tampon);
        tampon = lu.reste;
        lu.messages.forEach(function (texte) {
            var msg;
            try { msg = JSON.parse(texte); } catch (e) { return; }
            if (msg.event === 'ms.channel.connect') {
                var nouveau = msg.data && msg.data.token;
                if (nouveau && fichier && nouveau !== jeton) ecrireJeton(fichier, nouveau);
                socket.write(trame(JSON.stringify({ method: 'ms.remote.control', params: {
                    Cmd: 'Click', DataOfCmd: touche, Option: 'false', TypeOfRemote: 'SendRemoteKey' } })));
                setTimeout(function () { terminer(null, { touche: touche, jeton: !!(nouveau || jeton) }); }, 500);
            } else if (msg.event === 'ms.channel.unauthorized') {
                terminer('non autorisé sur la TV');
            }
        });
    });
    socket.on('error', function (e) { trace('erreur ' + e); terminer(String(e)); });
    // Laisse le temps d'accepter la demande d'accès affichée sur la TV la première fois.
    socket.setTimeout(45000, function () { terminer('délai dépassé (demande d\'accès non validée ?)'); });
}


function repondre(res, objet) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(objet));
}

var serveur = http.createServer(function (req, res) {
    trace('requête ' + req.url);
    if (req.url.indexOf('/eteindre') === 0) {
        return envoyerTouche({ hote: '127.0.0.1', fichierJeton: JETON }, 'KEY_POWER', function (erreur, info) {
            trace('eteindre fini ' + (erreur || JSON.stringify(info)));
            repondre(res, erreur ? { ok: false, erreur: erreur } : { ok: true, info: info });
        });
    }
    var m = req.url.match(/^\/lancer\/([^\/?]+)/);
    if (!m) return repondre(res, { ok: true, service: 'tv-accueil', port: PORT, tizen: typeof tizen !== 'undefined' });
    var id = decodeURIComponent(m[1]);
    try {
        tizen.application.launch(id,
            function () { repondre(res, { ok: true, id: id }); },
            function (e) { repondre(res, { ok: false, id: id, erreur: e.name + ' ' + e.message }); });
    } catch (e) {
        repondre(res, { ok: false, id: id, erreur: String(e) });
    }
});

serveur.on('error', function () {});
serveur.listen(PORT, '127.0.0.1');
trace('service démarré port ' + PORT);
