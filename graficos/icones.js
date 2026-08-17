"use strict";
// atalho no topo: declarado com const, usado antes daqui dava zona morta
const $=id=>document.getElementById(id);

/* ── ÍCONES ──────────────────────────────────────────────────────────────
   Construídos em 3D com as MESMAS primitivas, a MESMA luz e a MESMA paleta do
   carro, e renderizados uma vez na partida num viewport de 64x64. O resultado
   vira data URI e some da memória de vídeo.

   Ícone gerado por IA nunca casa com o jogo porque não sai do mesmo
   renderizador — sombra diferente, contorno diferente, paleta parecida mas
   não igual. Feito aqui, nasce nativo por construção. E volta a respeitar a
   lei do projeto: tudo sai de código.

   O fundo é magenta puro, cor que não existe em nenhuma peça, e vira alfa na
   hora de virar PNG. */
const ICONE = {};
/* 3D funciona para OBJETO (garrafa, roda, troféu) e falha para SÍMBOLO
   (energia, perícia). Símbolo quer forma chapada, contorno limpo e leitura
   instantânea a 20px — que é exatamente o que SVG faz melhor que render. */
const SVG = {
  energia:(t,c)=>`<svg class="ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none">
    <path d="M13.6 2 4.5 13.4h5.3L9.2 22l9.6-11.9h-5.7L13.6 2Z" fill="${c||'#F5C244'}"
      stroke="#0C1014" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  pericia:(t,c)=>`<svg class="ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none">
    <path d="M12 2.6 14.6 9h6.8l-5.5 4 2.1 6.6L12 15.6 6 19.6 8.1 13l-5.5-4h6.8L12 2.6Z"
      fill="${c||'#E9992B'}" stroke="#0C1014" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  mGaragem:(t,c)=>`<svg class="ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none">
    <path d="M3 10.2 12 4l9 6.2V21H3V10.2Z" fill="${c||'#8A939B'}" stroke="#0C1014"
      stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M6.6 13h10.8M6.6 16.2h10.8M6.6 19.4h10.8" stroke="#0C1014" stroke-width="1.5"/></svg>`,
  mMapa:(t,c)=>`<svg class="ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none">
    <path d="M2.6 5.6 9 3.2v15.2l-6.4 2.4V5.6Z" fill="${c||'#5AA894'}" stroke="#0C1014"
      stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M9 3.2 15 5.6v15.2L9 18.4V3.2Z" fill="${c||'#8A939B'}" stroke="#0C1014"
      stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M15 5.6 21.4 3.2v15.2L15 20.8V5.6Z" fill="${c||'#5E666E'}" stroke="#0C1014"
      stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  mCorrer:(t,c)=>`<svg class="ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none">
    <path d="M5 3v18" stroke="#0C1014" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M6.6 4.2h13.8v9.2H6.6V4.2Z" fill="${c||'#E9E4DA'}" stroke="#0C1014" stroke-width="1.4"/>
    <path d="M6.6 4.2h4.6v3.1H6.6zM15.8 4.2h4.6v3.1h-4.6zM11.2 7.3h4.6v3.1h-4.6zM6.6 10.4h4.6v3h-4.6zM15.8 10.4h4.6v3h-4.6z" fill="#0C1014"/></svg>`,
  mSom:(t,c)=>`<svg class="ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none">
    <path d="M4 9.2h3.6L12.6 5v14l-5-4.2H4V9.2Z" fill="${c||'#8A939B'}" stroke="#0C1014"
      stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M15.8 9.2c1.4 1.6 1.4 4 0 5.6M18.4 6.6c2.8 3 2.8 7.8 0 10.8"
      stroke="${c||'#E9992B'}" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  sucata:(t,c)=>`<svg class="ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none">
    <path d="M3 15.5 8 9l4.4 3.6L16.4 7l4.6 8.5v4.2H3v-4.2Z" fill="${c||'#8A939B'}"
      stroke="#0C1014" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="17.6" cy="5.4" r="2.3" fill="#C07838" stroke="#0C1014" stroke-width="1.3"/></svg>`,
};
function icone(nome,tam,cor){ if(SVG[nome]) return SVG[nome](tam,cor);
  return ICONE[nome]
  ? '<img class="ic" src="'+ICONE[nome]+'" width="'+tam+'" height="'+tam+'" alt="">'
  : ''; }

