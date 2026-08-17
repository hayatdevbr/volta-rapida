"use strict";
function prepararCarro(P){
  const c=construirCarro(P);
  return { corpo:subir(c.corpo), roda:subir(c.roda), rodaEsq:subir(c.rodaEsq),
           posRodas:c.posRodas, escape:c.escape };
}
/* Uma malha POR HABITANTE: cada um montou o carro dele. Antes eram três cores
   da build do JOGADOR, e o dono viu na hora que eram todos o mesmo carro. */
function reconstruirRivais(){
  malhaRival.length=0;
  for(const h of (corrida&&corrida.povo ? corrida.povo : escalar(GRID-1, 4242))){
    const g={...G_BASE, colBody:h.cor, colAcc:h.acc, pattern:h.padrao};
    for(const k of ["chassi","motor","rodas","aero"]) Object.assign(g, PECAS[k][h.build[k]].g);
    malhaRival.push(prepararCarro(g));
  }
}
function reconstruirCarro(){
  malhaCarro=prepararCarro(montar());
  if(!malhaRival.length) reconstruirRivais();
}

/* ── PARTÍCULAS DO TURBO ──────────────────────────────────────────────────
   Um cone fixo no escapamento não lê como velocidade: ele anda junto com o
   carro, então a vista não tem nada se mexendo em relação a ele. Partícula
   que NASCE no escapamento e FICA PARA TRÁS mostra o quanto se está andando.
   Cada uma é um cubinho que encolhe e esfria de laranja para cinza. */
function soltarBrasa(c,m,p){
  const [ex,ey,ez]=m.escape;
  const cs=Math.cos(-p.h), sn=Math.sin(-p.h);
  const vel=Math.hypot(p.vx,p.vz);
  for(const lado of [-1,1]){
    const lz=ez*lado;
    c.brasas.push({
      x:p.x + ex*cs + lz*sn,
      y:ey + (Math.random()-.5)*.12,
      z:p.z - ex*sn + lz*cs,
      // sai para trás do carro e espalha um pouco
      vx:-Math.cos(p.h)*(4+vel*.10) + (Math.random()-.5)*1.6,
      vz:-Math.sin(p.h)*(4+vel*.10) + (Math.random()-.5)*1.6,
      vy:.25+Math.random()*.75,
      t:0, vida:.20+Math.random()*.16, giro:0,
    });
  }
}
function passoBrasas(c,dt){
  for(const b of c.brasas){
    b.t+=dt;
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt;
    b.vy-=2.4*dt; b.vx*=1-1.8*dt; b.vz*=1-1.8*dt;
    b.giro+=dt*5;
  }
  c.brasas=c.brasas.filter(b=>b.t<b.vida && b.y>0);
}
function desenharBrasas(c,vista){
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);      // aditiva: luz soma, não tapa
  gl.depthMask(false);
  const uT=gl.getUniformLocation(pObj,"uTinta"), uA=gl.getUniformLocation(pObj,"uAlfa");
  for(const b of c.brasas){
    /* Nitro queima AZUL. O núcleo sai branco-ciano estourado — valor bem
       acima de 1 para o tonemap saturar e virar brilho — e esfria para azul
       profundo antes de sumir. */
    const k=1-b.t/b.vida;
    const q=cl(k*k*1.7,0,1);                 // o quanto ainda está quente
    // azul de nitro: verde e azul altos, vermelho quase nada, e o miolo
    // recém-saído puxa para o branco
    gl.uniform3f(uT, .05+q*q*.55, .30+q*.75, .95+q*.65);
    gl.uniform1f(uA, .035+q*.085);
    desenhar(malhaBrilho, billboard(b.x,b.y,b.z, .13+(1-k)*.22, vista));
  }
  gl.uniform3f(uT,1,1,1); gl.uniform1f(uA,1);
  gl.depthMask(true);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

/* ── anéis de efeito: é o que torna item visível ── */
/* O plano do jogador só vale para o carro DELE, e só no Automático. Mexe em
   três coisas, que é o que dá para explicar numa tela sem virar planilha:
   quanto arrisca na curva, quando gasta o nitro, e se guarda item para o fim. */
