"use strict";
/* ══════════════════════════════════════════════════════════════════════════
   GEOMETRIA — construtor de malha e carro paramétrico
   ══════════════════════════════════════════════════════════════════════════ */
class M{
  constructor(){this.p=[];this.n=[];this.c=[];}
  tri(a,b,c,col){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;
    nx/=l;ny/=l;nz/=l;
    for(const v of[a,b,c]){this.p.push(v[0],v[1],v[2]);this.n.push(nx,ny,nz);this.c.push(col[0],col[1],col[2]);}}
  quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col);}
  boxR(cx,cy,cz,sx,sy,sz,ang,col){const co=Math.cos(ang),si=Math.sin(ang),hx=sx/2,hy=sy/2,hz=sz/2;
    const P=(a,b,c)=>[cx+a*co-b*si,cy+a*si+b*co,cz+c];
    const v=[P(-hx,-hy,-hz),P(hx,-hy,-hz),P(hx,hy,-hz),P(-hx,hy,-hz),
             P(-hx,-hy,hz),P(hx,-hy,hz),P(hx,hy,hz),P(-hx,hy,hz)];
    this.quad(v[4],v[5],v[6],v[7],col);this.quad(v[1],v[0],v[3],v[2],col);
    this.quad(v[0],v[1],v[5],v[4],col);this.quad(v[3],v[7],v[6],v[2],col);
    this.quad(v[1],v[2],v[6],v[5],col);this.quad(v[0],v[4],v[7],v[3],col);}
  box(cx,cy,cz,sx,sy,sz,col){this.boxR(cx,cy,cz,sx,sy,sz,0,col);}
  cilX(cx,cy,cz,r,len,seg,col){const x0=cx-len/2,x1=cx+len/2;
    for(let i=0;i<seg;i++){const a0=i/seg*6.2832,a1=(i+1)/seg*6.2832;
      const p0=[cy+Math.cos(a0)*r,cz+Math.sin(a0)*r],p1=[cy+Math.cos(a1)*r,cz+Math.sin(a1)*r];
      this.quad([x0,p0[0],p0[1]],[x1,p0[0],p0[1]],[x1,p1[0],p1[1]],[x0,p1[0],p1[1]],col);}}
  cilY(cx,cy,cz,r,len,seg,col){const y0=cy-len/2,y1=cy+len/2;
    for(let i=0;i<seg;i++){const a0=i/seg*6.2832,a1=(i+1)/seg*6.2832;
      const p0=[cx+Math.cos(a0)*r,cz+Math.sin(a0)*r],p1=[cx+Math.cos(a1)*r,cz+Math.sin(a1)*r];
      this.quad([p0[0],y0,p0[1]],[p0[0],y1,p0[1]],[p1[0],y1,p1[1]],[p1[0],y0,p1[1]],col);
      this.tri([cx,y1,cz],[p0[0],y1,p0[1]],[p1[0],y1,p1[1]],col);}}
  cilZ(cx,cy,cz,r,len,seg,col){const z0=cz-len/2,z1=cz+len/2;
    for(let i=0;i<seg;i++){const a0=i/seg*6.2832,a1=(i+1)/seg*6.2832;
      const p0=[cx+Math.cos(a0)*r,cy+Math.sin(a0)*r],p1=[cx+Math.cos(a1)*r,cy+Math.sin(a1)*r];
      this.quad([p0[0],p0[1],z0],[p0[0],p0[1],z1],[p1[0],p1[1],z1],[p1[0],p1[1],z0],col);}
    this.disco(cx,cy,z1,r,seg,col);this.disco(cx,cy,z0,r,seg,col);}
  aro(cx,cy,z0,z1,r,seg,col){for(let i=0;i<seg;i++){const a0=i/seg*6.2832,a1=(i+1)/seg*6.2832;
    const p0=[cx+Math.cos(a0)*r,cy+Math.sin(a0)*r],p1=[cx+Math.cos(a1)*r,cy+Math.sin(a1)*r];
    this.quad([p0[0],p0[1],z0],[p0[0],p0[1],z1],[p1[0],p1[1],z1],[p1[0],p1[1],z0],col);}}
  anel(cx,cy,z,ri,ro,seg,col){for(let i=0;i<seg;i++){const a0=i/seg*6.2832,a1=(i+1)/seg*6.2832;
    const c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1);
    this.quad([cx+c0*ri,cy+s0*ri,z],[cx+c0*ro,cy+s0*ro,z],[cx+c1*ro,cy+s1*ro,z],[cx+c1*ri,cy+s1*ri,z],col);}}
  disco(cx,cy,z,r,seg,col){for(let i=0;i<seg;i++){const a0=i/seg*6.2832,a1=(i+1)/seg*6.2832;
    this.tri([cx,cy,z],[cx+Math.cos(a0)*r,cy+Math.sin(a0)*r,z],[cx+Math.cos(a1)*r,cy+Math.sin(a1)*r,z],col);}}
}

