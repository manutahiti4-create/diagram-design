"""Construit la version installable hors ligne (PWA) à partir de cocon.html (sortie de build.py)."""
import os, sys
D = os.path.dirname(os.path.abspath(__file__))
P = lambda f: os.path.join(D, f)
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, '..', 'app')
os.makedirs(OUT, exist_ok=True)

html = open(P('build/cocon.html')).read()
lines = html.split('\n')
js = html
def rep(old, new, count=1):
    global js
    n = js.count(old)
    assert n == count, (old[:90], n)
    js = js.replace(old, new)

rep('var FbjJ=O(K(),1);', 'var FbjJ=O(K(),1);' + open(P('pwa.js')).read() + '\n')
# réglages : cartes adaptées à l'appli locale
rep('function $1(){', 'function $1(){return(0,_.jsx)(FbjDevice,{})}function $1_claude(){')
rep('function F1(){', 'function F1(){return(0,_.jsx)(FbjInstall,{})}function F1_claude(){')
rep('function W1(){', 'function W1(){return(0,_.jsx)(FbjPrivacy,{})}function W1_claude(){')
rep('(0,_.jsx)(J1,{}),', '(0,_.jsx)(J1,{}),(0,_.jsx)(FbjBackup,{}),')
# écran de bienvenue
rep('"Ton compte Claude"," n\'est pas encore rattach\\xE9 au journal."', '"Bienvenue dans votre cocon !"," Indique ton pr\\xE9nom pour cr\\xE9er ton profil sur ce t\\xE9l\\xE9phone."')
rep('children:"Rejoindre le journal"}),!1', 'children:"Cr\\xE9er mon profil"}),(0,k.jsx)(FbjRestoreLink,{})')
rep('"Seuls les deux premiers comptes peuvent rejoindre le journal."', '"Tes donn\\xE9es restent sur ce t\\xE9l\\xE9phone et fonctionnent sans Internet."')
html = js
lines = html.split('\n')

body_start = lines[1:]                       # tout sauf la ligne d'en-tête de l'artefact
body = '\n'.join(body_start).replace('<title>Family Bullet Journal</title>\n', '').replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
body = body.replace('</body></html>', '')
reset = lines[0].split('<style>', 1)[1].split('</style>', 1)[0]
runtime = open(P('runtime.js')).read()
sw_reg = """<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').then(function (reg) {
      function waiting(w) { window.__fbjWaitingSW = w; window.dispatchEvent(new Event('fbj-update-ready')); }
      if (reg.waiting && navigator.serviceWorker.controller) waiting(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing; if (!w) return;
        w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) waiting(w); });
      });
      setInterval(function () { reg.update().catch(function () {}); }, 60 * 60 * 1000);
    }).catch(function () {});
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!reloaded) { reloaded = true; location.reload(); } });
    window.addEventListener('fbj-apply-update', function () { if (window.__fbjWaitingSW) window.__fbjWaitingSW.postMessage('skipWaiting'); });
  });
}
</script>"""
head = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Notre petit cocon</title>
<meta name="description" content="Le journal familial de Manu et sa femme : tâches, budget, notes. Fonctionne hors ligne.">
<meta name="theme-color" content="#F8F6F1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1A1D1A" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>{reset}</style>
<script>{runtime}</script>
</head>
<body>
"""
out = head + body + '\n' + sw_reg + '\n</body>\n</html>\n'
assert 'claude.ai/artifact' not in out.split('<script>"use strict"')[0]
open(os.path.join(OUT, 'index.html'), 'w').write(out)
print('ok', len(out))
