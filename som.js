"use strict";
/* ══════════════════════════════════════════════════════════════════════════
   SOM — motor sintetizado, sem nenhum sample
   ══════════════════════════════════════════════════════════════════════════ */
const som={ctx:null,on:false,osc:[],ganho:null,mestre:null,
            pneu:null,pneuG:null,pneuF:null, vento:null,ventoG:null,ventoF:null,
            ruidoBuf:null};

/* Um segundo de ruído branco, gerado uma vez e reaproveitado em laço. Cada
   fonte nova aponta para este mesmo buffer — criar ruído por evento encheria
   a memória num jogo que dispara som o tempo todo. */
function bufRuido(ctx){
  if(som.ruidoBuf) return som.ruidoBuf;
  const n=ctx.sampleRate, b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  som.ruidoBuf=b; return b;
}
/* Fonte de ruído contínua, com filtro próprio: é o molde do pneu e do vento,
   que não são eventos e sim estados. */
function ruidoContinuo(ctx,destino,tipoFiltro,freq,q){
  const src=ctx.createBufferSource(); src.buffer=bufRuido(ctx); src.loop=true;
  const f=ctx.createBiquadFilter(); f.type=tipoFiltro; f.frequency.value=freq;
  if(q!=null) f.Q.value=q;
  const g=ctx.createGain(); g.gain.value=0;
  src.connect(f); f.connect(g); g.connect(destino); src.start();
  return {src,f,g};
}

function ligarSom(){
  if(som.ctx)return;
  som.ctx=new (window.AudioContext||window.webkitAudioContext)();
  const ctx=som.ctx;
  /* Compressor no fim de tudo. Sem ele, subir os efeitos para vencer a música
     faria o estouro estourar de verdade — soma do motor com a rolagem e o
     baque passa de 1.0 e satura feio. Com ele dá para ser generoso no ganho
     e o pico se resolve sozinho. */
  const lim=ctx.createDynamicsCompressor();
  lim.threshold.value=-12; lim.knee.value=6; lim.ratio.value=8;
  lim.attack.value=0.004; lim.release.value=0.16;
  lim.connect(ctx.destination);
  const mestre=ctx.createGain(); mestre.gain.value=1.0; mestre.connect(lim);
  som.mestre=mestre; som.lim=lim;

  const g=ctx.createGain(); g.gain.value=0; g.connect(mestre);
  som.ganho=g;
  for(const[tipo,det,vol] of [["sawtooth",0,.22],["square",-.02,.11],["sawtooth",.013,.09]]){
    const o=ctx.createOscillator(), gg=ctx.createGain();
    o.type=tipo; gg.gain.value=vol; o.connect(gg); gg.connect(g); o.start();
    som.osc.push({o,det});
  }
  /* Pneu: passa-banda estreito. Só canta ACIMA de um limiar de deslize —
     sem limiar ele cantava o tempo todo, e canto constante é chiado. */
  const pn=ruidoContinuo(ctx,mestre,"bandpass",1150,7.0);
  som.pneu=pn.src; som.pneuF=pn.f; som.pneuG=pn.g;
  /* O que se ouve num carro andando não é vento agudo: é a ROLAGEM, um ronco
     grave do pneu no chão. A primeira versão punha ruído passa-alta em volume
     de motor e virou chiado — o dono ouviu na hora. Passa-baixa, e baixo. */
  const rl=ruidoContinuo(ctx,mestre,"lowpass",240,0.9);
  som.rolagem=rl.src; som.rolF=rl.f; som.rolG=rl.g;
  /* Um oscilador lento move o corte da rolagem. Ruído filtrado parado é
     estático; um pouco de movimento já lê como superfície passando. */
  const lfo=ctx.createOscillator(), lfoG=ctx.createGain();
  lfo.type="sine"; lfo.frequency.value=0.27; lfoG.gain.value=34;
  lfo.connect(lfoG); lfoG.connect(rl.f.frequency); lfo.start();
  som.lfo=lfo;
}

function motorSom(rpm,carga){
  if(!som.on||!som.ctx)return;
  const base=52+rpm*118;
  for(const{o,det} of som.osc) o.frequency.setTargetAtTime(base*(1+det),som.ctx.currentTime,.03);
  som.ganho.gain.setTargetAtTime(0.035+carga*0.075,som.ctx.currentTime,.05);
}

/* Estado contínuo da corrida: deslize e velocidade viram som sem disparar
   evento nenhum. */
