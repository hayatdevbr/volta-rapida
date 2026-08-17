"use strict";
/* ── partida ── */

/* ══════════════════════════════════════════════════════════════════════════
   BANCA DE TESTE — para o dono não esperar duas horas por uma corrida

   Ligada por `#teste` no endereço, e NUNCA por padrão. Fica visível na tela
   enquanto estiver ligada, porque o pior jeito de um atalho de teste vazar
   para produção é ele ser silencioso.

   O que ela NÃO faz: mexer em drop, prémio ou desgaste. Só adianta a espera —
   dá energia e sucata. Se ela afinasse o balanceamento, o que fosse testado
   com ela ligada não valeria nada.
   ══════════════════════════════════════════════════════════════════════════ */
function ligarBancaDeTeste(){
  // typeof: a bancada de núcleo roda no Node, onde `location` nem existe
  if(typeof location==="undefined" || !location.hash.includes("teste")) return;
  estado.energia=BATERIA;
  estado.sucata=Math.max(estado.sucata, 6000);
  estado.pericia=Math.max(estado.pericia, 120);
  for(const k of ["chassi","motor","rodas","aero"])
    estado.destravado[k]=PECAS[k].map((_,i)=>i);
  salvar(); montarGaragem();

  const av=document.createElement("div"); av.id="avisoTeste";
  av.innerHTML=`<b>Banca de teste</b><span>energia cheia · tudo destravado</span>
    <button id="testeEnche">encher de novo</button>`;
  document.body.appendChild(av);
  $("testeEnche").onclick=()=>{
    estado.energia=BATERIA; estado.sucata+=3000;
    for(const k of ["chassi","motor","rodas","aero"]) estado.dur[k]=100;
    salvar(); montarGaragem(); sfx("pegou"); mostrarDica("BANCA DE TESTE · TANQUE CHEIO",2500);
  };
}

/* A energia coletada com o jogo aberto só existia na memória: quem farmava e
   fechava a aba sem comprar nada perdia tudo, porque `salvar` só era chamado
   em compra, corrida e pintura. Um salvamento periódico e outro na saída. */
setInterval(()=>{ if(tela!=="corrida") salvar(); }, 15000);
addEventListener("pagehide", salvar);
addEventListener("visibilitychange", ()=>{ if(document.hidden) salvar(); });

gerarIcones();
// ícones fixos da barra de topo, uma vez só
for(const [id,nome] of [["nGar","mGaragem"],["nMapa","mMapa"],["nCor","mCorrer"],["nSom","mSom"]])
  $(id).firstElementChild.innerHTML=icone(nome,17);
$("icE").innerHTML=icone("energia",22);
$("icP").innerHTML=icone("pericia",22);
$("icS").innerHTML=icone("sucata",22);

const voltou=carregar();
if(!voltou) sortearProxima();
iniciarMapa();          // o pátio começa a rodar antes de qualquer tela aparecer
reconstruirCarro(); reconstruirPista(); construirPoco(); construirChao(); construirSeta();
construirCaixa(); construirMancha(); construirChama(); construirAnel();
construirMissil(); construirEscudo(); construirSombra(); construirNuvens();
construirChuva(); montarGaragem();
ligarBancaDeTeste();
if(voltou){
  // recupera o idle do tempo em que a aba esteve fechada
  const seg=Math.min(8*3600,(Date.now()-(estado.idleUltimo||Date.now()))/1000);
  estado.idleUltimo=Date.now();
  if(seg>120){
    const r=simularIdle(seg); salvar();
    if(r.ganho>1) setTimeout(()=>mostrarDica(
      "BEM-VINDO DE VOLTA · SEU CARRO COLETOU "+Math.round(r.ganho)+" DE ENERGIA"
      +(r.cheia?" E ENCHEU A BATERIA":""), 7000), 400);
  }
}
$("dica").textContent=dicaPadrao();

/* Nada é desenhado enquanto o portão está de pé: o primeiro quadro que o
   jogador vê já está na orientação que ele escolheu. */
function comecar(){ $("portao").hidden=true; atualizarToque(); requestAnimationFrame(quadro); }
if(ehToque && !localStorage.getItem("ca_orientacao")){
  $("portao").hidden=false;
  $("pgTravar").addEventListener("click",async()=>{
    localStorage.setItem("ca_orientacao","travado");
    await travarDeitado(); comecar();
  });
  $("pgPular").addEventListener("click",()=>{
    localStorage.setItem("ca_orientacao","livre"); comecar();
  });
}else comecar();
