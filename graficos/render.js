"use strict";
/* ══════════════════════════════════════════════════════════════════════════
   RENDER — WebGL2 puro, sombreamento chapado, zero textura
   ══════════════════════════════════════════════════════════════════════════ */
const cv=document.getElementById("cv");
const gl=cv.getContext("webgl2",{antialias:true,alpha:false});
if(!gl){document.body.innerHTML='<p style="font-family:sans-serif;padding:40px;color:#DFE6EB">Precisa de WebGL2. Abra no Chrome, Edge ou Firefox atual.</p>';throw 0;}

function prog(vs,fs){const c=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);
  if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;};
  const p=gl.createProgram();gl.attachShader(p,c(gl.VERTEX_SHADER,vs));gl.attachShader(p,c(gl.FRAGMENT_SHADER,fs));
  gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  return p;}
const TONE=`vec3 aces(vec3 x){const float a=2.51,b=.03,c=2.43,d=.59,e=.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.);} vec3 saida(vec3 c){return pow(aces(c),vec3(1./2.2));}`;

const pObj=prog(`#version 300 es
layout(location=0)in vec3 aP;layout(location=1)in vec3 aN;layout(location=2)in vec3 aC;
uniform mat4 uP,uV,uM;out vec3 vN,vW,vC;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=mat3(uM)*aN;vC=aC;gl_Position=uP*uV*w;}`,
`#version 300 es
precision highp float;in vec3 vN,vW,vC;uniform vec3 uEye;uniform float uNeb;uniform vec3 uNebCor;uniform vec3 uTinta;uniform float uAlfa;out vec4 o;
${TONE}
void main(){
  vec3 N=normalize(vN); if(!gl_FrontFacing)N=-N;
  vec3 V=normalize(uEye-vW);
  vec3 K=normalize(vec3(.55,.80,.30)),F1=normalize(vec3(-.70,.34,-.50)),F2=normalize(vec3(.10,.16,-.98));
  vec3 amb=mix(vec3(.105,.118,.140),vec3(.36,.405,.465),N.y*.5+.5);
  // key um fio mais quente e forte: o fim de tarde do pátio, não meio-dia
  vec3 c=vC*uTinta*(amb+vec3(1.30,1.12,.86)*max(dot(N,K),0.)
        +vec3(.22,.32,.46)*max(dot(N,F1),0.)+vec3(.17,.20,.27)*max(dot(N,F2),0.));
  c+=vec3(1.,.92,.78)*pow(max(dot(N,normalize(K+V)),0.),64.)*.15;
  c+=vec3(.42,.58,.82)*pow(1.-max(dot(N,V),0.),3.4)*.22;
  float d=length(uEye-vW);
  // a névoa tem a COR do céu do piso: o longe derrete para dentro do horizonte
  // em vez de afundar num azul-carvão que lavava a cena inteira
  c=mix(c, uNebCor, clamp((d-70.)/uNeb,0.,.82));
  o=vec4(saida(c),uAlfa);}`);

const pFundo=prog(`#version 300 es
out vec2 vU;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vU=p;gl_Position=vec4(p*2.-1.,0.,1.);}`,
`#version 300 es
precision highp float;in vec2 vU;uniform float uLuz;uniform vec3 uCeu;uniform float uSolI;out vec4 o;${TONE}
void main(){
  // céu em três faixas — alto, meio e horizonte — mais um sol baixo que
  // sangra na linha do chão. Gradiente de duas cores era o teto do visual.
  float h=vU.y;
  vec3 alto = uCeu*vec3(.075,.14,.27);
  vec3 meio = uCeu*vec3(.26,.35,.47);
  vec3 baixo= uCeu*vec3(.68,.58,.44);
  vec3 c = h>.55 ? mix(meio,alto,smoothstep(.55,1.,h))
                 : mix(baixo,meio,smoothstep(.10,.55,h));
  // sol: um halo largo e um núcleo pequeno, rentes ao horizonte VISÍVEL.
  // Em y=.30 ele morava atrás do terreno e ninguém nunca o viu — a linha do
  // chão nas câmeras do jogo fica perto de .55, medido em foto.
  vec2 sol=vec2(.68,.54);
  float d=distance(vU*vec2(1.7,1.),sol*vec2(1.7,1.));
  c += uCeu*vec3(.95,.60,.26)*smoothstep(.66,.0,d)*.62*uSolI;
  c += uCeu*vec3(1.8,1.3,.7)*smoothstep(.075,.0,d)*uSolI;
  // banda quente colada no horizonte visível (mesmo motivo da subida do sol)
  c += uCeu*vec3(.40,.26,.13)*smoothstep(.30,.03,abs(h-.50))*uSolI;
  c*=uLuz; o=vec4(saida(c),1.);}`);

