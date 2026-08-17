"use strict";
/* ══════════════════════════════════════════════════════════════════════════
   CIRCUITO ABERTO — vertical slice (Fase 2)

   O que este protótipo existe para responder: É DIVERTIDO SEM PRÊMIO NENHUM?
   Não há mercado, não há Ficha, não há dinheiro. Só o laço:
       mapa idle rende Energia → Energia paga corrida → corrida dá Perícia,
       Sucata e desgaste → peça melhor → carro melhor → corrida melhor.

   Arquitetura provada aqui: as MESMAS malhas low-poly servem a câmera
   traseira da corrida e a câmera de cima do mapa idle. Câmera não é decisão
   de asset. Zero textura, zero modelo importado, zero dependência.

   O bloco NÚCLEO abaixo é determinístico e não toca em DOM nem em WebGL —
   é o que vira código de servidor na Fase 3 sem reescrever nada.
   ══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────── util ─────────────────────────── */
const cl=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const suave=t=>{t=cl(t,0,1);return t*t*(3-2*t);};
const gauss=(x,m,s)=>Math.exp(-((x-m)*(x-m))/(2*s*s));
function semente(n){let a=n>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);
  t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const hex=h=>{const n=parseInt(h.slice(1),16),f=v=>Math.pow(v/255,2.2);
  return[f((n>>16)&255),f((n>>8)&255),f(n&255)];};
const esc=(c,k)=>[c[0]*k,c[1]*k,c[2]*k];
const tempo=s=>s<0?"—":(Math.floor(s/60)?Math.floor(s/60)+":":"")+ (s%60).toFixed(2).padStart(Math.floor(s/60)?5:4,"0");

/* ══════════════════════════════════════════════════════════════════════════
   NÚCLEO — determinístico, sem DOM, sem WebGL. Vira servidor sem reescrita.
   ══════════════════════════════════════════════════════════════════════════ */

const CUSTO_CORRIDA = 120;
/* Os dois números do Automático, tirados do simulador da Fase 1 e não de
   chute meu: lá são `dropS` 9 contra 11 e `desgaste` 1,30 contra 1,00. Ficam
   com nome para a bancada poder LER a regra em vez de copiá-la — teste que
   duplica a fórmula mente no dia em que a fórmula muda, e o meu mentiu. */
const AUTO_SUCATA = 0.82;
const AUTO_DESGASTE = 1.30;
const BATERIA = 800;

/* ── PISOS ────────────────────────────────────────────────────────────────
   A Lei L5 (nenhuma peça pode ser boa em tudo) só existe de verdade se as
   corridas rodarem em pisos diferentes. Com um piso só, não há motivo para
   montar mais de um carro — e a garagem inteira perde o sentido.
   O piso da próxima corrida é anunciado ANTES, para a escolha ser sua. */
/* A grama de cada piso é a COR-MÃE do mundo: encosta, terreno e tufos saem
   dela. O dono cobrou "a pista é viva, o chão não" — e a resposta é saturação
   AQUI, não objeto novo: verde de verdade no autódromo, ocre quente no rali,
   verde-frio molhado no urbano. */
const PISOS = {
  asfalto: { nome:"Asfalto", aderencia:1.00, arrasto:1.00,
             pista:[.019,.021,.024], grama:[.024,.062,.027], ceu:1.00 },
  terra:   { nome:"Terra",   aderencia:0.64, arrasto:1.09,
             pista:[.052,.032,.018], grama:[.055,.047,.018], ceu:1.06 },
  chuva:   { nome:"Chuva",   aderencia:0.58, arrasto:0.95,
             pista:[.013,.016,.024], grama:[.016,.038,.028], ceu:0.62 },
};
const ORDEM_PISO = ["asfalto","terra","chuva"];

/* ── peças: cada uma muda a GEOMETRIA e muda a FÍSICA ── */
const PECAS = {
  chassi:[
    {nome:"Ferro-Velho", desc:"aguenta qualquer piso", custo:0, tier:0, g:{length:4.15,width:1.84,ride:.25,hoodH:.82,roofH:1.34,deckH:1.02,noseDrop:.03,tHood:.30,tWs:.44,tRoof:.64,tDeck:.82,noseTaper:.08,tailTaper:.07,tumble:.20,chamfer:.06,flare:.08}, peso:1.00,aderencia:1.00,pot:1.00, piso:{asfalto:1.00,terra:1.00,chuva:1.02}},
    {nome:"Cunha GT",    desc:"voa no asfalto, sofre na terra", custo:900, pericia:20, tier:2, g:{length:4.5,width:2.02,ride:.16,hoodH:.62,roofH:1.12,deckH:.78,noseDrop:.22,tHood:.36,tWs:.51,tRoof:.66,tDeck:.83,noseTaper:.22,tailTaper:.13,tumble:.34,chamfer:.09,flare:.18}, peso:.88,aderencia:1.14,pot:1.00, piso:{asfalto:1.14,terra:0.80,chuva:0.86}},
    {nome:"Buggy",       desc:"dono da terra e da chuva", custo:750, pericia:12, tier:2, g:{length:3.85,width:1.92,ride:.40,hoodH:.84,roofH:1.50,deckH:1.12,noseDrop:.04,tHood:.26,tWs:.40,tRoof:.60,tDeck:.78,noseTaper:.15,tailTaper:.17,tumble:.38,chamfer:.08,flare:.25}, peso:1.06,aderencia:.90,pot:1.00, piso:{asfalto:0.90,terra:1.28,chuva:1.20}},
  ],
  motor:[
    {nome:"1.6 Aspirado", desc:"o que veio de fábrica", custo:0, tier:0, g:{engine:0}, pot:1.00, peso:1.00},
    {nome:"Turbo",        desc:"+24% de força", custo:700, pericia:15, tier:1, g:{engine:2}, pot:1.24, peso:1.05},
    {nome:"Compressor",   desc:"+45%, e pesado", custo:1600, pericia:40, tier:2, g:{engine:3}, pot:1.45, peso:1.12},
  ],
  rodas:[
    {nome:"Pneu de rua", desc:"nunca é o melhor, nunca é o pior", custo:0, tier:0, g:{wheelW:.22,wheelR:.33,spokes:8}, aderencia:1.00, piso:{asfalto:1.00,terra:0.98,chuva:1.12}},
    {nome:"Slick",       desc:"imbatível no seco, inútil no resto", custo:600, pericia:10, tier:2, g:{wheelW:.35,wheelR:.34,spokes:6}, aderencia:1.26, piso:{asfalto:1.22,terra:0.60,chuva:0.52}},
    {nome:"Cravo",       desc:"morde terra e chuva", custo:600, pericia:10, tier:2, g:{wheelW:.31,wheelR:.42,spokes:5}, aderencia:.92, piso:{asfalto:0.84,terra:1.36,chuva:1.24}},
  ],
  aero:[
    {nome:"Sem aerofólio",desc:"toda a velocidade final", custo:0, tier:0, g:{wing:0}, arrasto:1.00, aderencia:1.00, piso:{asfalto:1,terra:1,chuva:1}},
    {nome:"Asa média",    desc:"equilíbrio",       custo:450, tier:1, g:{wing:2}, arrasto:1.07, aderencia:1.11, piso:{asfalto:1,terra:1,chuva:1}},
    {nome:"Asa grande",   desc:"gruda na curva, custa reta", custo:1100, pericia:25, tier:2, g:{wing:3}, arrasto:1.18, aderencia:1.24, piso:{asfalto:1,terra:1,chuva:1}},
  ],
};
/* ══════════════════════════════════════════════════════════════════════════
   PINTURA — a lei que a torna segura: NADA VISUAL TOCA STATUS.

   É corolário da Lei 3 (nunca vender poder), e dela sai o achado mais valioso
   do projeto: o mercado cosmético é o único que não pode quebrar o jogo.
   Vender uma pintura por dinheiro real nunca desequilibra corrida nenhuma.

   O mundo é pátio de ferro-velho ao sol, então a paleta tem duas famílias:
   as sofridas, que é o que um carro velho de verdade tem, e as vivas, que é
   o que alguém pinta quando decide que aquele carro vai ser dele. */
