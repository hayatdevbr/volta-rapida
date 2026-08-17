"use strict";

/* ── CENÁRIO ──────────────────────────────────────────────────────────────
   Pista sozinha no vazio não tem escala nem velocidade: sem nada passando do
   lado, 200 km/h parece 40. O cenário é o que dá referência — e é onde o
   low-poly rende mais por triângulo, porque forma boa em silhueta não precisa
   de detalhe nenhum.

   Cada piso tem o seu mundo: autódromo, rali de montanha, circuito urbano. */

/* Serra no horizonte: picos facetados num anel longe de tudo. A névoa os
   transforma em silhueta azulada — é o que fecha o mundo em vez de deixar o
   chão terminar no céu. Compartilhada entre a corrida e o pátio idle. */
function serraNoHorizonte(B, r, tom, quantos, d0, d1){
  for(let k=0;k<quantos;k++){
    const ang=k/quantos*6.2832+r()*0.35, dist=d0+r()*(d1-d0);
    const x=Math.cos(ang)*dist, z=Math.sin(ang)*dist;
    const picos=2+Math.floor(r()*2), rM=95+r()*85;
    for(let p2=0;p2<picos;p2++){
      const px=x+(r()-.5)*rM, pz=z+(r()-.5)*rM;
      const hh=(24+r()*30)*(0.6+r()*0.5), rr=rM*(0.5+r()*0.4);
      const lados=5, cor=esc(tom,0.85+r()*0.35);
      for(let q2=0;q2<lados;q2++){
        const a0=q2/lados*6.2832, a1=(q2+1)/lados*6.2832;
        // base BEM abaixo do terreno: colina nenhuma pode abrir fresta no pé
        B.tri([px,hh,pz],
              [px+Math.cos(a0)*rr,-6,pz+Math.sin(a0)*rr],
              [px+Math.cos(a1)*rr,-6,pz+Math.sin(a1)*rr], cor);
      }
    }
  }
}
/* ── as peças, numa FÁBRICA compartilhada ────────────────────────────────
   O pátio idle (construirChao, em efeitos.js) usa as MESMAS peças do
   cenário de corrida: guindaste, container, torre de água. Antes elas viviam
   presas dentro de construirCenario e o pátio era um gramado vazio — o mundo
   do jogo é UM ferro-velho, e ele tem de ser o mesmo nas duas câmeras. */