function nrm(P){let a=cl(P.tHood,.10,.50),b=Math.max(a+.05,P.tWs),c=Math.max(b+.05,P.tRoof),
  d=Math.min(Math.max(c+.05,P.tDeck),.95); c=Math.min(c,d-.04);b=Math.min(b,c-.04);a=Math.min(a,b-.04);
  return{a,b,c,d};}
function teto(P,t,S){const nose=Math.max(P.ride+.06,P.hoodH-P.noseDrop),{a,b,c,d}=S;
  if(t<a)return lerp(nose,P.hoodH,suave(t/a));
  if(t<b)return lerp(P.hoodH,Math.max(P.hoodH+.05,P.roofH),suave((t-a)/(b-a)));
  if(t<c)return Math.max(P.hoodH+.05,P.roofH);
  if(t<d)return lerp(Math.max(P.hoodH+.05,P.roofH),P.deckH,suave((t-c)/(d-c)));
  return lerp(P.deckH,P.deckH+(P.ducktail||0),suave((t-d)/(1-d)));}
function meiaLarg(P,t){let s=1;
  s-=P.noseTaper*Math.pow(cl((0.26-t)/0.26,0,1),1.7);
  s-=P.tailTaper*Math.pow(cl((t-0.74)/0.26,0,1),1.7);
  s+=P.flare*gauss(t,P.axF,.075)+P.flare*gauss(t,P.axR,.075);
  return Math.max(.07,(P.width*.5)*s);}

/* Carro: seção de 12 pontos com LINHA DE CINTURA e arco de roda — as duas
   coisas que fazem a malha ler como carro em vez de cunha maciça. */