const CORES_CARRO=[
  ["#E8321C","Vermelho"],   ["#1080D8","Azul"],       ["#13B04C","Verde"],
  ["#F2A007","Âmbar"],      ["#B02BD8","Violeta"],    ["#00B9B0","Turquesa"],
  ["#D81448","Carmim"],     ["#E9E4DA","Osso"],
  ["#8A5A3A","Ferrugem"],   ["#6B6259","Chumbo"],     ["#3E6B58","Musgo"],
  ["#7A6E5E","Areia"],      ["#2A323A","Grafite"],    ["#8A9099","Zinco"],
];
const CORES_DETALHE=[
  ["#F2EDE2","Creme"],  ["#141A20","Preto"],   ["#E9992B","Âmbar"],
  ["#B7C2CB","Prata"],  ["#D2604A","Telha"],   ["#5AA894","Verde-água"],
];
/* O padrão é GEOMETRIA, não textura: uma faixa é um par de triângulos com a
   cor de detalhe, desenhado por cima da chapa. Textura pediria mapa de UV, e
   mapa de UV pediria arquivo — que é justamente o que a trava de arte evita. */
const PADROES=[
  {nome:"Liso",      f:null},
  {nome:"Faixa",     f:"centro"},
  {nome:"Duas cores",f:"cintura"},
  {nome:"Capô",      f:"capo"},
];

const G_BASE={length:4.25,width:1.88,ride:.22,hoodH:.78,roofH:1.28,deckH:.92,tHood:.28,tWs:.44,
  tRoof:.62,tDeck:.80,noseDrop:.08,ducktail:.03,noseTaper:.13,tailTaper:.10,tumble:.30,chamfer:.10,
  flare:.10,wheelR:.34,rearRatio:1,wheelW:.24,spokes:5,axF:.21,axR:.80,wing:1,engine:0,exhaust:0,
  pattern:0,colBody:"#E8321C",colAcc:"#F2EDE2"};

/* A classe é do CARRO, não do jogador. Soma dos níveis das quatro peças,
   calculada na hora — não dá para moer em separado: melhorou o carro, subiu de
   classe e passa a enfrentar gente melhor equipada.

   Nível de conta foi recusado de propósito: conta com progresso acumulado vira
   mercado de contas, e é por aí que o dinheiro sai do jogo por baixo.

   A soma é de TIER, não de índice: Buggy e Cravo são especialização, não
   degrau — somar índice diria que um carro de terra vale menos classe que um de
   asfalto, o que é falso. Dois carros igualmente investidos, um para terra e
   outro para asfalto, têm de cair na mesma sala. Com 4 slots de tier 0 a 2, a
   soma vai de 0 a 8. */
const CLASSES=[
  {l:"D", ate:1, nome:"Lata-velha"},
  {l:"C", ate:3, nome:"Rodando"},
  {l:"B", ate:5, nome:"Montado"},
  {l:"A", ate:7, nome:"Afiado"},
  {l:"S", ate:99,nome:"Topo"},
];
function classeDe(build){
  const b=build||estado.build;
  const soma=["chassi","motor","rodas","aero"]
    .reduce((t,k)=>t+(PECAS[k][b[k]].tier||0),0);
  for(const c of CLASSES) if(soma<=c.ate) return {...c, soma};
  return {...CLASSES[CLASSES.length-1], soma};
}

/* ══════════════════════════════════════════════════════════════════════════
   O POVO DO PÁTIO

   Os rivais usavam `montar()` — a build DO JOGADOR — só trocando a cor. Oito
   carros iguais pintados diferente, e o dono notou na hora. Agora cada um é
   uma pessoa: nome, carro montado por ela, pintura escolhida por ela, e um
   jeito de dirigir.

   São FABRICADOS de propósito, e isso é uma decisão de lançamento, não uma
   gambiarra: no dia um não há oito mil jogadores para preencher sala nenhuma,
   e um pátio vazio mata o jogo antes de ele começar. O dono pediu que a
   quantidade fosse configurável, e é o campo `POVO.quantos`.

   O formato aqui é DE PROPÓSITO o mesmo do fantasma que virá no multijogador
   (`MULTIJOGADOR.md`): nome, build, pintura, perfil de pilotagem. Quando
   houver gente de verdade, troca-se a fonte da lista e nada mais no jogo
   precisa mudar.

   Semeados: o Marcos de hoje é o Marcos de amanhã, com o mesmo carro. Sem
   isso o pátio vira multidão anônima e a derrota não ganha rosto. */
const POVO={ quantos:60 };

/* "Neném da Várzea" não cabe em 126px de minimapa, e o primeiro nome é o que a
   pessoa é chamada. Mora AQUI, junto do povo, e não na camada de desenho: a
   simulação escreve os avisos com nome, e `passoCorrida` não pode depender de
   nada de tela — foi o mesmo tropeço do `sfx`, que a bancada pegou das duas
   vezes. */