/* ── decalque e partícula plana: cor crua, sem luz nenhuma ────────────────
   Marca de pneu escurece o que já está no chão (mistura multiplicativa) e o
   fio de chuva soma um risco pálido (aditiva). Nenhum dos dois quer o custo
   nem o resultado do sombreamento — são tinta, não superfície. */
const pCru=prog(`#version 300 es
layout(location=0)in vec3 aP;layout(location=2)in vec3 aC;
uniform mat4 uP,uV,uM;out vec3 vC;
void main(){vC=aC;gl_Position=uP*uV*uM*vec4(aP,1.);}`,
`#version 300 es
precision highp float;in vec3 vC;uniform float uAlfa;out vec4 o;
void main(){o=vec4(vC,uAlfa);}`);

/* ── PÓS-PROCESSAMENTO ────────────────────────────────────────────────────
   A cena é desenhada num framebuffer multisample, resolvida para textura e
   só então vai para a tela por um passe de acabamento: saturação, um S suave
   de contraste e vinheta. É a quarta perna da direção de arte ("paleta,
   iluminação, silhueta, PÓS-PROCESSAMENTO") que até aqui não existia — e é o
   que separa cor de jogo de cor de protótipo. */
const pos={w:0,h:0,fbMS:null,fb:null,tex:null,rbC:null,rbD:null};
const pPos=prog(`#version 300 es
out vec2 vU;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vU=p;gl_Position=vec4(p*2.-1.,0.,1.);}`,
`#version 300 es
precision highp float;in vec2 vU;uniform sampler2D uTela;out vec4 o;
void main(){
  vec3 c=texture(uTela,vU).rgb;
  // saturação: afasta da luminância — é o "cores vivas" pedido, sem retocar
  // nenhum material um a um
  float l=dot(c,vec3(.299,.587,.114));
  c=clamp(mix(vec3(l),c,1.24),0.,1.);
  // contraste: curva S um pouco mais firme que antes
  c=mix(c, c*c*(3.-2.*c), .34);
  // duotônico discreto do fim de tarde: alta-luz puxa pro dourado, sombra
  // pro azul — é o que separa "hora dourada" de "meio-dia lavado"
  float l2=dot(c,vec3(.299,.587,.114));
  c=mix(c*vec3(.972,.988,1.030), c*vec3(1.045,1.000,.945), smoothstep(.12,.72,l2));
  // vinheta discreta: escurece canto, concentra o olho no meio
  float d=distance(vU,vec2(.5,.46));
  c*=1.-.30*smoothstep(.52,.96,d);
  o=vec4(c,1.);}`);

function prepararPos(w,h){
  if(pos.w===w && pos.h===h) return;
  pos.w=w; pos.h=h;
  for(const k of ["fbMS","fb"]) if(pos[k]) gl.deleteFramebuffer(pos[k]);
  for(const k of ["rbC","rbD"]) if(pos[k]) gl.deleteRenderbuffer(pos[k]);
  if(pos.tex) gl.deleteTexture(pos.tex);
  const MS=Math.min(4, gl.getParameter(gl.MAX_SAMPLES)||0);
  pos.rbC=gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER,pos.rbC);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER,MS,gl.RGBA8,w,h);
  pos.rbD=gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER,pos.rbD);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER,MS,gl.DEPTH_COMPONENT24,w,h);
  pos.fbMS=gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER,pos.fbMS);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,pos.rbC);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,pos.rbD);
  pos.tex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,pos.tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  pos.fb=gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER,pos.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,pos.tex,0);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
