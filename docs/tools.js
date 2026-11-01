
const $=s=>document.querySelector(s);
const root=$('#tool');const T=root.dataset.tool;const P=JSON.parse(root.dataset.params||'{}');
let files=[];
const fmt=b=>b>1048576?(b/1048576).toFixed(2)+' MB':(b/1024).toFixed(1)+' KB';
const drop=$('#drop'),inp=$('#file'),btn=$('#go'),out=$('#out'),info=$('#info');
const multi=(T==='merge-pdf'||T==='img2pdf');
if(multi)inp.setAttribute('multiple','');
drop.addEventListener('click',()=>inp.click());
['dragover','dragenter'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault()}));
drop.addEventListener('drop',ev=>{ev.preventDefault();setFiles(ev.dataTransfer.files)});
inp.addEventListener('change',()=>setFiles(inp.files));
function setFiles(fl){files=[...fl];if(!multi)files=files.slice(0,1);
 info.textContent=files.length?files.map(f=>f.name+' ('+fmt(f.size)+')').join(', '):'';btn.disabled=!files.length;out.innerHTML='';}
function add(name,blob,extra){const u=URL.createObjectURL(blob);const d=document.createElement('div');d.className='res';
 d.innerHTML='<span>'+name+' - '+fmt(blob.size)+(extra?' '+extra:'')+'</span><a download="'+name+'" href="'+u+'">Download</a>';out.appendChild(d);}
const toBlob=(c,t,q)=>new Promise(r=>c.toBlob(r,t,q));
async function loadImg(file){
 if(/heic|heif/i.test(file.type+file.name)){file=await heic2any({blob:file,toType:'image/jpeg',quality:.92});if(Array.isArray(file))file=file[0];}
 const url=URL.createObjectURL(file);
 return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Image open nahi hui'));i.src=url;});}
function draw(img,w,h,mime){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
 if(mime==='image/jpeg'){x.fillStyle='#fff';x.fillRect(0,0,w,h);}x.drawImage(img,0,0,w,h);return c;}
const base=n=>n.replace(/\.[^.]+$/,'');
async function compressTo(img,kb){
 const target=kb*1024;let best=null;
 for(const s of [1,.85,.7,.55,.45,.35,.25,.18]){
  const w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s));const c=draw(img,w,h,'image/jpeg');
  let lo=.05,hi=.95,ok=null;
  for(let i=0;i<8;i++){const q=(lo+hi)/2;const b=await toBlob(c,'image/jpeg',q);if(b.size<=target){ok=b;lo=q}else hi=q;}
  if(ok){best=ok;break;}
 }
 return best;}
async function run(){
 btn.disabled=true;out.innerHTML='<div class="note">Processing...</div>';
 try{
  const o=[];
  if(T==='compress'){
   for(const f of files){const img=await loadImg(f);
    if(P.kb){const b=await compressTo(img,P.kb);if(!b)throw new Error('Itni chhoti size mumkin nahi, bada KB try karein');o.push([base(f.name)+'-'+P.kb+'kb.jpg',b]);}
    else{let q=+($('#q')?$('#q').value:70)/100;const c=draw(img,img.width,img.height,'image/jpeg');o.push([base(f.name)+'-compressed.jpg',await toBlob(c,'image/jpeg',q)]);}}
  }else if(T==='resize'){
   const f=files[0];const img=await loadImg(f);let w=+$('#w').value||img.width,h=+$('#h').value;
   if(!h)h=Math.round(img.height*(w/img.width));const c=draw(img,w,h,'image/jpeg');
   let q=.92,b=await toBlob(c,'image/jpeg',q);const kb=+($('#kb')?$('#kb').value:0);
   if(kb){const bb=await compressTo(await loadImg(new File([b],'x.jpg',{type:'image/jpeg'})),kb);if(bb)b=bb;}
   o.push([base(f.name)+'-'+w+'x'+h+'.jpg',b]);
  }else if(T==='convert'){
   for(const f of files){const img=await loadImg(f);const mime=P.to==='png'?'image/png':'image/jpeg';
    const c=draw(img,img.width,img.height,mime);o.push([base(f.name)+'.'+(P.to==='png'?'png':'jpg'),await toBlob(c,mime,.92)]);}
  }else if(T==='img2pdf'){
   const pdf=await PDFLib.PDFDocument.create();
   for(const f of files){const img=await loadImg(f);const c=draw(img,img.width,img.height,'image/jpeg');
    const jb=await toBlob(c,'image/jpeg',.92);const em=await pdf.embedJpg(await jb.arrayBuffer());
    const sc=Math.min(1,595/em.width);const pg=pdf.addPage([em.width*sc,em.height*sc]);pg.drawImage(em,{x:0,y:0,width:em.width*sc,height:em.height*sc});}
   o.push(['images.pdf',new Blob([await pdf.save()],{type:'application/pdf'})]);
  }else if(T==='merge-pdf'){
   const pdf=await PDFLib.PDFDocument.create();
   for(const f of files){const src=await PDFLib.PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true});
    const pgs=await pdf.copyPages(src,src.getPageIndices());pgs.forEach(p=>pdf.addPage(p));}
   o.push(['merged.pdf',new Blob([await pdf.save()],{type:'application/pdf'})]);
  }else if(T==='split-pdf'){
   const f=files[0];const src=await PDFLib.PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true});
   const n=src.getPageCount();const rng=($('#range').value||('1-'+n)).split(',');const idx=[];
   rng.forEach(r=>{const m=r.trim().split('-').map(Number);const a=m[0],b=m[1]||m[0];for(let i=a;i<=b;i++)if(i>=1&&i<=n)idx.push(i-1);});
   if(!idx.length)throw new Error('Page range sahi nahi');
   const pdf=await PDFLib.PDFDocument.create();(await pdf.copyPages(src,idx)).forEach(p=>pdf.addPage(p));
   o.push([base(f.name)+'-split.pdf',new Blob([await pdf.save()],{type:'application/pdf'})]);
  }
  out.innerHTML='';o.forEach(x=>add(x[0],x[1]));
 }catch(e){out.innerHTML='<div class="note" style="color:#c0392b">Error: '+e.message+'</div>';}
 btn.disabled=false;
}
btn.addEventListener('click',run);