function nomeCurto(p){
  const n=(p&&p.nome)||"";
  return n.length>12 ? n.split(" ")[0] : n;
}

const NOMES=["Marcos","Iara","Beto","Dandara","Zé Cabo","Neném","Vavá","Cleide",
  "Tião","Rosa","Juca","Nilda","Gerson","Sula","Bira","Fátima","Douglas","Preta",
  "Ademir","Joana","Lelo","Cida","Toninho","Márcia","Valdo","Bruna","Chico",
  "Simone","Edinho","Lourdes","Wando","Tati","Paulão","Neide","Jamil","Rita"];
const SOBRE=["do Ferro","Pé de Chumbo","da Curva","Meia-Noite","do Cravo","Cascalho",
  "Faísca","da Várzea","Roda Solta","Bico Doce","Zero Bala","Mão Leve"];

/* Um habitante é calculado, nunca guardado: 60 deles seriam 60 registos para
   sincronizar. Do índice sai tudo, sempre igual. */
function habitante(i){
  const r=semente(7717+i*131);
  const nome=NOMES[Math.floor(r()*NOMES.length)]
    + (r()<0.45 ? " "+SOBRE[Math.floor(r()*SOBRE.length)] : "");
  /* A build é sorteada com PESO: a maioria do pátio anda em lata-velha, como
     numa população de verdade. Sem isso todo mundo seria classe S e o jogador
     novo se sentiria num campeonato que não é dele. */
  /* O grau decide QUANTO a pessoa investiu; o sorteio por slot decide EM QUÊ.
     Na primeira versão o grau baixo devolvia zero em todos os slots, então 45%
     do povo tinha o carro exatamente igual — e, com a sala filtrada por classe,
     o grid saía com duas builds em sete. Aqui cada peça é sorteada à parte:
     dois motoristas de lata-velha podem ter escolhido gastar em coisas
     diferentes, que é o que acontece na vida. */
  const grau=r();
  const chanceDeGastar = grau<0.45 ? 0.26 : grau<0.80 ? 0.58 : 0.88;
  const escolhe=(k)=>{
    if(r()>chanceDeGastar) return 0;                 // ficou com a de fábrica
    return 1+Math.floor(r()*(PECAS[k].length-1));
  };
  return {
    nome,
    build:{ chassi:escolhe("chassi"), motor:escolhe("motor"),
            rodas:escolhe("rodas"),   aero:escolhe("aero") },
    cor:  CORES_CARRO[Math.floor(r()*CORES_CARRO.length)][0],
    acc:  CORES_DETALHE[Math.floor(r()*CORES_DETALHE.length)][0],
    padrao:Math.floor(r()*PADROES.length),
    /* o jeito de dirigir, que no multijogador virá do plano do dono do carro */
    perfil:{ linha:(r()*2-1)*0.62, coragem:0.86+r()*0.28,
             forca:0.93+r()*0.12, erro:0.04+r()*0.20,
             ritmo:0.6+r()*1.5, fase:r()*6.28 },
  };
}
/* Quem está no pátio hoje. Sorteia por PROXIMIDADE DE CLASSE, que é a regra de
   emparelhamento de `FILA.md` aplicada desde já — e resolve uma incoerência que
   apareceria na tela: como todos os carros da corrida usam os mesmos atributos,
   um rival classe S ao lado de um jogador classe D pareceria um carrão e
   andaria igual a uma lata-velha. Mentira visual.

   Não é filtro duro: com pouca gente na faixa, alarga. Sala vazia é pior que
   sala desigual. */
function escalar(quantos, semSemente){
  const r=semente(semSemente);
  const minha=classeDe().soma;
  const perto=(h)=>Math.abs(classeDe(h.build).soma - minha) <= 3;
  const vagas=[];
  const usados=new Set(), nomes=new Set();
  let tentativas=0;
  while(vagas.length<quantos && tentativas++<POVO.quantos*8){
    const i=Math.floor(r()*POVO.quantos);
    if(usados.has(i)) continue;
    const h=habitante(i);
    /* Compara o PRIMEIRO nome: "Neném" e "Neném da Várzea" são strings
       diferentes e leem como a mesma pessoa duas vezes na lista de chegada. */
    const prim=h.nome.split(" ")[0];
    if(nomes.has(prim)) continue;
    // metade das tentativas exige classe próxima; depois disso aceita qualquer
    // um, para a sala nunca ficar vazia por excesso de exigência
    if(tentativas < POVO.quantos*4 && !perto(h)) continue;
    usados.add(i); nomes.add(prim); vagas.push(h);
  }
  return vagas;
}

const estado={
  nome:"Piloto",
  /* Automático não é preguiça: é outro jogo. Você não pilota, você PREPARA —
     e a mesma estratégia vai dirigir o seu fantasma nas corridas dos outros
     quando o multijogador existir. Guardado aqui porque é decisão do jogador,
     não estado de corrida. */
  auto:false,
  plano:{ agressao:1, nitro:1, item:1 },   // 0 = contido, 1 = meio, 2 = solto

  /* Vários carros, UM farmando de cada vez. Medido no simulador: dois carros
     farmando passam nos sete portões e ainda assim derrubam o preço da sucata
     em 85%. E com bateria de 8 h, dois carros enchem em 4 — carro extra
     premiaria ATENÇÃO, que é o oposto do que um modo idle promete.
     Então o segundo carro é especialização e reserva: um de terra, um de
     asfalto, e um sobressalente para quando a peça quebrar. */
  carros:[ {build:{chassi:0,motor:0,rodas:0,aero:1}, cor:"#E8321C", acc:"#F2EDE2",
            dur:{chassi:100,motor:100,rodas:100,aero:100}} ],
  ativo:0,
  energia:480, pericia:0, sucata:0,
  melhorVolta:-1, corridas:0,
  piso:"asfalto", sementePista:3, vitorias:0,
  // o que já foi comprado é da CONTA, não do carro: peça destravada serve
  // para qualquer um deles
  destravado:{chassi:[0],motor:[0],rodas:[0],aero:[0]},
  idleUltimo:Date.now(), idleSemente:7,
};

/* `build`, `cor`, `acc` e `dur` continuam sendo lidos como `estado.build` no
   resto do arquivo inteiro — são centenas de usos. Em vez de trocar todos, eles
   viram JANELAS para o carro ativo. Trocar de carro passa a ser mudar um
   índice, e nada mais no jogo precisa saber que existe mais de um. */
