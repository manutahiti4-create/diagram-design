const fs=require('fs');const {chromium}=require('playwright');
const src=fs.readFileSync('ill.js','utf8');const ILL=eval(src.split('function FbjIll')[0]+';FBJ_ILL');
const vars='--il-line:#4A4F47;--il-sage:#788F79;--il-sage-l:#B4C4B2;--il-pale:#DDE7E1;--il-sand:#E5DCCF;--il-peach:#F0C5AF;--il-cream:#FFFDF8;--il-sky:#EEF3EC';
// maison sans le cercle de fond, sur fond plein
const house=ILL.house.replace(/<circle cx="60" cy="60" r="56"[^>]*\/>/,'').replace('viewBox="0 0 120 120"','viewBox="14 24 92 80"');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
for (const [name,size,pad,round] of [['icon-192',192,.16,true],['icon-512',512,.16,true],['icon-maskable-512',512,.26,false],['apple-touch-icon',180,.14,false]]) {
  await p.setViewportSize({width:size,height:size});
  const r=round?size*0.22:0;
  await p.setContent(`<body style="margin:0;background:transparent"><div style="${vars};width:${size}px;height:${size}px;background:#DDE7E1;border-radius:${r}px;display:flex;align-items:center;justify-content:center"><div style="width:${size*(1-2*pad)}px;height:${size*(1-2*pad)}px">${house.replace('<svg','<svg width="100%" height="100%"')}</div></div></body>`);
  await p.screenshot({path:`../app/public/icons/${name}.png`,omitBackground:true});
}
await b.close();})();
