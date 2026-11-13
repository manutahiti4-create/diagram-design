<script>
(function(){
  const KEY='mockdb'; let store={};
  try{store=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(store))}catch{}};
  const snap=(p)=>({exists:p in store,data:()=>JSON.parse(JSON.stringify(store[p]))});
  function doc(p){return{
    get:async()=>snap(p),
    set:async(d)=>{store[p]=d;save()},
    delete:async()=>{delete store[p];save()},
    acquire:async()=>({acquired:true}),
    collection:(n)=>coll(p+'/'+n)}}
  function coll(p){return{
    doc:(id)=>doc(p+'/'+id),
    get:async()=>({docs:Object.keys(store).filter(k=>k.startsWith(p+'/')&&!k.slice(p.length+1).includes('/')).map(k=>snap(k))})}}
  const db={collection:coll,doc:(p)=>doc(p)};
  window.claude={use:async(n)=>n==='db'?db:n==='user'?{id:async()=>'u1'}:n==='downloads'?{save:async()=>{}}:null};
})();
</script>
