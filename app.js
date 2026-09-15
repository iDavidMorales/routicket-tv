const STORAGE_KEY='rtk-tv-screens';
const CHANNEL_NAME='routicket-tv';
const PLAY_ORIGIN='https://routicket-play-app.vercel.app';
const PLAY_SEARCH=`${PLAY_ORIGIN}/api/plugins/go/search.php`;
const PLAY_TMDB=`${PLAY_ORIGIN}/api/plugins/movies/tmdb_proxy.php`;
const channel='BroadcastChannel'in window?new BroadcastChannel(CHANNEL_NAME):null;

const defaultScreens=[
  {id:'recepcion',name:'Recepción',location:'Lobby',status:'online',current:{type:'routicket',title:'Routicket Play',value:`${PLAY_ORIGIN}/`}},
  {id:'restaurante',name:'Restaurante',location:'Área principal',status:'online',current:{type:'qr',title:'Menú digital',value:'https://routicket.com/'}},
  {id:'exterior',name:'Pantalla exterior',location:'Entrada',status:'offline',current:null}
];
const fixedLibrary=[
  {title:'Routicket Play',type:'routicket',value:`${PLAY_ORIGIN}/`,icon:'fa-solid fa-play',desc:'Abrir el catálogo completo de Routicket Play.',source:'play'},
  {title:'Routicket',type:'url',value:'https://routicket.com/',icon:'fa-solid fa-globe',desc:'Mostrar la plataforma Routicket.',source:'routicket'},
  {title:'QR de Routicket',type:'qr',value:'https://routicket.com/',icon:'fa-solid fa-qrcode',desc:'QR grande para abrir Routicket desde el teléfono.',source:'routicket'},
  {title:'Mapa Routicket',type:'url',value:'https://routicket.com/inicio',icon:'fa-solid fa-map-location-dot',desc:'Mapas, lugares y rutas de Routicket.',source:'routicket'}
];
let playItems=[];
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
function isUrl(v){return /^https?:\/\//i.test(String(v||''));}

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
function allLibrary(){return [...fixedLibrary,...playItems];}
function renderLibrary(){
  const items=allLibrary();
  $('#libraryGrid').innerHTML=items.map((item,i)=>`<article class="library-card">
    ${item.img?`<img class="library-cover" src="${escapeHtml(item.img)}" alt="" loading="lazy" onerror="this.style.display='none'">`:''}
    <div class="library-top"><span class="library-icon"><i class="${item.icon||iconForType(item.type)}"></i></span><span class="status online">${item.source==='api'?'Routicket Play API':'Disponible'}</span></div>
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.desc||'Contenido listo para mostrar en pantalla.')}</p>
    <div class="library-actions"><button class="primary-btn" data-library="${i}"><i class="fa-solid fa-tv"></i> Enviar a pantalla</button></div>
  </article>`).join('');
  $$('[data-library]').forEach(btn=>btn.onclick=()=>chooseScreenForLibrary(items[Number(btn.dataset.library)]));
}
function renderQuickList(){
  $('#quickList').innerHTML=fixedLibrary.slice(0,3).map((item,i)=>`<button type="button" class="quick-chip" data-quick="${i}"><i class="${item.icon}"></i> ${escapeHtml(item.title)}</button>`).join('');
  $$('[data-quick]').forEach(btn=>btn.onclick=()=>{
    const item=fixedLibrary[Number(btn.dataset.quick)];
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
  if(screen.current){setType(screen.current.type);$('#contentValue').value=screen.current.value||'';$('#contentTitle').value=screen.current.title||labelForType(screen.current.type);}else{setType('routicket');$('#contentValue').value=fixedLibrary[0].value;$('#contentTitle').value=fixedLibrary[0].title;}
  $('#controlModal').showModal();
}
function setType(type){
  activeType=type;
  $$('.type-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.type===type));
  const label=$('#contentLabel');
  const input=$('#contentValue');
  const cfg={routicket:['Contenido de Routicket Play',`${PLAY_ORIGIN}/`],url:['URL de la página','https://...'],qr:['Enlace o texto para el QR','https://...'],image:['URL de la imagen','https://.../imagen.jpg'],video:['URL del video','https://.../video.mp4']}[type];
  label.textContent=cfg[0];input.placeholder=cfg[1];input.type=type==='qr'?'text':'url';
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

function normalizeRouticketRow(row){
  const title=row.text||row.name||row.title||row.code||'Contenido';
  const id=row.id||row.code||title;
  const directVideo=row.video_url||row.trailer_url||row.youtube_url||'';
  if(directVideo){return {title,type:'video',value:directVideo,img:row.foto||row.img||'',desc:'Video disponible desde Routicket Play.',icon:'fa-solid fa-video',source:'api'};}
  if(isUrl(row.code)){return {title,type:'url',value:row.code,img:row.foto||row.img||'',desc:'Enlace publicado en Routicket Play.',icon:'fa-solid fa-globe',source:'api'};}
  const deepLink=`${PLAY_ORIGIN}/?v=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}`;
  return {title,type:'routicket',value:deepLink,img:row.foto||row.img||'',desc:'Abrir ficha y reproductor dentro de Routicket Play.',icon:'fa-solid fa-circle-play',source:'api'};
}
async function loadPlayContent(query=''){
  const status=$('#playApiStatus');
  status.textContent='Cargando contenido desde Routicket Play…';status.className='api-status loading';
  try{
    const url=query?`${PLAY_SEARCH}?query=${encodeURIComponent(query)}&sort=recent`:`${PLAY_SEARCH}?mode=code&sort=recent`;
    const res=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const rows=await res.json();
    playItems=(Array.isArray(rows)?rows:[]).slice(0,60).map(normalizeRouticketRow);
    renderLibrary();
    status.textContent=playItems.length?`${playItems.length} contenidos cargados desde Routicket Play`:'La API respondió, pero no devolvió contenido.';
    status.className='api-status';
  }catch(error){
    status.textContent='No se pudo cargar la API de Routicket Play. Puedes seguir enviando URLs manualmente.';
    status.className='api-status error';
  }
}

function setAuthGate(show,configured=true){
  const gate=$('#authGate');if(!gate)return;
  gate.hidden=!show;
  if(show){$('#authGateText').textContent=configured?'Inicia sesión con tu cuenta Routicket para administrar las pantallas.':'El login Routicket ya está preparado. Falta configurar las credenciales OAuth en Vercel.';}
}
async function refreshAuth(){
  const area=$('#authArea');
  try{
    const res=await fetch('/oauth/status',{credentials:'include',cache:'no-store'});
    const data=await res.json();
    if(!data.configured){area.innerHTML='<span class="auth-pending"><i class="fa-solid fa-key"></i> OAuth pendiente</span>';setAuthGate(false,false);return;}
    if(data.connected){
      const p=data.profile||{};
      area.innerHTML=`<div class="user-chip">${p.photo?`<img src="${escapeHtml(p.photo)}" alt="">`:'<i class="fa-solid fa-user"></i>'}<span>${escapeHtml(p.name||'Usuario Routicket')}</span><button id="logoutBtn" type="button" title="Cerrar sesión"><i class="fa-solid fa-right-from-bracket"></i></button></div>`;
      $('#logoutBtn').onclick=async()=>{await fetch('/oauth/logout',{method:'POST',credentials:'include'});location.reload();};
      setAuthGate(false,true);
    }else{
      const returnUrl=encodeURIComponent(location.href);
      area.innerHTML=`<a class="secondary-btn login-btn" href="/oauth/login?return=${returnUrl}"><i class="fa-solid fa-user-shield"></i> Entrar con Routicket</a>`;
      const gateLink=$('#authGateLogin');if(gateLink)gateLink.href=`/oauth/login?return=${returnUrl}`;
      setAuthGate(true,true);
    }
  }catch(_){area.innerHTML='<span class="auth-pending">Login no disponible</span>';setAuthGate(false,false);}
}

$$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.nav-item').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  $$('.section').forEach(s=>s.classList.remove('active'));$(`#section-${btn.dataset.section}`).classList.add('active');
  $('#sidebar').classList.remove('open');
  if(btn.dataset.section==='content'&&!playItems.length)loadPlayContent();
}));
$$('.type-btn').forEach(btn=>btn.addEventListener('click',()=>setType(btn.dataset.type)));
$('#sendBtn').onclick=sendToScreen;
$('#addScreenBtn').onclick=()=>$('#addModal').showModal();
$('#saveScreenBtn').onclick=addScreen;
$('#refreshBtn').onclick=()=>{screens=loadScreens();renderScreens();renderMetrics();toast('Estado actualizado');};
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
$('#playSearchBtn').onclick=()=>loadPlayContent($('#playSearchInput').value.trim());
$('#playSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter')loadPlayContent(e.currentTarget.value.trim());});
$('#playReloadBtn').onclick=()=>loadPlayContent($('#playSearchInput').value.trim());
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){screens=loadScreens();renderScreens();renderMetrics();}});

renderMetrics();renderScreens();renderLibrary();renderQuickList();refreshAuth();