function pecasDeCenario(B,r){
  const arvore=(x,z,esc)=>{
    const h=(5+r()*4)*esc, tronco=hex("#4A3524");
    const folha=r()<.5?hex("#2E5B3A"):hex("#254A31");
    B.cilY(x,h*.30,z,.55*esc,h*.6,6,tronco);
    for(let k=0;k<3;k++){
      const yy=h*(.55+k*.22), rr=(2.6-k*.7)*esc;
      for(let i=0;i<6;i++){ const a=i/6*6.2832,a2=(i+1)/6*6.2832;
        B.tri([x,yy+2.2*esc,z],[x+Math.cos(a)*rr,yy,z+Math.sin(a)*rr],
              [x+Math.cos(a2)*rr,yy,z+Math.sin(a2)*rr],folha); }
    }
  };
  const pedra=(x,z)=>{
    const t=1.2+r()*2.2, c=hex(r()<.5?"#5E666E":"#4A5158");
    B.boxR(x,t*.35,z,t*1.6,t*.8,t*1.3,r()*3,c);
  };
  const predio=(x,z,alt)=>{
    const l=9+r()*10, p2=9+r()*10;
    const corpo=hex(["#2A323A","#343E48","#232B33"][Math.floor(r()*3)]);
    B.box(x,alt*.5,z,l,alt,p2,corpo);
    B.box(x,alt+.6,z,l*1.06,1.2,p2*1.06,hex("#1A2028"));
    // janelas acesas: cor alta demais para o tonemap, então brilham
    const jan=[2.4,1.9,.6];
    for(let a=3;a<alt-2;a+=4.5) for(let k=-1;k<=1;k++){
      if(r()<.45) continue;
      B.box(x+l*.51, a, z+k*p2*.28, .12, 1.5, 2.0, jan);
      B.box(x-l*.51, a, z+k*p2*.28, .12, 1.5, 2.0, jan);
    }
  };
  const arquibancada=(x,z,ang)=>{
    const cor=hex("#3A444E"), banco=hex("#8A939B");
    for(let k=0;k<5;k++)
      B.boxR(x - Math.sin(ang)*k*1.5, 1.0+k*1.15, z + Math.cos(ang)*k*1.5,
             26, .9, 1.4, ang, k%2?cor:banco);
    B.boxR(x,.5,z,26,1,7,ang,hex("#232B33"));
  };
  const torreLuz=(x,z)=>{
    B.cilY(x,7,z,.42,14,6,hex("#5E666E"));
    B.box(x,14.6,z,5.5,1.4,1.4,hex("#3A444E"));
    for(let k=-2;k<=2;k++) B.box(x+k*1.15,15.5,z,.9,.7,.9,[3.2,3.0,2.4]);
  };
  const muroPneu=(x,z,ang)=>{
    for(let k=-3;k<=3;k++){
      const px=x+Math.cos(ang)*k*1.7, pz=z+Math.sin(ang)*k*1.7;
      B.cilY(px,.7,pz,.85,1.4,8, k%2?hex("#141A20"):hex("#D2604A"));
    }
  };
  const poste=(x,z,lado)=>{
    B.cilY(x,4.2,z,.22,8.4,6,hex("#5E666E"));
    B.box(x+lado*1.1,8.2,z,2.4,.3,.3,hex("#5E666E"));
    B.box(x+lado*2.1,8.0,z,1.1,.42,.7,[3.0,2.6,1.6]);
  };
  /* ═══ O pátio de ferro-velho ═══════════════════════════════════════
     O circuito é improvisado num pátio grande, traçado com o que havia por
     perto. Estas peças aparecem em TODOS os pisos, porque são a identidade
     do lugar — não decoração de um mapa só. */

  /* Guindaste: a silhueta que mais diz o nome do jogo. Lança inclinada com
     treliça em X, e o disco do eletroímã pendurado num cabo. */
  const guindaste=(x,z,ang)=>{
    const aco=hex("#6B6259"), ferrugem=hex("#8A5A3A"), escuro=hex("#2A323A");
    const co=Math.cos(ang), si=Math.sin(ang);
    B.box(x,1.1,z,7.0,2.2,4.4,escuro);                      // esteira
    B.box(x,3.0,z,4.6,2.0,4.0,ferrugem);                    // corpo
    const bx=6.5, by=13.5;                                  // ponta da lança
    const pe=[x,4.2,z];
    const nos=8;
    for(let k=0;k<nos;k++){
      const t0=k/nos, t1=(k+1)/nos;
      const p0=[pe[0]+co*bx*t0, pe[1]+(by-4.2)*t0, pe[2]+si*bx*t0];
      const p1=[pe[0]+co*bx*t1, pe[1]+(by-4.2)*t1, pe[2]+si*bx*t1];
      const w=0.44-0.16*t0;
      B.box((p0[0]+p1[0])/2,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2, w*2.4, 1.25, w*2.4, aco);
    }
    const px=pe[0]+co*bx, py=by, pz=pe[2]+si*bx;
    B.box(px,py-2.4,pz,.16,4.6,.16,escuro);                 // cabo
    B.cilY(px,py-5.1,pz,1.35,.55,10,hex("#3A444E"));        // eletroímã
  };

  /* Container: empilhado de jeitos diferentes, faz metade de um cenário
     sozinho. As nervuras verticais são o que faz ler como container. */
  const container=(x,z,ang,n)=>{
    const cores=["#3E6B58","#8A4A38","#3A5570","#6B6259","#7A6B3A"];
    for(let k=0;k<n;k++){
      const c=hex(cores[Math.floor(r()*cores.length)]);
      const dx=(r()-.5)*1.1, dz=(r()-.5)*0.6;
      const cy=1.35+k*2.72;
      B.boxR(x+dx,cy,z+dz,6.1,2.6,2.5,ang,c);
      // nervura: quatro vincos no flanco longo
      for(let i=-1;i<=1;i++)
        B.boxR(x+dx+Math.cos(ang)*i*1.7, cy, z+dz+Math.sin(ang)*i*1.7,
               .22,2.4,2.62,ang,esc(c,0.80));
      B.boxR(x+dx,cy+1.32,z+dz,6.2,.12,2.6,ang,esc(c,1.18));
    }
  };

  /* Pilha de carcaças prensadas: o material bruto do pátio. Sem roda, sem
     vidro, achatadas — é o que sobra depois da prensa. */
  const carcacas=(x,z,ang)=>{
    const tons=["#7A3A30","#3A5570","#6B6259","#5A6B3A","#8A6B38"];
    for(let k=0;k<4;k++){
      const c=hex(tons[Math.floor(r()*tons.length)]);
      const a=ang+(r()-.5)*0.7;
      B.boxR(x+(r()-.5)*1.3, .55+k*1.02, z+(r()-.5)*1.3, 4.3, .95, 2.0, a, c);
      B.boxR(x+(r()-.5)*1.3, .55+k*1.02+.52, z+(r()-.5)*1.3, 2.2, .16, 1.9, a, esc(c,0.7));
    }
  };

  /* Torre de água: ponto de referência que se lê de longe, e por isso ajuda
     o jogador a saber em que parte da volta está. */
  const torreAgua=(x,z)=>{
    const perna=hex("#6B6259"), tanque=hex("#8A9099"), teto=hex("#5A4A3A");
    for(const a of [0.79,2.36,3.93,5.50])
      B.cilY(x+Math.cos(a)*2.3, 6.0, z+Math.sin(a)*2.3, .28, 12.0, 5, perna);
    B.box(x,7.4,z,5.2,.34,5.2,perna);                        // cinta
    B.cilY(x,14.2,z,3.1,5.4,10,tanque);
    for(let i=0;i<10;i++){ const a=i/10*6.2832,a2=(i+1)/10*6.2832;
      B.tri([x,18.6,z],[x+Math.cos(a)*3.2,16.9,z+Math.sin(a)*3.2],
                       [x+Math.cos(a2)*3.2,16.9,z+Math.sin(a2)*3.2],teto); }
  };

  /* A ponte foi REMOVIDA a pedido do dono: com o relevo ela nasceu torta —
     pilares em chão de altura diferente, tabuleiro cortando morro — e ponte
     defeituosa é pior que ponte nenhuma. Se voltar um dia, volta como feição
     desenhada da pista (viaduto de verdade), não como enfeite sorteado. */

  /* Posto abandonado: marquise sobre duas colunas, duas bombas e a loja de
     janela fechada com tábua. */
  const posto=(x,z,ang)=>{
    const conc=hex("#8A8375"), col=hex("#6B6259"), loja=hex("#7A6E5E");
    const tabua=hex("#5A4A3A"), bomba=hex("#B0433A");
    B.boxR(x,4.6,z,11.0,.7,7.0,ang,conc);                    // marquise
    for(const s of [-1,1])
      B.boxR(x+Math.cos(ang)*s*3.6, 2.3, z+Math.sin(ang)*s*3.6, .7, 4.6, .7, ang, col);
    for(const s of [-1,1]){
      const bx=x+Math.cos(ang)*s*1.9, bz=z+Math.sin(ang)*s*1.9;
      B.boxR(bx,.9,bz,.9,1.8,1.4,ang,bomba);
      B.boxR(bx,1.9,bz,.7,.4,1.2,ang,hex("#2A323A"));
    }
    const lx=x-Math.sin(ang)*6.4, lz=z+Math.cos(ang)*6.4;
    B.boxR(lx,2.0,lz,7.0,4.0,5.0,ang,loja);
    B.boxR(lx+Math.cos(ang)*0.2, 2.4, lz+Math.sin(ang)*0.2, 3.0, 1.6, 5.1, ang, tabua);
  };

  const feno=(x,z,ang)=>{
    for(let k=-1;k<=1;k++)
      B.cilZ(x+Math.cos(ang)*k*2.4, 1.0, z+Math.sin(ang)*k*2.4, 1.0, 2.0, 8,
             k===0?hex("#D9A62B"):hex("#C9922B"));
  };
  return {arvore,pedra,predio,arquibancada,torreLuz,muroPneu,poste,
          guindaste,container,carcacas,torreAgua,posto,feno};
}