const CAMPOS_DO_CARRO=["build","cor","acc","dur"];
for(const k of CAMPOS_DO_CARRO)
  Object.defineProperty(estado, k, {
    get(){ return estado.carros[estado.ativo][k]; },
    set(v){ estado.carros[estado.ativo][k]=v; },
    enumerable:true, configurable:true,
  });

const VAGAS_GARAGEM=2;      // 2 de graça; o passe abre mais, e guardar não é farmar
function novoCarro(){
  return { build:{chassi:0,motor:0,rodas:0,aero:1},
           cor:CORES_CARRO[Math.floor(Math.random()*CORES_CARRO.length)][0],
           acc:"#F2EDE2",
           dur:{chassi:100,motor:100,rodas:100,aero:100} };
}
function trocarCarro(i){
  estado.ativo=cl(i,0,estado.carros.length-1);
  salvar(); reconstruirCarro(); montarGaragem();
}

/* ── PERSISTÊNCIA ─────────────────────────────────────────────────────────
   O portão da Fase 2 é retenção: alguém voltar no dia seguinte. Sem salvar,
   fechar a aba apagava tudo e o portão era impossível de medir. */
const CHAVE="circuito-aberto-v1";
function salvar(){
  try{ localStorage.setItem(CHAVE, JSON.stringify({
    nome:estado.nome, auto:estado.auto, plano:estado.plano,
    carros:estado.carros, ativo:estado.ativo,
    energia:estado.energia, pericia:estado.pericia, sucata:estado.sucata,
    melhorVolta:estado.melhorVolta, corridas:estado.corridas, vitorias:estado.vitorias,
    idleUltimo:estado.idleUltimo, piso:estado.piso, sementePista:estado.sementePista,
    destravado:estado.destravado,
  })); }catch(e){}
}
function carregar(){
  try{
    const d=JSON.parse(localStorage.getItem(CHAVE)||"null");
    if(!d) return false;

    /* Save de antes da garagem: `build`, `cor`, `acc` e `dur` moravam soltos no
       topo. Recolhe-os para dentro do primeiro carro antes de qualquer outra
       coisa — quem já jogava não pode perder o carro que montou. */
    if(!d.carros){
      d.carros=[{ build:d.build||{chassi:0,motor:0,rodas:0,aero:1},
                  cor:d.cor||"#E8321C", acc:d.acc||"#F2EDE2",
                  dur:d.dur||{chassi:100,motor:100,rodas:100,aero:100} }];
      d.ativo=0;
    }
    delete d.build; delete d.cor; delete d.acc; delete d.dur;   // são janelas agora

    Object.assign(estado,d);
    if(!Array.isArray(estado.carros)||!estado.carros.length) estado.carros=[novoCarro()];
    estado.ativo=cl(estado.ativo|0,0,estado.carros.length-1);

    // o que ficou salvo pode ser de uma versão anterior: completa o que faltar
    for(const carro of estado.carros){
      for(const k of ["chassi","motor","rodas","aero"]){
        if(!estado.destravado[k]) estado.destravado[k]=[0];
        if(!carro.dur) carro.dur={};
        if(carro.dur[k]===undefined) carro.dur[k]=100;
        if(!estado.destravado[k].includes(carro.build[k])) carro.build[k]=0;
      }
    }
    return true;
  }catch(e){ return false; }
}

function montar(){
  const g={...G_BASE, colBody:estado.cor, colAcc:estado.acc,
           pattern:(estado.carros[estado.ativo].padrao|0)};
  for(const k of ["chassi","motor","rodas","aero"]) Object.assign(g, PECAS[k][estado.build[k]].g);
  return g;
}
/* Peça gasta rende menos. Não é punição no meio da corrida — é conta a pagar
   entre uma e outra, que é onde a Sucata deixa de ser número decorativo. */
function fatorDur(k){ return 0.62 + 0.38*cl((estado.dur[k]||0)/100,0,1); }
function custoReparo(){
  let t=0;
  for(const k of ["chassi","motor","rodas","aero"]){
    const falta=100-(estado.dur[k]||0);
    t += falta * (0.5 + PECAS[k][estado.build[k]].custo/900);
  }
  return Math.round(t);
}
function atributos(piso){
  const P=PISOS[piso||estado.piso||"asfalto"];
  const p=k=>PECAS[k][estado.build[k]];
  const c=p("chassi"), m=p("motor"), r=p("rodas"), a=p("aero");
  const nomePiso=piso||estado.piso||"asfalto";
  const af=(x)=>(x.piso&&x.piso[nomePiso])||1;      // afinidade da peça com o piso
  const peso=c.peso*m.peso;
  const potencia = 11.5 * c.pot * m.pot * fatorDur("motor") / peso;
  const arrasto  = 0.0026 * a.arrasto * P.arrasto;
  // velocidade terminal resolvida da própria equação de movimento, para o
  // número da garagem ser o número que o carro faz de verdade na pista
  const vmax = (-0.18 + Math.sqrt(0.0324 + 4*arrasto*potencia)) / (2*arrasto);
  return {
    potencia, arrasto, vmax, peso, piso:nomePiso,
    aderencia: 3.05 * c.aderencia * r.aderencia * a.aderencia
             * P.aderencia * af(c) * af(r) * af(a)
             * (0.70+0.30*fatorDur("rodas")) * (0.85+0.15*fatorDur("chassi")),
    terra: 0.55 + 0.45*af(c)*af(r),      // o quanto sofre fora da pista
  };
}

/* ── pista: laço fechado gerado por spline, com blocos de meio-fio ── */
/* Cada piso é um LUGAR, não uma cor. O traçado muda de caráter:

     asfalto  autódromo — poucas curvas, amplas, reta longa, pista larga
     terra    rali      — sinuoso, curva fechada, largura que aperta e abre
     chuva    circuito urbano — cantos de 90 graus, estreito, sem escapatória

   É isso que faz correr na terra ser diferente de correr no asfalto, muito
   mais do que trocar a cor do chão. */