/* Piso muda o chão que se ouve: asfalto é ronco seco e baixo, terra é mais
   solto e grave, chuva é o único caso em que chiado está CERTO — é a água
   saindo debaixo do pneu. */
const CHAO={ asfalto:{corte:240, vol:0.030, q:0.9},
             terra:  {corte:170, vol:0.055, q:0.7},
             chuva:  {corte:900, vol:0.048, q:0.5} };

function ambienteSom(desliza, velNorm, foraDaPista, piso){
  if(!som.on||!som.ctx)return;
  const t=som.ctx.currentTime, v=cl(velNorm,0,1);
  const ch=CHAO[piso]||CHAO.asfalto;

  /* O pneu só canta a partir de 0,32 de deslize. Abaixo disso o carro está
     apenas andando, e som de derrapagem em linha reta é o que fazia tudo
     virar chiado. Acima do limiar ele entra rápido, que é como derrapagem
     soa de verdade: não tem meio-termo longo. */
  const canto=cl((desliza-0.32)/0.55, 0, 1);
  som.pneuG.gain.setTargetAtTime(canto*canto*0.15, t, .04);
  som.pneuF.frequency.setTargetAtTime(820+canto*1500, t, .05);
  som.pneuF.Q.setTargetAtTime(foraDaPista?2.2:7.5, t, .08);

  /* Rolagem: só existe andando, cresce com a velocidade e some parado.
     O corte sobe pouco, senão volta a ser chiado. */
  const rol = v*v*(0.35+0.65*v);
  som.rolG.gain.setTargetAtTime(rol*ch.vol*(foraDaPista?1.7:1.0), t, .10);
  som.rolF.frequency.setTargetAtTime(ch.corte*(0.75+0.5*v), t, .12);
  som.rolF.Q.setTargetAtTime(ch.q, t, .2);
}

/* ── eventos ──────────────────────────────────────────────────────────
   Um disparo = um punhado de nós que se auto-encerram. Nada fica pendurado:
   `stop()` agendado libera o nó, senão uma corrida de dois minutos deixaria
   milhares deles vivos. */
/* Um botão só para o volume de TODOS os efeitos. Subir cada som na mão
   destruiria o equilíbrio entre eles, que já está desenhado — o estouro tem
   de ser mais alto que o "peguei" de propósito. */
const GANHO_SFX=1.7;

function toque(freq, dur, tipo, vol, varre){
  if(!som.on||!som.ctx)return;
  const ctx=som.ctx, t=ctx.currentTime;
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type=tipo||"square"; o.frequency.setValueAtTime(freq,t);
  if(varre) o.frequency.exponentialRampToValueAtTime(Math.max(24,varre), t+dur);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime((vol==null?0.14:vol)*GANHO_SFX, t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t+dur);
  o.connect(g); g.connect(som.mestre);
  /* O navegador recolhe a cadeia depois que a fonte termina, mas desconectar
     na mão tira a dúvida — e numa corrida de dois minutos são centenas de
     disparos pendurados no nó mestre. O `onended` vem ANTES do `stop`: depois
     é ordem frágil, e a bancada pegou isso. */
  o.onended=()=>{ try{ g.disconnect(); o.disconnect(); }catch(e){} };
  o.start(t); o.stop(t+dur+0.02);
}
function baque(dur, corte, vol){
  if(!som.on||!som.ctx)return;
  const ctx=som.ctx, t=ctx.currentTime;
  const src=ctx.createBufferSource(); src.buffer=bufRuido(ctx);
  src.loop=false; src.playbackRate.value=0.6+Math.random()*0.5;
  const f=ctx.createBiquadFilter(); f.type="lowpass";
  f.frequency.setValueAtTime(corte||1800,t);
  f.frequency.exponentialRampToValueAtTime(180, t+dur);
  const g=ctx.createGain();
  g.gain.setValueAtTime((vol==null?0.30:vol)*GANHO_SFX,t);
  g.gain.exponentialRampToValueAtTime(0.0008, t+dur);
  src.connect(f); f.connect(g); g.connect(som.mestre);
  src.onended=()=>{ try{ g.disconnect(); f.disconnect(); src.disconnect(); }catch(e){} };
  src.start(t); src.stop(t+dur+0.02);
}

/* Cada som diz o que aconteceu sem o jogador ler nada. Turbo sobe, batida
   desce, escudo é limpo e agudo, míssil é varredura longa. */