function construirCenario(pista, piso){
  const B=new M(), r=semente(pista.n*7+1);
  const pts=pista.pontos, n=pista.n;
  /* Cada peça é construída no zero e depois levantada até a altura do ponto de
     pista mais próximo — senão árvore e container ficariam enterrados nos
     morros ou flutuando sobre os vales. */
  /* A altura do TERRENO num ponto qualquer do mundo — a mesma conta que o
     carro usa quando sai da pista, e a mesma que o chão desenhado segue.
     Três detalhes, cada um custou um bug:
       1. interpola ao longo do segmento (o ponto mais próximo dá degrau de
          2,4 m, e o carro afundava nele);
       2. usa `yBase`, o chão SEM a rampa — a rampa é estrutura construída, e
          quando o terreno lia a altura dela nascia um platô de barro depois
          do salto, com o carro pousando dentro da terra;
       3. desce pelo avental conforme se afasta: o morro é da pista, não do
          mundo inteiro. */
  const alturaPerto=(x,z)=>{
    let mel=0, md=1e9;
    for(let i=0;i<n;i++){
      const d=(pts[i].x-x)**2+(pts[i].z-z)**2;
      if(d<md){ md=d; mel=i; }
    }
    const p0=pts[mel];
    return alturaChao(pista, mel, x, z, false)
         * quedaDoAvental(Math.sqrt(md), p0.larg);
  };
  const noChao=(f)=>(x,z,...resto)=>{
    const marca=B.p.length;
    f(x,z,...resto);
    const dy=alturaPerto(x,z);
    for(let i=marca+1;i<B.p.length;i+=3) B.p[i]+=dy;
  };
  /* Usado em toda chamada de peça: `por(arvore,x,z,esc)` em vez de
     `arvore(x,z,esc)`. Envolver na chamada é bem menos edição — e menos risco —
     que reescrever a declaração de catorze funções. */
  const por=(f,...a)=>noChao(f)(...a);

  const {arvore,pedra,predio,arquibancada,torreLuz,muroPneu,poste,
         guindaste,container,carcacas,torreAgua,posto,feno}=pecasDeCenario(B,r);

  const passo = piso==="chuva" ? 7 : 5;
  for(let i=0;i<n;i+=passo){
    const p=pts[i];
    const q=pts[(i+3)%n];
    const curva=Math.abs(Math.atan2(q.tz,q.tx)-Math.atan2(p.tz,p.tx));
    for(const lado of [-1,1]){
      const d=p.larg/2 + 12 + r()*22;
      const x=p.x+p.nx*lado*d, z=p.z+p.nz*lado*d;
      const ang=Math.atan2(p.tz,p.tx);
      if(piso==="terra"){
        if(r()<.62) por(arvore,x,z,.9+r()*.6);
        else if(r()<.6) por(pedra,x,z);
        if(curva>.22 && r()<.5) por(feno,p.x+p.nx*lado*(p.larg/2+5), p.z+p.nz*lado*(p.larg/2+5), ang);
      } else if(piso==="chuva"){
        if(r()<.85) por(predio,p.x+p.nx*lado*(p.larg/2+34+r()*22),
                           p.z+p.nz*lado*(p.larg/2+34+r()*22), 14+r()*30);
        if(r()<.5) por(poste,p.x+p.nx*lado*(p.larg/2+5.5), p.z+p.nz*lado*(p.larg/2+5.5), lado);
      } else {
        if(r()<.22) por(arquibancada,x,z,ang);
        else if(r()<.30) por(torreLuz,x,z);
        else if(r()<.45) por(arvore,x,z,.7+r()*.4);
        if(curva>.25 && r()<.55) por(muroPneu,p.x+p.nx*lado*(p.larg/2+5.0),
                                          p.z+p.nz*lado*(p.larg/2+5.0), ang+1.5708);
      }

      /* O pátio de ferro-velho aparece em TODOS os pisos: é o lugar, não a
         decoração de um mapa. Longe da pista, para não virar parede. */
      const dl = p.larg/2 + 26 + r()*30;
      const lx = p.x+p.nx*lado*dl, lz = p.z+p.nz*lado*dl;
      const sorte = r();
      if(sorte<.07)      por(guindaste,lx,lz,ang+(r()-.5)*2);
      else if(sorte<.17) por(container,lx,lz,ang+(r()-.5)*1.4, 1+Math.floor(r()*3));
      else if(sorte<.24) por(carcacas,lx,lz,ang+(r()-.5)*2);
      else if(sorte<.28) por(torreAgua,lx,lz);
      else if(sorte<.31) por(posto,lx,lz,ang);
    }
  }

  /* ── TERRENO ──────────────────────────────────────────────────────────
     O chão de fundo era uma PLACA plana. Com o relevo, no vale a placa
     ficava ACIMA da pista e cortava o buraco como uma lâmina d'água — o
     dono viu "os carros passando por cima de um lago", e era exatamente
     isso. Placa não tem conserto num mundo com altura: o fundo agora é uma
     malha de terreno que segue a pista de perto (a MESMA conta do avental,
     então nunca briga com ele) e vira colina ao longe. */
  {
    const PI2=PISOS[piso]||PISOS.asfalto;
    // 1,0 e 0,62: o campo desbotava rápido demais e lia como morto
    const perto=esc(PI2.grama,1.0), longe=esc(PI2.grama,0.62);
    const seco = piso==="terra" ? [0.155,0.115,0.058]
               : piso==="chuva" ? [0.045,0.060,0.072] : [0.095,0.115,0.062];
    // 20 m e não 27: a célula grande deixava o terreno desviar da conta que o
    // carro usa, e ele afundava no barranco entre um canto e outro
    const cel=20, R=900, NC=Math.round(R*2/cel);
    const alturaT=(x,z)=>{
      let md=1e9, mi=0;
      for(let i=0;i<n;i++){ const d2=(pts[i].x-x)**2+(pts[i].z-z)**2;
        if(d2<md){ md=d2; mi=i; } }
      const d=Math.sqrt(md), mp=pts[mi];
      const base=alturaChao(pista, mi, x, z, false)*quedaDoAvental(d, mp.larg);
      // sob o avental o terreno mergulha meio palmo: coberto, nunca z-briga
      if(d < mp.larg/2+68) return {h:base-0.45, d};
      // colinas: só crescem longe da pista, e a chuva é mais mansa
      const k=cl((d-95)/210,0,1), amp=piso==="chuva"?0.35:1;
      const ond=Math.sin(x*0.0126+2.1)*Math.sin(z*0.0107+0.7)
               +0.55*Math.sin(x*0.0311-1.2)*Math.sin(z*0.0273+2.4);
      return {h:base-0.12 + k*(1.6+ond*3.1)*amp, d};
    };
    const H=[];
    for(let j=0;j<=NC;j++){ H[j]=[];
      for(let i2=0;i2<=NC;i2++) H[j][i2]=alturaT(-R+i2*cel, -R+j*cel); }
    for(let j=0;j<NC;j++) for(let i2=0;i2<NC;i2++){
      const x0=-R+i2*cel, z0=-R+j*cel;
      const a=H[j][i2], b2=H[j][i2+1], c2=H[j+1][i2+1], d3=H[j+1][i2];
      const dm=(a.d+b2.d+c2.d+d3.d)/4, hm=(a.h+b2.h+c2.h+d3.h)/4;
      // o tom escurece com a distância, clareia no alto da colina, e de vez
      // em quando vira mancha seca — é a variação que placa nenhuma tinha
      const t2=cl((dm-80)/320,0,1);
      let tom=[lerp(perto[0],longe[0],t2),lerp(perto[1],longe[1],t2),lerp(perto[2],longe[2],t2)];
      if(r()<0.15) tom=[lerp(tom[0],seco[0],.6),lerp(tom[1],seco[1],.6),lerp(tom[2],seco[2],.6)];
      tom=esc(tom, 1 + cl(hm*0.05,0,0.25) + (r()-0.5)*0.10);
      B.quad([x0,a.h,z0],[x0+cel,b2.h,z0],[x0+cel,c2.h,z0+cel],[x0,d3.h,z0+cel],tom);
    }
    const tomSerra = piso==="chuva" ? [0.050,0.066,0.088]
                   : piso==="terra" ? [0.135,0.110,0.085] : [0.095,0.115,0.150];
    /* A distância da serra conta A PARTIR DA PISTA, não do centro do mundo:
       medida do centro, uma pista larga chegava a 300 m de um pico e ele
       aparecia gigante e sem névoa do lado do traçado — apareceu na chuva. */
    let maxR=0;
    for(let i=0;i<n;i+=3) maxR=Math.max(maxR, Math.hypot(pts[i].x,pts[i].z));
    // +420: a 340 um pico ainda tomava um terço do quadro do lado de lá da
    // volta. Serra é horizonte, não vizinho.
    serraNoHorizonte(B, r, tomSerra, 13, maxR+420, maxR+640);
  }

  /* Tufos de capim e florzinhas na beira: é o que dá vida no close, onde a
     encosta lisa denunciava o low-poly. Três triângulos por tufo. */
  if(piso!=="chuva")
    for(let i=0;i<n;i+=2){
      const p=pts[i];
      for(const lado of [-1,1]){
        if(r()>0.55) continue;
        const dd=p.larg/2+2.5+r()*9;
        const x=p.x+p.nx*lado*dd, z=p.z+p.nz*lado*dd;
        // a MESMA interpolação do avental, senão o tufo flutua na encosta —
        // e pelo chão natural, senão ele sobe na rampa junto com o tabuleiro
        const pyb2=p.yBase!==undefined?p.yBase:p.y;
        const t3=cl((dd-p.larg/2-1.5)/68.5,0,1);
        const y=lerp(pyb2+0.10, pyb2*0.28-0.07, t3);
        const tt=0.25+r()*0.40;
        const cor = r()<0.14
          ? (piso==="terra" ? [0.55,0.42,0.10] : [0.72,0.70,0.58])
          : esc(PISOS[piso].grama, 1.3+r()*0.5);
        for(let k=0;k<3;k++){
          const a=r()*6.2832, dx=Math.cos(a)*tt, dz=Math.sin(a)*tt;
          B.tri([x+dx,y,z+dz],[x-dz*0.3,y+tt*(1.5+r()),z+dx*0.3],[x-dx,y,z-dz],cor);
        }
      }
    }

  return B;
}