function gerarPista(sem, piso){
  const r=semente(sem);
  piso = piso || "asfalto";
  let ctrl=[], SUB=14, larguraBase=19, aperto=7;

  if(piso==="asfalto"){
    const N=11;
    for(let i=0;i<N;i++){
      const a=i/N*Math.PI*2, rad=210+r()*70;
      ctrl.push([Math.cos(a)*rad, Math.sin(a)*rad]);
    }
    // uma reta longa: dois pontos quase alinhados
    ctrl[0][0]*=1.22; ctrl[0][1]*=1.22;
    larguraBase=21; aperto=6;

  } else if(piso==="terra"){
    const N=17;
    for(let i=0;i<N;i++){
      const a=i/N*Math.PI*2, rad=150+r()*130;      // raio muito variável = sinuoso
      ctrl.push([Math.cos(a)*rad, Math.sin(a)*rad]);
    }
    larguraBase=16; aperto=9; SUB=12;

  } else {                                        // chuva: circuito urbano
    const N=12, quadra=95;
    for(let i=0;i<N;i++){
      const a=i/N*Math.PI*2, rad=200+r()*60;
      // encaixa na malha das quadras: é o que gera canto de rua
      ctrl.push([Math.round(Math.cos(a)*rad/quadra)*quadra,
                 Math.round(Math.sin(a)*rad/quadra)*quadra]);
    }
    larguraBase=18; aperto=4; SUB=13;             // canto radiado, não faca
  }

  const N=ctrl.length;
  const cr=(p0,p1,p2,p3,t)=>{const t2=t*t,t3=t2*t;
    return [0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
            0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)];};
  const meio=[];
  for(let i=0;i<N;i++) for(let sI=0;sI<SUB;sI++)
    meio.push(cr(ctrl[(i-1+N)%N],ctrl[i],ctrl[(i+1)%N],ctrl[(i+2)%N],sI/SUB));

  /* ── RELEVO POR FEIÇÕES, não por ruído ─────────────────────────────────
     A primeira versão somava harmônicos aleatórios da volta inteira: a pista
     inteira balançava, os mapas que eram desenhados planos viraram gelatina e
     o dono reprovou. Relevo bom é o contrário de ruído: é FEIÇÃO — um morro
     AQUI, um vale ALI, uma rampa NAQUELA reta — com o resto plano, porque é o
     plano em volta que faz a subida ser um acontecimento.

     Cada feição é uma janela local (cosseno levantado): fora dela a
     contribuição é zero com derivada zero, então a volta fecha por construção
     e a LARGADA É SEMPRE PLANA — nenhuma feição pode morar perto do u=0.

     A rampa é a feição especial: o chão sobe em linha até a borda e CAI. O
     carro que chega rápido sai voando — o voo é da física, não da animação —
     e por isso ela só nasce em reta comprida, com área de pouso limpa. */
  const nMeio=meio.length;
  // curvatura por ponto do meio, para saber onde é reta de verdade
  const curvEm=[];
  for(let i=0;i<nMeio;i++){
    const a=meio[(i-1+nMeio)%nMeio], b=meio[i], c=meio[(i+1)%nMeio];
    let dA=Math.atan2(c[1]-b[1],c[0]-b[0])-Math.atan2(b[1]-a[1],b[0]-a[0]);
    while(dA>Math.PI)dA-=6.2832; while(dA<-Math.PI)dA+=6.2832;
    curvEm.push(Math.abs(dA));
  }
  // comprimento aproximado ANTES do y existir: as janelas são frações da
  // volta, e a rampa precisa saber quantos metros um u vale
  let aprox=0;
  for(let i=0;i<nMeio;i++){
    const a=meio[i], b=meio[(i+1)%nMeio];
    aprox+=Math.hypot(b[0]-a[0],b[1]-a[1]);
  }
  const retaEm=(u,frac,tol)=>{       // a janela [u, u+frac] é toda reta?
    const i0=Math.floor(u*nMeio), q=Math.ceil(frac*nMeio);
    for(let k=0;k<=q;k++) if(curvEm[(i0+k)%nMeio]>(tol||0.055)) return false;
    return true;
  };
  const PLANO={   // o caráter de cada piso, em feições
    asfalto:{ morros:2, vales:1, ampM:[5.0,8.5], ampV:[3.5,5.5], larg:[0.085,0.125], rampas:0 },
    terra:  { morros:3, vales:1, ampM:[4.0,7.5], ampV:[3.0,5.0], larg:[0.055,0.085], rampas:2 },
    chuva:  { morros:1, vales:0, ampM:[2.2,3.2], ampV:[0,0],     larg:[0.11,0.13],  rampas:0 },
  }[piso] || { morros:2, vales:0, ampM:[4,6], ampV:[0,0], larg:[0.08,0.12], rampas:0 };

  const feicoes=[];
  const livre=(u,w)=>{
    // largada plana: nada entre u 0,93 e 0,07
    let du0=Math.min(Math.abs(u),1-Math.abs(u));
    if(du0 < w+0.07) return false;
    for(const f of feicoes){
      let d=Math.abs(u-f.u); if(d>0.5)d=1-d;
      if(d < w+(f.w||f.len)+0.02) return false;
    }
    return true;
  };
  /* Rampas PRIMEIRO: são a feição-assinatura do piso, e colocadas por último
     os morros já tinham bloqueado a volta inteira com as margens de
     separação — era por isso que dois terços das terras saíam sem rampa.
     E em vez de sortear um lugar e torcer para ser reto, o gerador VARRE a
     volta e escolhe as retas mais retas que existem. */
  if(PLANO.rampas>0){
    const deckU=32/aprox, pousoU=48/aprox;
    const jan=Math.ceil((deckU+pousoU)*nMeio);
    const candidatos=[];
    for(let i0=0;i0<nMeio;i0+=2){
      let pior=0;
      for(let k=0;k<=jan;k++) pior=Math.max(pior,curvEm[(i0+k)%nMeio]);
      candidatos.push({u:i0/nMeio, pior});
    }
    candidatos.sort((a,b)=>a.pior-b.pior);
    let postas=0;
    for(const cand of candidatos){
      if(postas>=PLANO.rampas) break;
      if(cand.pior>0.11) break;               // aqui já não há reta que preste
      if(!livre(cand.u+deckU/2, deckU/2+pousoU)) continue;
      // o `w` é a extensão que os morros respeitam: deck E pouso, porque
      // morro em cima da área de pouso é pouso quebrado
      feicoes.push({tipo:"rampa", u:cand.u, len:deckU, w:deckU+pousoU,
                    H:2.3+r()*0.8});
      postas++;
    }
  }
  // morros e vales: em qualquer lugar que não brigue com o que já existe
  const poe=(quantos,[a0,a1],sinal)=>{
    for(let q=0;q<quantos;q++)
      for(let tent=0;tent<40;tent++){
        const u=r(), w=PLANO.larg[0]+r()*(PLANO.larg[1]-PLANO.larg[0]);
        if(!livre(u,w)) continue;
        feicoes.push({tipo:"morro", u, w, amp:sinal*(a0+r()*(a1-a0))});
        break;
      }
  };
  poe(PLANO.morros, PLANO.ampM, 1);
  poe(PLANO.vales,  PLANO.ampV, -1);

  const alturaEm=(u)=>{
    let y=0;
    for(const f of feicoes){
      if(f.tipo==="rampa"){
        let du=u-f.u; if(du<-0.5)du+=1; if(du>0.5)du-=1;
        if(du>=0 && du<=f.len) y+=f.H*(du/f.len);
      } else {
        let du=Math.abs(u-f.u); if(du>0.5)du=1-du;
        if(du<f.w) y+=f.amp*0.5*(1+Math.cos(Math.PI*du/f.w));
      }
    }
    return y;
  };
  const naRampa=(u)=>{             // 0 fora; senão a fração ao longo do deck
    for(const f of feicoes){
      if(f.tipo!=="rampa") continue;
      let du=u-f.u; if(du<-0.5)du+=1; if(du>0.5)du-=1;
      if(du>=0 && du<=f.len) return du/f.len || 1e-4;
    }
    return 0;
  };

  const n=meio.length, dados=[];
  let total=0;
  for(let i=0;i<n;i++){
    const a=meio[(i-1+n)%n], b=meio[i], c=meio[(i+1)%n];
    let tx=c[0]-a[0], tz=c[1]-a[1]; const l=Math.hypot(tx,tz)||1; tx/=l; tz/=l;
    const curv=Math.abs(Math.atan2(c[1]-b[1],c[0]-b[0])-Math.atan2(b[1]-a[1],b[0]-a[0]));
    const larg=larguraBase - cl(curv,0,.5)*aperto;
    // a→b é UM segmento; o *0.5 daqui fazia o perímetro sair pela metade,
    // e a IA calcula a distância de frenagem a partir dele
    total+=Math.hypot(b[0]-meio[(i-1+n)%n][0], b[1]-meio[(i-1+n)%n][1]);
    dados.push({x:b[0],z:b[1],y:alturaEm(i/n),rampa:naRampa(i/n),
                tx,tz,nx:-tz,nz:tx,larg,s:total});
  }
  /* Inclinação: quanto o chão sobe por metro andado. É o que o motor sente na
     subida e o que dá impulso na descida. Calculada depois, quando todos os y
     já existem, e pelo vizinho de trás e da frente para não ficar granulada. */
  for(let i=0;i<n;i++){
    const a=dados[(i-1+n)%n], b=dados[i], c=dados[(i+1)%n];
    const dist=Math.hypot(c.x-a.x,c.z-a.z)||1;
    /* Na borda da rampa o vizinho da frente já está lá embaixo e a diferença
       central inventaria um tobogã: ali a inclinação vem só de trás, que é o
       chão que o carro ainda pisa. E um teto geral, porque inclinação de
       degrau não é inclinação — é queda, e queda é assunto do voo. */
    const borda = b.rampa>0 && !(c.rampa>0);
    b.saltoBorda = borda;
    b.inc = cl(borda ? (b.y-a.y)/(Math.hypot(b.x-a.x,b.z-a.z)||1)
                     : (c.y-a.y)/dist, -0.30, 0.30);
  }
  return {pontos:dados, n, comprimento:total, piso, feicoes,
          alto:Math.max(...dados.map(d=>d.y)), baixo:Math.min(...dados.map(d=>d.y))};
}

