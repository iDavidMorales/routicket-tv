const STORAGE_KEY='rtk-tv-screens';
const CHANNEL_NAME='routicket-tv';
const WIDGET_BASE='https://routicket.com/widget/element3.php?url=';
const params=new URLSearchParams(location.search);
const screenId=params.get('id')||'recepcion';
const stage=document.getElementById('stage');
const hudName=document.getElementById('hudName');
const hudStatus=document.getElementById('hudStatus');
const channel='BroadcastChannel'in window?new BroadcastChannel(CHANNEL_NAME):null;
let lastSignature='';
let loadTimer=null;

function getScreen(){
  try{const screens=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return screens.find(s=>s.id===screenId)||null;}catch(e){return null;}
}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function updateHud(screen,payload){
  hudName.textContent=screen?.name||`Pantalla ${screenId}`;
  hudStatus.textContent=payload?.title||'Pantalla lista';
  document.title=`${screen?.name||'Routicket TV'} · Routicket TV`;
}
function widgetUrl(url){return WIDGET_BASE+encodeURIComponent(String(url||'').trim());}
function isDirectVideo(url){return /\.(mp4|webm|ogg|m4v)(?:[?#].*)?$/i.test(String(url||''));}

function welcome(message='Esta pantalla está lista para recibir contenido desde Routicket TV.'){
  clearTimeout(loadTimer);
  const screen=getScreen();updateHud(screen,null);
  stage.innerHTML=`<section class="welcome"><div class="welcome-card"><div class="logo">TV</div><p style="margin:0 0 7px;font-size:.78rem;font-weight:900;letter-spacing:.18em;color:#7fc0ff">ROUTICKET</p><h1>Routicket TV</h1><p>${escapeHtml(message)}</p><span class="code">${escapeHtml(screenId.toUpperCase())}</span></div></section>`;
}

function renderWidget(payload){
  const originalUrl=String(payload.value||'').trim();
  const playerUrl=widgetUrl(originalUrl);
  stage.innerHTML=`<div class="widget-loading" id="widgetLoading" style="position:absolute;inset:0;z-index:2;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#17304d 0,#09111c 42%,#05080d 78%);color:#fff;text-align:center;padding:24px"><div><div style="font-size:2.1rem;margin-bottom:12px">TV</div><strong style="font-size:1.15rem">Cargando contenido…</strong><p style="color:#aab8c6;max-width:520px">Routicket está preparando el enlace para esta pantalla.</p></div></div>`;
  const frame=document.createElement('iframe');
  frame.className='media';
  frame.src=playerUrl;
  frame.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';
  frame.allowFullscreen=true;
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.title=payload.title||'Contenido Routicket TV';
  frame.onload=()=>{
    const loader=document.getElementById('widgetLoading');
    if(loader)loader.remove();
    hudStatus.textContent=`${payload.title||'Contenido'} · Widget conectado`;
  };
  stage.appendChild(frame);

  clearTimeout(loadTimer);
  loadTimer=setTimeout(()=>{
    const loader=document.getElementById('widgetLoading');
    if(!loader)return;
    loader.innerHTML=`<div><div style="font-size:2rem;margin-bottom:12px">TV</div><strong style="font-size:1.15rem">El contenido está tardando en cargar</strong><p style="color:#aab8c6;max-width:560px">Puedes recargar la pantalla o abrir el enlace original.</p><a href="${escapeHtml(originalUrl)}" target="_blank" rel="noreferrer" style="display:inline-flex;margin-top:8px;padding:11px 16px;border-radius:12px;background:#1683ff;color:#fff;text-decoration:none;font-weight:800">Abrir contenido</a></div>`;
  },12000);
}

function render(payload){
  if(!payload||!payload.type||!payload.value){welcome();return;}
  const signature=JSON.stringify(payload);if(signature===lastSignature)return;lastSignature=signature;
  const screen=getScreen();updateHud(screen,payload);
  clearTimeout(loadTimer);
  stage.innerHTML='';

  if(payload.type==='qr'){
    const wrap=document.createElement('section');wrap.className='qr-view';wrap.innerHTML=`<div class="qr-card"><h1>${escapeHtml(payload.title||'Escanea el código')}</h1><div class="qr-box" id="qrBox"></div><p>${escapeHtml(payload.value)}</p></div>`;stage.appendChild(wrap);
    const box=document.getElementById('qrBox');
    if(window.QRCode){new QRCode(box,{text:payload.value,width:720,height:720,correctLevel:QRCode.CorrectLevel.M});}
    else{box.textContent='QR no disponible';}
    return;
  }

  if(payload.type==='image'){
    const img=document.createElement('img');img.className='media cover';img.src=payload.value;img.alt=payload.title||'Imagen';img.onerror=()=>showError('No se pudo cargar la imagen',payload.value);stage.appendChild(img);return;
  }

  if(payload.type==='video'&&isDirectVideo(payload.value)){
    const video=document.createElement('video');video.className='media';video.src=payload.value;video.autoplay=true;video.controls=false;video.loop=true;video.muted=false;video.playsInline=true;video.onerror=()=>renderWidget(payload);stage.appendChild(video);video.play().catch(()=>{video.muted=true;video.play().catch(()=>renderWidget(payload));});return;
  }

  renderWidget(payload);
}

function showError(message,url){
  clearTimeout(loadTimer);
  stage.innerHTML=`<section class="error-box"><div><h1>${escapeHtml(message)}</h1><p>Routicket TV no pudo cargar este contenido.</p><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Abrir contenido</a></div></section>`;
}
function refreshFromStorage(){
  let command=null;try{command=JSON.parse(localStorage.getItem(`rtk-tv-command-${screenId}`)||'null');}catch(e){}
  const screen=getScreen();render(command||screen?.current||null);
}
channel?.addEventListener('message',event=>{if(event.data?.screenId===screenId)render(event.data.payload);});
window.addEventListener('storage',event=>{if(event.key===`rtk-tv-command-${screenId}`||event.key===STORAGE_KEY)refreshFromStorage();});
document.getElementById('reloadBtn').onclick=()=>{lastSignature='';refreshFromStorage();};
document.getElementById('fullBtn').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();};
welcome('Iniciando pantalla y buscando contenido asignado…');
requestAnimationFrame(refreshFromStorage);