function construirCarro(P){
  const B=new M(), S=nrm(P), L=P.length;
  const corpo=hex(P.colBody), acc=hex(P.colAcc);
  const vidro=[.020,.030,.042], sob=esc(corpo,.16), grade=[.030,.036,.044];
  const pneu=[.0135,.0145,.0165], fundoAro=[.028,.032,.038], metal=esc(acc,.85), saia=esc(corpo,.42);
  const RF=P.wheelR, RR=P.wheelR*(P.rearRatio||1);
  const arco=t=>{let a=0;for(const[ax,R]of[[P.axF,RF],[P.axR,RR]]){
    const u=Math.abs(t-ax)/((R*1.16)/L); if(u<1)a=Math.max(a,Math.sqrt(1-u*u)*R*1.05);} return a;};

  const N=48, sec=[];
  for(let i=0;i<N;i++){
    const t=i/(N-1), x=L*.5-t*L;
    const yb=Math.max(P.ride-(t<.10?.020*(1-t/.10):0), arco(t));
    const yt=Math.max(yb+.16, teto(P,t,S)), hw=meiaLarg(P,t);
    const yBelt=cl(P.hoodH*.90, yb+.10, yt-.02), gh=Math.max(0,yt-yBelt);
    const ghw=Math.max(.04, hw*(1-P.tumble*cl(gh/.34,0,1))), sh=Math.min(.055,gh*.42);
    const ch=Math.max(.006,Math.min(P.chamfer,hw*.38,ghw*.38,(yBelt-yb)*.40,Math.max(.01,gh-sh)*.55));
    sec.push({x,yb,yt,hw,ghw,yBelt,sh,ch,t,gh});
  }
  const anelS=s=>[[s.x,s.yb,-s.hw*.90+s.ch],[s.x,s.yb+s.ch,-s.hw*.90],[s.x,s.yBelt,-s.hw],
    [s.x,s.yBelt+s.sh,-s.ghw],[s.x,s.yt-s.ch,-s.ghw],[s.x,s.yt,-s.ghw+s.ch],
    [s.x,s.yt,s.ghw-s.ch],[s.x,s.yt-s.ch,s.ghw],[s.x,s.yBelt+s.sh,s.ghw],
    [s.x,s.yBelt,s.hw],[s.x,s.yb+s.ch,s.hw*.90],[s.x,s.yb,s.hw*.90-s.ch]];

  for(let i=0;i<N-1;i++){
    const A=anelS(sec[i]),Bv=anelS(sec[i+1]);
    const tm=(sec[i].t+sec[i+1].t)*.5, gm=(sec[i].gh+sec[i+1].gh)*.5;
    for(let e=0;e<12;e++){const e2=(e+1)%12; let col;
      if(e===11) col=sob;
      else if(e===0||e===10) col=saia;
      else if((e===3||e===7)&&gm>.055) col=vidro;
      else if(e===5&&((tm>S.a&&tm<S.b)||(tm>S.c&&tm<S.d))) col=vidro;
      else col=corpo;
      B.quad(A[e],A[e2],Bv[e2],Bv[e],col);}
  }
  /* ── as duas pontas ──────────────────────────────────────────────────
     Antes as duas eram um leque de triângulos numa cor quase preta: um treco
     escuro e chapado na frente e na traseira, sem nada que dissesse "carro".

     O conserto tem três partes, e a primeira é a que mais rende:
       1. a tampa é PINTADA da cintura para cima. Capô e tampa de porta-malas
          são chapa pintada em qualquer carro do mundo; só o para-choque e a
          grade é que são escuros.
       2. lanterna e farol. É o que faz uma traseira ler como traseira mesmo
          de longe — a cor passa de 1 de propósito, para o tonemap acender.
       3. para-choque como FAIXA, não como metade do carro. */
  /* 1,7 e não 2,7 no vermelho: o tonemap ACES lava cor muito acima de 1 em
     direção ao branco, e a lanterna saía rosa. Brilhante o bastante para
     acender, baixo o bastante para continuar vermelha. */
  const lanterna=[1.7,.16,.12], farol=[2.6,2.5,2.3], parachoque=esc(corpo,.22);

  const tampa=(s,fl)=>{
    const r=anelS(s), cy=(s.yb+s.yBelt)/2;
    for(let e=0;e<12;e++){
      const e2=(e+1)%12;
      // altura média da aresta decide se ali é chapa pintada ou para-choque
      const alt=(r[e][1]+r[e2][1])*0.5;
      const col = alt > s.yBelt*0.86 ? corpo : (alt > s.yb+0.10 ? grade : parachoque);
      fl ? B.tri([s.x,cy,0],r[e2],r[e],col) : B.tri([s.x,cy,0],r[e],r[e2],col);
    }
  };
  tampa(sec[0],false); tampa(sec[N-1],true);

  /* ── padrão ──
     Desenhado 8 mm acima da chapa para não brigar no z-buffer, e seguindo a
     mesma seção do corpo — assim ele acompanha a curva do carro em vez de
     parecer adesivo plano. */
  const pad=PADROES[P.pattern|0];
  if(pad && pad.f){
    const cor=acc, ergue=0.008;
    for(let i=0;i<N-1;i++){
      const a=sec[i], b=sec[i+1];
      const alto=(s2)=>Math.max(s2.yt, s2.yBelt);
      if(pad.f==="centro" || (pad.f==="capo" && (a.t<0.30||a.t>0.86))){
        // faixa dupla sobre o teto e o capô, no eixo do carro
        for(const off of (pad.f==="centro"?[-0.16,0.16]:[-0.20,0.20])){
          const la=Math.min(a.ghw,a.hw)*0.55, lb=Math.min(b.ghw,b.hw)*0.55;
          B.quad([a.x, alto(a)+ergue, off*la*2-la*0.34],
                 [b.x, alto(b)+ergue, off*lb*2-lb*0.34],
                 [b.x, alto(b)+ergue, off*lb*2+lb*0.34],
                 [a.x, alto(a)+ergue, off*la*2+la*0.34], cor);
        }
      }
      if(pad.f==="cintura"){
        // tudo abaixo da linha de cintura na cor de detalhe: dois tons
        for(const sg of [-1,1]){
          B.quad([a.x, a.yBelt, sg*(a.hw+ergue)],
                 [b.x, b.yBelt, sg*(b.hw+ergue)],
                 [b.x, b.yb+b.ch, sg*(b.hw*0.90+ergue)],
                 [a.x, a.yb+a.ch, sg*(a.hw*0.90+ergue)], cor);
        }
      }
    }
  }

  /* Luzes e para-choque ficam um dedo FORA da tampa: coplanar com ela brigaria
     no z-buffer e piscaria conforme o ângulo. */
  /* Lente clara dentro de um aro escuro, e quase encostada na chapa. Sem o aro
     e sobressaindo demais, viravam dois tijolos brancos colados no carro —
     lâmpada precisa de moldura para ler como lâmpada. */
  const luzes=(s,sinal,cor,largF,altF)=>{
    const hw=s.hw, y=cl(s.yBelt-0.05, s.yb+0.14, s.yt-0.10);
    const lz=hw*largF, ly=hw*altF;
    for(const sg of [-1,1]){
      const z=sg*hw*0.58;
      B.box(s.x+sinal*0.018, y, z, 0.030, ly*1.34, lz*1.20, esc(corpo,.16));  // aro
      B.box(s.x+sinal*0.034, y, z, 0.022, ly,      lz,      cor);             // lente
    }
  };
  // traseira: lanterna larga e baixa, que é o desenho que se lê no retrovisor
  luzes(sec[N-1], -1, lanterna, 0.46, 0.20);
  // frente: farol um pouco menor
  luzes(sec[0],    1, farol,    0.38, 0.19);

  const faixaChoque=(s,sinal)=>{
    const x=s.x+sinal*0.02, hw=s.hw;
    const y=cl(s.yb+0.11, s.yb+0.05, s.yBelt-0.04);
    B.box(x, y, 0, 0.05, 0.13, hw*1.72, parachoque);
  };
  faixaChoque(sec[N-1],-1); faixaChoque(sec[0],1);

  /* Escapamento: dois canos saindo por baixo da traseira. Detalhe pequeno, mas
     é o que tira o ar de "caixa cortada" da parte de baixo. */
  {
    const s=sec[N-1], hw=s.hw;
    for(const sg of [-1,1])
      B.cilX(s.x-0.06, s.yb+0.055, sg*hw*0.42, 0.045, 0.16, 7, esc(metal,.72));
  }

  /* A roda sai do corpo e vira malha própria, em raio 1 e centrada na origem.
     Assada dentro do corpo ela não tinha como girar — e carro com roda parada
     lê como maquete. Aqui ela é desenhada 4 vezes, com giro e esterço. */
  /* DUAS malhas de roda, uma por lado, em vez de espelhar por escala.
     Escala negativa inverte o determinante da matriz: a normal vira ao
     contrário E o gl_FrontFacing também, então a correção de face dupla se
     anula e o lado esquerdo saía cinza-chapado enquanto o direito ficava
     preto. Construir os dois é mais barato que acertar isso no shader. */
  const seg=18, ri=.62, cubo=.16, meia=P.wheelW*.5;
  const fazRoda=(sinal)=>{
    const W=new M(), fora=sinal*meia;          // face decorada para fora
    W.aro(0,0,-meia,meia,1,seg,pneu);
    W.anel(0,0,-meia,ri,1,seg,esc(pneu,1.5));
    W.anel(0,0, meia,ri,1,seg,esc(pneu,1.5));
    W.disco(0,0,fora-sinal*.02,ri,seg,fundoAro);
    W.anel(0,0,fora-sinal*.035,ri*.87,ri,seg,metal);
    const ns=Math.max(3,Math.round(P.spokes)), raioCor=esc(metal,.78);
    for(let k=0;k<ns;k++){const ang=k/ns*6.2832, rr=ri*.47;
      W.boxR(Math.cos(ang)*rr, Math.sin(ang)*rr, fora-sinal*.032, ri*.80, ri*.17,.05,ang,raioCor);}
    W.cilZ(0,0,fora-sinal*.03,cubo,.06,10,metal);
    return W;
  };
  const W=fazRoda(1), Wesq=fazRoda(-1);
  const posRodas=[];
  for(const [t,R,frente] of [[P.axF,RF,true],[P.axR,RR,false]]){
    const x=L*.5-t*L, hw=meiaLarg(P,t);
    for(const sg of [-1,1])
      // lado espelha a malha: o aro e os raios só existem numa face, e sem
      // espelhar a roda esquerda mostrava o lado liso pra fora
      posRodas.push({x, y:R, z:sg*(hw+.022-P.wheelW*.5), r:R, frente, lado:sg});
  }

  const w=P.wing|0;
  if(w>0){const tw=.92,xw=-L*.5+(w===1?.16:.34),hwT=meiaLarg(P,tw),dk=teto(P,tw,S);
    if(w===1) B.boxR(xw,dk+.04,0,.26,.06,hwT*1.80,-0.20,acc);
    else{const h=w===2?.20:.32, span=hwT*2*(w===2?.94:1.02), chord=w===2?.28:.36;
      for(const s of[-1,1]) B.box(xw+.03,dk+h/2,s*span*.32,.075,h,.06,metal);
      B.boxR(xw,dk+h,0,chord,.042,span,-0.19,acc);
      if(w===3) for(const s of[-1,1]) B.box(xw,dk+h+.045,s*span*.5,chord*.95,.13,.032,metal);}}

  const en=P.engine|0;
  if(en>0){const te=Math.min(S.a*.62,.24), xe=L*.5-te*L, ye=teto(P,te,S);
    if(en===1) B.boxR(xe,ye+.055,0,.72,.12,P.width*.34,0.06,esc(corpo,.7));
    if(en===2){B.box(xe,ye+.10,0,.62,.20,P.width*.36,metal);
      for(let k=-1;k<=1;k+=2)for(let j=-1;j<=1;j+=2) B.cilY(xe+k*.17,ye+.28,j*P.width*.11,.055,.20,10,esc(acc,1.1));}
    if(en===3){B.box(xe,ye+.13,0,.66,.26,P.width*.32,esc(metal,.75));
      B.cilZ(xe,ye+.30,0,.13,P.width*.34,12,metal);
      B.box(xe-.05,ye+.44,0,.34,.10,P.width*.26,esc(acc,1.05));}}

  const cano=esc(metal,.62);
  for(const s of[-1,1]) B.cilX(-L*.5+.09,P.ride+.045,s*P.width*.17,.044,.32,10,cano);
  return { corpo:B, roda:W, rodaEsq:Wesq, posRodas, escape:[-L*.5+.02, P.ride+.05, P.width*.17] };
}