/* Índice do ponto mais próximo — busca local, porque o carro anda contínuo. */
function maisProximo(pista, x, z, ult){
  let mel=ult, md=1e9;
  for(let k=-14;k<=14;k++){
    const i=(ult+k+pista.n)%pista.n, p=pista.pontos[i];
    const d=(p.x-x)**2+(p.z-z)**2;
    if(d<md){md=d;mel=i;}
  }
  return {i:mel, dist:Math.sqrt(md)};
}

/* ── física arcade, passo fixo, determinística ──
   O deslize nasce de a velocidade NÃO acompanhar a rotação do carro: gira
   forte em velocidade, a lateral cresce, o pneu arrasta e o carro derrapa.
   Determinística de propósito: na Fase 3 o servidor re-simula o log de
   entradas e compara, que é como o Trackmania valida tempo. */
const DT=1/120;
/* GRID mora aqui, e não junto do desenho, porque o sorteio de item depende
   dele: o NÚCLEO tem de rodar sozinho no servidor, sem nada da tela. */
const GRID=8;   // com quatro dava para passar todo mundo em uma volta
const ORCAMENTO_DESLIZE = 4.2;   // m/s de lateral que o pneu aguenta de graça

/* Temperatura de motor e desgaste de pneu FORAM REMOVIDOS.
   Medido: num ritmo humano o motor chegava a 92° e o pneu a 75%, o que dava
   9% de perda de força e 11% de aderência — número que se mexe e consequência
   que não morde. Pior: o único jeito de esfriar era parar de acelerar, ou
   seja, a mecânica pedia que você jogasse menos. Limitação igual pra todos,
   sem decisão nenhuma no meio.
   O custo do turbo agora é o próprio NITRO, que é recurso conquistado
   derrapando e pegando vácuo. */

/* ── NITRO ───────────────────────────────────────────────────────────────
   Enche derrapando e pegando vácuo, gasta no turbo. E o turbo é a FONTE DE
   CALOR: motor esquentando sozinho não mordia (a 92° a perda é 9%, ninguém
   sente), mas como preço de usar o turbo ele passa a ser uma decisão. Toda
   peça alimenta a outra: derrapa → nitro → turbo → calor → tem que aliviar. */
const NITRO = { max:100, gasto:34, forca:1.85, calor:0, porDeslize:11, porVacuo:19, porAtraso:16 };

/* ── ITENS ───────────────────────────────────────────────────────────────
   Peso por posição: quem está atrás tira coisa melhor. É o que mantém a
   corrida viva depois que alguém abre vantagem. */