const SONS={
  turbo:   ()=>{ toque(180,0.42,"sawtooth",0.11,760); baque(0.16,2600,0.14); },
  escudo:  ()=>{ toque(880,0.30,"sine",0.13,1320); toque(1320,0.22,"sine",0.07); },
  missil:  ()=>{ toque(140,0.75,"sawtooth",0.10,1400); baque(0.30,1400,0.20); },
  estouro: ()=>{ baque(0.55,3200,0.42); toque(90,0.42,"square",0.13,38); },
  tranco:  ()=>{ baque(0.22,2200,0.30); toque(150,0.16,"square",0.10,70); },
  oleo:    ()=>{ toque(300,0.26,"triangle",0.08,120); },
  // o salto é ar: um sino subindo, sem baque nenhum — o baque é do pouso
  salto:   ()=>{ toque(340,0.34,"sine",0.09,880); },
  pouso:   ()=>{ baque(0.26,1600,0.26); toque(90,0.12,"square",0.07); },
  reparo:  ()=>{ toque(520,0.16,"sine",0.10); setTimeout(()=>toque(780,0.22,"sine",0.10),90); },
  pegou:   ()=>{ toque(620,0.09,"square",0.10); setTimeout(()=>toque(930,0.13,"square",0.10),75); },
  batida:  (f)=>{ baque(0.34, 1200+2000*cl(f||0.5,0,1), 0.16+0.30*cl(f||0.5,0,1)); },
  conta:   ()=>{ toque(520,0.16,"square",0.12); },
  vai:     ()=>{ toque(1040,0.40,"square",0.15); },
  chegada: ()=>{ toque(660,0.14,"square",0.12);
                 setTimeout(()=>toque(880,0.14,"square",0.12),130);
                 setTimeout(()=>toque(1320,0.34,"square",0.13),260); },
  ui:      ()=>{ toque(1200,0.035,"square",0.05); },
};
/* A rolagem e o canto do pneu NÃO abrem buraco: são estado contínuo, e ceder
   lugar a eles seria a música piscando o tempo todo. */
const ABREM_BURACO={pegou:1,turbo:1,escudo:1,missil:1,estouro:1,tranco:1,
                    reparo:1,batida:1,vai:1,chegada:1};
function sfx(nome,arg){
  const f=SONS[nome]; if(!f) return;
  if(ABREM_BURACO[nome]) abrirBuraco();
  f(arg);
}

/* ══════════════════════════════════════════════════════════════════════════
   MÚSICA — arquivos de fora, tocados sob demanda
   ══════════════════════════════════════════════════════════════════════════

   Regras que o formato do manifesto já carrega:

   · UMA lista por tela. Sorteia-se dentro da lista, então duas variações da
     mesma faixa evitam a repetição imediata sem custar código.
   · A corrida tem uma lista POR PISO, e cai para `geral` quando o piso não
     tem faixa própria. Acrescentar música de terra é largar o arquivo na
     pasta e escrever uma linha aqui — não se mexe em código.
   · Nada é baixado antes da hora. Um `<audio>` com `preload="none"` só busca
     quando toca, senão a primeira visita puxaria 58 MB de uma vez.
   · Se o arquivo não existir, o jogo segue sem música e sem erro. O protótipo
     tem de continuar rodando de um arquivo só.
   · DOIS formatos, escolhidos na hora. Opus a 64 kbps soa melhor que AAC a
     96 e ocupa 31% menos — 20,7 MB contra 30,2. Mas o Safari só passou a ler
     Ogg há pouco, e o iPhone é metade do público de celular. Então o
     manifesto guarda o caminho SEM extensão e quem decide é o navegador.
     Custa espaço no repositório, que é barato; poupa dados do jogador, que
     não é. */
const MUSICA={
  menu:    ["menu/hino-do-motor"],
  garagem: ["garagem/hora-dourada-a","garagem/hora-dourada-b",
            "garagem/containers-a","garagem/containers-b",
            "garagem/hino-do-motor-longo"],
  mapa:    ["garagem/hora-dourada-b","garagem/containers-b"],
  corrida: { geral:["corrida/geral/pistao-a","corrida/geral/pistao-b"],
             asfalto:[], terra:[], chuva:[] },
  chegada: ["chegada/ferrugem-a","chegada/ferrugem-b"],
};
const RAIZ_MUSICA="musica/";
/* "probably" e não "maybe": navegador que hesita cai no AAC, que toca em todo
   lugar. Errar para o lado seguro aqui custa 9 MB; errar para o outro custa
   um jogador sem música nenhuma e sem saber por quê. */
