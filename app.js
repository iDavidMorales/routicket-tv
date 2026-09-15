const STORAGE_KEY='rtk-tv-screens';
const CHANNEL_NAME='routicket-tv';
const channel='BroadcastChannel'in window?new BroadcastChannel(CHANNEL_NAME):null;
const defaultScreens=[
  {id:'recepcion',name:'Recepción',location:'Lobby',status:'online',current:{type:'routicket',title:'Routicket Play',value:'https://routicket-play-app.xupplier.workers.dev/'}},
  {id:'restaurante',name:'Restaurante',location:'Área principal',status:'online',current:{type:'qr',title:'Menú digital',value:'https://routicket.com/'}},
  {id:'exterior',name:'Pantalla exterior',location:'Entrada',status:'offline',current:null}
];
const library=[
  {title:'Routicket Play',type:'routicket',value:'https://routicket-play-app.xupplier.workers.dev/',icon:'fa-solid fa-play',desc:'Catálogo principal de contenido Routicket.'},
  {title:'Routicket',type:'url',value:'https://routicket.com/',icon:'fa-solid fa-globe',desc:'Mostrar la plataforma Routicket en pantalla.'},
  {title:'QR de Routicket',type:'qr',value:'https://routicket.com/',icon:'fa-solid fa-qrcode',desc:'QR grande para abrir Routicket desde el teléfono.'},
  {title:'Mapa Routicket',type:'url',value:'https://routicket.com/inicio',icon:'fa-solid fa-map-location-dot',desc:'Acceso rápido para contenido de mapas y lugares.'}
];
let screens=loadScreens();
let activeScreenId=null;
let activeType='routicket';

const $=sel=>document.querySelector(sel);
const $$=sel=>[...document.querySelectorAll(sel)];

function loadScreens(){
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(Array.isArray(saved)&&saved.length)return saved;}catch(e){}
  localStorage.setItem(STORAGE_KEY,JSON.stringify(defaultScreens));
  return structuredClone(defaultScreens);
}
function saveScreens(){localStorage.setItem(STORAGE_KEY,JSON.stringify(screens));renderScreens();renderMetrics();}
function iconForType(type){return {routicket:'fa-solid fa-play',url:'fa-solid fa-globe',qr:'fa-solid fa-qrcode',image:'fa-regular fa-image',video:'fa-solid fa-video'}[type]||'fa-solid fa-circle-play';}
function labelForType(type){return {routicket:'Routicket Play',url:'Página web',qr:'Código QR',image:'Imagen',video:'Video'}[type]||'Contenido';}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function slugify(v){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36)||`screen-${Date.now()}`;}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200);}