const ITENS = {
  turbo:  { nome:"Turbo",  cor:"#E9992B", peso:[4,5,7,8], ic:"turbo" },
  oleo:   { nome:"Óleo",   cor:"#7A6A50", peso:[7,5,3,2], ic:"oleo" },
  tranco: { nome:"Tranco", cor:"#D2604A", peso:[0,2,4,6], ic:"tranco" },
  reparo: { nome:"Recarga",cor:"#5AA894", peso:[3,4,5,5], ic:"recarga" },
  // ESTOURO: só cai pra quem está em 3º ou 4º e acerta o LÍDER onde ele
  // estiver. É o que impede a corrida de virar procissão depois que alguém
  // abre vantagem — sem algo assim, quem lidera aos 40% vence sempre.
  estouro:{ nome:"Estouro", cor:"#E9552B", peso:[0,0,2,5], ic:"estouro" },
  // Escudo é ITEM, não um improviso: quem se prepara para o estouro tomou
  // uma decisão, em vez de simplesmente ter sobrado algo no bolso.
  /* Com peso 7 na frente, o líder tirava escudo em um terço das caixas e o
     míssil virava enfeite. Escudo forte no miolo, raro na ponta: quem lidera
     ter defesa passa a ser sorte, não regra. */
  escudo: { nome:"Escudo",  cor:"#5AC8E9", peso:[2,5,5,4], ic:"escudo" },
};
/* ══════════════════════════════════════════════════════════════════════════
   PEÇA DE CORRIDA — a caixa dá uma peça que você monta na hora e perde na
   bandeirada.

   Por que com prazo, e nunca permanente: a caixa aparece várias vezes por
   volta. Peça permanente ali seria uma torneira enorme sem sorvedouro nenhum
   — Lei 2 violada de frente, e em uma semana peça não valeria nada. Com
   prazo não é torneira: evapora na chegada.

   E de jogo é melhor que consumível. Consumível é um botão que dá um susto;
   peça MUDA COMO O CARRO DIRIGE pelo resto da prova. Cada uma dá com uma mão
   e tira com a outra, senão pegar a caixa deixaria de ser decisão.

   A troca acontece na hora de pegar: a caixa que você vê à frente pode
   trocar a peça que você está gostando. Esse é o dilema. */
const PECAS_CORRIDA={
  mole:   { nome:"Composto mole", cor:"#D2604A", ic:"roda",
            oq:"agarra mais, estica menos",
            mod:{aderencia:1.20, arrasto:1.09} },
  /* Chamava-se "relação longa" e mentia sobre a física: neste modelo quem
     levanta a velocidade final é o ARRASTO, não a relação de marcha. Pior, na
     primeira versão baixei potência e arrasto quase igual e a peça ficou mais
     lenta na reta — pior em tudo, ou seja, lixo. Batizada pelo que ela de
     fato faz, e o arrasto cai bem mais que a potência. */
  carena: { nome:"Carenagem", cor:"#5AA894", ic:"aerofolio",
            oq:"corta o ar, empurra menos",
            mod:{potencia:0.88, arrasto:0.55} },
  leve:   { nome:"Chapa leve",    cor:"#E9992B", ic:"chassi",
            oq:"acelera fácil, escorrega",
            mod:{potencia:1.12, aderencia:0.90} },
};
const CHAVES_PECA=Object.keys(PECAS_CORRIDA);

/* Uma caixa em cada três dá peça em vez de item. Menos que isso e a mecânica
   não aparece; mais e o carro vive trocando de personalidade. */
const CHANCE_PECA=0.34;

function aplicarPeca(at, chave){
  const pc=PECAS_CORRIDA[chave];
  if(!pc) return at;
  const m=pc.mod, r={...at};
  if(m.potencia)  r.potencia  = at.potencia*m.potencia;
  if(m.aderencia) r.aderencia = at.aderencia*m.aderencia;
  if(m.arrasto){
    r.arrasto = at.arrasto*m.arrasto;
    // a velocidade final tem de sair da MESMA equação de movimento, senão o
    // número mostrado ao jogador e o que o carro faz na pista divergem
    r.vmax = (-0.18 + Math.sqrt(0.0324 + 4*r.arrasto*r.potencia)) / (2*r.arrasto);
  } else if(m.potencia){
    r.vmax = (-0.18 + Math.sqrt(0.0324 + 4*r.arrasto*r.potencia)) / (2*r.arrasto);
  }
  return r;
}

function sortearItem(posicao){
  /* A tabela tem quatro faixas e o grid tem oito carros: sem esticar, do 5º ao
     8º todos caíam na mesma faixa e o fundo do pelotão perdia a mão boa. */
  const ch=Object.keys(ITENS);
  const i=cl(Math.floor((posicao-1)/Math.max(1,GRID-1)*4),0,3);
  let soma=0; for(const k of ch) soma+=ITENS[k].peso[i];
  let r=Math.random()*soma;
  for(const k of ch){ r-=ITENS[k].peso[i]; if(r<=0) return k; }
  return "turbo";
}


function passo(c, ent, at, naPista, terra){
  const spd=Math.hypot(c.vx,c.vz);
  /* NO AR o carro é um projétil: o pneu não toca nada, então não há tração,
     freio, aderência nem ladeira — só o arrasto. O volante gira um resto,
     porque carro que trava feito pedra no ar parece travado, não voando. */
  const noAr=!!c.noAr;

  // volante: afina em alta velocidade, mas nunca some
  const dirMax=(1-0.40*cl(spd/44,0,1))*(noAr?0.22:1);
  c.dir=lerp(c.dir, ent.dir*dirMax, 0.26);

  // gira o carro primeiro; a velocidade fica pra trás e é isso que vira deslize
  c.h += c.dir*2.95*cl(spd/5,0,1)*DT*(c.vl<0?-1:1);

  const cs=Math.cos(c.h), sn=Math.sin(c.h);
  let vl= c.vx*cs+c.vz*sn, vt=-c.vx*sn+c.vz*cs;

  const superficie = naPista?1:terra;
  // turbo: força extra ao custo de nitro e de MUITO calor
  c.turbando = 0;
  if(ent.turbo && (c.nitro||0)>0.5 && vl>-1 && !noAr){
    c.nitro = Math.max(0,(c.nitro||0) - NITRO.gasto*DT);
    c.turbando = 1;
  }
  const potMult = c.turbando ? NITRO.forca : 1;
  if(!noAr && (ent.acel>0 || c.turbando)) vl += Math.max(ent.acel,c.turbando?0.9:0)*at.potencia*potMult*superficie*DT;
  if(ent.freio && !noAr)  vl -= (vl>0.5?26:8)*DT;   // segurando parado, engata a ré
  vl -= vl*Math.abs(vl)*at.arrasto*DT;
  /* A ladeira empurra ou segura. É gravidade projetada no sentido do
     movimento: subir custa, descer dá de graça — e é o que faz o relevo virar
     decisão de pilotagem em vez de enfeite. O 9,8 é o real, e a inclinação já
     vem em metro por metro andado. */
  if(c.inc && !noAr) vl -= 9.8*c.inc*DT;
  if(!noAr) vl *= 1-(naPista?0.18:1.7)*DT;
  vl = cl(vl,-11,at.vmax);

  // ADERÊNCIA COM ORÇAMENTO DE DESLIZE.
  // Antes, QUALQUER curva descontava velocidade e o carro parecia freado a
  // cada volante. Agora o pneu tem uma cota de escorregada de graça e só o
  // EXCESSO arranha — que é o que faz curva rápida ser prazerosa e derrapada
  // grande ser cara.
  const freioDeMao = ent.mao ? 0.30 : 1;
  if(c.oleado>0) c.oleado-=DT;
  if(!noAr){
    const ader = at.aderencia*(naPista?1:0.5*terra)*freioDeMao*(c.oleado>0?0.28:1);
    vt *= Math.exp(-ader*DT);
    const excesso = Math.max(0, Math.abs(vt) - ORCAMENTO_DESLIZE);
    vl -= excesso*1.15*DT;
    c.derrapa = Math.abs(vt);                      // o quanto está de lado AGORA
  } else {
    c.derrapa = 0;      // voar não é derrapar: nem perícia, nem nitro, nem som
  }

  c.vl=vl;
  c.giroRoda=(c.giroRoda||0) - vl*DT*2.9;      // roda gira com o chão passando
  c.vx=vl*cs-vt*sn; c.vz=vl*sn+vt*cs;
  c.x+=c.vx*DT; c.z+=c.vz*DT;
}

