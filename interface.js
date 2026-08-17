"use strict";
/* ══════════════════════════════════════════════════════════════════════════
   INTERFACE
   ══════════════════════════════════════════════════════════════════════════ */
/* O minimapa é 2D puro: traçado da pista uma vez, e um ponto por carro. Fazer
   em WebGL exigiria outra câmera e outro passe para ganhar nada. */
let miniCtx=null, miniCaixa=null;
function prepararMini(){
  const cv2=$("miniCv"); miniCtx=cv2.getContext("2d");
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
  for(const p of pista.pontos){
    x0=Math.min(x0,p.x); x1=Math.max(x1,p.x);
    z0=Math.min(z0,p.z); z1=Math.max(z1,p.z);
  }
  const larg=Math.max(x1-x0,z1-z0)*1.10;
  miniCaixa={cx:(x0+x1)/2, cz:(z0+z1)/2, esc:cv2.width/larg, meio:cv2.width/2};
}
function desenharMini(){
  if(!miniCtx||!corrida) return;
  const c=miniCtx, L=$("miniCv").width, B=miniCaixa;
  const px=(x)=>B.meio+(x-B.cx)*B.esc, pz=(z)=>B.meio+(z-B.cz)*B.esc;
  c.clearRect(0,0,L,L);
  // traçado
  c.beginPath();
  for(let i=0;i<pista.n;i++){
    const p=pista.pontos[i];
    i?c.lineTo(px(p.x),pz(p.z)):c.moveTo(px(p.x),pz(p.z));
  }
  c.closePath();
  c.strokeStyle="rgba(150,162,172,.30)"; c.lineWidth=11; c.lineJoin="round"; c.stroke();
  c.strokeStyle="rgba(190,202,212,.55)"; c.lineWidth=2.5; c.stroke();
  // linha de chegada
  const p0=pista.pontos[0];
  c.fillStyle="#E9E4DA";
  c.fillRect(px(p0.x)-4,pz(p0.z)-4,8,8);
  // carros
  const ordem=[...corrida.pilotos].sort((a,b)=>b.prog-a.prog);
  for(let i=corrida.pilotos.length-1;i>=0;i--){
    const p=corrida.pilotos[i], eu=(i===0);
    const x=px(p.x), y=pz(p.z);
    if(eu){
      c.beginPath(); c.arc(x,y,9,0,6.2832);
      c.strokeStyle="#E9992B"; c.lineWidth=2.5; c.stroke();
    }
    c.beginPath(); c.arc(x,y,eu?5.5:4.2,0,6.2832);
    c.fillStyle = eu ? "#E8321C" : (corrida.misseis.some(m=>m.alvo===p) ? "#FF4A2E" : "#7C8A94");
    c.fill();
  }
  // míssil no mapa
  for(const m of corrida.misseis){
    c.beginPath(); c.arc(px(m.x),pz(m.z),3.4,0,6.2832);
    c.fillStyle="#FFD36B"; c.fill();
  }
  const meuLugar=ordem.indexOf(corrida.pilotos[0]);
  $("posN").textContent = meuLugar+1;
  $("posT").textContent = corrida.pilotos.length;
  /* Quem está logo à frente e logo atrás. É a informação que muda o que você
     faz agora — e é o que transforma "o carro azul" em "a Márcia". Oito nomes
     de uma vez seriam poluição; dois são a briga que está acontecendo. */
  const viz=$("vizinhos");
  if(viz){
    const frente=ordem[meuLugar-1], tras=ordem[meuLugar+1];
    const linha=(p,seta)=> p ? `<span class="v"><i>${seta}</i>${nomeCurto(p)}</span>` : "";
    const html=linha(frente,"▲")+linha(tras,"▼");
    if(viz.dataset.q!==html){ viz.dataset.q=html; viz.innerHTML=html; }
  }
}

/* "2h14" lê melhor que "8040 s", e "3 min" melhor que "0,05 h". */
function emQuanto(seg){
  if(seg<90) return Math.max(1,Math.round(seg))+" s";
  const m=Math.round(seg/60);
  if(m<90) return m+" min";
  const h=Math.floor(m/60), r=m%60;
  return h+"h"+String(r).padStart(2,"0");
}