function temperar(ent, p, c){
  if(!c.auto || p!==c.pilotos[0]) return ent;
  const g=estado.plano;
  // agressão: entra mais forte na curva, e freia mais tarde
  /* "Seguro" tem de trocar velocidade por NÃO ERRAR, não ser simplesmente
     lento: com 0,86 no acelerador e freio a cada esterço médio, o carro
     terminava em último e o plano virava castigo. */
  const k=[0.97,1.00,1.08][g.agressao] ?? 1;
  ent.acel=cl(ent.acel*k,0,1);
  if(g.agressao===0){
    /* TIRA O PÉ, não freia. Freio no meio da curva desestabiliza, e o plano
       "seguro" saía MAIS da pista que o arriscado — 8,2% contra 3,1%, medido.
       Aliviar o acelerador é suave e faz o que o rótulo promete.
       (Mexer no ganho da direção também foi tentado e é pior: mais ganho
       oscila — a mesma lição do controlador da IA, aprendida duas vezes.) */
    if(Math.abs(ent.dir)>0.45) ent.acel=cl(ent.acel*0.55,0,1);
  }
  if(g.agressao===2){
    if(ent.freio && Math.abs(ent.dir)<0.45) ent.freio=false;   // segura o freio
  }
  /* `mao` é FREIO DE MÃO — corta a aderência para 30%. Eu estava puxando o
     freio de mão achando que era o nitro, e o carro do jogador terminava em
     último nos três planos. O nitro é `turbo`. */
  const faseFinal = p.volta>=VOLTAS-1;
  const largada   = c.t<9;
  /* O MEIO tem de ser neutro — exatamente a IA dos rivais, sem tempero. Antes
     ele ainda restringia o nitro (>35 contra >28 da IA base) e o carro do
     jogador ficava de saída um pouco pior que todo mundo. Plano do meio que
     penaliza é armadilha: o jogador escolhe "normal" e perde por isso. */
  if(g.nitro!==1){
    const podeGastar = g.nitro===0 ? (faseFinal && p.nitro>40)
                                   : (largada || p.nitro>55);
    // o plano decide QUANDO gastar; onde gastar continua com a IA, que sabe
    // que nitro em curva fechada é nitro jogado fora
    ent.turbo = ent.turbo && podeGastar;
    if(g.nitro===2 && largada && (p.nitro||0)>20) ent.turbo=true;
  }
  return ent;
}

function efeito(c,p,tipo){
  const cores={turbo:[3.0,1.6,.4], oleo:[.9,.8,.5], tranco:[3.0,1.0,.6],
               estouro:[3.4,.8,.3], reparo:[.7,2.4,1.9], escudo:[.5,2.2,3.2],
               batida:[2.4,2.4,2.6]};
  c.efeitos.push({x:p.x,z:p.z,t:c.t,cor:cores[tipo]||cores.batida,
                  raio: tipo==="estouro"?11:tipo==="tranco"?7:5});
  /* A simulação ANOTA o que aconteceu; quem toca é a camada de desenho.
     Chamar `sfx` daqui fazia `passoCorrida` depender do áudio — e ele tem de
     rodar no servidor, sem tela nenhuma. A bancada pegou isso na hora.

     Só o que acontece COM VOCÊ entra na fila: oito carros disparando item
     viraria pipoca, e o som perderia a informação que carrega — que aquilo
     aconteceu com você. */
  if(p===c.pilotos[0]) c.sons.push(tipo);
}

/* ── matrizes ── */
function m4mul(a,b){const o=new Float32Array(16);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)
    o[i*4+j]=a[j]*b[i*4]+a[4+j]*b[i*4+1]+a[8+j]*b[i*4+2]+a[12+j]*b[i*4+3];
  return o;}
