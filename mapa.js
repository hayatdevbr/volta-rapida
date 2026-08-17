"use strict";
/* ══════════════════════════════════════════════════════════════════════════
   MAPA IDLE
   ══════════════════════════════════════════════════════════════════════════ */
/* A zona faz surgir carga a uma taxa FIXA — essa é a torneira, e ela não muda
   com quantos carros estão no mapa. O que muda é quanto sobra pra você: quem
   chega primeiro leva. É a mesma lei de antes, mas disputada em movimento em
   vez de dividida parado.

   O desenho anterior deixava os carros orbitando em cima do poço feito
   beyblade: sem disputa visível, sem decisão, sem vida. */
/* Meia carga a cada 0,45 s vale a mesma energia por segundo que uma inteira a
   cada 1,1 s — mas mantém MAIS carga em campo do que carro, que é a condição
   para cada um perseguir a sua em vez de todos correrem pro mesmo ponto.

   O ritmo aqui é ~53x o da Fase 1 porque o mapa roda em TEMPO ACELERADO: um
   minuto olhando é uma hora de jogo. 8 h de bateria = 8 min de tela = 4,8
   corridas, que bate com o modelo econômico. */
const ZONA={ raio:190, intervalo:0.45, valor:10, maxCargas:34, aceleracao:60 };

function surgirCarga(m,r){
  const rr=r||Math.random;
  const a=rr()*6.2832, d=Math.sqrt(rr())*ZONA.raio;
  m.cargas.push({x:Math.cos(a)*d, z:Math.sin(a)*d, nasceu:m.t});
}

/* O pátio não é uma tela que se visita: é o MUNDO, e ele nunca para enquanto
   o jogo está aberto. Garagem e mercado são painéis POR CIMA dele.

   O dono pediu isso com todas as letras, e resolve de uma vez a queixa de
   "nunca tenho energia": antes, olhar o mapa rendia 60x mais que qualquer
   outra tela, então quem ficava na garagem montando carro não coletava quase
   nada. Agora o carro está no pátio o tempo todo, faça você o que fizer.

   A economia não muda: a torneira já era travada pela BATERIA, não pelo ritmo.
   15 min de jogo aberto e 8 h fora dão a mesma bateria cheia — que é exatamente
   o que o modelo da Fase 1 diz. */
function iniciarMapa(){
  const r=semente(91), carros=[];
  /* O pátio tem as MESMAS pessoas da corrida. Antes eram doze anônimos com
     velocidade sorteada, e o jogador não tinha como reconhecer ninguém — o que
     esvazia a única coisa que o mapa idle tem de social: ver quem está lá.

     O carro de cada um anda conforme a build DELE, pela mesma conta que rege o
     seu: quem investiu em motor chega primeiro na carga. */
  const gente=escalar(11, 91);
  for(let i=0;i<12;i++){
    const h = i===0 ? null : gente[i-1];
    const d = h ? idleDoCarro(h.build) : idleDoCarro();
    carros.push({
      x:(r()-.5)*330, z:(r()-.5)*330, h:r()*6.2832,
      vel:d.vel, giro:d.giro, meu:i===0, coletou:0, alvo:-1,
      nome: h ? h.nome : estado.nome, cor: h ? h.cor : estado.cor,
    });
  }
  const meu=idleDoCarro();                   // as peças mandam, não o decreto
  carros[0].vel=meu.vel; carros[0].giro=meu.giro;
  mapa={cargas:[], carros, t:0, proxima:0, minhas:0, total:0, zoom:1, cam:null, brilho:0};
  for(let i=0;i<26;i++) surgirCarga(mapa,r);

}

function passoMapa(dt){
  if(!mapa)return; const m=mapa; m.t+=dt;

  m.proxima-=dt;
  if(m.proxima<=0){ if(m.cargas.length<ZONA.maxCargas) surgirCarga(m); m.proxima=ZONA.intervalo; }

  /* ATRIBUIÇÃO: cada carga é reivindicada por quem chega primeiro, e cada
     carro persegue a melhor entre as que ganhou. Sem isto os doze correm
     todos para a mesma carga e viram um bolo — que é tão sem vida quanto o
     beyblade que isto veio substituir. */
  const eta=(c,g)=>Math.hypot(g.x-c.x,g.z-c.z)/c.vel;
  const dono=new Array(m.cargas.length).fill(-1);
  for(let i=0;i<m.cargas.length;i++){
    let melhor=-1, melhorEta=1e9;
    for(let k=0;k<m.carros.length;k++){
      const e=eta(m.carros[k],m.cargas[i]);
      if(e<melhorEta){ melhorEta=e; melhor=k; }
    }
    dono[i]=melhor;
  }
  for(let k=0;k<m.carros.length;k++){
    const c=m.carros[k];
    let mel=-1, melE=1e9;
    for(let i=0;i<m.cargas.length;i++)
      if(dono[i]===k){ const e=eta(c,m.cargas[i]); if(e<melE){ melE=e; mel=i; } }
    if(mel<0)  // não ganhou nenhuma: vai atrás da mais próxima, com desconto
      for(let i=0;i<m.cargas.length;i++){
        const e=eta(c,m.cargas[i])*(dono[i]>=0?1.9:1);
        if(e<melE){ melE=e; mel=i; }
      }
    c.alvo=mel;
  }

  for(const c of m.carros){
    const mel=c.alvo;
    if(mel<0||mel>=m.cargas.length) continue;

    const g=m.cargas[mel];
    const ang=Math.atan2(g.z-c.z,g.x-c.x);
    let d=ang-c.h; while(d>Math.PI)d-=6.2832; while(d<-Math.PI)d+=6.2832;
    c.h+=cl(d,-c.giro*dt,c.giro*dt);
    const v=c.vel*(1-cl(Math.abs(d),0,1.5)*0.42);   // freia pra fazer a curva
    c.x+=Math.cos(c.h)*v*dt; c.z+=Math.sin(c.h)*v*dt;

    if(Math.hypot(g.x-c.x,g.z-c.z)<3.6){
      m.cargas.splice(mel,1); c.coletou++; m.total++;
      if(c.meu){
        m.minhas++; m.brilho=1;
        estado.energia=cl(estado.energia+ZONA.valor,0,BATERIA);
        if(m.minhas%10===0) salvar();
      }
    }
  }
  // separação: carro não atravessa carro nem no mapa
  for(let a=0;a<m.carros.length;a++) for(let b=a+1;b<m.carros.length;b++){
    const A=m.carros[a], B=m.carros[b];
    const dx=B.x-A.x, dz=B.z-A.z, d=Math.hypot(dx,dz);
    if(d>=6||d<1e-3) continue;
    const e=(6-d)*0.5, nx=dx/d, nz=dz/d;
    A.x-=nx*e; A.z-=nz*e; B.x+=nx*e; B.z+=nz*e;
  }
  if(m.brilho>0) m.brilho-=dt*2.4;
}
