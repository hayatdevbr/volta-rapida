"use strict";
/* ══════════════════════════════════════════════════════════════════════════
   CORRIDA
   ══════════════════════════════════════════════════════════════════════════ */
const VOLTAS=2;
/* O grid é SORTEADO. Antes o carro do jogador largava sempre na primeira
   fila, e como o míssil mira o líder, quem larga na frente vira alvo. Medido
   em 40 corridas no automático: posição média 5,95 num campo de 8, a 5,4
   erros-padrão do 4,50 esperado, e nenhuma vitória. Não era azar.

   Largar no meio também é melhor de jogar: dá alguém para caçar. */
function montarGrid(){
  /* O sorteio é da VAGA no grid, não de quem é quem. Na primeira versão eu
     embaralhava e devolvia `vagas.map(v=>novoPiloto(v))`, o que trocava a
     IDENTIDADE junto: `pilotos[0]` passava a ser um rival qualquer, e o jogador
     virava outro carro do array. Passou despercebido porque a corrida ainda
     funcionava — e porque medir "a posição média de pilotos[0]" dava 4,5 por
     construção, já que pilotos[0] era um carro sorteado. */
  const vagas=Array.from({length:GRID},(_,i)=>i);
  for(let i=vagas.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [vagas[i],vagas[j]]=[vagas[j],vagas[i]];
  }
  // índice = quem é (0 é sempre o jogador); vaga = onde larga
  return vagas.map((vaga,idx)=>novoPiloto(idx, vaga));
}