function m4rodaLocal(w,giro,esterco){
  const cz=Math.cos(giro), sz=Math.sin(giro);
  const cy=Math.cos(esterco), sy=Math.sin(esterco);
  // escala (r,r,1) · giro em Z · esterço em Y · translação
  const r=w.r;
  const a=new Float32Array([ cz*r,sz*r,0,0,  -sz*r,cz*r,0,0,  0,0,1,0,  0,0,0,1]);
  const b=new Float32Array([ cy,0,-sy,0,  0,1,0,0,  sy,0,cy,0,  w.x,w.y,w.z,1]);
  return m4mul(b,a);
}
function desenharCarro(m,pose,giro,esterco){
  desenhar(m.corpo,pose);
  for(const w of m.posRodas)
    desenhar(w.lado<0 ? m.rodaEsq : m.roda,
             m4mul(pose, m4rodaLocal(w,giro,w.frente?esterco:0)));
}
function reconstruirPista(){
  malhaPista=subir(construirPista(pista, estado.piso));
  malhaCenario=subir(construirCenario(pista, estado.piso));
}
function construirChao(){
  /* O PÁTIO É O MUNDO — e até aqui ele era um gramado xadrez com meia dúzia
     de bosques, enquanto toda a identidade do jogo (guindaste, container,
     torre de água) morava só no cenário da corrida. Agora a zona é um pátio
     de verdade: chão batido e gasto no miolo onde os carros rodam, o anel da
     zona marcado no chão (a regra "a zona rende um total fixo" ganha um
     desenho), e o ferro-velho em volta, feito com as MESMAS peças da pista. */
  const B=new M(), r=semente(31);

  // chão: terra batida no miolo esmaecendo para grama suja — tons próximos,
  // porque contraste forte redesenha a grade que a gente veio tirar
  const terra=[hex("#4A3E2C"),hex("#463A2A"),hex("#4E4230"),hex("#443826")];
  const grama=[hex("#2C3822"),hex("#293520"),hex("#303C24"),hex("#273220")];
  const L=560, P=80, w=L*2/P;   // mancha de ~14 m: menor que isso vira ruído,
                                // maior vira o xadrez que a gente veio tirar
  for(let i=-P/2;i<P/2;i++) for(let j=-P/2;j<P/2;j++){
    const x0=i*w, z0=j*w;
    const d=Math.hypot(x0+w/2, z0+w/2);
    // a fronteira terra→grama é irregular de propósito: círculo perfeito
    // leria como campo de futebol, não como pátio gasto
    const borda=195+Math.sin(Math.atan2(z0,x0)*3+1.2)*26+r()*20;
    const t=(d<borda ? terra : grama)[Math.floor(r()*4)];
    B.quad([x0,-.02,z0],[x0+w,-.02,z0],[x0+w,-.02,z0+w],[x0,-.02,z0+w],t);
  }
  // o anel da zona: a linha que diz "aqui dentro a carga nasce"
  {
    const am=[.42,.28,.07], seg=64;
    for(let i=0;i<seg;i++){
      const a0=i/seg*6.2832, a1=(i+1)/seg*6.2832;
      if(i%4===3) continue;                       // tracejado
      const R0=ZONA.raio-0.5, R1=ZONA.raio+0.5;
      B.quad([Math.cos(a0)*R0,.02,Math.sin(a0)*R0],[Math.cos(a0)*R1,.02,Math.sin(a0)*R1],
             [Math.cos(a1)*R1,.02,Math.sin(a1)*R1],[Math.cos(a1)*R0,.02,Math.sin(a1)*R0],am);
    }
  }

  /* o ferro-velho em volta da zona: as peças da fábrica compartilhada, num
     anel entre a borda da zona e o mato. Voltadas para dentro, porque pátio
     é lugar de trabalho, não fachada. */
  const p=pecasDeCenario(B,r);
  for(let k=0;k<34;k++){
    const a=k/34*6.2832+r()*0.12, d=ZONA.raio+26+r()*62;
    const x=Math.cos(a)*d, z=Math.sin(a)*d, ang=a+1.5708+(r()-.5)*.5;
    const sorte=r();
    if(sorte<.12)      p.guindaste(x,z,ang);
    else if(sorte<.36) p.container(x,z,ang, 1+Math.floor(r()*3));
    else if(sorte<.54) p.carcacas(x,z,ang);
    else if(sorte<.62) p.torreAgua(x,z);
    else if(sorte<.70) p.posto(x,z,ang);
    else if(sorte<.82) p.muroPneu(x,z,ang);
    else               p.torreLuz(x,z);
  }

  // vegetação EM BOSQUES, além do ferro-velho: espalhar uniforme lê como
  // grama de golfe, e aglomerado é o que dá desenho ao terreno de cima
  for(let b=0;b<22;b++){
    const ab=r()*6.2832, db=ZONA.raio+120+Math.sqrt(r())*330;
    const bx=Math.cos(ab)*db, bz=Math.sin(ab)*db;
    const quantos=4+Math.floor(r()*14);
    for(let k=0;k<quantos;k++){
      const a=r()*6.2832, d=Math.sqrt(r())*46;
      const x=bx+Math.cos(a)*d, z=bz+Math.sin(a)*d;
      const q=r();
      if(q<.55) p.arvore(x,z,.9+r()*.7);
      else if(q<.82) p.pedra(x,z);
      else p.feno(x,z,r()*3.14);
    }
  }
  malhaChao=subir(B);
}

