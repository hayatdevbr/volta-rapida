"use strict";
/* ══════════════════════════════════════════════════════════════════════════
   LOOP DE DESENHO
   ══════════════════════════════════════════════════════════════════════════ */
gl.enable(gl.DEPTH_TEST);
let acum=0, ultimo=performance.now();
function redim(){const r=Math.min(devicePixelRatio||1,2);
  const w=Math.max(1,innerWidth*r|0),h=Math.max(1,innerHeight*r|0);
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}}

function desenhar(malha,M4){
  gl.bindVertexArray(malha.vao);
  gl.uniformMatrix4fv(gl.getUniformLocation(pObj,"uM"),false,M4);
  gl.drawArrays(gl.TRIANGLES,0,malha.n);
}

function quadro(agora){
  const dt=Math.min(.05,(agora-ultimo)/1000); ultimo=agora;
  if(tela==="corrida") lerGamepad();
  redim();
  // toda a cena nasce no framebuffer do pós-processamento; a tela de verdade
  // só recebe o resultado do passe de acabamento, em acabarPos()
  comecarPos();
  gl.viewport(0,0,cv.width,cv.height);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
  gl.useProgram(pFundo);
  gl.uniform1f(gl.getUniformLocation(pFundo,"uLuz"),
    tela==="corrida" ? (PISOS[estado.piso]||PISOS.asfalto).ceu : 1.0);
  const tomCeu = tela!=="corrida" ? [1,1,1]
    : estado.piso==="chuva" ? [.62,.72,.92]      // cinza-azulado de chuva
    : estado.piso==="terra" ? [1.10,.98,.82]     // poeira quente
    : [1,1,1];
  gl.uniform3f(gl.getUniformLocation(pFundo,"uCeu"),tomCeu[0],tomCeu[1],tomCeu[2]);
  gl.bindVertexArray(vazio); gl.drawArrays(gl.TRIANGLES,0,3);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true);

  correrIdleDeFundo();
  /* O pátio anda mesmo quando a câmera está noutro lugar. Só a corrida o
     interrompe — lá o carro está na pista, não no pátio. */
  if(tela!=="corrida" && tela!=="mapa" && mapa) passoMapa(dt);

  const asp=cv.width/cv.height;
  let proj, vista, olho, neb=140;

  if(tela==="corrida"&&corrida){
    acum+=dt;
    let it=0; while(acum>=DT && it++<260){ passoCorrida(); acum-=DT; }
    const p=corrida.pilotos[0], spd=Math.hypot(p.vx,p.vz);
    /* Câmera atrás do carro PROMETE controle. No Automático você não controla
       nada, e a câmera mentia — o que talvez fosse a causa real de o modo
       parecer fraco. Assistindo, ela sobe e afasta: mostra os oito carros e as
       diferenças, que é o conteúdo de um modo sem intervenção. */
    const vendo=corrida.auto;
    const dist=(vendo? 15.0 : 9.4)+spd*(vendo?0.05:0.085);
    const alt =(vendo? 11.5 : 3.4)+spd*(vendo?0.030:0.016);
    /* A câmera sobe junto com o carro. Sem isto ela ficaria no nível do mar e
       o carro sumiria atrás dos morros na subida. */
    const alvo=[p.x-Math.cos(p.h)*dist, alt+(p.y||0), p.z-Math.sin(p.h)*dist];
    if(!corrida.cam) corrida.cam=alvo.slice();
    const cola = vendo ? 0.06 : 0.0016;   // de cima, seguir grudado embrulha
    for(let i=0;i<3;i++) corrida.cam[i]=lerp(corrida.cam[i],alvo[i],1-Math.pow(cola,dt));
    olho=corrida.cam;
    // o turbo abre o ângulo e treme a câmera: sem isso o turbo é só uma
    // barra descendo, e ele precisa ser SENTIDO
    const kick=(p.turbando?1:0);
    corrida.kick=lerp(corrida.kick||0,kick,1-Math.pow(0.004,dt));
    proj=m4p(0.80+cl(spd/120,0,.22)+corrida.kick*0.16,asp,.15,420);
    if(corrida.kick>0.02){
      const a=corrida.kick*0.16;
      olho[0]+=(Math.random()-.5)*a; olho[1]+=(Math.random()-.5)*a; olho[2]+=(Math.random()-.5)*a;
    }
    // mira um pouco à frente do carro: é o que dá sensação de estar indo pra algum lugar
    vista=m4look(olho,[p.x+Math.cos(p.h)*(vendo?7.0:4.5), 0.95+(p.y||0),
                       p.z+Math.sin(p.h)*(vendo?7.0:4.5)],[0,1,0]);
    /* Esvazia a fila que a simulação encheu. `while` e não `for`, para a fila
       ficar vazia mesmo se o quadro atrasar e vierem vários de uma vez. */
    while(corrida.sons.length){
      const ev=corrida.sons.shift();
      sfx(ev);
      /* A chegada não é uma tela, é um acontecimento — `irPara` nunca é
         chamado ali. Então a troca de faixa pendura no mesmo evento que a
         simulação já anuncia, e a camada de desenho decide o que ele
         significa: tocar o toque E trocar a música. */
      if(ev==="chegada") tocarMusica("chegada");
    }
    motorSom(cl(spd/corrida.at.vmax,0,1), (teclas.arrowup||teclas.w)?1:0.2);
    /* O canto do pneu sai do deslize que a física já calcula: a diferença
       entre para onde o carro aponta e para onde ele de fato vai. */
    const dir=Math.atan2(p.vz,p.vx);
    let dif=dir-p.h; while(dif>Math.PI)dif-=6.2832; while(dif<-Math.PI)dif+=6.2832;
    const desliza=cl(Math.abs(dif)*(spd>6?1:0)*1.7,0,1);
    ambienteSom(desliza, cl(spd/corrida.at.vmax,0,1), p.naPista===false, estado.piso);
  } else if(tela==="mapa"){
    passoMapa(dt);   // com a câmera em cima dele
    const eu=mapa.carros[0];
    if(!mapa.cam) mapa.cam=[eu.x,eu.z];
    const k=1-Math.pow(0.0025,dt);
    mapa.cam[0]=lerp(mapa.cam[0],eu.x,k); mapa.cam[1]=lerp(mapa.cam[1],eu.z,k);
    const alt=165*mapa.zoom;   // enquadra a zona quase inteira: com a camera baixa a tela ficava vazia
    olho=[mapa.cam[0], alt, mapa.cam[1]+alt*0.60];
    proj=m4p(0.72,asp,.5,900); neb=420;
    vista=m4look(olho,[mapa.cam[0],0,mapa.cam[1]],[0,1,0]);
  } else {
    if(girando) camAng+=dt*0.26;
    const estreito=asp<0.85 ? 1.62 : asp<1.2 ? 1.18 : 1;
    const dist=camDist*estreito;
    olho=[Math.sin(camAng)*Math.cos(0.28)*dist, Math.sin(0.28)*dist+.55, Math.cos(camAng)*Math.cos(0.28)*dist];
    proj=m4p(0.72,asp,.1,300); neb=120;
    // com a gaveta ocupando a parte de baixo, o alvo desce para o carro
    // aparecer na faixa que sobrou em cima
    const estreita = innerWidth<=1000 || (asp>1 && innerHeight<=560);
    const gaveta = tela==="garagem" && innerHeight>innerWidth && estreita;
    const painel = tela==="garagem" && innerWidth>innerHeight && estreita;
    /* Deitado o painel toma 47% da direita e o carro ficava metade escondido.
       Em vez de deslizar a câmera — que me obrigou a acertar uma distância na
       mão, e errei —, desloco o eixo óptico na própria projeção: a área livre
       fica centrada em x = -0.47 no espaço de recorte, e essa conta não
       depende de distância, abertura nem proporção de tela.
       O sinal é positivo porque o termo multiplica z do olho, que é negativo
       olhando para -Z: x_ndc acaba somando -s. Medi antes de acreditar. */
    if(painel) proj[8] = 0.45;
    vista=m4look(olho,[0,gaveta?-2.0:.62,0],[0,1,0]);
    // costura de teste: é por aqui que a bancada lê o enquadramento em números
    // em vez de julgar por foto. Custa um if por quadro e já pagou por si.
    if(window.__sonda) window.__sonda(proj,vista,painel);
  }

  gl.useProgram(pObj);
  gl.uniformMatrix4fv(gl.getUniformLocation(pObj,"uP"),false,proj);
  gl.uniformMatrix4fv(gl.getUniformLocation(pObj,"uV"),false,vista);
  gl.uniform3fv(gl.getUniformLocation(pObj,"uEye"),new Float32Array(olho));
  gl.uniform1f(gl.getUniformLocation(pObj,"uNeb"),neb);
  gl.uniform3f(gl.getUniformLocation(pObj,"uTinta"),1,1,1);

  if(tela==="corrida"&&corrida){
    desenhar(malhaPista,m4pose(0,0,0,0));
    if(malhaCenario) desenhar(malhaCenario,m4pose(0,0,0,0));
    // nuvens fora da névoa: a névoa do chão as comeria
    if(malhaNuvens){
      gl.uniform1f(gl.getUniformLocation(pObj,"uNeb"),1e6);
      desenhar(malhaNuvens,m4pose(0,0,0,0));
      gl.uniform1f(gl.getUniformLocation(pObj,"uNeb"),neb);
    }
    // marcas de pneu escurecendo o asfalto — a simulação sempre as anotou,
    // e nenhum quadro as desenhava
    desenharMarcas(corrida.marcas, proj, vista);
    // sombra de contato de todo mundo: carro, caixa. No voo ela fica no chão
    // e encolhe — é ela que conta a altura do salto.
    comecarSombras(proj,vista);
    for(const p of corrida.pilotos){
      const chaoS=pista.pontos[p.seg]?pista.pontos[p.seg].y:0;
      const alt=Math.max(0,(p.y||0)-chaoS);
      const k=1/(1+alt*0.22);
      desenharSombra(p.x, chaoS+0.05, p.z, -p.h, 2.65*k, 1.75*k);
    }
    for(const cx of corrida.caixas)
      if(!(cx.volta>0)) desenharSombra(cx.x,(cx.y||0)+0.06,cx.z,0,1.15,1.15);
    acabarSombras();
    for(const g of corrida.perigos){
      const vida=cl(1-(corrida.t-g.t)/14,0,1);
      // a mancha deita no chão: X->X, Y->Z, Z(espessura)->Y
      const e=0.6+vida*0.6;
      desenhar(malhaMancha,new Float32Array([e,0,0,0, 0,0,e,0, 0,e,0,0,
               g.x, (g.y||0)+0.05, g.z, 1]));
    }
    // a caixa cicla pelas cores dos itens: comunica sozinha que o que vem
    // de dentro é sorteio, em vez de ser sempre a mesma estrela laranja
    const paleta=Object.values(ITENS).map(it=>hex(it.cor));
    for(const cx of corrida.caixas){
      if(cx.volta>0) continue;
      // módulo SEMPRE positivo: corrida.t começa em -3,2 na contagem
      // regressiva e cx.x é negativo em metade da pista. O % do JavaScript
      // preserva o sinal, então paleta[índice negativo] era undefined e a
      // corrida explodia no primeiro quadro.
      const n=paleta.length;
      const f=(((corrida.t*0.8+cx.x*0.05)%n)+n)%n;
      const c0=paleta[Math.floor(f)], c1=paleta[(Math.floor(f)+1)%n], k=f%1;
      gl.uniform3f(gl.getUniformLocation(pObj,"uTinta"),
        lerp(c0[0],c1[0],k)*2.2, lerp(c0[1],c1[1],k)*2.2, lerp(c0[2],c1[2],k)*2.2);
      desenhar(malhaCaixa,m4pose(cx.x,(cx.y||0)+2.0+Math.sin(corrida.t*2.4+cx.x)*0.26,
                                 cx.z,corrida.t*2.1,0.82));
      gl.uniform3f(gl.getUniformLocation(pObj,"uTinta"),1,1,1);
    }
    // escudo em volta de quem está protegido
    for(const p of corrida.pilotos){
      if(!(p.escudo>0)) continue;
      const pulso=1+Math.sin(corrida.t*9)*0.05;
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);       // aditiva: campo de força, não pedra
      gl.uniform1f(gl.getUniformLocation(pObj,"uAlfa"),0.10+Math.sin(corrida.t*6)*0.035);
      gl.depthMask(false);
      desenhar(malhaEscudo,m4pose(p.x,0.95,p.z,corrida.t*1.2, 1.95*pulso));
      gl.depthMask(true);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(gl.getUniformLocation(pObj,"uAlfa"),1);
    }
    for(const m of corrida.misseis)
      desenhar(malhaMissil,m4pose(m.x,m.y,m.z,-m.h,1.5));
    passoBrasas(corrida,dt);
    desenharBrasas(corrida,vista);
    if(corrida.misseis.length){
      // rastro do míssil, também como luz
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
      const uT=gl.getUniformLocation(pObj,"uTinta"), uA=gl.getUniformLocation(pObj,"uAlfa");
      for(const m of corrida.misseis) for(const g of m.rastro){
        const k=cl(1-g.t/0.7,0,1);
        gl.uniform3f(uT, 2.6*k+.3, .9*k*k+.15, .25*k*k);
        gl.uniform1f(uA, .07+k*.22);
        desenhar(malhaBrilho, billboard(g.x,g.y,g.z, .22+(1-k)*.52, vista));
      }
      gl.uniform3f(uT,1,1,1); gl.uniform1f(uA,1);
      gl.depthMask(true); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    /* O anel de efeito é LUZ, não pedra: desenhado opaco ele virava um disco
       pálido tapando a pista inteira no clarão do tranco. Aditivo, ele soma
       brilho e some — que é o que um clarão faz. */
    if(corrida.efeitos.length){
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
      gl.uniform1f(gl.getUniformLocation(pObj,"uAlfa"),0.6);
      for(const e of corrida.efeitos){
        const v=(corrida.t-e.t)/0.75, r=e.raio*(0.25+v*1.5), br=(1-v)*(1-v);
        gl.uniform3f(gl.getUniformLocation(pObj,"uTinta"),e.cor[0]*br,e.cor[1]*br,e.cor[2]*br);
        desenhar(malhaAnel,new Float32Array([r,0,0,0, 0,0,r,0, 0,r,0,0, e.x,0.35,e.z,1]));
      }
      gl.uniform3f(gl.getUniformLocation(pObj,"uTinta"),1,1,1);
      gl.uniform1f(gl.getUniformLocation(pObj,"uAlfa"),1);
      gl.depthMask(true);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    corrida.pilotos.forEach((p,i)=>{
      const m=i===0?malhaCarro:malhaRival[(i-1)%malhaRival.length];
      desenharCarro(m,m4pose(p.x,p.y||0,p.z,-p.h), p.giroRoda||0, (p.dir||0)*0.5);
      if(p.turbando && Math.random()<.8) soltarBrasa(corrida,m,p);

    });
    // a chuva cai por último: é cortina, fica na frente de tudo
    if(estado.piso==="chuva" && malhaChuva)
      desenharChuva(proj,vista,olho,corrida.t+10);
  } else if(tela==="mapa"){
    desenhar(malhaChao,m4pose(0,0,0,0));
    if(malhaNuvens){
      gl.uniform1f(gl.getUniformLocation(pObj,"uNeb"),1e6);
      desenhar(malhaNuvens,m4pose(0,0,0,0));
      gl.uniform1f(gl.getUniformLocation(pObj,"uNeb"),neb);
    }
    comecarSombras(proj,vista);
    for(const c of mapa.carros) desenharSombra(c.x,0.06,c.z,-c.h,5.6,3.8);
    acabarSombras();
    mapa.cargas.forEach(g=>{
      const idade=mapa.t-g.nasceu;
      const pulso=1.05+Math.sin(mapa.t*3.4+g.x)*0.18;
      const nascendo=cl(idade*2.5,0,1);
      desenhar(malhaPoco,m4pose(g.x,0,g.z,mapa.t*1.1,pulso*nascendo*1.7));
    });
    mapa.carros.forEach((c,i)=>{
      const m=c.meu?malhaCarro:malhaRival[i%malhaRival.length];
      c.giroRoda=(c.giroRoda||0)+dt*c.vel*1.6;
      desenharCarro(m,m4pose(c.x,0,c.z,-c.h,2.1), c.giroRoda, 0);
    });
    // seta em cima do meu carro: sem isto não dá pra achar quem é você
    const eu=mapa.carros[0];
    // o anel é construído no plano XY, então deita no chão com uma pose própria
    // deita o anel: X do modelo -> X do mundo, Y do modelo -> Z do mundo,
    // e Z do modelo (a espessura) -> Y do mundo. Trocar as duas últimas fazia
    // o anel virar duas lascas de pé.
    const g=1+mapa.brilho*0.35, ang=mapa.t*0.9, ca=Math.cos(ang)*g, sa=Math.sin(ang)*g;
    desenhar(malhaSeta,new Float32Array([ca,0,sa,0, -sa,0,ca,0, 0,g,0,0, eu.x,0.10,eu.z,1]));
  } else {
    // a sombra ancora o carro da vitrine: sem ela, ele flutua no céu
    comecarSombras(proj,vista);
    desenharSombra(0,-0.012,0,0,2.7,1.8);
    acabarSombras();
    desenharCarro(malhaCarro,m4pose(0,0,0,0),0,0);
  }

  acabarPos();
  atualizarHUD();
  requestAnimationFrame(quadro);
}