function atualizarHUD(){
  if(tela==="mapa"&&mapa&&mapa.total>0&&(mapa.t|0)!==ultimoTick){
    ultimoTick=mapa.t|0;
    $("dica").textContent="VOCÊ PEGOU "+mapa.minhas+" DE "+mapa.total+" CARGAS ("
      +Math.round(mapa.minhas/mapa.total*100)+"% DA ZONA) · "+(mapa.carros.length-1)
      +" CARROS DISPUTANDO COM VOCÊ · RODA DO MOUSE DÁ ZOOM";
  }
  $("barraE").firstElementChild.style.width=(estado.energia/BATERIA*100)+"%";
  $("eTxt").textContent=Math.round(estado.energia);
  /* A coleta rende ~1 de energia por MINUTO, então o número arredondado fica
     parado e o jogador jura que está quebrado — o dono relatou exatamente
     isso. O mostrador passa a dizer a taxa e quanto falta, que é a informação
     que ele estava procurando e não existia em lugar nenhum. */
  const et=$("eTaxa");
  if(tela==="mapa"){
    et.textContent="coletando";
  } else if(estado.energia>=BATERIA){
    et.textContent="cheia";
  } else {
    const porH=Math.round(rendaPorSegundo()*3600);
    const falta=CUSTO_CORRIDA-estado.energia;
    et.textContent = falta<=0
      ? "+"+porH+"/h · "+Math.floor(estado.energia/CUSTO_CORRIDA)+" corridas"
      : "+"+porH+"/h · corrida em "+emQuanto(falta/rendaPorSegundo());
  }
  $("pTxt").textContent=Math.round(estado.pericia);
  $("sTxt").textContent=Math.round(estado.sucata);
  if(tela==="corrida"&&corrida){
    const p=corrida.pilotos[0];
    $("velN").textContent=Math.round(Math.hypot(p.vx,p.vz)*3.6);
    $("vAtual").textContent=Math.min(VOLTAS,p.volta+1);
    $("pisoHud").textContent=PISOS[estado.piso].nome;
    /* Sem isto o carro muda de comportamento no meio da prova e o jogador não
       sabe por quê — o que lê como bug, não como mecânica. */
    /* Durante a corrida isto era um bloco com nome e descrição — o dono achou
       poluído, e ele tem razão: no meio de uma volta o jogador não lê, ele
       reage. Fica só uma marca da cor da peça. O nome aparece por dois
       segundos na TROCA, que é o instante em que a informação importa, e a
       conta completa vai para o cartão do fim. */
    const ph=$("pecaHud"), pc=p.peca?PECAS_CORRIDA[p.peca]:null;
    ph.hidden=!pc;
    if(pc && ph.dataset.qual!==p.peca){
      ph.dataset.qual=p.peca;
      ph.style.setProperty("--cor", pc.cor);
      ph.textContent=pc.nome;
      ph.classList.remove("novo"); void ph.offsetWidth; ph.classList.add("novo");
    }
    if(!pc) ph.dataset.qual="";
    desenharMini();
    const naMira = corrida.misseis.some(m=>m.alvo===p);
    abaixarMusica(naMira ? 0.28 : 1);
    $("perigo").classList.toggle("on",naMira);
    if(!naMira) $("perigo").style.opacity=0; else $("perigo").style.opacity="";
    $("tAtual").textContent=tempo(Math.max(0,corrida.tVolta));
    $("tMelhor").textContent=tempo(corrida.melhor);
    const pe0=$("pericia");
    if(corrida.avisoAte>corrida.t){ pe0.textContent=corrida.aviso; pe0.style.opacity=1; }
    const av=$("aviso");
    /* A contagem soa uma vez por número, e o "VAI" uma vez só: sem guardar o
       último tocado, o laço de quadro dispararia o bipe 60 vezes por segundo. */
    if(corrida.t<0){const n=Math.ceil(-corrida.t);
      if(corrida.ultConta!==n){ corrida.ultConta=n; sfx("conta"); }
      av.innerHTML=(n>3?"":n)+(n<=0?"<small>VAI</small>":"");
      av.textContent=n>0?String(Math.min(3,n)):"VAI";}
    else if(corrida.t<0.9){ av.textContent="VAI";
      if(!corrida.tocouVai){ corrida.tocouVai=true; sfx("vai"); } }
    else av.textContent="";
    $("bNitro").style.width=(p.nitro||0)+"%";
    for(let i=0;i<2;i++){
      const el=$("slot"+i), it=p.itens[i], ico=el.querySelector(".ico"), nm=el.querySelector(".nm");
      if(it!==ultimoItem[i]){
        ultimoItem[i]=it;
        el.classList.remove("novo"); void el.offsetWidth;
        if(it) el.classList.add("novo");
        ico.innerHTML = it ? icone(ITENS[it].ic,40) : "";
        nm.textContent = it ? ITENS[it].nome : "—";
        nm.style.color = it ? ITENS[it].cor : "var(--tx3)";
      }
      el.classList.toggle("tem", !!it);
      el.classList.toggle("sel", p.sel===i && !!it);
    }
    const atual=p.itens[p.sel];
    $("oqItem").textContent = atual ? DESCRICAO[atual]
      : (p.itens.some(Boolean) ? "TAB troca de item" : "pegue as caixas na pista");

    const pe=$("pericia");
    if(corrida.avisoAte<=corrida.t){
      if(p.derrapa>ORCAMENTO_DESLIZE){ pe.textContent="+ PERÍCIA · NITRO";
        pe.style.opacity=Math.min(1,(p.derrapa-ORCAMENTO_DESLIZE)*0.25); }
      else pe.style.opacity=Math.max(0,parseFloat(pe.style.opacity||0)-0.06);
    }
  }
}
function abrirModal(html){ const m=$("modal"); m.innerHTML='<div class="cartao">'+html+'</div>'; m.classList.add("on"); }
/* Existia só o `classList.remove("on")` espalhado em quatro lugares. Ganha nome
   porque agora há um modal que se FECHA para voltar ao jogo, e não só para
   trocar de tela. */