/* ── sombra de contato ────────────────────────────────────────────────────
   Um carro sem sombra flutua — era o que dava o ar de maquete. A sombra é um
   disco radial desenhado com mistura MULTIPLICATIVA: escurece o que já está
   no chão, forte no centro e neutra na borda, então não precisa de alfa nem
   deixa quadrado duro. No salto ela fica no chão e encolhe: é ela que conta
   a altura do voo. */
function construirSombra(){
  /* Cor POR VÉRTICE, não por triângulo: o M.tri pinta chapado, e chapado num
     degradê radial vira dente de serra — que no multiply lia como estrela.
     Aqui os arrays são preenchidos na mão para o esvaecimento ser contínuo. */
  const B=new M(), seg=26, aneis=6;
  // núcleo largo (expoente alto): sombra tímida não ancora nada
  const fator=t=>lerp(0.34,1.0,Math.pow(cl(t,0,1),2.2));
  const põe=(a,rr)=>{
    B.p.push(Math.cos(a)*rr,0,Math.sin(a)*rr);
    B.n.push(0,1,0);
    const g=fator(rr); B.c.push(g,g,g*1.03);
  };
  for(let i=0;i<seg;i++){
    const a0=i/seg*6.2832, a1=(i+1)/seg*6.2832;
    for(let j=0;j<aneis;j++){
      const r0=j/aneis, r1=(j+1)/aneis;
      põe(a0,r0); põe(a1,r1); põe(a1,r0);
      põe(a0,r0); põe(a0,r1); põe(a1,r1);
    }
  }
  malhaSombra=subir(B);
}
// pose deitada com escala anisotrópica: sombra é elipse, não círculo
function m4deitado(x,y,z,ang,sx,sz){
  const c=Math.cos(ang), s=Math.sin(ang);
  return new Float32Array([c*sx,0,-s*sx,0, 0,1,0,0, s*sz,0,c*sz,0, x,y,z,1]);
}

/* ── nuvens ───────────────────────────────────────────────────────────────
   Caixas achatadas em aglomerados, bem alto e bem longe. Cor acima de 1 para
   o tonemap dar o brilho de nuvem ao sol. São desenhadas com a névoa
   desligada — a névoa do chão as comeria e o céu voltaria a ser vazio. */
function construirNuvens(){
  const B=new M(), r=semente(77);
  for(let k=0;k<12;k++){
    const a=r()*6.2832, d=260+r()*720;
    const x=Math.cos(a)*d, z=Math.sin(a)*d, y=58+r()*44, esc2=1+r()*1.7;
    const nb=3+Math.floor(r()*4);
    for(let j=0;j<nb;j++){
      const c= j? [1.04,1.06,1.10] : [1.16,1.18,1.24];
      B.box(x+(r()-.5)*30*esc2, y+(r()-.5)*5, z+(r()-.5)*18*esc2,
            (15+r()*17)*esc2, 3.5+r()*3, (9+r()*9)*esc2, c);
    }
  }
  malhaNuvens=subir(B);
}