const FORMATO=(()=>{ try{
  return new Audio().canPlayType('audio/ogg; codecs="opus"')==="probably" ? ".ogg" : ".m4a";
}catch(e){ return ".m4a"; } })();

/* 0,32 e não 0,55: as faixas do Suno vêm masterizadas alto, perto do teto,
   enquanto os efeitos vivem entre 0,1 e 0,4. A 0,55 a música engolia o jogo —
   o dono ouviu e disse exatamente isso. */
const mus={ el:null, atual:"", vol:0.32, tocando:false, ligada:true,
            duckMissil:1, duckEvento:1 };

function listaDe(chave, sub){
  const m=MUSICA[chave];
  if(!m) return [];
  if(Array.isArray(m)) return m;
  const esp=m[sub];
  return (esp && esp.length) ? esp : (m.geral||[]);
}
/* Sorteia sem repetir a que acabou de tocar: numa lista de dois, sortear puro
   repete metade das vezes e o jogador jura que só existe uma faixa. */
function sortearFaixa(lista){
  if(!lista.length) return "";
  if(lista.length===1) return lista[0];
  const outras=lista.filter(f=>f!==mus.atual);
  return outras[Math.floor(Math.random()*outras.length)];
}

function tocarMusica(chave, sub){
  if(!mus.ligada) return;
  const faixa=sortearFaixa(listaDe(chave,sub));
  if(!faixa || faixa===mus.atual) return;
  if(!mus.el){
    mus.el=new Audio();
    mus.el.preload="none";
    mus.el.loop=true;
    // arquivo ausente não pode derrubar nada: o jogo é jogável sem música
    mus.el.addEventListener("error",()=>{ mus.tocando=false; });
  }
  mus.atual=faixa;
  mus.el.src=RAIZ_MUSICA+faixa+FORMATO;
  mus.el.loop = chave!=="chegada";     // a chegada toca uma vez e cala
  mus.el.volume=0;
  const pr=mus.el.play();
  if(pr&&pr.catch) pr.catch(()=>{ mus.tocando=false; });
  mus.tocando=true;
  aparecerMusica();
}

/* Dois abaixamentos que se multiplicam, porque têm durações diferentes: o do
   míssil dura enquanto ele voa, o do evento é um buraco de um quarto de
   segundo para o "peguei" caber. Um só campo faria o segundo apagar o
   primeiro no meio do voo. */
function alvoMusica(){ return mus.vol*mus.duckMissil*mus.duckEvento; }

/* Entrada e saída em rampa. Corte seco em música é a coisa mais amadora que
   um jogo pode fazer, e custa umas dez linhas evitar. */
let fadeT=null;
function rampaMusica(alvo, ms){
  if(!mus.el) return;
  clearInterval(fadeT);
  const de=mus.el.volume, passo=40, n=Math.max(1,Math.round(ms/passo));
  let k=0;
  fadeT=setInterval(()=>{
    k++;
    const v=de+(alvo-de)*(k/n);
    try{ mus.el.volume=cl(v,0,1); }catch(e){}
    if(k>=n){ clearInterval(fadeT); if(alvo<=0.001 && mus.el){ mus.el.pause(); mus.tocando=false; } }
  }, passo);
}
function aparecerMusica(){ rampaMusica(alvoMusica(), 900); }
function calarMusica(){ rampaMusica(0, 500); }

/* A música abaixa quando o jogo precisa ser ouvido. É o que uma trilha
   gravada não faz sozinha, e o motivo de valer a pena tocá-la por código em
   vez de deixar um <audio autoplay> no HTML. */
function abaixarMusica(k){
  if(mus.duckMissil===k) return;
  mus.duckMissil=k;
  rampaMusica(alvoMusica(), k<1?260:700);
}

/* O buraco: a música cede metade por um instante para o efeito passar por
   cima. É o que faz um blip de 0,1 s ser ouvido sem precisar gritar — e era o
   que faltava, porque só subir o efeito acabaria numa guerra de volume. */
let buracoT=null;
function abrirBuraco(){
  if(!mus.el||!mus.tocando) return;
  mus.duckEvento=0.45;
  try{ mus.el.volume=cl(alvoMusica(),0,1); }catch(e){}
  clearTimeout(buracoT);
  buracoT=setTimeout(()=>{ mus.duckEvento=1; rampaMusica(alvoMusica(), 380); }, 190);
}