function comecarPos(){
  prepararPos(cv.width,cv.height);
  gl.bindFramebuffer(gl.FRAMEBUFFER,pos.fbMS);
}
function acabarPos(){
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,pos.fbMS);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,pos.fb);
  gl.blitFramebuffer(0,0,pos.w,pos.h,0,0,pos.w,pos.h,gl.COLOR_BUFFER_BIT,gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  gl.viewport(0,0,pos.w,pos.h);
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
  gl.useProgram(pPos);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,pos.tex);
  gl.uniform1i(loc(pPos,"uTela"),0);
  gl.bindVertexArray(vazio);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
}

/* ── os dois ralos de suavidade, tapados ─────────────────────────────────
   1. `getUniformLocation` procura por TEXTO no driver, e o laço chamava isso
      dezenas de vezes por quadro (uma por caixa, por brasa, por sombra…).
   2. cada desenho criava uma Float32Array de matriz nova — centenas por
      segundo — e o coletor de lixo cobrava em soluços periódicos. Era o
      "anda travando" que o dono sentia no turbo, quando as brasas dobram a
      conta. Cache de endereço e anel de matrizes recicladas. */
const _locs=new Map();
function loc(p,nome){
  let m=_locs.get(p);
  if(!m){ m=new Map(); _locs.set(p,m); }
  let u=m.get(nome);
  if(u===undefined){ u=gl.getUniformLocation(p,nome); m.set(nome,u); }
  return u;
}
const _anelM=[]; let _anelI=0;
for(let i=0;i<512;i++) _anelM.push(new Float32Array(16));
function m16(){ _anelI=(_anelI+1)&511; return _anelM[_anelI]; }

const vazio=gl.createVertexArray();
function subir(mesh){
  const vao=gl.createVertexArray(); gl.bindVertexArray(vao);
  const dados=[new Float32Array(mesh.p),new Float32Array(mesh.n),new Float32Array(mesh.c)];
  dados.forEach((a,i)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);gl.enableVertexAttribArray(i);
    gl.vertexAttribPointer(i,3,gl.FLOAT,false,0,0);});
  gl.bindVertexArray(null);
  return {vao, n:mesh.p.length/3};
}
const m4p=(fy,as,n,f)=>{const t=1/Math.tan(fy/2);
  return new Float32Array([t/as,0,0,0,0,t,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);};
function m4look(e,c,u){let z=[e[0]-c[0],e[1]-c[1],e[2]-c[2]];let l=Math.hypot(...z)||1;z=z.map(v=>v/l);
  let x=[u[1]*z[2]-u[2]*z[1],u[2]*z[0]-u[0]*z[2],u[0]*z[1]-u[1]*z[0]];l=Math.hypot(...x)||1;x=x.map(v=>v/l);
  const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,
    -(x[0]*e[0]+x[1]*e[1]+x[2]*e[2]),-(y[0]*e[0]+y[1]*e[1]+y[2]*e[2]),-(z[0]*e[0]+z[1]*e[1]+z[2]*e[2]),1]);}
function m4pose(x,y,z,ang,esc=1){const c=Math.cos(ang)*esc,s=Math.sin(ang)*esc;
  const o=m16();
  o[0]=c;o[1]=0;o[2]=-s;o[3]=0; o[4]=0;o[5]=esc;o[6]=0;o[7]=0;
  o[8]=s;o[9]=0;o[10]=c;o[11]=0; o[12]=x;o[13]=y;o[14]=z;o[15]=1;
  return o;}