/* ── chuva que CAI ────────────────────────────────────────────────────────
   O piso "chuva" escurecia o céu e molhava a física, mas não chovia — e
   chuva sem chuva é só um dia feio. Fios em lâminas cruzadas num bloco em
   volta da câmera, desenhados duas vezes com deslocamento vertical animado:
   o bloco recicla e a chuva nunca acaba. Aditiva, bem discreta. */
function construirChuva(){
  const B=new M(), r=semente(55), c=[0.30,0.38,0.50];
  for(let i=0;i<240;i++){
    const x=(r()-.5)*58, z=(r()-.5)*58, y=r()*26;
    const l=1.4+r()*1.0, t=0.16;    // leve inclinação de vento
    B.quad([x-0.025,y,z],[x+0.025,y,z],[x+0.025+t,y+l,z],[x-0.025+t,y+l,z],c);
    B.quad([x,y,z-0.025],[x,y,z+0.025],[x+t,y+l,z+0.025],[x+t,y+l,z-0.025],c);
  }
  malhaChuva=subir(B);
}

/* ── marcas de pneu, finalmente desenhadas ───────────────────────────────
   A simulação SEMPRE anotou as marcas (c.marcas) e nenhum quadro jamais as
   desenhou — sistema invisível não existe, diz a lei da casa. Buffer
   dinâmico: um retângulo por marca, orientado pelo rumo do carro, escurecendo
   o chão por mistura multiplicativa e esvaindo com o tempo. */
let marcasDin=null;
function desenharMarcas(marcas, proj, vista){
  if(!marcas || !marcas.length) return;
  if(!marcasDin){
    const MAX=900;
    const vao=gl.createVertexArray(); gl.bindVertexArray(vao);
    const bp=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,bp);
    gl.bufferData(gl.ARRAY_BUFFER, MAX*18*4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
    const bc=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,bc);
    gl.bufferData(gl.ARRAY_BUFFER, MAX*18*4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,3,gl.FLOAT,false,0,0);
    gl.bindVertexArray(null);
    marcasDin={vao,bp,bc,pos:new Float32Array(MAX*18),cor:new Float32Array(MAX*18),MAX};
  }
  const M2=marcasDin; let q=0;
  for(const m of marcas){
    if(q>=M2.MAX) break;
    const cs=Math.cos(m.h), sn=Math.sin(m.h);
    const tx=cs*0.62, tz=sn*0.62, nx=-sn*0.20, nz=cs*0.20;
    const y=(m.y||0)+0.035, o=q*18;
    M2.pos.set([m.x-tx-nx,y,m.z-tz-nz, m.x+tx-nx,y,m.z+tz-nz, m.x+tx+nx,y,m.z+tz+nz,
                m.x-tx-nx,y,m.z-tz-nz, m.x+tx+nx,y,m.z+tz+nz, m.x-tx+nx,y,m.z-tz+nz], o);
    // marca nova escurece forte; esvaindo, o fator volta a 1 e ela some
    const g=lerp(1,0.42,cl(m.v,0,1));
    for(let k=0;k<6;k++){ M2.cor[o+k*3]=g; M2.cor[o+k*3+1]=g; M2.cor[o+k*3+2]=g*1.04; }
    q++;
  }
  gl.useProgram(pCru);
  gl.uniformMatrix4fv(gl.getUniformLocation(pCru,"uP"),false,proj);
  gl.uniformMatrix4fv(gl.getUniformLocation(pCru,"uV"),false,vista);
  gl.uniformMatrix4fv(gl.getUniformLocation(pCru,"uM"),false,m4pose(0,0,0,0));
  gl.uniform1f(gl.getUniformLocation(pCru,"uAlfa"),1);
  gl.bindVertexArray(M2.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,M2.bp);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,M2.pos,0,q*18);
  gl.bindBuffer(gl.ARRAY_BUFFER,M2.bc);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,M2.cor,0,q*18);
  gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
  gl.depthMask(false);
  gl.drawArrays(gl.TRIANGLES,0,q*6);
  gl.depthMask(true);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(pObj);
}