/* ── mapa idle: simulado por tick, recuperável offline ──
   Nada disso depende de aba aberta. Ao entrar no mapa a gente recalcula o
   que aconteceu desde a última visita — que é como o servidor faria. */
/* O que o carro faz NO PÁTIO. Antes isto era `vel=21, giro=2.3` escrito na
   mão: trocar de motor não mudava nada no mapa, e garagem e pátio eram dois
   jogos que não se falavam.

   A leitura de cada peça no mapa:
     motor   → chega primeiro na carga disputada
     chassi  → peso; carro leve acelera e vira melhor entre uma carga e outra
     rodas   → curva fechada, pega a carga que o outro passou reto
     aero    → faro: enxerga carga mais longe (o `nivelSensor` que existia sem
               nada pendurado nele)
   Os rivais do mapa andam a 16–26 de velocidade e 1,5–2,5 de giro, então o
   carro de fábrica nasce ABAIXO da média e sobe com as peças. Antes ele era o
   melhor do pátio por decreto. */
function idleDoCarro(build){
  const b=build||estado.build;
  const p=k=>PECAS[k][b[k]];
  const c=p("chassi"), m=p("motor"), r=p("rodas"), a=p("aero");
  const peso=c.peso*m.peso;
  return {
    vel:  17.0 * m.pot / peso * (0.80+0.20*fatorDur("motor")),
    giro:  1.70 * r.aderencia * c.aderencia * (0.80+0.20*fatorDur("rodas")),
    faro:  b.aero,                       // 0, 1 ou 2
  };
}

/* QUEM PAGA É O CARRO ANDANDO. Não existe "taxa de tempo" no jogo: o carro
   roda o pátio e pega carga, e é isso. Com o jogo fechado ninguém pode rodar a
   simulação, então esta função é a APROXIMAÇÃO do mesmo pátio — e ela precisa
   dar no mesmo lugar, senão o jogador é obrigado a deixar a aba aberta.

   O ponto de referência vem do modelo da Fase 1, não de chute: conta grátis
   enche a bateria em 8 horas. Antes eu tinha 55/h escrito na mão, o que enchia
   em 12 h — o jogador voltava no dia seguinte e a bateria não estava cheia. */
const HORAS_ATE_ENCHER = 8;
function rendaPorSegundo(){
  const d=idleDoCarro();
  const forca=(d.vel/21 + d.giro/2.0)/2;
  // a build ainda importa: carro melhor disputa melhor e enche antes
  const fator=(0.55+0.45*forca)*(1+d.faro*0.05);
  return BATERIA/(HORAS_ATE_ENCHER*3600)*fator;
}

/* O carro está no pátio o tempo todo — não só quando você abre o mapa para
   olhar. Antes, meia hora na garagem rendia ZERO, e o jogador ficava sem
   energia sem entender por quê: o dono relatou exatamente isso.

   Isto é a linha que eu mesmo escrevi e estava quebrando: NÃO ASSISTIR É O
   NORMAL, ASSISTIR É O BÓNUS. O mapa segue rendendo ~52x mais por minuto de
   tela, que é o bónus de estar olhando. */
/* O RELÓGIO tem um dono só: esta função, chamada no começo de todo quadro.
   Dois donos davam crédito em dobro, e nenhum dono perdia o tempo da aba
   escondida — já cometi os dois erros nesta mesma semana.

   Pelo relógio e não pelo `dt` do quadro: `dt` é limitado a 0,05 s e aba em
   segundo plano para de desenhar, então contar quadros perderia horas. */
function correrIdleDeFundo(){
  const agora=Date.now();
  const seg=Math.min(8*3600,(agora-(estado.idleUltimo||agora))/1000);
  estado.idleUltimo=agora;

  // menos de 2 s quer dizer que o pátio esteve rodando e já pagou, ao vivo
  if(seg<2) return;
  // correndo, o carro está na pista e não no pátio: o tempo passa sem render
  if(tela==="corrida") return;
  if(estado.energia>=BATERIA) return;
  estado.energia=cl(estado.energia + rendaPorSegundo()*seg, 0, BATERIA);
}

/* O mesmo pátio, adiantado de uma vez para o tempo em que o jogo esteve
   fechado. Usa a MESMA renda por segundo da coleta ao vivo — dois números
   diferentes para a mesma coisa foi o que fez o dono ter de deixar a aba
   aberta para conseguir energia. O sorteio só dá um tempero de disputa. */
function simularIdle(segundos){
  const r=semente(estado.idleSemente++);
  const ganho=rendaPorSegundo()*segundos*(0.88+r()*0.24);
  const antes=estado.energia;
  estado.energia=cl(estado.energia+ganho,0,BATERIA);
  return {ganho:estado.energia-antes, cheia:estado.energia>=BATERIA};
}