function fecharModal(){ $("modal").classList.remove("on"); }
let dicaT=null, ultimoTick=-1, ultimoItem=["__","__"];
const DESCRICAO={
  turbo:  "enche o nitro na hora",
  oleo:   "solta poça atrás de você",
  tranco: "trava quem está na sua frente",
  reparo: "recarrega meio nitro",
  estouro:"acerta o líder onde ele estiver",
  escudo: "segura o próximo golpe que vier",
};
/* A banca de teste e o salvamento periódico moravam DENTRO deste setTimeout —
   acidente de edição: cada dica que expirava registrava um setInterval novo e
   a banca só aparecia depois da primeira dica sumir. Hoje vivem na partida
   (principal.js), que é o lugar deles. */
function mostrarDica(txt,ms=5200){ $("dica").textContent=txt; clearTimeout(dicaT);
  dicaT=setTimeout(()=>{ $("dica").textContent=dicaPadrao(); },ms); }
function dicaPadrao(){
  return tela==="corrida" ? "SETAS OU WASD  ·  ESPAÇO FREIA  ·  R REINICIA  ·  ESC SAI"
    : tela==="mapa" ? (mapa&&mapa.total>0
        ? "VOCÊ PEGOU "+mapa.minhas+" DE "+mapa.total+" CARGAS · TEMPO "+ZONA.aceleracao+"x"
        : "A ZONA FAZ SURGIR CARGA A TAXA FIXA E QUEM CHEGA PRIMEIRO LEVA · TEMPO ACELERADO · RODA DO MOUSE DÁ ZOOM")
    : "TROQUE AS PEÇAS E VEJA O CARRO E OS ATRIBUTOS MUDAREM";
}
function gastarEnergia(){
  if(estado.energia<CUSTO_CORRIDA){
    abrirModal(`<h2>Sem energia</h2><div class="sub">Corrida custa ${CUSTO_CORRIDA} de energia</div>
      <div class="linha"><span>Você tem</span><b>${Math.round(estado.energia)}</b></div>
      <p style="color:var(--tx2);font-size:14px;margin:16px 0 0;max-width:44ch">
      Energia vem do mapa idle, e o carro coleta sozinho mesmo com a aba fechada.
      Vá ao mapa e espere — ou volte mais tarde.</p>
      <div class="acoes"><button class="btn p" id="mMapa">Ir para o mapa</button>
      <button class="btn" id="mFechar">Fechar</button></div>`);
    $("mMapa").onclick=()=>irPara("mapa"); $("mFechar").onclick=()=>$("modal").classList.remove("on");
    return false;
  }
  estado.energia-=CUSTO_CORRIDA; salvar(); return true;
}
function sortearProxima(){
  estado.piso = ORDEM_PISO[Math.floor(Math.random()*ORDEM_PISO.length)];
  estado.sementePista = Math.floor(Math.random()*9999);
  salvar();
}
function irPara(t){
  tela=t;
  setTimeout(atualizarToque,0);
  $("modal").classList.remove("on"); $("hud").classList.remove("on");
  $("garagem").style.display = t==="garagem"?"block":"none";
  document.body.classList.toggle("correndo", t==="corrida");
  if(t==="corrida")      tocarMusica("corrida", estado.piso);
  else if(t==="mapa")    tocarMusica("mapa");
  else                   tocarMusica("garagem");
  // sair da corrida com o pneu ainda cantando é o tipo de coisa que só se
  // percebe depois de publicado
  if(t!=="corrida") ambienteSom(0,0,false,estado.piso);
  for(const[id,alvo] of [["nGar","garagem"],["nMapa","mapa"],["nCor","corrida"]])
    $(id).setAttribute("aria-pressed", String(t===alvo));
  if(t==="mapa" && !mapa) iniciarMapa();   // já está rodando; a tela só aponta a câmera
  if(t==="corrida"){ if(!gastarEnergia()){ tela="garagem"; $("garagem").style.display="block";
      $("nGar").setAttribute("aria-pressed","true"); $("nCor").setAttribute("aria-pressed","false"); return; }
    pista=gerarPista(estado.sementePista, estado.piso); reconstruirPista();
    iniciarCorrida(); prepararMini(); }
  $("dica").textContent=dicaPadrao();
}
$("nGar").onclick=()=>irPara("garagem");
$("nMapa").onclick=()=>irPara("mapa");
$("nCor").onclick=()=>irPara("corrida");
$("nSom").onclick=e=>{ ligarSom(); som.on=!som.on; if(som.ctx&&som.ctx.state==="suspended")som.ctx.resume();
  if(!som.on&&som.ganho) som.ganho.gain.setTargetAtTime(0,som.ctx.currentTime,.05);
  /* Um botão só. Quem desliga o som quer silêncio, não quer descobrir que há
     um segundo interruptor escondido para a música. */
  mus.ligada=som.on;
  if(som.on){ mus.atual=""; tocarMusica(tela==="corrida"?"corrida":tela==="mapa"?"mapa":"garagem", estado.piso); }
  else calarMusica();
  e.currentTarget.setAttribute("aria-pressed",String(som.on)); };