/* sombras dos carros e caixas, num passe só: multiplicativa como as marcas.
   Usam o pCru — a sombra é um FATOR de escurecimento, não uma superfície com
   luz; passar pelo sombreamento lavaria o fator com ambiente e névoa. */
function comecarSombras(proj,vista){
  gl.useProgram(pCru);
  gl.uniformMatrix4fv(gl.getUniformLocation(pCru,"uP"),false,proj);
  gl.uniformMatrix4fv(gl.getUniformLocation(pCru,"uV"),false,vista);
  gl.uniform1f(gl.getUniformLocation(pCru,"uAlfa"),1);
  gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
  gl.depthMask(false);
  gl.bindVertexArray(malhaSombra.vao);
}
function desenharSombra(x,y,z,ang,sx,sz){
  gl.uniformMatrix4fv(gl.getUniformLocation(pCru,"uM"),false,m4deitado(x,y,z,ang,sx,sz));
  gl.drawArrays(gl.TRIANGLES,0,malhaSombra.n);
}
function acabarSombras(){
  gl.depthMask(true);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(pObj);
}

/* a cortina de chuva, em dois blocos reciclando na vertical */
function desenharChuva(proj,vista,olho,t){
  gl.useProgram(pCru);
  gl.uniformMatrix4fv(gl.getUniformLocation(pCru,"uP"),false,proj);
  gl.uniformMatrix4fv(gl.getUniformLocation(pCru,"uV"),false,vista);
  gl.uniform1f(gl.getUniformLocation(pCru,"uAlfa"),0.55);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.depthMask(false);
  gl.bindVertexArray(malhaChuva.vao);
  const desloca=-((t*17)%26);
  for(const dy of [desloca, desloca+26]){
    gl.uniformMatrix4fv(gl.getUniformLocation(pCru,"uM"),false,
      new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, olho[0],dy,olho[2],1]));
    gl.drawArrays(gl.TRIANGLES,0,malhaChuva.n);
  }
  gl.depthMask(true);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(pObj);
}
function construirMissil(){
  const B=new M(), corpo=hex("#C8CDD2"), faixa=hex("#D2604A"), aleta=hex("#2A323A");
  for(let i=0;i<8;i++){ const a=i/8*6.2832,a2=(i+1)/8*6.2832;
    B.tri([1.5,0,0],[.55,Math.cos(a)*.34,Math.sin(a)*.34],
                    [.55,Math.cos(a2)*.34,Math.sin(a2)*.34],faixa); }
  B.cilX(-.10,0,0,.34,1.30,10,corpo);
  B.cilX(.30,0,0,.35,.26,10,faixa);
  for(let k=0;k<4;k++){ const a=k/4*6.2832;
    B.box(-.78,Math.cos(a)*.44,Math.sin(a)*.44,.52,.46,.10,aleta); }
  malhaMissil=subir(B);
}
function construirEscudo(){
  // casca facetada: lê como campo de força e some por dentro com alfa baixo
  const B=new M(), c=[.20,1.9,3.0];
  const seg=12, anel=5;
  for(let j=0;j<anel;j++){
    const f0=(j/anel-0.5)*Math.PI, f1=((j+1)/anel-0.5)*Math.PI;
    const y0=Math.sin(f0), y1=Math.sin(f1), r0=Math.cos(f0), r1=Math.cos(f1);
    for(let i=0;i<seg;i++){
      const a0=i/seg*6.2832, a1=(i+1)/seg*6.2832;
      B.quad([Math.cos(a0)*r0,y0,Math.sin(a0)*r0],[Math.cos(a1)*r0,y0,Math.sin(a1)*r0],
             [Math.cos(a1)*r1,y1,Math.sin(a1)*r1],[Math.cos(a0)*r1,y1,Math.sin(a0)*r1], c);
    }
  }
  malhaEscudo=subir(B);
}
function construirChama(){
  /* LUZ, NÃO CUBO. Partícula sólida continua parecendo caixinha por mais que
     se pinte de azul. O que lê como luz é um leque radial que nasce claro no
     centro e MORRE em preto na borda, desenhado com mistura aditiva: soma no
     que já está na tela em vez de tapar, que é o que a luz faz.
     A queda suave vem da própria geometria — sem textura, como o resto. */
  const B=new M(), seg=28, aneis=6;
  // queda em seis anéis com curva quadrática: com dois, o degrau de cor
  // aparecia como raio de roda em volta da luz
  const bri=t=>{const v=Math.pow(1-t,2.1); return [v,v,v];};
  for(let i=0;i<seg;i++){
    const a0=i/seg*6.2832, a1=(i+1)/seg*6.2832;
    for(let j=0;j<aneis;j++){
      const r0=j/aneis, r1=(j+1)/aneis;
      const c0=bri(r0), c1=bri(r1);
      const A=[Math.cos(a0)*r0,Math.sin(a0)*r0,0], Bp=[Math.cos(a1)*r0,Math.sin(a1)*r0,0];
      const C=[Math.cos(a1)*r1,Math.sin(a1)*r1,0], D=[Math.cos(a0)*r1,Math.sin(a0)*r1,0];
      B.tri(A,Bp,C,c0); B.tri(A,C,D,c1);
    }
  }
  malhaBrilho=subir(B);
}