function novoPiloto(i, vaga){
  // largada em duas colunas, como grid de verdade
  // largada SEMPRE à frente da linha. Atrás dela, o carro cruzava o índice 0
  // no primeiro segundo e ganhava uma volta de graça.
  if(vaga===undefined) vaga=i;
  const fila=Math.floor(vaga/2), col=(vaga%2)?1:-1;
  const p=pista.pontos[(3 + fila*3) % pista.n];
  const off=col*3.6;
  const r=semente(1000+i*37+Math.floor(Math.random()*9999));
  /* O rival não é mais "o carro do jogador de outra cor": é uma pessoa, com a
     build dela. O jogador (i===0) segue sendo o jogador. */
  const quem = i>0 ? (corrida&&corrida.povo ? corrida.povo[i-1] : null) : null;
  return {quem, nome: quem?quem.nome:estado.nome,
          x:p.x+p.nx*off, z:p.z+p.nz*off, h:Math.atan2(p.tz,p.tx),
          vx:0,vz:0,vl:0,dir:0,derrapa:0,
          nitro:0, itens:[null,null], desde:[0,0], sel:0, escudo:0, peca:null, pecaDesde:-99,
          oleado:0, travado:0, turbando:0,
          seg:(3+fila*3)%pista.n, meio:false,
          volta:0, prog:0, terminou:-1, ia:i>0,
          // PERSONALIDADE: sem isto os rivais andam em fila indiana feito trenzinho
          perfil: quem ? quem.perfil : {
            linha:   (r()*2-1)*0.62,      // quanto puxa pra dentro ou pra fora
            coragem: 0.92+r()*0.12,       // leque estreito: diferença grande de ritmo mata a disputa
            forca:   0.93+r()*0.11,       // potência relativa
            erro:    0.04+r()*0.14,       // amplitude do erro de volante
            ritmo:   0.5+r()*1.4,         // frequência do erro
            fase:    r()*6.28,
          }};
}
function montarCaixas(){
  const cx=[];
  // Caixa rara e fora da linha de corrida quase nunca é pega: 27 caixas
  // renderam 6 itens numa prova inteira. Mais fileiras, mais larguras.
  /* QUATRO cristais por fileira, bem separados. Com cinco a 3,8 m um do
     outro e um raio de coleta de 5,4 m, um carro passava no meio e levava
     dois de uma vez — o dono viu acontecer. Quatro abrem 5,5 m de vão, e o
     raio de coleta caiu para 3,2 m (mais a carência de 1 s lá embaixo). */
  for(let i=8;i<pista.n;i+=13){
    const p=pista.pontos[i];
    for(const lado of [-0.42,-0.14,0.14,0.42])
      // a caixa nasce com a altura do ponto: em altura fixa ela flutuaria nos
      // vales e ficaria enterrada nos morros
      cx.push({x:p.x+p.nx*p.larg*lado*0.94, y:p.y||0, seg:i, rumo:Math.atan2(p.tz,p.tx),
               z:p.z+p.nz*p.larg*lado*0.80, volta:0});
  }
  return cx;
}
function iniciarCorrida(){
  const at=atributos();
  /* O povo vem PRIMEIRO: `novoPiloto` lê `corrida.povo` para saber quem é cada
     rival, e a malha de cada carro é construída a partir dele. Montar o objeto
     `corrida` de uma vez só, com `pilotos` dentro, apagaria o povo no caminho —
     a atribuição de fora sobrescreve a de dentro.

     A semente junta o traçado com a HORA: o pátio muda de gente ao longo do
     dia, mas não a cada corrida. Trocar de adversário a cada prova impede
     qualquer rivalidade de nascer. */
  corrida={ povo: escalar(GRID-1,
    (estado.sementePista|0)*97 + Math.floor(Date.now()/3.6e6)) };
  corrida.pilotos=montarGrid();
  reconstruirRivais();          // cada um com o carro que montou
  Object.assign(corrida,{
    at, t:-3.2, tVolta:0, melhor:-1, acabou:false, perLog:[], marcas:[],
    periciaGanha:0, pico:0, caixas:montarCaixas(), perigos:[], efeitos:[], brasas:[], misseis:[], sons:[], pegou:{}, aviso:"", avisoAte:0,
  });
  /* No Automático a sua IA assume o volante. É a MESMA `iaEntrada` dos
     rivais, temperada pelo seu plano — não uma segunda inteligência. */
  corrida.pilotos[0].ia=estado.auto;
  corrida.auto=estado.auto;
  document.getElementById("hud").classList.add("on");
  document.getElementById("modal").classList.remove("on");
}
function iaEntrada(p, at, t, rivais){
  /* No ar não há decisão: freio no ar não freia (o CADERNO avisou — "a IA
     precisa saber que a rampa existe, senão freia no ar") e volante no ar só
     torce o pouso. Reto, acelerando, esperando o chão. */
  if(p.voando) return {dir:0, acel:1, freio:false, mao:false, turbo:false};
  const n=pista.n, spd=Math.hypot(p.vx,p.vz), P=p.perfil;
  const look=Math.round(4+spd*0.20);
  const norm=a=>{while(a>Math.PI)a-=6.2832; while(a<-Math.PI)a+=6.2832; return a;};
  const aqui=pista.pontos[p.seg];

  // linha preferida: cada um corre num traçado diferente, não em fila
  const alvoIdx=(p.seg+look)%n, ap=pista.pontos[alvoIdx];
  let desvio=P.linha*ap.larg*0.34;

  // desviar de quem está na frente — é isto que gera ultrapassagem
  for(const o of rivais){
    if(o===p||o.terminou>=0) continue;
    const dx=o.x-p.x, dz=o.z-p.z, d=Math.hypot(dx,dz);
    if(d>16||d<0.1) continue;
    const aFrente=(dx*Math.cos(p.h)+dz*Math.sin(p.h))/d;
    if(aFrente<0.55) continue;                       // só quem está mesmo à frente
    const ladoDele=(o.x-aqui.x)*aqui.nx+(o.z-aqui.z)*aqui.nz;
    desvio += (ladoDele>0?-1:1)*(16-d)*0.42*P.coragem;
  }
  desvio=cl(desvio,-ap.larg*0.44,ap.larg*0.44);

  const ax=ap.x+ap.nx*desvio, az=ap.z+ap.nz*desvio;
  const ang=norm(Math.atan2(az-p.z,ax-p.x)-p.h);

  /* CORREÇÃO LATERAL COM AMORTECIMENTO (PD).
     Só com o termo de posição a IA oscilava de um lado ao outro da pista até
     ser cuspida pra fora — instabilidade clássica de malha de controle: ganho
     alto, resposta atrasada, nenhum amortecimento. O termo derivativo é a
     velocidade lateral em relação à pista, que dá pra ler direto do vetor
     velocidade sem guardar histórico. */
  const lat=(p.x-aqui.x)*aqui.nx+(p.z-aqui.z)*aqui.nz;
  const vLatPista=p.vx*aqui.nx+p.vz*aqui.nz;
  const correcao=-cl((lat-desvio)*0.055 + vLatPista*0.17, -0.75, 0.75);

  /* VELOCIDADE-ALVO PELA CURVATURA REAL DA PISTA.
     Antes ela media o ângulo até um ponto a `look*2` de distância — a 40 m/s
     isso dava 255 m à frente, numa pista que tem curva a cada 111 m. Sempre
     havia curva no horizonte dela, então a velocidade-alvo nunca subia e ela
     nunca acelerava de verdade. Era isso que fazia os rivais parecerem
     passageiros em vez de adversários.

     Agora mede a curvatura entre as TANGENTES da própria pista, numa janela
     do tamanho da distância de frenagem, e resolve v = raiz(aderência/κ) —
     que é a velocidade que a curva de fato aguenta. */
  const esp=pista.comprimento/n, FREIO=24;
  // Varre TODOS os pontos dentro da distância de frenagem: para cada um,
  // calcula a velocidade que aquela curva aguenta e, de trás pra frente,
  // qual velocidade eu posso ter AGORA e ainda chegar lá freando a tempo.
  // É por isso que ela passa a acelerar na reta e frear cedo pra curva.
  let vCurva=at.vmax;
  const alcance=Math.max(6, Math.round((spd*spd/(2*FREIO)+22)/esp));
  for(let d=2; d<=alcance; d+=2){
    const a=pista.pontos[(p.seg+d)%n], b=pista.pontos[(p.seg+d+3)%n];
    const kap=Math.abs(norm(Math.atan2(b.tz,b.tx)-Math.atan2(a.tz,a.tx)))/(3*esp);
    const vLa=Math.sqrt((at.aderencia*1.70)/Math.max(1e-5,kap));
    vCurva=Math.min(vCurva, Math.sqrt(vLa*vLa + 2*FREIO*d*esp));
  }

  // VONTADE DE GANHAR: quem está atrás do líder anda um pouco mais no limite.
  // Sem isto o pelotão se esparrama e ninguém volta pra briga.
  const lider=Math.max(...rivais.map(o=>o.prog||0));
  const atraso=cl(((lider-(p.prog||0))/n)*1.5,0,0.11);

  const vAlvo=Math.min(at.vmax, vCurva)*P.coragem*(1+atraso);

  // erro humano: mão que treme e às vezes entra torto
  const tremor=Math.sin(t*P.ritmo+P.fase)*P.erro;
  const curvaAgora=Math.abs(norm(Math.atan2(
    pista.pontos[(p.seg+5)%n].z-p.z, pista.pontos[(p.seg+5)%n].x-p.x)-p.h));

  return {dir:cl(ang*1.45+correcao+tremor,-1,1),
          acel: spd<vAlvo ? 1 : 0.08,
          freio: spd>vAlvo*1.10,
          mao: curvaAgora>0.85&&spd>vAlvo*1.3,
          turbo: (p.nitro||0)>28 && spd>vAlvo*0.80 && curvaAgora<0.45};
}
/* Uma corrida presa é um servidor preso. Se o carro do jogador rodar e ficar
   de frente para o muro, ele nunca cruza a linha e o laço nunca sai. O teto é
   generoso — quatro minutos é o dobro de uma corrida ruim — e existe para o
   caso patológico, não para apertar ninguém. */
