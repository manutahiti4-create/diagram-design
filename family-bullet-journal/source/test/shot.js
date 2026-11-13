const { chromium } = require('playwright');
const [,, file, prefix, theme] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, colorScheme: theme||'light' });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file://'+process.cwd()+'/'+file);
  await p.waitForTimeout(800);
  await p.screenshot({path:`${prefix}-0boot.png`, fullPage:true});
  const inp = await p.$('input');
  if (inp) { await inp.fill('Manu'); await p.keyboard.press('Enter'); await p.waitForTimeout(800); }
  await p.screenshot({path:`${prefix}-1after-join.png`, fullPage:true});
  // seed tasks
  const q = await p.$('.quick-add input');
  if (q) for (const t of ['Payer la facture EDT','Arroser les plantes','Préparer le culte familial']) { await q.fill(t); await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
  // expense
  const eb = await p.$('[data-action="expense"]') || await p.$('.quick-btn.accent');
  if (eb) { await eb.click(); await p.waitForTimeout(400);
    await p.screenshot({path:`${prefix}-sheet-expense.png`});
    const a = await p.$('.amount-input'); if (a) { await a.fill('4500'); }
    const c = await p.$('.cat-btn'); if (c) await c.click();
    const sv = await p.$('.sheet-foot .btn.primary'); if (sv) await sv.click(); await p.waitForTimeout(600); }
  for (const [r,h] of [['today','#aujourdhui'],['tasks','#taches'],['budget','#budget'],['meals','#repas'],['calendar','#calendrier'],['wellbeing','#bien-etre'],['settings','#reglages']]) {
    await p.evaluate(h=>location.hash=h, h); await p.waitForTimeout(700);
    await p.screenshot({path:`${prefix}-${r}.png`, fullPage:true});
  }
  await p.evaluate(()=>location.hash='#aujourdhui'); await p.waitForTimeout(500);
  const fab = await p.$('.fab'); if (fab){ await fab.click(); await p.waitForTimeout(400); await p.screenshot({path:`${prefix}-sheet-add.png`}); }
  const w = await p.evaluate(()=>document.documentElement.scrollWidth); console.log('scrollWidth',w);
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