function montarGaragem(){
  const g=$("garagem"); g.innerHTML="";
  const at=atributos(estado.piso);
  const PI=PISOS[estado.piso];

  /* ── quem é você, e em que classe o seu carro corre ──
     A classe fica aqui e não no topo porque ela é do CARRO: muda quando você
     troca peça, e é aqui que se troca peça. */
  /* ── qual carro ──
     Setas, e não uma lista: no celular a lista roubaria a altura que o carro
     precisa para aparecer inteiro. E a garagem é pequena de propósito — duas
     vagas de graça, porque guardar carro não é farmar com ele. */
  if(estado.carros.length>1 || estado.carros.length<VAGAS_GARAGEM){
    const nav=document.createElement("div"); nav.className="grp carros";
    const n=estado.carros.length;
    nav.innerHTML=`
      <button class="seta" id="carAnt" ${estado.ativo<=0?"disabled":""} aria-label="carro anterior">‹</button>
      <div class="meio">
        <div class="cnt">Carro ${estado.ativo+1} de ${n}</div>
        <div class="rot">só este coleta no pátio</div>
      </div>
      <button class="seta" id="carProx" ${estado.ativo>=n-1?"disabled":""} aria-label="próximo carro">›</button>
      ${n<VAGAS_GARAGEM?`<button class="mais" id="carNovo" title="nova lata-velha">+</button>`:""}`;
    g.append(nav);
    $("carAnt").onclick=()=>{ sfx("ui"); trocarCarro(estado.ativo-1); };
    $("carProx").onclick=()=>{ sfx("ui"); trocarCarro(estado.ativo+1); };
    if($("carNovo")) $("carNovo").onclick=()=>{
      estado.carros.push(novoCarro()); sfx("pegou"); trocarCarro(estado.carros.length-1);
    };
  }

  const cl_=classeDe();
  const perfil=document.createElement("div"); perfil.className="grp perfil";
  perfil.innerHTML=`<div class="quem">
      <input id="nomeJog" value="${estado.nome.replace(/"/g,'&quot;')}"
             maxlength="14" spellcheck="false" aria-label="seu nome">
      <div class="rot">seu nome</div>
    </div>
    <div class="classe" title="soma dos níveis das quatro peças">
      <b>${cl_.l}</b><span>${cl_.nome}</span><i>${cl_.soma}/8</i>
    </div>`;
  g.append(perfil);

  /* ── a próxima corrida é anunciada ANTES: é o que transforma a garagem
        em decisão em vez de vitrine ── */
  const prox=document.createElement("div"); prox.className="grp prox";
  const dica={asfalto:"pede pneu liso e carro baixo",
              terra:"pede cravo e altura",
              chuva:"pede aderência, esqueça o slick"}[estado.piso];
  prox.innerHTML=`<h3>Próxima corrida</h3>
    <div class="pisoNome">${PI.nome}</div><div class="pisoDica">${dica}</div>`;
  g.append(prox);

  /* ── pintura ──
     Fica no fim porque é o que se mexe depois de decidir a mecânica, e porque
     é aqui que o jogador passa tempo de propósito. Nada disto toca status. */
  const carro=estado.carros[estado.ativo];
  const pint=document.createElement("div"); pint.className="grp pintura";
  pint.innerHTML=`<h3>${icone("chassi",20)}Pintura</h3>
    <div class="rot">cor do carro</div>
    <div class="cores">`+CORES_CARRO.map(([c,nm])=>
      `<button class="tinta ${estado.cor===c?"on":""}" data-cor="${c}" title="${nm}"
               style="background:${c}"></button>`).join("")+`</div>
    <div class="rot" style="margin-top:11px">cor do detalhe</div>
    <div class="cores">`+CORES_DETALHE.map(([c,nm])=>
      `<button class="tinta ${estado.acc===c?"on":""}" data-acc="${c}" title="${nm}"
               style="background:${c}"></button>`).join("")+`</div>
    <div class="rot" style="margin-top:11px">desenho</div>
    <div class="ops">`+PADROES.map((pd,i)=>
      `<button class="mini ${(carro.padrao|0)===i?"on":""}" data-pad="${i}">${pd.nome}</button>`).join("")+`</div>`;
  g.append(pint);
  pint.querySelectorAll("[data-cor]").forEach(b=>b.onclick=()=>{
    estado.cor=b.dataset.cor; salvar(); sfx("ui"); reconstruirCarro(); montarGaragem(); });
  pint.querySelectorAll("[data-acc]").forEach(b=>b.onclick=()=>{
    estado.acc=b.dataset.acc; salvar(); sfx("ui"); reconstruirCarro(); montarGaragem(); });
  pint.querySelectorAll("[data-pad]").forEach(b=>b.onclick=()=>{
    carro.padrao=+b.dataset.pad; salvar(); sfx("ui"); reconstruirCarro(); montarGaragem(); });

  const cnome=$("nomeJog");
  cnome.addEventListener("input",()=>{
    estado.nome=cnome.value.trim().slice(0,14)||"Piloto"; salvar();
  });
  cnome.addEventListener("blur",()=>{ cnome.value=estado.nome; });

  /* ── quem dirige, e com que plano ──
     O bloco muda de tamanho conforme a escolha: pilotando, é uma linha; no
     automático, abrem-se as três decisões. Mostrar a planilha para quem vai
     pilotar seria pedir atenção por nada. */
  const modo=document.createElement("div"); modo.className="grp modo";
  const PL=[
    ["agressao","Na curva",   ["Seguro","Meio","Arriscado"]],
    ["nitro",   "O nitro",    ["Guardar","Quando der","Na largada"]],
    ["item",    "Os itens",   ["Só no fim","Quando der","Assim que pegar"]],
  ];
  modo.innerHTML=`<h3>${icone("mCorrer",20)}Quem dirige</h3>
    <div class="quem2">
      <button class="op ${estado.auto?"":"on"}" data-auto="0">Você pilota</button>
      <button class="op ${estado.auto?"on":""}" data-auto="1">Sua IA pilota</button>
    </div>
    <div class="oq2">${estado.auto
      ? "Você prepara e assiste de cima. Rende sucata, mas <b>nenhuma perícia</b> — o topo exige mão humana."
      : "Você no volante. Rende mais, e é o único jeito de ganhar perícia."}</div>
    ${estado.auto ? `<div class="plano">`+PL.map(([k,rot,ops])=>
      `<div class="pl"><div class="rot">${rot}</div><div class="ops">`+
      ops.map((o,i)=>`<button class="mini ${estado.plano[k]===i?"on":""}" data-pl="${k}" data-v="${i}">${o}</button>`).join("")+
      `</div></div>`).join("")+`</div>` : ""}`;
  g.append(modo);
  modo.querySelectorAll("[data-auto]").forEach(b=>b.onclick=()=>{
    estado.auto=b.dataset.auto==="1"; salvar(); sfx("ui"); montarGaragem();
  });
  modo.querySelectorAll("[data-pl]").forEach(b=>b.onclick=()=>{
    estado.plano[b.dataset.pl]=+b.dataset.v; salvar(); sfx("ui"); montarGaragem();
  });

  const rotulos={chassi:"Chassi",motor:"Motor",rodas:"Rodas e pneus",aero:"Aerodinâmica"};
  const icoSlot={chassi:"chassi",motor:"motor",rodas:"roda",aero:"aerofolio"};
  for(const k of ["chassi","motor","rodas","aero"]){
    const d=document.createElement("div"); d.className="grp";
    const dur=Math.round(estado.dur[k]||0);
    const corDur = dur<30?"var(--oxide)":dur<65?"var(--amber)":"var(--patina)";
    d.innerHTML=`<h3>${icone(icoSlot[k],20)}${rotulos[k]}<span class="dur" style="color:${corDur}">${dur}%</span></h3>`;
    const box=document.createElement("div"); box.className="opc";
    PECAS[k].forEach((pc,i)=>{
      const temEle=estado.destravado[k].includes(i);
      const afin=(pc.piso&&pc.piso[estado.piso])||1;
      const marca = afin>=1.15?"<em class='bom'>ótimo aqui</em>"
                  : afin<=0.85?"<em class='ruim'>ruim aqui</em>":"";
      const b=document.createElement("button");
      if(temEle){
        b.innerHTML=`<span>${pc.nome}<br><small>${pc.desc} ${marca}</small></span>`;
        b.setAttribute("aria-pressed",String(estado.build[k]===i));
        b.onclick=()=>{ estado.build[k]=i; salvar(); reconstruirCarro(); montarGaragem(); };
      } else {
        const podeS=estado.sucata>=pc.custo, podeP=estado.pericia>=(pc.pericia||0);
        b.className="trava"+((podeS&&podeP)?" pode":"");
        // a afinidade com o piso importa MAIS na hora de comprar do que
        // depois de comprada — é aqui que a decisão acontece
        b.innerHTML=`<span>${pc.nome}<br><small>${pc.desc} ${marca}</small></span>`
          +`<b class="preco">${pc.custo} S${pc.pericia?" · "+pc.pericia+" P":""}</b>`;
        b.onclick=()=>{
          if(estado.sucata<pc.custo||estado.pericia<(pc.pericia||0)){
            mostrarDica("Falta "+(estado.sucata<pc.custo?"sucata":"perícia")+" para destravar "+pc.nome,3200);
            return;
          }
          estado.sucata-=pc.custo; estado.pericia-=(pc.pericia||0);
          estado.destravado[k].push(i); estado.build[k]=i;
          salvar(); reconstruirCarro(); montarGaragem();
          mostrarDica(pc.nome.toUpperCase()+" DESTRAVADO E EQUIPADO",3200);
        };
      }
      box.append(b);
    });
    d.append(box); g.append(d);
  }

  /* ── oficina ── */
  const rep=custoReparo();
  const of=document.createElement("div"); of.className="grp";
  of.innerHTML=`<h3>${icone("chave",20)}Oficina</h3>`;
  const br=document.createElement("button");
  br.className="btn"; br.style.width="100%";
  if(rep<=0){ br.textContent="Carro inteiro"; br.disabled=true; }
  else{
    br.textContent="Reparar tudo — "+rep+" de sucata";
    if(estado.sucata<rep) br.classList.add("semGrana");
    br.onclick=()=>{
      if(estado.sucata<rep){ mostrarDica("Sucata insuficiente para o reparo",3000); return; }
      estado.sucata-=rep;
      for(const k of ["chassi","motor","rodas","aero"]) estado.dur[k]=100;
      salvar(); montarGaragem(); mostrarDica("CARRO REPARADO",2600);
    };
  }
  of.append(br); g.append(of);

  /* ── atributos, já calculados PARA O PISO da próxima corrida ── */
  const d=document.createElement("div"); d.className="grp";
  d.innerHTML=`<h3>Atributos <span class="dur">no ${PI.nome.toLowerCase()}</span></h3>`;
  const barras=[
    ["Força",     cl((at.potencia-8)/8,0,1),"a", Math.round(at.potencia*10)],
    ["Aderência", cl((at.aderencia-1.6)/2.6,0,1),"g", at.aderencia.toFixed(1)],
    ["Vel. máx",  cl((at.vmax-32)/28,0,1),"a", Math.round(at.vmax*3.6)],
    ["Fora-pista",cl((at.terra-.6)/.9,0,1),"g", at.terra.toFixed(2)],
    ["Peso",      cl((at.peso-.85)/.35,0,1),"r", at.peso.toFixed(2)],
  ];
  for(const[n,v,kk,q] of barras)
    d.innerHTML+=`<div class="st"><div class="n">${n}</div>
      <div class="b ${kk==="g"?"g":kk==="r"?"r":""}"><i style="width:${v*100}%"></i></div>
      <div class="q">${q}</div></div>`;
  g.append(d);

  const e=document.createElement("div"); e.className="grp";
  e.innerHTML=`<h3>${icone("bandeira",20)}Registro</h3>
    <div class="st"><div class="n">${icone("cronometro",18)} Melhor volta</div><div class="q" style="grid-column:2/4;text-align:left">${tempo(estado.melhorVolta)}</div></div>
    <div class="st"><div class="n">${icone("trofeu",18)} Corridas</div><div class="q" style="grid-column:2/4;text-align:left">${estado.corridas} · ${estado.vitorias||0} vitória${(estado.vitorias||0)===1?"":"s"}</div></div>`;
  const b=document.createElement("button"); b.className="btn p"; b.style.width="100%"; b.style.marginTop="12px";
  b.textContent=`Correr no ${PI.nome.toLowerCase()} — ${CUSTO_CORRIDA} de energia`;
  b.onclick=()=>irPara("corrida");
  e.append(b); g.append(e);
}