/* ── malha da pista: asfalto, meio-fio, encosta, faixas, rampa, largada ── */
function construirPista(pista, nomePiso){
  const B=new M(), PI=PISOS[nomePiso||"asfalto"], r=semente(pista.n*13+5);
  const asf=PI.pista, mf1=[.30,.045,.035], mf2=[.62,.60,.56], gr=PI.grama;
  const pts=pista.pontos, n=pista.n;
  // disco deitado no chão — o `disco` da classe M é vertical, este é o do piso
  const discoChao=(x,y,z,raio,seg,col)=>{
    for(let i=0;i<seg;i++){ const a0=i/seg*6.2832, a1=(i+1)/seg*6.2832;
      B.tri([x,y,z],[x+Math.cos(a1)*raio,y,z+Math.sin(a1)*raio],
            [x+Math.cos(a0)*raio,y,z+Math.sin(a0)*raio],col); }
  };
  /* O avental de grama ACOMPANHA o relevo: a borda interna na altura da
     pista, a externa descendo para o nível base. A versão anterior fixava a
     grama em altura absoluta — a pista subia o morro e virava uma fita
     flutuando sobre um campo plano, que foi exatamente a "pista quebrada"
     que o dono viu. A encosta é da pista, e o cenário pousa na mesma conta
     (alturaPerto, em construirCenario). */
  /* A placa plana de fundo MORREU: num mundo com vale ela ficava acima da
     pista e lia como um lago cortando o buraco. Quem faz o chão agora é o
     terreno de construirCenario, que segue esta mesma conta de avental. */
  const APAVENTAL=70, SOBRA=0.28;

  // cores da estrutura da rampa
  const deckCor = nomePiso==="terra" ? [.16,.11,.055] : esc(asf,1.25);
  const saia=hex("#4A4038"), viga=hex("#2A2622");
  const linhaCor = nomePiso==="terra" ? null : [.70,.68,.62];

  for(let i=0;i<n;i++){
    const p=pts[i], q=pts[(i+1)%n];
    const L=(o,w)=>[o.x+o.nx*w, o.y+.02, o.z+o.nz*w];
    /* `p.rampa>0` e não `p && q`: o segmento que DESCE da beira até o chão
       também é a estrutura da rampa — pintado de asfalto ele lia como um
       tobogã de asfalto no meio do rali. */
    const naRampa = p.rampa>0;
    // o tabuleiro da rampa tem cor própria: o jogador precisa LER de longe
    // que aquilo é uma coisa construída, não um calombo do chão
    B.quad(L(p,-p.larg/2),L(q,-q.larg/2),L(q,q.larg/2),L(p,p.larg/2),
           naRampa ? deckCor : asf);

    if(naRampa){
      // saias laterais até o chão e vigas por baixo: rampa é ARMADA, não morro
      // a saia desce até o CHÃO NATURAL, não até o nível do mar: numa rampa
      // sobre terreno inclinado ela ficava boiando ou enterrada
      const pb=p.yBase||0, qb=q.yBase||0;
      for(const s of[-1,1]){
        const a=L(p,s*p.larg/2), b=L(q,s*q.larg/2);
        B.quad([a[0],p.y+.10,a[2]],[b[0],q.y+.10,b[2]],
               [b[0],qb,b[2]],[a[0],pb,a[2]], saia);
      }
      if(i%2===0)
        for(const s of[-0.4,0.4]){
          const a=L(p,s*p.larg);
          B.box(a[0], (p.y+pb)/2, a[2], .34, Math.max(.2,p.y-pb), .34, viga);
        }
      // listra âmbar na beirada do deck, que é o aviso universal de "salto"
      for(const s of[-1,1]){
        const a=L(p,s*(p.larg/2-0.55)), b=L(q,s*(q.larg/2-0.55));
        B.quad([a[0],p.y+.045,a[2]],[b[0],q.y+.045,b[2]],
               [L(q,s*q.larg/2)[0],q.y+.045,L(q,s*q.larg/2)[2]],
               [L(p,s*p.larg/2)[0],p.y+.045,L(p,s*p.larg/2)[2]],
               (i%2? [1.4,.75,.10] : [.10,.10,.10]));
      }
    } else {
      // meio-fio zebrado dos dois lados
      const cor=(i%6<3)?mf1:mf2;
      for(const s of[-1,1]){
        const a=L(p,s*p.larg/2), b=L(q,s*q.larg/2);
        const a2=L(p,s*(p.larg/2+1.5)), b2=L(q,s*(q.larg/2+1.5));
        a[1]=p.y+.03; b[1]=q.y+.03; a2[1]=p.y+.10; b2[1]=q.y+.10;
        B.quad(a,b,b2,a2,cor);
      }
      /* Faixas pintadas: borda contínua e eixo tracejado. Terra não tem tinta
         — estrada de chão pintada leria como asfalto sujo. É o tipo de
         detalhe que não muda a física em nada e muda a foto inteira. */
      if(linhaCor){
        for(const s of[-1,1]){
          const a=L(p,s*(p.larg/2-0.55)), b=L(q,s*(q.larg/2-0.55));
          const a2=L(p,s*(p.larg/2-0.20)), b2=L(q,s*(q.larg/2-0.20));
          a[1]=p.y+.032; b[1]=q.y+.032; a2[1]=p.y+.032; b2[1]=q.y+.032;
          B.quad(a,b,b2,a2,linhaCor);
        }
        if(i%6<3){
          const a=L(p,-0.18), b=L(q,-0.18), a2=L(p,0.18), b2=L(q,0.18);
          a[1]=p.y+.032; b[1]=q.y+.032; a2[1]=p.y+.032; b2[1]=q.y+.032;
          B.quad(a,b,b2,a2,[1.05,.82,.22]);
        }
      }
    }
    /* Encosta em DUAS faixas: a régua de perto (até 14 m) mais viva e clara,
       a encosta longa mais funda. É coloração, não objeto — o pedido do dono
       era "o chão não parece vivo", e vivo aqui é saturação perto da pista,
       onde o olho passa a corrida inteira. */
    /* O avental segue o CHÃO NATURAL (yBase), não o tabuleiro da rampa: a
       grama do lado de uma rampa construída não sobe junto com ela. */
    const pyb=p.yBase!==undefined?p.yBase:p.y, qyb=q.yBase!==undefined?q.yBase:q.y;
    for(const s of[-1,1]){
      const meioA=14, tm=cl((meioA-1.5)/68.5,0,1);
      const a=L(p,s*(p.larg/2+1.5)), b=L(q,s*(q.larg/2+1.5));
      const m1=L(p,s*(p.larg/2+meioA)), m2=L(q,s*(q.larg/2+meioA));
      const a2=L(p,s*(p.larg/2+APAVENTAL)), b2=L(q,s*(q.larg/2+APAVENTAL));
      a[1]=pyb+.10; b[1]=qyb+.10;
      m1[1]=lerp(pyb+0.10, pyb*SOBRA-.07, tm);
      m2[1]=lerp(qyb+0.10, qyb*SOBRA-.07, tm);
      a2[1]=pyb*SOBRA-.07; b2[1]=qyb*SOBRA-.07;
      B.quad(a,b,m2,m1, esc(gr, i%2 ? 1.34 : 1.18));
      // 1,16 e não 1,35 na faixa longa: com o avental acompanhando o relevo
      // as listras ficaram enormes na paisagem, e contraste forte virava zebra
      B.quad(m1,m2,b2,a2, (i%2? gr : esc(gr,1.16)));
    }
  }

  /* Poças na chuva: discos claros espelhando o céu, espalhados na pista.
     Não mudam a física — a aderência do piso já é a da chuva inteira — mas
     são o que faz "chuva" ler como chuva antes de o primeiro pneu cantar. */
  if(nomePiso==="chuva"){
    /* As poças SUMIRAM na versão passada: eu as restringi ao chão plano, e
       com 7,4 m entre pontos quase nenhum ponto passava no teste — a chuva
       ficou sem poça nenhuma. A resposta certa não é escolher onde elas
       nascem, é elas DEITAREM na inclinação, como todo decalque. */
    const espelho=[.16,.20,.27];
    for(let k=0;k<40;k++){
      const i=Math.floor(r()*n), p=pts[i];
      if(p.rampa>0) continue;
      const off=(r()*2-1)*p.larg*0.30;
      const cx=p.x+p.nx*off, cy=p.y+.028, cz=p.z+p.nz*off;
      const raio=1.1+r()*1.7, seg=10;
      // base do plano da pista ali: tangente com a inclinação, lateral reta
      const fl=Math.hypot(1,p.inc||0);
      const fx=p.tx/fl, fy=(p.inc||0)/fl, fz=p.tz/fl;
      for(let q=0;q<seg;q++){
        const a0=q/seg*6.2832, a1=(q+1)/seg*6.2832;
        const c0=Math.cos(a0)*raio, s0=Math.sin(a0)*raio;
        const c1=Math.cos(a1)*raio, s1=Math.sin(a1)*raio;
        B.tri([cx,cy,cz],
              [cx+fx*c1+p.nx*s1, cy+fy*c1, cz+fz*c1+p.nz*s1],
              [cx+fx*c0+p.nx*s0, cy+fy*c0, cz+fz*c0+p.nz*s0], espelho);
      }
    }
  }

  /* A largada: linha quadriculada E as oito vagas pintadas no chão — o grid
     que o carro ocupa é o mesmo que novoPiloto calcula (fila*3, coluna ±3,6).
     Vaga pintada é o que faz a largada parecer um lugar, não um acaso. */
  const p0=pts[0], br=[.80,.80,.78];
  for(let k=-3;k<=3;k++){
    const w=k*1.4;
    B.box(p0.x+p0.nx*w, p0.y+.045, p0.z+p0.nz*w, 1.2, .01, 1.2, (k%2?br:[.05,.05,.05]));
  }
  for(let vaga=0;vaga<8;vaga++){
    const fila=Math.floor(vaga/2), col=(vaga%2)?1:-1;
    const p=pts[(3+fila*3)%n], off=col*3.6;
    const cx=p.x+p.nx*off, cz=p.z+p.nz*off, y=p.y+.035;
    // um "T" deitado seguindo a tangente: traço no eixo da vaga, trave atrás
    const q4=(mx,mz,mtx,mtz,mnx,mnz,ct,cn)=>B.quad(
      [mx-mtx*ct-mnx*cn, y, mz-mtz*ct-mnz*cn],
      [mx+mtx*ct-mnx*cn, y, mz+mtz*ct-mnz*cn],
      [mx+mtx*ct+mnx*cn, y, mz+mtz*ct+mnz*cn],
      [mx-mtx*ct+mnx*cn, y, mz-mtz*ct+mnz*cn], br);
    q4(cx,cz, p.tx,p.tz, p.nx,p.nz, 1.5, .09);                       // traço
    q4(cx-p.tx*1.6, cz-p.tz*1.6, p.tx,p.tz, p.nx,p.nz, .09, 1.15);  // trave
  }
  return B;
}
