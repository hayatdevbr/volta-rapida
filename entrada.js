"use strict";
/* ══════════════════════════════════════════════════════════════════════════
   ESTADO DE CENA
   ══════════════════════════════════════════════════════════════════════════ */
let tela="garagem";
let malhaCarro=null, malhaPista=null, malhaCenario=null, malhaRival=[], malhaPoco=null, malhaChao=null, malhaSeta=null, malhaCaixa=null, malhaMancha=null, malhaBrasa=null, malhaNucleo=null, malhaAnel=null, malhaBrilho=null, malhaMissil=null, malhaEscudo=null,
    malhaSombra=null, malhaNuvens=null, malhaChuva=null;
let pista=gerarPista(3,'asfalto');
let corrida=null, mapa=null;
let camY=0.6, camDist=9.5, camAng=-0.7, girando=true;
const teclas={};
addEventListener("keydown",e=>{
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Tab"].includes(e.key))e.preventDefault();
  if(e.key==="Tab" && tela==="corrida" && corrida){
    const eu=corrida.pilotos[0];
    eu.sel = eu.itens[1-eu.sel] ? 1-eu.sel : eu.sel;   // só troca se houver o quê
  }
  teclas[e.key.toLowerCase()]=true;
  if(e.key==="r"&&tela==="corrida") iniciarCorrida();
  if(e.key==="Escape"&&tela==="corrida") desistir();
});
addEventListener("keyup",e=>{teclas[e.key.toLowerCase()]=false;});
/* ── toque ──────────────────────────────────────────────────────────────
   Um manche para guiar e dois botões de ação. O acelerador é AUTOMÁTICO:
   com quatro botões de pressionar era preciso uma terceira mão. */
const ehToque = ("ontouchstart" in window) || navigator.maxTouchPoints>0;
const manche = { dir:0, freio:false, id:null, cx:0, cy:0, r:56 };
(function(){
  const el=document.getElementById("manche"), bola=document.getElementById("mancheBola");
  const solta=()=>{ manche.dir=0; manche.freio=false; manche.id=null;
    el.classList.remove("puxado"); bola.style.transform="translate(0,0)"; };
  el.addEventListener("pointerdown",e=>{
    e.preventDefault(); manche.id=e.pointerId; el.setPointerCapture(e.pointerId);
    const r=el.getBoundingClientRect(); manche.cx=r.left+r.width/2; manche.cy=r.top+r.height/2;
    manche.r=r.width*0.42; el.classList.add("puxado"); mover(e);
    ligarSomSeMudo();
  });
  el.addEventListener("pointermove",e=>{ if(manche.id===e.pointerId){e.preventDefault(); mover(e);} });
  el.addEventListener("pointerup",e=>{ if(manche.id===e.pointerId) solta(); });
  el.addEventListener("pointercancel",solta);
  function mover(e){
    let dx=e.clientX-manche.cx, dy=e.clientY-manche.cy;
    const d=Math.hypot(dx,dy), lim=manche.r;
    if(d>lim){ dx*=lim/d; dy*=lim/d; }
    bola.style.transform="translate("+dx.toFixed(0)+"px,"+dy.toFixed(0)+"px)";
    manche.dir=cl(dx/lim,-1,1);
    manche.freio=dy>lim*0.55;      // puxar pra trás freia e dá ré
  }
})();
/* Sair no meio já não pagava nada — `terminarCorrida` só roda ao cruzar a
   linha. Mas o jogador não tinha como saber, e descobrir isso depois de
   desistir é a pior hora. Agora ele é avisado antes. */