const TETO_CORRIDA=240;

function passoCorrida(){
  const c=corrida; if(!c)return;
  if(!c.acabou && c.t>TETO_CORRIDA){
    for(const p of c.pilotos) if(p.terminou<0) p.terminou=c.t;
    terminarCorrida(); return;
  }
  c.t+=DT;
  for(let i=0;i<c.pilotos.length;i++){
    const p=c.pilotos[i];
    if(p.terminou>=0){ p.vx*=.98; p.vz*=.98; p.x+=p.vx*DT; p.z+=p.vz*DT; continue; }
    const np=maisProximo(pista,p.x,p.z,p.seg);
    /* A volta só conta se o carro passou pelo MEIO da pista antes de cruzar a
       linha. Sem esse pedágio, qualquer vaivém perto do índice 0 — largada,
       batida, ré — contava volta. */
    const meioPista = np.i > pista.n*0.42 && np.i < pista.n*0.62;
    if(meioPista) p.meio=true;
    if(p.meio && p.seg>pista.n-12 && np.i<12){ p.volta++; p.meio=false;
      /* O que decide é ser o SEU carro, não quem está no volante. Antes isto
         dependia de `!p.ia`, e no Automático o seu carro é IA — a corrida
         nunca terminava e você assistiria para sempre. */
      if(p===c.pilotos[0]){
        const v=c.tVolta; c.tVolta=0;
        // volta feita pela sua IA não entra no recorde pessoal: Lei 4 em miniatura
        if(!c.auto && v>1 && (c.melhor<0||v<c.melhor)){
          c.melhor=v;
          if(estado.melhorVolta<0||v<estado.melhorVolta) estado.melhorVolta=v;
        }
      }
      if(p.volta>=VOLTAS && p.terminou<0){
        p.terminou=c.t;
        if(p===c.pilotos[0]) terminarCorrida();
      }
    }
    p.seg=np.i;
    const naPista=np.dist < pista.pontos[np.i].larg/2 + 0.6;
    p.naPista=naPista;          // o som do pneu lê isto; antes eu inventei um campo

    /* ── chão e AR ─────────────────────────────────────────────────────
       No chão, a altura persegue o ponto de pista mais próximo com um pouco
       de atraso: o carro tem suspensão, não é adesivo colado no terreno.

       Mas quando o chão SOME de baixo do carro — a borda da rampa, ou uma
       crista tomada rápido demais — a suspensão não alcança e o carro passa a
       ser um projétil: sobe com a velocidade que a rampa deu, desce com a
       gravidade de verdade, e só volta a obedecer o volante quando pousa.
       Sem isto a rampa seria um tobogã; com isto ela é a coisa mais
       partilhável do jogo. */
    /* O chão sob o carro, pela MESMA conta que desenha o mundo:
       — na pista, a superfície interpolada do segmento (com rampa);
       — fora dela, o terreno, que desce pelo avental conforme se afasta.
       Antes eram três contas diferentes para a mesma superfície, e o carro
       afundava no barranco até sumir. */
    const forasPista=Math.max(0, np.dist - pista.pontos[np.i].larg/2);
    const chao = forasPista<=0
      ? alturaChao(pista, np.i, p.x, p.z, true)
      : alturaChao(pista, np.i, p.x, p.z, false)
        * quedaDoAvental(np.dist, pista.pontos[np.i].larg);
    const spdAr=Math.hypot(p.vx,p.vz);
    if(p.y===undefined){ p.y=chao; p.vy=0; p.chaoAnt=chao; }

    /* ── CHÃO E AR, por projétil contra terreno ──────────────────────────
       A regra é uma só, e vale para rampa, crista, buraco e piso plano:
       tenta-se o VOO LIVRE; se ele terminaria acima do chão, o carro está no
       ar; senão, ele está no chão, e ponto.

       Antes havia dois casos especiais empilhados — "a beira da rampa é um
       degrau" e "no ar se subiu 0,9 m acima do chão" — e eles brigavam com a
       malha desenhada bem onde o carro pousa: 3,2 m de desacordo, medidos. O
       carro decola porque o chão foge mais depressa do que a gravidade o
       puxa, que é o que acontece de verdade numa rampa. */
    const vyLivre=(p.vy||0) - 9.8*DT;
    const yLivre =p.y + vyLivre*DT;
    if(yLivre > chao + 0.06){
      if(!p.noAr && p===c.pilotos[0] && spdAr>16 && (p.vy||0)>2.2){
        c.sons.push("salto");
        c.aviso="SALTO!"; c.avisoAte=c.t+1.1;
      }
      p.noAr=true; p.inc=0;
      p.vy=cl(vyLivre,-40,20);
      // e uma rede por cima: nada neste jogo sobe 25 m acima do chão
      p.y=Math.min(yLivre, chao+25);
      /* VOAR não é PULAR. Numa quebra convexa da pista o carro sai do chão
         por poucos centímetros dezenas de vezes por volta — é o certo para o
         arco, e seria péssimo para o comando: sem tração nem volante nesses
         instantes, o carro pareceria patinar. Só perde o chão de verdade quem
         está bem acima dele. */
      p.voando = (p.y - chao) > 0.22;
    } else {
      if(p.noAr){
        // pouso: quanto mais duro, mais velocidade fica no amortecedor
        const tranco=cl((-(p.vy||0)-4)/10,0,0.16);
        p.vx*=1-tranco; p.vz*=1-tranco;
        if(p===c.pilotos[0] && (p.vy||0)<-4.5) c.sons.push("pouso");
      }
      p.noAr=false; p.voando=false;
      p.y=chao;
      /* No chão a velocidade vertical É a do chão: é ela que vira o arco do
         salto quando o tabuleiro acaba.

         Com TETO, e o teto não é decoração: longe da pista a busca do ponto
         mais próximo pode pular de índice, `chao` salta metros num quadro só
         e a conta cospe centenas de m/s. Um carro subiu 2.430 metros na
         bancada. Nenhuma ladeira deste jogo passa de 30% a 60 m/s, ou seja,
         18 m/s — 20 é folga. */
      p.vy=cl((chao-(p.chaoAnt===undefined?chao:p.chaoAnt))/DT, -20, 20);
      p.inc = pista.pontos[np.i].inc || 0;
    }
    p.chaoAnt=chao;
    // A largada vale pra todo mundo. Antes o gate de contagem regressiva só
    // existia no ramo do jogador e as IAs saíam 3,2 s na frente.
    const ent = c.t<0 ? {dir:0,acel:0,freio:false,mao:false}
      : p.ia ? temperar(iaEntrada(p,c.at,c.t,c.pilotos), p, c)
      : (ehToque
         ? { dir:manche.dir,
             acel:manche.freio?0:1,          // acelerador automático
             freio:manche.freio,
             mao:!!teclas[" "],
             turbo:!!teclas.shift }
         : { dir:(teclas.arrowleft||teclas.a?-1:0)+(teclas.arrowright||teclas.d?1:0),
             acel:(teclas.arrowup||teclas.w)?1:0,
             freio:!!(teclas.arrowdown||teclas.s),
             mao:!!teclas[" "],
             turbo:!!teclas.shift });
    let at = p.ia ? {...c.at, potencia:c.at.potencia*p.perfil.forca,
                     aderencia:c.at.aderencia*(0.94+p.perfil.coragem*0.06)} : c.at;
    if(p.peca) at=aplicarPeca(at, p.peca);
    passo(p, ent, at, naPista, c.at.terra);
    p.prog=p.volta*pista.n+np.i;

    if(!p.ia){
      if(c.t>=0) c.tVolta+=DT;
      c.pico=Math.max(c.pico,Math.hypot(p.vx,p.vz));
      // Perícia: derrapagem controlada dentro da pista. Só mão humana consegue.
      if(p.derrapa>ORCAMENTO_DESLIZE && naPista && Math.hypot(p.vx,p.vz)>14){
        c.periciaGanha+=(p.derrapa-ORCAMENTO_DESLIZE)*DT*1.4;
      }
      // fora do asfalto o carro solta muito mais rastro: é o aviso visual de
      // que o piso mudou, sem precisar ler nada
      const lim = estado.piso==="asfalto" ? ORCAMENTO_DESLIZE*0.7 : ORCAMENTO_DESLIZE*0.32;
      /* Uma marca a cada ~1,2 m andado, nunca por passo: a 120 Hz as marcas
         empilhavam no mesmo ponto e a mistura multiplicativa acumulada virava
         um retângulo PRETO — apareceu na primeira foto em que elas passaram a
         ser desenhadas. */
      const dMarca=(p.x-(p.marcaX||1e9))**2+(p.z-(p.marcaZ||1e9))**2;
      if(p.derrapa>lim && naPista && c.marcas.length<900 && dMarca>1.4){
        // `seg` é ONDE na pista a marca ficou: o desenho precisa disso para
        // deitá-la na inclinação em vez de a deixar chata numa ladeira
        c.marcas.push({x:p.x,y:p.y,z:p.z,h:p.h,seg:p.seg,v:1});
        p.marcaX=p.x; p.marcaZ=p.z;
      }
    }
  }
  /* ── nitro, caixas de item e perigos ── */
  const eu0=c.pilotos[0];
  const ordem=[...c.pilotos].sort((a,b)=>b.prog-a.prog);
  for(const p of c.pilotos){
    if(p.terminou>=0) continue;
    const spd=Math.hypot(p.vx,p.vz);

    // enche nitro derrapando dentro da pista...
    const excesso=Math.max(0,(p.derrapa||0)-ORCAMENTO_DESLIZE);
    let ganho=excesso*NITRO.porDeslize;
    // ...e pegando vácuo de quem está logo à frente
    for(const o of c.pilotos){
      if(o===p||o.terminou>=0) continue;
      const dx=o.x-p.x, dz=o.z-p.z, d=Math.hypot(dx,dz);
      if(d>34||d<2) continue;
      const alinhado=(dx*Math.cos(p.h)+dz*Math.sin(p.h))/d;
      if(alinhado>0.72 && spd>12){ ganho+=NITRO.porVacuo*(1-d/34); break; }
    }
    // quem está atrás ganha nitro só por estar atrás: é o elástico que
    // devolve o perseguidor pra briga quando o vácuo já não alcança
    const lider=Math.max(...c.pilotos.map(o=>o.prog||0));
    ganho += NITRO.porAtraso*cl(((lider-(p.prog||0))/pista.n)*1.7,0,1);
    p.nitro=cl((p.nitro||0)+ganho*DT,0,NITRO.max);

    if(p.travado>0) p.travado-=DT;

    // caixa de item: entra no primeiro encaixe livre dos DOIS
    const livre=p.itens.indexOf(null);
    // carência de 1 s entre coletas: com dois cristais no alcance ao mesmo
    // tempo, o carro levava os dois em quadros seguidos
    if(livre>=0 && c.t-(p.pegouEm||-99) > 1.0){
      for(const cx of c.caixas){
        if(cx.volta>0) continue;
        if(Math.hypot(cx.x-p.x,cx.z-p.z)<3.2){
          p.pegouEm=c.t;
          cx.volta=18;
          /* Peça entra montada na hora, sem passar pelo bolso: ela não é algo
             que se guarda para o momento certo, é o carro mudando. */
          /* Carência depois de montar: por 20 s a caixa só dá item. Sem isto
             o carro trocava de peça 17 vezes numa corrida de duas voltas —
             medido — e o dilema "vale a pena pegar aquela caixa?" virava ruído,
             porque a peça ia embora sozinha em cinco segundos de qualquer jeito. */
          if(Math.random()<CHANCE_PECA && c.t-(p.pecaDesde||-99)>20){
            const nova=CHAVES_PECA[Math.floor(Math.random()*CHAVES_PECA.length)];
            const trocou = p.peca && p.peca!==nova;
            p.peca=nova; p.pecaDesde=c.t;
            // o que passou pelo carro vira a conta do fim
            if(p===c.pilotos[0]) c.pegou[nova]=(c.pegou[nova]||0)+1;
            if(p===c.pilotos[0]){
              c.sons.push("pegou");
              c.aviso=(trocou?"TROCOU PARA ":"")+PECAS_CORRIDA[nova].nome.toUpperCase();
              c.avisoAte=c.t+1.8;
            }
            continue;
          }
          p.itens[livre]=sortearItem(ordem.indexOf(p)+1); p.desde[livre]=c.t;
          if(p===c.pilotos[0]) c.sons.push("pegou");
          if(!p.ia){
            if(p.itens[1-livre]===null) p.sel=livre;
            c.aviso="PEGOU "+ITENS[p.itens[livre]].nome.toUpperCase();
            c.avisoAte=c.t+2.0;
          }
          break;
        }
      }
    }

    // perigo no chão
    for(const g of c.perigos){
      if(g.de===p&&c.t-g.t<1.2) continue;
      if(Math.hypot(g.x-p.x,g.z-p.z)<3.4 && p.oleado<=0){ p.oleado=1.5; }
    }
  }
  for(const cx of c.caixas) if(cx.volta>0) cx.volta-=DT;
  // 9 s e não 14: com 14 as poças de três voltas atrás ainda estavam lá
  c.perigos=c.perigos.filter(g=>c.t-g.t<9);
  c.efeitos=c.efeitos.filter(e=>c.t-e.t<0.75);

  /* ── contato entre carros ──
     Sem isto eles se atravessam e a corrida perde a disputa corpo a corpo,
     que é metade da graça de correr contra alguém. Separação por círculo,
     com troca de quantidade de movimento ao longo da normal do contato. */
  const RAIO=2.95;
  for(let i=0;i<c.pilotos.length;i++) for(let j=i+1;j<c.pilotos.length;j++){
    const a=c.pilotos[i], b=c.pilotos[j];
    const dx=b.x-a.x, dz=b.z-a.z, d=Math.hypot(dx,dz);
    if(d>=RAIO||d<1e-4) continue;
    const nx=dx/d, nz=dz/d, empurra=(RAIO-d)*0.5;
    a.x-=nx*empurra; a.z-=nz*empurra; b.x+=nx*empurra; b.z+=nz*empurra;
    const va=a.vx*nx+a.vz*nz, vb=b.vx*nx+b.vz*nz;
    if(va-vb>0){
      const t=(va-vb)*0.6;
      a.vx-=nx*t; a.vz-=nz*t; b.vx+=nx*t; b.vz+=nz*t;
      if(!a.ia||!b.ia) c.batidas=(c.batidas||0)+1;
    }
  }

  for(const m of c.marcas) m.v-=DT*0.09;

  /* ── os mísseis viajam, e só então acertam ── */
  for(let mi=c.misseis.length-1; mi>=0; mi--){
    const m=c.misseis[mi], a=m.alvo;
    m.t+=DT;
    const dx=a.x-m.x, dz=a.z-m.z, d=Math.hypot(dx,dz);
    // persegue o alvo, acelerando no fim para sempre alcançar
    const vel=26 + 70*(m.t/m.dur);
    if(d>0.01){ m.h=Math.atan2(dz,dx); m.x+=dx/d*vel*DT; m.z+=dz/d*vel*DT; }
    // o míssil voa rente ao alvo, não ao nível do mar: com relevo, altura
    // fixa o enterrava no morro e o fazia flutuar no vale
    m.y=(a.y||0)+1.0+Math.sin(m.t*7)*0.25;
    m.rastro.push({x:m.x,y:m.y,z:m.z,t:0});
    if(m.rastro.length>26) m.rastro.shift();
    for(const g of m.rastro) g.t+=DT;

    /* O escudo NÃO derruba mais o míssil no ar. Antes a IA levantava o escudo
       no mesmo passo em que o míssil nascia, ele morria antes de andar, e quem
       atirou não via nada acontecer. Agora o míssil sempre cumpre o voo e o
       escudo o apara no impacto — que é onde a defesa fica bonita de ver. */
    if(d<3.2 || m.t>m.dur+2){
      if(a.escudo>0){
        a.escudo=0; efeito(c,a,"escudo");
        c.aviso = a.ia ? nomeCurto(a).toUpperCase()+" APAROU COM ESCUDO"
                       : "SEU ESCUDO APAROU O MÍSSIL";
        c.avisoAte=c.t+2.2;
      } else if(a.terminou<0){
        a.travado=1.8; a.vx*=0.38; a.vz*=0.38; a.oleado=1.4; efeito(c,a,"estouro");
        c.aviso = a.ia ? "MÍSSIL ACERTOU "+nomeCurto(a).toUpperCase()
                       : "VOCÊ FOI ATINGIDO";
        c.avisoAte=c.t+2.0;
      }
      c.misseis.splice(mi,1);
    }
  }
  for(const p of c.pilotos) if(p.escudo>0) p.escudo-=DT;

  /* ── uso de item ──────────────────────────────────────────────────────
     São DOIS encaixes agora. No teclado, TAB troca o selecionado e E solta;
     as teclas 1 e 2 soltam direto. No celular há um botão redondo para cada,
     com o ícone do item dentro — um toque, sem modo. */
  for(const p of c.pilotos){
    if(p.terminou>=0) continue;

    for(let i=0;i<2;i++){
      const it=p.itens[i];
      if(!it) continue;
      let usar=false;
      if(p.ia){
        const spd=Math.hypot(p.vx,p.vz);
        if(it==="turbo")  usar = spd>c.at.vmax*0.45 && (p.nitro||0)<40;
        if(it==="oleo")   usar = c.pilotos.some(o=>o!==p&&o.terminou<0&&
                            Math.hypot(o.x-p.x,o.z-p.z)<22&&
                            ((o.x-p.x)*Math.cos(p.h)+(o.z-p.z)*Math.sin(p.h))<0);
        if(it==="tranco") usar = c.pilotos.some(o=>o!==p&&o.terminou<0&&
                            Math.hypot(o.x-p.x,o.z-p.z)<34&&
                            ((o.x-p.x)*Math.cos(p.h)+(o.z-p.z)*Math.sin(p.h))>0);
        if(it==="reparo") usar = (p.nitro||0)<45;
        if(it==="estouro")usar = true;
        /* Plano de item do jogador: 0 guarda para a última volta, 2 usa assim
           que aparece o alvo. O meio é o que a IA já fazia. */
        if(c.auto && p===c.pilotos[0]){
          if(estado.plano.item===0 && p.volta<VOLTAS-1) usar=false;
          if(estado.plano.item===2) usar=true;
        }
        if(it==="escudo") usar = c.misseis.some(m=>m.alvo===p);
        if(!usar && c.t-(p.desde[i]||0) > 18) usar = true;
      } else {
        usar = (!!teclas[String(i+1)]) || ((p.sel===i) && (!!teclas.e||!!teclas.control));
      }
      if(!usar) continue;

      if(it==="estouro"){
        let alvo=null, melhor=-1;
        for(const o of c.pilotos){ if(o===p||o.terminou>=0) continue;
          if(o.prog>melhor){ melhor=o.prog; alvo=o; } }
        /* Antes havia um só míssil no mundo, e o segundo lançamento sumia:
           para a IA o item era engolido, e para o jogador o botão simplesmente
           não fazia nada — nem míssil, nem aviso. Agora cabem três no ar. */
        if(alvo && alvo.prog>p.prog && c.misseis.length<3){
          /* O míssil VOA. Antes era um temporizador invisível e o alvo levava
             um susto do nada; agora ele vê a coisa vindo e tem 5 s para
             resolver — dá para defender, e dá para tentar chegar numa caixa. */
          c.misseis.push({ alvo, de:p, t:0, dur:5.0,
                     x:p.x, y:(p.y||0)+1.0, z:p.z, h:p.h, rastro:[] });
          efeito(c,p,"estouro");   // clarão em quem atirou
          c.sons.push("missil");   // o tiro se ouve venha de quem vier
          c.aviso = alvo.ia ? "MÍSSIL A CAMINHO DE "+nomeCurto(alvo).toUpperCase()
                            : "MÍSSIL VINDO NA SUA DIREÇÃO";
          c.avisoAte=c.t+2.4;
        } else if(!p.ia) continue;
      }
      if(it==="escudo"){ p.escudo=14; efeito(c,p,"escudo");
        if(!p.ia){ c.aviso="ESCUDO LIGADO"; c.avisoAte=c.t+1.8; } }
      if(it==="turbo"){ p.nitro=NITRO.max; efeito(c,p,"turbo"); }
      if(it==="oleo"){  c.perigos.push({x:p.x-Math.cos(p.h)*4,y:p.y||0,z:p.z-Math.sin(p.h)*4,
                                        t:c.t,de:p,seg:p.seg,rumo:p.h});
                        efeito(c,{x:p.x-Math.cos(p.h)*4,z:p.z-Math.sin(p.h)*4},"oleo"); }
      if(it==="reparo"){ p.nitro=cl((p.nitro||0)+55,0,NITRO.max); efeito(c,p,"reparo"); }
      if(it==="tranco"){
        let alvo=null, melhor=1e9;
        for(const o of c.pilotos){
          if(o===p||o.terminou>=0) continue;
          const dx=o.x-p.x, dz=o.z-p.z, d=Math.hypot(dx,dz);
          if(d>40) continue;
          if(((dx*Math.cos(p.h)+dz*Math.sin(p.h))/d)<0.5) continue;
          if(d<melhor){ melhor=d; alvo=o; }
        }
        if(alvo && alvo.escudo>0){ alvo.escudo=0; efeito(c,alvo,"escudo");
        c.aviso = alvo.ia ? "ESCUDO SEGUROU" : "SEU ESCUDO SEGUROU"; c.avisoAte=c.t+1.8; }
      else if(alvo){ alvo.travado=1.1; alvo.vx*=0.55; alvo.vz*=0.55; efeito(c,alvo,"tranco");
          if(!alvo.ia){ c.aviso="VOCÊ LEVOU UM TRANCO"; c.avisoAte=c.t+1.8; }
          else if(!p.ia){ c.aviso="TRANCO ACERTOU"; c.avisoAte=c.t+1.6; } }
        else if(!p.ia) continue;
      }
      p.itens[i]=null;
      if(!p.ia && p.itens[p.sel]===null && p.itens[1-p.sel]) p.sel=1-p.sel;
    }
  }

  // efeito do tranco: freia forte por um instante
  for(const p of c.pilotos) if(p.travado>0){ p.vx*=1-1.4*DT; p.vz*=1-1.4*DT; }
  c.marcas=c.marcas.filter(m=>m.v>0);
}
function terminarCorrida(){
  const c=corrida; if(c.acabou)return; c.acabou=true;
  c.sons.push("chegada");
  const eu=c.pilotos[0];
  const pos=1+c.pilotos.filter(p=>p!==eu && (p.terminou>=0&&p.terminou<eu.terminou)).length;
  /* Só os cinco primeiros levam, e a queda depois do terceiro é dura: é o
     que faz brigar pelo pódio valer mais do que só terminar. */
  const FATOR=[1.00,0.66,0.42,0.18,0.08];
  const premio=FATOR[pos-1]||0;
  /* Lei 4 — perícia SÓ de corrida pilotada. É o mecanismo que trava a fazenda
     de contas e o que impede o Automático de virar caixa eletrônico.

     Lei 6 — automático nunca lucrativo ACIMA DO NÍVEL 1. Eu tinha implementado
     isso como um corte fixo de 58% na sucata, e o dono reclamou com razão: quem
     só quer gerenciar ficava com lucro zero depois do conserto e não avançava
     nunca. Fui conferir e o simulador da Fase 1 — o que passou nos sete portões
     — nunca disse isso. Ele diz `dropS: 9` no automático contra `11` no manual
     (82%) e `desgaste: 1.30` contra `1.00`.

     A diferença de desenho é grande: o corte fixo pune sempre, e o DESGASTE
     pune conforme a peça encarece. No nível 1 o gerente lucra; subindo, a
     manutenção come o ganho sozinha. A lei sai da física da economia em vez de
     um número meu, e foi assim que ela nasceu na Fase 1. */
  const per=c.auto ? 0 : Math.round(c.periciaGanha*(0.45+premio*0.55));
  const base=Math.round(c.periciaGanha*(0.45+premio*0.55));
  const suc=Math.round((90+base*0.9)*premio*(c.auto?AUTO_SUCATA:1));
  estado.pericia+=per; estado.sucata+=suc; estado.corridas++;
  if(pos===1) estado.vitorias=(estado.vitorias||0)+1;
  /* Andar no limite CUSTA. Sem isto "arriscado" domina — 3,9 de posição média
     contra 6,4 do seguro — e um menu em que uma opção é sempre certa não é
     decisão, é enfeite. O preço é desgaste, que é o ralo-mestre da economia:
     você corre mais rápido hoje e troca peça mais cedo. */
  /* Automático desgasta 30% mais, como no simulador: a IA não sente o carro,
     então castiga a peça. É ISTO que faz o modo parar de compensar conforme a
     peça encarece — e é o mesmo mecanismo que quebra a fazenda de contas. */
  const zeloso=(c.auto?AUTO_DESGASTE:1.00)*([0.78,1.00,1.34][c.auto?estado.plano.agressao:1] ?? 1);
  for(const k of ["chassi","motor","rodas","aero"])
    estado.dur[k]=cl((estado.dur[k]||100) - (7+Math.random()*5)*zeloso, 0, 100);
  sortearProxima();
  salvar();
  document.getElementById("hud").classList.remove("on");
  abrirModal(`
    <h2>${pos===1?icone("trofeu",44)+" Vitória":pos+"º lugar"}</h2>
    <div class="sub">${VOLTAS} voltas · ${pos}º de ${GRID}${pos>5?" · fora da pontuação":""}</div>
    ${(()=>{
      /* A chegada com nome e classe. Sem isto o jogador só sabe o número dele,
         e "3º de 8" não conta história nenhuma — quem ele passou, por quem foi
         passado, quem estava logo ali. */
      /* A corrida acaba quando VOCÊ cruza a linha, então quem vinha atrás nunca
         "termina" — e mostrar seis traços num grid de oito parecia defeito. Quem
         não chegou entra na ordem em que estava, que é a informação verdadeira:
         a posição em que a bandeira o pegou. */
      const ord=[...c.pilotos].filter(p=>p.terminou>=0).sort((a,b)=>a.terminou-b.terminou);
      const resto=c.pilotos.filter(p=>p.terminou<0).sort((a,b)=>b.prog-a.prog);
      const eu=c.pilotos[0];
      const lin=(p,n,naPista)=>{
        const cl=p.quem?classeDe(p.quem.build):classeDe();
        return `<div class="ch${p===eu?" eu":""}">`
          +`<i>${n}</i><span>${p.nome||"—"}</span>`
          +(naPista?`<b class="ainda">na pista</b>`:``)
          +`<em>${cl.l}</em></div>`;
      };
      return `<div class="chegada">`
        + ord.map((p,i)=>lin(p,i+1,false)).join("")
        + resto.map((p,i)=>lin(p,ord.length+i+1,true)).join("")
        + `</div>`;
    })()}
    <div class="linha"><span>Melhor volta</span><b>${tempo(c.melhor)}</b></div>
    <div class="linha"><span>Velocidade de pico</span><b>${Math.round(c.pico*3.6)} km/h</b></div>
    ${(()=>{
      /* O apanhado da corrida, no lugar certo: aqui o jogador tem tempo de
         ler. Na pista ele só reage. */
      const ks=Object.keys(c.pegou||{});
      if(!ks.length) return "";
      return `<div class="apanhado"><div class="rot">Peças montadas na corrida</div>`
        + ks.map(k=>`<span class="pc" style="--cor:${PECAS_CORRIDA[k].cor}">`
            +`${PECAS_CORRIDA[k].nome}${c.pegou[k]>1?" ×"+c.pegou[k]:""}</span>`).join("")
        + `<div class="nota">peça de corrida não vai para a garagem — ela vale a prova, e só</div></div>`;
    })()}
    <div class="linha d"><span>Perícia ganha</span><b>+${per}</b></div>
    <div class="linha d"><span>Sucata</span><b>+${suc}</b></div>
    <div class="acoes">
      <button class="btn p" id="mDeNovo">Correr de novo</button>
      <button class="btn" id="mGaragem">Garagem</button>
    </div>`);
  document.getElementById("mDeNovo").onclick=()=>{ if(gastarEnergia()) iniciarCorrida(); };
  document.getElementById("mGaragem").onclick=()=>irPara("garagem");
}
