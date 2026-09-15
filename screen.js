const STORAGE_KEY='rtk-tv-screens';
const CHANNEL_NAME='routicket-tv';
const params=new URLSearchParams(location.search);
const screenId=params.get('id')||'recepcion';
const stage=document.getElementById('stage');
const hudName=document.getElementById('hudName');
const hudStatus=document.getElementById('hudStatus');
const channel='BroadcastChannel'in window?new BroadcastChannel(CHANNEL_NAME):null;
let lastSignature='';

function getScreen(){
  try{const screens=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return screens.find(s=>s.id===screenId)||null;}catch(e){return null;}
}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function updateHud(screen,payload){hudName.textContent=screen?.name||`Pantalla ${screenId}`;hudStatus.textContent=payload?.title||'Esperando contenido';document.title=`${screen?.name||'Routicket TV'} · Routicket TV`;}
function welcome(){
  const screen=getScreen();updateHud(screen,null);
  stage.innerHTML=`<section class="welcome"><div class="welcome-card"><div class="logo">TV</div><h1>Routicket TV</h1><p>Esta pantalla está lista para recibir contenido desde Screen Manager.</p><span class="code">${escapeHtml(screenId.toUpperCase())}</span></div></section>`;
}
function render(payload){
  if(!payload||!payload.type||!payload.value){welcome();return;}
  const signature=JSON.stringify(payload);if(signature===lastSignature)return;lastSignature=signature;
  const screen=getScreen();updateHud(screen,payload);
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
  if(payload.type==='video'){
    const video=document.createElement('video');video.className='media';video.src=payload.value;video.autoplay=true;video.controls=false;video.loop=true;video.muted=false;video.playsInline=true;video.onerror=()=>showError('No se pudo reproducir el video',payload.value);stage.appendChild(video);video.play().catch(()=>{video.muted=true;video.play().catch(()=>{});});return;
  }
  const frame=document.createElement('iframe');frame.className='media';frame.src=payload.value;frame.allow='autoplay; fullscreen; picture-in-picture';frame.referrerPolicy='strict-origin-when-cross-origin';stage.appendChild(frame);
}
function showError(message,url){stage.innerHTML=`<section class="error-box"><div><h1>${escapeHtml(message)}</h1><p>El contenido puede estar bloqueando la reproducción dentro de un iframe o no estar disponible.</p><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Abrir contenido</a></div></section>`;}
function refreshFromStorage(){
  let command=null;try{command=JSON.parse(localStorage.getItem(`rtk-tv-command-${screenId}`)||'null');}catch(e){}
  const screen=getScreen();render(command||screen?.current||null);
}
channel?.addEventListener('message',event=>{if(event.data?.screenId===screenId)render(event.data.payload);});
window.addEventListener('storage',event=>{if(event.key===`rtk-tv-command-${screenId}`||event.key===STORAGE_KEY)refreshFromStorage();});
document.getElementById('reloadBtn').onclick=()=>{lastSignature='';refreshFromStorage();};
document.getElementById('fullBtn').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();};
refreshFromStorage();