/* Matriz que faz o leque olhar sempre para a câmera. Sem isso ele vira uma
   folha de papel de perfil e some. */
function billboard(x,y,z,tam,vista){
  const dx=vista[0]*tam, dy=vista[4]*tam, dz=vista[8]*tam;    // direita da câmera
  const ux=vista[1]*tam, uy=vista[5]*tam, uz=vista[9]*tam;    // cima da câmera
  return new Float32Array([dx,dy,dz,0, ux,uy,uz,0, 0,0,1,0, x,y,z,1]);
}
function construirAnel(){
  const B=new M(), c=[1,1,1];
  B.anel(0,0,0,.80,1,30,c);
  malhaAnel=subir(B);
}
function construirCaixa(){
  const B=new M(), a=[1,1,1], b=[.55,.55,.55];
  // octaedro: gira bonito e lê de longe
  const r=1.5, h=1.9;
  for(let i=0;i<4;i++){
    const a0=i/4*6.2832+0.785, a1=(i+1)/4*6.2832+0.785;
    const p0=[Math.cos(a0)*r,0,Math.sin(a0)*r], p1=[Math.cos(a1)*r,0,Math.sin(a1)*r];
    B.tri([0,h,0],p0,p1,a); B.tri([0,-h*0.6,0],p1,p0,b);
  }
  malhaCaixa=subir(B);
}
function construirMancha(){
  const B=new M(), c=[.030,.024,.016];
  B.disco(0,0,0,3.2,14,c);
  malhaMancha=subir(B);
}
function construirSeta(){
  const B=new M(), am=[2.4,1.35,.30];
  // anel no chão em volta do carro: de cima, isto lê na hora; um cone vira
  // um pentágono chapado e não ajuda ninguém
  B.anel(0,0,0,5.4,6.6,26,am);
  for(let k=0;k<3;k++){                       // três marcas maiores no anel
    const a=k/3*6.2832;
    B.boxR(Math.cos(a)*6.9,Math.sin(a)*6.9,0,2.0,.9,.01,a,am);
  }
  malhaSeta=subir(B);
}
function construirPoco(){
  const B=new M(), am=[1.6,.95,.22];
  B.cilY(0,1.1,0,.55,2.2,7,am);
  B.disco(0,2.2,0,.55,7,esc(am,1.4));
  B.box(0,.12,0,2.6,.24,2.6,[.12,.10,.05]);
  malhaPoco=subir(B);
}