/* Preguiçosa de propósito: este bloco fica no topo do arquivo, antes de hex()
   existir. Montar a paleta na declaração cairia na zona morta do const. */
let PAL = null;
function montarPaleta(){
  PAL = {
    aco:    hex("#8A939B"), aco2:  hex("#5E666E"), grafite: hex("#2A323A"),
    ambar:  hex("#E9992B"), ambar2:hex("#B8720F"), verde:   hex("#5AA894"),
    oxido:  hex("#D2604A"), creme: hex("#E9E4DA"), preto:   hex("#141A20"),
    ouro:   hex("#D9A62B"), cobre: hex("#C07838"), vidro:   hex("#2E4450"),
  };
}

/* Cada ícone é uma função que recebe o construtor e devolve o quanto a
   câmera precisa recuar para o objeto caber no quadro. */
const FORMAS = {
  energia(B){
    B.cilY(0,0,0,.62,1.35,10,PAL.ambar);
    B.disco(0,.675,0,.62,10,PAL.ambar2);
    B.cilY(0,.78,0,.24,.22,8,PAL.aco);
    // raio: três traços em zigue-zague, gordos o bastante para ler a 24px
    B.boxR(-.10,.30,.63,.46,.19,.10,-0.62,PAL.creme);
    B.boxR( .02,.02,.63,.34,.19,.10, 0.55,PAL.creme);
    B.boxR( .10,-.28,.63,.46,.19,.10,-0.62,PAL.creme);
    return 2.3;
  },
  pericia(B){
    for(let i=0;i<14;i++){ const a=i/14*6.2832;
      B.boxR(Math.cos(a)*.85,Math.sin(a)*.85,0,.42,.24,.24,a,PAL.grafite); }
    for(let k=0;k<3;k++){ const a=k/3*6.2832+1.05;
      B.boxR(Math.cos(a)*.44,Math.sin(a)*.44,0,.88,.20,.16,a,PAL.aco); }
    B.cilZ(0,0,0,.30,.26,10,PAL.aco2);
    B.disco(0,0,.14,.30,10,PAL.ambar);
    return 2.4;
  },
  sucata(B){
    const r=semente(4);
    for(let i=0;i<11;i++){
      const a=r()*6.2832, d=r()*.72, t=.30+r()*.26;
      B.boxR(Math.cos(a)*d, -.45+r()*.75, Math.sin(a)*d*.7, t,t*.7,t*.9, r()*3, r()<.35?PAL.aco2:PAL.aco);
    }
    B.cilZ(.42,.34,.42,.34,.16,8,PAL.cobre);
    return 2.5;
  },
  turbo(B){
    B.cilY(0,-.15,0,.46,1.25,10,PAL.oxido);
    B.disco(0,.475,0,.46,10,esc(PAL.oxido,1.3));
    B.disco(0,-.775,0,.46,10,esc(PAL.oxido,.6));
    B.cilY(0,.60,0,.17,.30,8,PAL.aco);
    for(let i=0;i<5;i++){ const a=i/5*6.2832;
      B.boxR(Math.cos(a)*.20,1.02+Math.sin(a)*.06,Math.sin(a)*.20,.34,.30,.22,a,i%2?PAL.ambar:PAL.creme); }
    return 2.5;
  },
  oleo(B){
    // poça larga e chata embaixo, lata deitada em cima e um fio caindo
    B.cilY(0,-.72,0,1.05,.14,16,PAL.grafite);
    B.disco(0,-.64,0,1.05,16,esc(PAL.grafite,1.9));
    B.cilZ(-.10,.42,0,.46,.86,12,PAL.ambar2);
    B.disco(-.10,.42,.44,.46,12,esc(PAL.ambar2,1.35));
    B.cilX(.46,.30,0,.11,.52,8,PAL.aco);          // bico
    B.box(.10,-.10,0,.14,.62,.14,esc(PAL.grafite,2.2));  // fio de óleo caindo
    return 2.5;
  },
  tranco(B){
    B.cilX(-.10,0,0,.40,1.30,10,PAL.aco);
    B.box(.72,0,0,.30,1.02,1.02,PAL.aco2);
    B.box(.92,0,0,.12,.80,.80,PAL.oxido);
    B.cilX(-.95,0,0,.24,.36,8,PAL.grafite);
    return 2.5;
  },
  recarga(B){
    B.cilY(0,0,0,.62,1.35,10,PAL.verde);
    B.disco(0,.675,0,.62,10,esc(PAL.verde,1.4));
    B.cilY(0,.78,0,.24,.22,8,PAL.aco);
    // raio: três traços em zigue-zague, gordos o bastante para ler a 24px
    B.boxR(-.10,.30,.63,.46,.19,.10,-0.62,PAL.creme);
    B.boxR( .02,.02,.63,.34,.19,.10, 0.55,PAL.creme);
    B.boxR( .10,-.28,.63,.46,.19,.10,-0.62,PAL.creme);
    return 2.3;
  },
  estouro(B){
    for(let i=0;i<8;i++){ const a=i/8*6.2832,a2=(i+1)/8*6.2832;
      B.tri([1.05,0,0],[.30,Math.cos(a)*.44,Math.sin(a)*.44],[.30,Math.cos(a2)*.44,Math.sin(a2)*.44],PAL.oxido); }
    B.cilX(-.20,0,0,.44,1.00,10,PAL.aco);
    for(let k=0;k<4;k++){ const a=k/4*6.2832;
      B.boxR(-.70,0,0,.42,.10,.10,0,PAL.oxido);
      B.box(-.70,Math.cos(a)*.52,Math.sin(a)*.52,.40,.34,.10,PAL.grafite); }
    B.anel(0,0,0,.86,1.02,16,PAL.ambar);
    return 2.6;
  },
  motor(B){
    B.box(0,0,0,1.10,.86,.94,PAL.aco2);
    B.box(0,.50,0,.94,.20,.80,PAL.aco);
    for(const z of [-.24,.24]) B.cilY(-.18,.72,z,.15,.34,8,PAL.creme);
    B.cilZ(.60,-.14,.56,.34,.30,10,PAL.ambar);
    B.cilZ(.60,-.14,.74,.14,.10,8,PAL.aco);
    B.box(-.66,-.10,0,.24,.50,.70,PAL.grafite);
    return 2.5;
  },
  roda(B){
    const seg=16, ri=.60;
    B.aro(0,0,-.34,.34,1.0,seg,PAL.preto);
    B.anel(0,0,-.34,ri,1.0,seg,esc(PAL.preto,1.7));
    B.anel(0,0,.34,ri,1.0,seg,esc(PAL.preto,1.7));
    B.disco(0,0,.30,ri,seg,PAL.grafite);
    B.anel(0,0,.36,ri*.86,ri,seg,PAL.aco);
    for(let k=0;k<5;k++){ const a=k/5*6.2832;
      B.boxR(Math.cos(a)*.30,Math.sin(a)*.30,.38,.52,.16,.06,a,PAL.creme); }
    B.cilZ(0,0,.40,.14,.10,8,PAL.ambar);
    return 2.3;
  },
  aerofolio(B){
    B.boxR(0,.42,0,1.60,.14,.62,-0.16,PAL.oxido);
    for(const z of [-.52,.52]) B.box(.10,-.10,z,.16,.90,.14,PAL.aco);
    for(const z of [-.80,.80]) B.box(0,.42,z,1.30,.44,.08,PAL.aco2);
    return 2.4;
  },
  trofeu(B){
    for(let i=0;i<12;i++){ const a=i/12*6.2832,a2=(i+1)/12*6.2832;
      const R1=.66,R2=.42;
      B.quad([Math.cos(a)*R1,.62,Math.sin(a)*R1],[Math.cos(a2)*R1,.62,Math.sin(a2)*R1],
             [Math.cos(a2)*R2,-.10,Math.sin(a2)*R2],[Math.cos(a)*R2,-.10,Math.sin(a)*R2],PAL.ouro); }
    B.disco(0,.62,0,.66,12,esc(PAL.ouro,1.4));
    B.cilY(0,-.34,0,.16,.50,8,PAL.ouro);
    B.cilY(0,-.66,0,.62,.22,10,esc(PAL.ouro,.7));
    for(const x of [-1,1]) B.boxR(x*.72,.34,0,.62,.16,.16,x*0.9,PAL.ouro);
    return 2.4;
  },
  cronometro(B){
    B.cilZ(0,0,0,.92,.34,18,PAL.aco2);
    B.disco(0,0,.19,.80,18,PAL.creme);
    B.anel(0,0,.21,.80,.92,18,PAL.aco);
    B.boxR(0,.18,.23,.12,.62,.06,0.5,PAL.oxido);
    B.cilZ(0,0,.24,.10,.06,8,PAL.grafite);
    B.box(0,1.02,0,.30,.22,.26,PAL.aco);
    for(let k=0;k<4;k++){ const a=k/4*6.2832;
      B.boxR(Math.cos(a)*.62,Math.sin(a)*.62,.20,.14,.10,.04,a,PAL.grafite); }
    return 2.4;
  },
  bandeira(B){
    B.cilY(-.86,0,0,.09,2.00,8,PAL.aco);
    for(let i=0;i<4;i++) for(let j=0;j<3;j++){
      const x=-.72+i*.44, y=.86-j*.40;
      B.box(x,y+Math.sin(i*1.1)*.10,0,.44,.40,.07,(i+j)%2?PAL.creme:PAL.grafite);
    }
    return 2.5;
  },
  chave(B){
    B.boxR(0,0,0,1.70,.30,.16,0.6,PAL.aco);
    B.boxR(-.62,.44,0,.52,.52,.18,0.6,PAL.aco);
    B.boxR(-.62,.44,.10,.26,.30,.10,0.6,PAL.grafite);
    B.boxR(0,0,.10,1.50,.22,.14,-0.6,PAL.aco2);
    B.boxR(.66,-.48,.10,.34,.34,.16,-0.6,PAL.ambar);
    return 2.6;
  },
  escudo(B){
    const c=hex("#5AC8E9"), b=hex("#2A6E88"), m=hex("#E9E4DA");
    // brasão: placa larga com bico embaixo
    B.quad([-.86,.95,0],[.86,.95,0],[.86,.10,0],[-.86,.10,0],c);
    B.tri([-.86,.10,0],[.86,.10,0],[0,-1.05,0],c);
    B.quad([-.86,.95,-.22],[.86,.95,-.22],[.86,.10,-.22],[-.86,.10,-.22],b);
    B.tri([.86,.10,-.22],[-.86,.10,-.22],[0,-1.05,-.22],b);
    B.quad([-.86,.95,0],[-.86,.95,-.22],[-.86,.10,-.22],[-.86,.10,0],b);
    B.quad([.86,.95,-.22],[.86,.95,0],[.86,.10,0],[.86,.10,-.22],b);
    B.quad([-.86,.95,0],[.86,.95,0],[.86,.95,-.22],[-.86,.95,-.22],esc(c,1.35));
    B.box(0,.15,.06,.26,1.15,.14,m);
    B.box(0,.52,.06,.90,.26,.14,m);
    return 2.4;
  },
  chassi(B){
    for(const z of [-.52,.52]) B.box(0,0,z,1.80,.16,.16,PAL.aco2);
    for(const x of [-.72,-.24,.24,.72]) B.box(x,0,0,.14,.14,1.16,PAL.aco);
    for(const [x,z] of [[-.80,-.52],[-.80,.52],[.80,-.52],[.80,.52]])
      B.box(x,.24,z,.14,.44,.14,PAL.aco2);
    B.boxR(-.20,.34,0,.90,.12,.90,0.10,PAL.grafite);
    return 2.6;
  },
};