function desistir(){
  if(corrida && !corrida.acabou && corrida.t>2){
    abrirModal(`
      <h2>Desistir?</h2>
      <div class="sub">A energia já foi gasta e você não leva nada — nem sucata,
        nem perícia, nem as peças que montou.</div>
      <div class="acoes">
        <button class="btn p" id="mFicar">Continuar correndo</button>
        <button class="btn" id="mSair">Desistir mesmo assim</button>
      </div>`);
    document.getElementById("mFicar").onclick=()=>{ fecharModal(); };
    document.getElementById("mSair").onclick=()=>{ fecharModal(); irPara("garagem"); };
    return;
  }
  irPara("garagem");
}
document.getElementById("sairCorrida").addEventListener("click",desistir);
document.getElementById("btDeitar").addEventListener("click",travarDeitado);
// no celular o próprio encaixe é o botão: um toque solta AQUELE item, sem modo
for(const el of document.querySelectorAll(".slot")){
  const i=el.dataset.i;
  const liga=e=>{ e.preventDefault(); teclas[String(+i+1)]=true;
                  if(corrida) corrida.pilotos[0].sel=+i; ligarSomSeMudo(); };
  const desliga=e=>{ e.preventDefault(); teclas[String(+i+1)]=false; };
  el.addEventListener("pointerdown",liga);
  el.addEventListener("pointerup",desliga);
  el.addEventListener("pointercancel",desliga);
  el.addEventListener("pointerleave",desliga);
  el.addEventListener("contextmenu",e=>e.preventDefault());
}
for(const b of document.querySelectorAll(".tq")){
  const k=b.dataset.k;
  const liga=e=>{e.preventDefault(); teclas[k]=true; b.classList.add("ativo");
                 if(k==="shift"||k==="e") ligarSomSeMudo();};
  const desliga=e=>{e.preventDefault(); teclas[k]=false; b.classList.remove("ativo");};
  b.addEventListener("pointerdown",liga);
  b.addEventListener("pointerup",desliga);
  b.addEventListener("pointercancel",desliga);
  b.addEventListener("pointerleave",desliga);
  b.addEventListener("contextmenu",e=>e.preventDefault());
}
function ligarSomSeMudo(){ if(som.ctx&&som.ctx.state==="suspended") som.ctx.resume(); }
/* Travar a orientação só funciona em tela cheia, e o Safari do iPhone não
   implementa a API. Então é BOTÃO, não automático: onde dá, trava; onde não
   dá, o aviso de deitar continua valendo e nada quebra. */
async function travarDeitado(){
  try{
    const el=document.documentElement;
    if(el.requestFullscreen) await el.requestFullscreen();
    else if(el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    if(screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
    return true;
  }catch(e){
    /* iPhone não tem a API, e alguns Android recusam fora de tela cheia. Não é
       erro: o retrato continua jogável, só mostra menos pista. */
    mostrarDica("SEU APARELHO NÃO DEIXA TRAVAR A TELA — GIRE NA MÃO MESMO",4200);
    return false;
  }
}

function atualizarToque(){
  const mostrar = ehToque && tela==="corrida";
  $("toque").hidden=!mostrar; $("toque").classList.toggle("on",mostrar);
  // em pé o menu vira barra embaixo e atrapalharia os controles: some na
  // corrida, e a saída passa a ser o ✕ do próprio HUD
  $("nav").classList.toggle("someNaCorrida", mostrar && innerHeight>innerWidth);
  const emPe = ehToque && tela==="corrida" && innerHeight>innerWidth;
  const g=$("girar");
  g.hidden=!emPe; g.classList.remove("on");
  if(emPe){ void g.offsetWidth; g.classList.add("on"); }
}
addEventListener("resize",atualizarToque);
addEventListener("orientationchange",atualizarToque);

/* ── controle de videogame ────────────────────────────────────────────── */
function lerGamepad(){
  if(!navigator.getGamepads) return;
  const g=[...navigator.getGamepads()].find(x=>x&&x.connected);
  if(!g) return;
  const eixo=g.axes[0]||0;
  teclas.arrowleft  = eixo<-0.25 || !!(g.buttons[14]&&g.buttons[14].pressed);
  teclas.arrowright = eixo> 0.25 || !!(g.buttons[15]&&g.buttons[15].pressed);
  const gat=(i)=>g.buttons[i]&&(g.buttons[i].pressed||g.buttons[i].value>0.3);
  teclas.arrowup   = gat(7)||gat(0);      // RT ou A
  teclas.arrowdown = gat(6)||gat(1);      // LT ou B
  teclas[" "]      = gat(2);              // X — freio de mão
  teclas.shift     = gat(5)||gat(3);      // RB ou Y — turbo
  teclas.e         = gat(4);              // LB — item
}

addEventListener("wheel",e=>{
  if(tela!=="mapa"||!mapa)return;
  e.preventDefault();
  mapa.zoom=cl(mapa.zoom*(1+Math.sign(e.deltaY)*0.13),0.45,3.4);
},{passive:false});

/* ── arrastar e pinçar no mapa, para o celular ── */
let toqueAnt=null, pincaAnt=0;
cv.addEventListener("touchstart",e=>{
  if(tela!=="mapa") return;
  if(e.touches.length===1) toqueAnt=[e.touches[0].clientX,e.touches[0].clientY];
  if(e.touches.length===2) pincaAnt=Math.hypot(
    e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
},{passive:true});
cv.addEventListener("touchmove",e=>{
  if(tela!=="mapa"||!mapa) return;
  if(e.touches.length===2){
    const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,
                       e.touches[0].clientY-e.touches[1].clientY);
    if(pincaAnt) mapa.zoom=cl(mapa.zoom*(pincaAnt/d),0.45,3.4);
    pincaAnt=d; e.preventDefault();
  }
},{passive:false});
cv.addEventListener("touchend",()=>{toqueAnt=null;pincaAnt=0;},{passive:true});