function renderMetrics(){
  $('#metricTotal').textContent=screens.length;
  $('#metricOnline').textContent=screens.filter(s=>s.status==='online').length;
  $('#metricPlaying').textContent=screens.filter(s=>s.current).length;
}
function renderScreens(){
  const grid=$('#screenGrid');
  grid.innerHTML=screens.map(screen=>{
    const current=screen.current;
    return `<article class="screen-card">
      <div class="screen-top"><span class="screen-icon"><i class="fa-solid fa-display"></i></span><span class="status ${screen.status==='online'?'online':''}">${screen.status==='online'?'En línea':'Sin conexión'}</span></div>
      <h3>${escapeHtml(screen.name)}</h3><p>${escapeHtml(screen.location||'Sin ubicación')}</p>
      <div class="now-row"><div><small>Mostrando ahora</small><strong>${current?escapeHtml(current.title||labelForType(current.type)):'Sin contenido'}</strong></div><i class="${iconForType(current?.type)}"></i></div>
      <div class="screen-actions">
        <button class="secondary-btn" data-open-screen="${screen.id}"><i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir</button>
        <button class="primary-btn" data-control-screen="${screen.id}"><i class="fa-solid fa-sliders"></i> Controlar</button>
      </div>
    </article>`;
  }).join('');
  $$('[data-control-screen]').forEach(btn=>btn.onclick=()=>openControl(btn.dataset.controlScreen));
  $$('[data-open-screen]').forEach(btn=>btn.onclick=()=>window.open(`./screen.html?id=${encodeURIComponent(btn.dataset.openScreen)}`,'_blank'));
}
function renderLibrary(){
  $('#libraryGrid').innerHTML=library.map((item,i)=>`<article class="library-card">
    <div class="library-top"><span class="library-icon"><i class="${item.icon}"></i></span><span class="status online">Disponible</span></div>
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.desc)}</p>
    <div class="library-actions"><button class="primary-btn" data-library="${i}"><i class="fa-solid fa-tv"></i> Enviar a pantalla</button></div>
  </article>`).join('');
  $$('[data-library]').forEach(btn=>btn.onclick=()=>chooseScreenForLibrary(library[Number(btn.dataset.library)]));
}
function renderQuickList(){
  $('#quickList').innerHTML=library.slice(0,3).map((item,i)=>`<button type="button" class="quick-chip" data-quick="${i}"><i class="${item.icon}"></i> ${escapeHtml(item.title)}</button>`).join('');
  $$('[data-quick]').forEach(btn=>btn.onclick=()=>{
    const item=library[Number(btn.dataset.quick)];
    setType(item.type);$('#contentValue').value=item.value;$('#contentTitle').value=item.title;
  });
}
function chooseScreenForLibrary(item){
  const candidate=screens.find(s=>s.status==='online')||screens[0];
  if(!candidate){toast('Primero añade una pantalla');return;}
  openControl(candidate.id);
  setType(item.type);$('#contentValue').value=item.value;$('#contentTitle').value=item.title;
}
function openControl(id){
  const screen=screens.find(s=>s.id===id);if(!screen)return;
  activeScreenId=id;
  $('#modalScreenName').textContent=screen.name;
  $('#openScreenLink').href=`./screen.html?id=${encodeURIComponent(id)}`;
  $('#nowPlaying').innerHTML=screen.current?`<small>Reproduciendo ahora</small><strong>${escapeHtml(screen.current.title||labelForType(screen.current.type))}</strong>`:'<small>Reproduciendo ahora</small><strong>Sin contenido</strong>';
  if(screen.current){setType(screen.current.type);$('#contentValue').value=screen.current.value||'';$('#contentTitle').value=screen.current.title||labelForType(screen.current.type);}else{setType('routicket');$('#contentValue').value=library[0].value;$('#contentTitle').value=library[0].title;}
  $('#controlModal').showModal();
}
function setType(type){
  activeType=type;
  $$('.type-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.type===type));
  const label=$('#contentLabel');
  const input=$('#contentValue');
  const cfg={routicket:['Contenido de Routicket Play','https://routicket-play-app.xupplier.workers.dev/'],url:['URL de la página','https://...'],qr:['Enlace o texto para el QR','https://...'],image:['URL de la imagen','https://.../imagen.jpg'],video:['URL del video','https://.../video.mp4']}[type];
  label.textContent=cfg[0];input.placeholder=cfg[1];input.type='url';
  if(type==='qr')input.type='text';
}
function sendToScreen(){
  const screen=screens.find(s=>s.id===activeScreenId);if(!screen)return;
  const value=$('#contentValue').value.trim();
  if(!value){toast('Agrega el contenido que quieres mostrar');return;}
  const payload={type:activeType,value,title:$('#contentTitle').value.trim()||labelForType(activeType),updatedAt:Date.now()};
  screen.current=payload;screen.status='online';saveScreens();
  localStorage.setItem(`rtk-tv-command-${screen.id}`,JSON.stringify(payload));
  channel?.postMessage({screenId:screen.id,payload});
  $('#nowPlaying').innerHTML=`<small>Reproduciendo ahora</small><strong>${escapeHtml(payload.title)}</strong>`;
  toast(`Enviado a ${screen.name}`);
}
function addScreen(){
  const name=$('#newScreenName').value.trim();if(!name){toast('Escribe un nombre para la pantalla');return;}
  let id=slugify(name);let n=2;while(screens.some(s=>s.id===id))id=`${slugify(name)}-${n++}`;
  screens.push({id,name,location:$('#newScreenLocation').value.trim()||'Sin ubicación',status:'online',current:null});saveScreens();
  $('#addModal').close();$('#newScreenName').value='';$('#newScreenLocation').value='';toast('Pantalla creada');
}

$$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.nav-item').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  $$('.section').forEach(s=>s.classList.remove('active'));$(`#section-${btn.dataset.section}`).classList.add('active');
  $('#sidebar').classList.remove('open');
}));
$$('.type-btn').forEach(btn=>btn.addEventListener('click',()=>setType(btn.dataset.type)));
$('#sendBtn').onclick=sendToScreen;
$('#addScreenBtn').onclick=()=>$('#addModal').showModal();
$('#saveScreenBtn').onclick=addScreen;
$('#refreshBtn').onclick=()=>{screens=loadScreens();renderScreens();renderMetrics();toast('Estado actualizado');};
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){screens=loadScreens();renderScreens();renderMetrics();}});

renderMetrics();renderScreens();renderLibrary();renderQuickList();
