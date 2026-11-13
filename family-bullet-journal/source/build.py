import base64, re, sys, os
D = os.path.dirname(os.path.abspath(__file__))
P = lambda f: os.path.join(D, f)
html = open(P('original.html')).read()
lines = html.split('\n')

# 1) CSS : on garde la feuille d'origine (mise en page) et on ajoute le thème "Notre petit cocon" après
font = base64.b64encode(open(P('font/nunito-latin-wght-normal.woff2'), 'rb').read()).decode()
theme = open(P('theme.css')).read().replace('__NUNITO__', font)
assert lines[3].startswith('<style>') and lines[4] == '</style>'
lines[4] = '\n/* ---- theme ---- */\n' + theme + '\n</style>'

# 2) JS
js = lines[15]
def rep(old, new, count=1):
    global js
    n = js.count(old)
    assert n == count, (old[:80], n)
    js = js.replace(old, new)

inject = 'var FbjJ=O(K(),1);' + open(P('ill.js')).read() + '\n' + open(P('home.js')).read() + '\n'
rep('var Wg=O(Ge(),1)', inject + 'var Wg=O(Ge(),1)')

# logos (/icon.svg n'existe pas dans l'artefact) -> maison illustrée
def logo(m):
    size = int(m.group(2)); size = 36 if size < 40 else 104
    return '(0,%s.jsx)(FbjLogo,{size:%d})' % (m.group(1), size)
js, n = re.subn(r'\(0,([\w$]+)\.jsx\)\("img",\{src:"/icon\.svg",alt:"",width:(\d+),height:\d+\}\)', logo, js)
assert n == 4, n
rep('(0,ge.jsx)("span",{children:"Bullet Journal"})',
    '(0,ge.jsxs)("span",{children:["Notre cocon",(0,ge.jsx)("small",{children:"Bullet Journal"})]})')

# navigation : "Accueil"
rep('{route:"today",label:"Aujourd\'hui",icon:"sun"}', '{route:"today",label:"Accueil",icon:"sun"}')

# données d'accueil : nombre de tâches du jour déjà terminées (lecture seule)
rep('open_count:i.length}', 'open_count:i.length,done_today:a.filter(s=>s.status==="done"&&s.due_date===t).length}')

# accueil
old_head = '(0,y.jsx)(kt,{title:`${t.greeting} ${t.name}`,subtitle:(0,y.jsxs)(y.Fragment,{children:[Oi(t.date),n&&(0,y.jsx)("span",{className:"sr-only",children:" (mise \\xE0 jour\\u2026)"})]})}),t.phrase&&(0,y.jsx)("p",{className:"phrase",children:t.phrase}),'
rep(old_head, '(0,y.jsx)(FbjHome,{t,loading:n,onNote:u.actions.props.onNote}),')
rep('T("En retard",c,"late"),T("Aujourd\'hui",s)', '(0,y.jsx)(FbjTaskProgress,{e}),T("En retard",c,"late"),T("Aujourd\'hui",s)')

# états vides illustrés
rep('function Cn({icon:e,title:t,children:a}){return(0,B.jsxs)("div",{className:"empty",children:[(0,B.jsx)(z,{name:e,size:28})',
    'function Cn({icon:e,title:t,children:a}){return(0,B.jsxs)("div",{className:"empty",children:[FBJ_EMPTY[e]?(0,B.jsx)(FbjIll,{name:FBJ_EMPTY[e]}):(0,B.jsx)(z,{name:e,size:28})')

# pages à venir
rep('(0,Mt.jsx)(z,{name:t.icon,size:36}),(0,Mt.jsx)("h2",{children:"Pas encore d\\xE9velopp\\xE9"})',
    '(0,Mt.jsx)(FbjIll,{name:e}),(0,Mt.jsx)("span",{className:"soon-tag",children:"Bient\\xF4t dans votre cocon"}),(0,Mt.jsx)("h2",{children:"Pas encore d\\xE9velopp\\xE9"})')

# budget : petit bocal d'épargne dans le résumé
rep('c&&(0,N.jsxs)("section",{className:"card","aria-label":"R\\xE9sum\\xE9",children:[',
    'c&&(0,N.jsxs)("section",{className:"card budget-sum","aria-label":"R\\xE9sum\\xE9",children:[(0,N.jsx)(FbjIll,{name:"budget",className:"budget-ill"}),')

rep('Q1=["#2F8F83",', 'Q1=["#788F79","#D39A7C","#A8906E","#2F8F83",')
lines[15] = js
out = '\n'.join(lines)
os.makedirs(P('build'), exist_ok=True); open(P('build/cocon.html'), 'w').write(out)
i = out.index('<div id="root"></div>')
os.makedirs(P('test'), exist_ok=True); open(P('test/test-cocon.html'), 'w').write(out[:i] + open(P('mock.js')).read() + out[i:])
print('ok', len(out))