/* Renderiza cada forma uma vez, num canto do canvas, e guarda como PNG. */
/* ALFA EXATO POR DOIS FUNDOS.
   Recortar por cor de chave deixa franja: o antialias mistura o fundo na
   borda, e nenhum limiar separa "meio magenta" de "objeto roxo". A saída é
   desenhar DUAS vezes, sobre magenta e sobre verde. Onde as duas leituras
   batem, é objeto opaco; onde diferem, a diferença É a transparência.
     p = O*(1-t) + fundo*t   →   t = (verde.g - magenta.g)/255
   Depois desfaz a pré-multiplicação para recuperar a cor limpa. */
function gerarIcones(){
  montarPaleta();
  const L=64;
  const c2=document.createElement("canvas"); c2.width=c2.height=L;
  const ctx=c2.getContext("2d");
  const img=ctx.createImageData(L,L);
  const bufM=new Uint8Array(L*L*4), bufV=new Uint8Array(L*L*4);

  gl.useProgram(pObj);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
  gl.uniform1f(loc(pObj,"uNeb"),1e6);
  gl.uniform3f(loc(pObj,"uTinta"),1,1,1);
  gl.uniform1f(loc(pObj,"uAlfa"),1);
  gl.uniform1f(loc(pObj,"uAlfa"),1);

  for(const nome of Object.keys(FORMAS)){
    const B=new M();
    const recuo=FORMAS[nome](B);
    const malha=subir(B);

    // 3/4 de cima, igual à garagem, para o ícone parecer o mesmo mundo
    const olho=[recuo*.62, recuo*.52, recuo*.78];
    const desenha=(cr,cg,cb,destino)=>{
      gl.viewport(0,0,L,L);
      gl.clearColor(cr,cg,cb,1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(loc(pObj,"uP"),false,m4p(0.72,1,.1,60));
      gl.uniformMatrix4fv(loc(pObj,"uV"),false,m4look(olho,[0,0,0],[0,1,0]));
      gl.uniformMatrix4fv(loc(pObj,"uM"),false,m4pose(0,0,0,0));
      gl.uniform3fv(loc(pObj,"uEye"),new Float32Array(olho));
      gl.bindVertexArray(malha.vao);
      gl.drawArrays(gl.TRIANGLES,0,malha.n);
      gl.readPixels(0,0,L,L,gl.RGBA,gl.UNSIGNED_BYTE,destino);
    };
    desenha(1,0,1,bufM);      // magenta
    desenha(0,1,0,bufV);      // verde

    for(let y=0;y<L;y++) for(let x=0;x<L;x++){
      const o=((L-1-y)*L+x)*4, d=(y*L+x)*4;      // WebGL lê de baixo pra cima
      const t=cl((bufV[o+1]-bufM[o+1])/255,0,1); // quanto de fundo entrou
      const a=1-t;
      if(a<=0.004){ img.data[d+3]=0; continue; }
      // magenta é (255,0,255): VERMELHO e azul recebem fundo, verde não.
      // Corrigir só o azul deixava franja rosa sobre fundo claro.
      img.data[d]  =cl((bufM[o]  -255*t)/a,0,255);
      img.data[d+1]=cl( bufM[o+1]     /a,0,255);
      img.data[d+2]=cl((bufM[o+2]-255*t)/a,0,255);
      img.data[d+3]=Math.round(a*255);
    }
    ctx.putImageData(img,0,0);
    ICONE[nome]=c2.toDataURL("image/png");
  }
  gl.enable(gl.BLEND);
  gl.clearColor(0,0,0,1);
}
