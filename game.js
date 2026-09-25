"use strict";

const $ = (selector) => document.querySelector(selector);
const letters = ["A", "B", "C", "D", "E", "F"];

const dom = {
  route: $("#route"),
  levelName: $("#levelName"),
  counter: $("#questionCounter"),
  question: $("#question"),
  hint: $("#hint"),
  stage: $("#stage"),
  choices: $("#choices"),
  feedback: $("#feedback"),
  score: $("#score"),
  streak: $("#streak"),
  retry: $("#retryBtn"),
  next: $("#nextBtn"),
  music: $("#musicBtn"),
  startOverlay: $("#startOverlay"),
  start: $("#startBtn"),
  finalModal: $("#finalModal"),
  finalScore: $("#finalScore"),
  finalText: $("#finalText"),
  rankGrid: $("#rankGrid"),
  restart: $("#restartBtn")
};

const vec = {
  sub: (a, b) => a.map((v, i) => v - b[i]),
  add: (a, b) => a.map((v, i) => v + b[i]),
  scale: (a, n) => a.map(v => v * n),
  dot: (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  length: a => Math.hypot(...a),
  unit(a) { const n = this.length(a) || 1; return this.scale(a, 1 / n); }
};

function iso([x, y, z]) {
  return [150 + 280 * x + 70 * y, 315 - 60 * y - 200 * z];
}

function pointString(points, projector = iso) {
  return points.map(p => projector(p).map(n => n.toFixed(1)).join(",")).join(" ");
}

const cubeVertices = {
  A: [0, 0, 0], B: [1, 0, 0], C: [1, 1, 0], D: [0, 1, 0],
  A1: [0, 0, 1], B1: [1, 0, 1], C1: [1, 1, 1], D1: [0, 1, 1]
};

const cubeEdges = [
  ["A", "D", true], ["D", "C", true], ["D", "D1", true],
  ["A", "B"], ["B", "C"], ["A", "A1"], ["B", "B1"], ["C", "C1"],
  ["A1", "B1"], ["B1", "C1"], ["C1", "D1"], ["D1", "A1"]
];

function svgDefs() {
  return `<defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6.5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#ffdc72"/></marker>
    <radialGradient id="sphereGlow" cx="35%" cy="28%"><stop offset="0" stop-color="#d9fbff"/><stop offset=".28" stop-color="#64d8ef"/><stop offset="1" stop-color="#17638a"/></radialGradient>
  </defs>`;
}

function cubeBase({ labels = false, questionFace = false } = {}) {
  const p = Object.fromEntries(Object.entries(cubeVertices).map(([k, v]) => [k, iso(v)]));
  const faces = `
    <polygon class="cube-face" points="${[p.A1,p.B1,p.C1,p.D1].map(v=>v.join(",")).join(" ")}"/>
    <polygon class="cube-face alt" points="${[p.A,p.B,p.B1,p.A1].map(v=>v.join(",")).join(" ")}"/>
    <polygon class="cube-face" points="${[p.B,p.C,p.C1,p.B1].map(v=>v.join(",")).join(" ")}"/>`;
  const lines = cubeEdges.map(([a,b,hidden]) => `<line class="${hidden ? "cube-hidden" : "cube-line"}" x1="${p[a][0]}" y1="${p[a][1]}" x2="${p[b][0]}" y2="${p[b][1]}"/>`).join("");
  const vertexLabels = labels ? Object.entries(p).map(([name, [x,y]]) => `<text class="cube-label" x="${x + (name.startsWith("A") || name.startsWith("D") ? -20 : 9)}" y="${y + (name.includes("1") ? -8 : 19)}">${name.replace("1", "₁")}</text>`).join("") : "";
  const faceLabels = questionFace ? `
    <text class="cube-label" x="325" y="82" text-anchor="middle">3（上）</text>
    <text class="cube-label" x="286" y="230" text-anchor="middle">1（前）</text>
    <text class="cube-label" x="447" y="206" text-anchor="middle">?（右）</text>` : "";
  return faces + lines + vertexLabels + faceLabels;
}

function orderPlanePoints(points) {
  if (points.length < 4) return points;
  const center = points.reduce((a,p) => vec.add(a,p), [0,0,0]).map(v => v / points.length);
  const normal = vec.unit(vec.cross(vec.sub(points[1], points[0]), vec.sub(points[2], points[0])));
  const seed = Math.abs(normal[2]) < .9 ? [0,0,1] : [0,1,0];
  const u = vec.unit(vec.cross(normal, seed));
  const v = vec.cross(normal, u);
  return [...points].sort((a,b) => {
    const aa = Math.atan2(vec.dot(vec.sub(a,center),v), vec.dot(vec.sub(a,center),u));
    const bb = Math.atan2(vec.dot(vec.sub(b,center),v), vec.dot(vec.sub(b,center),u));
    return aa - bb;
  });
}

function sectionVisual(config, reveal = false) {
  const labels = config.points.map((p, i) => {
    const [x,y] = iso(p);
    return `<circle class="cube-point pulse-point" cx="${x}" cy="${y}" r="7"/><text class="cube-label" x="${x + 10}" y="${y - 10}">${["P","Q","R"][i]}</text>`;
  }).join("");
  const polygon = reveal ? `<polygon class="reveal-shape" points="${pointString(orderPlanePoints(config.section))}"/>` : "";
  const revealLabel = reveal ? `<g><rect class="formula-badge" x="355" y="350" width="170" height="35" rx="9"/><text class="formula-text" x="440" y="372" text-anchor="middle">截面：${config.name}</text></g>` : "";
  return `<svg viewBox="0 0 600 420" role="img" aria-label="正方体表面三点与截面示意图">${svgDefs()}${cubeBase()}${polygon}${labels}${revealLabel}</svg><span class="stage-note">答题后显示完整截面</span>`;
}

function netSvg(cells, numbers = null, accent = null) {
  const xs = cells.map(c=>c[0]), ys = cells.map(c=>c[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const cols = maxX-minX+1, rows=maxY-minY+1;
  const size = Math.min(40, 184/cols, 124/rows);
  const left=(240-cols*size)/2, top=(140-rows*size)/2;
  const cellsMarkup = cells.map((c,i) => {
    const x=left+(c[0]-minX)*size, y=top+(c[1]-minY)*size;
    const n=numbers ? numbers[i] : "";
    return `<rect class="net-cell${accent===i ? " accent" : ""}" x="${x}" y="${y}" width="${size}" height="${size}" rx="2"/>${n ? `<text class="net-number" x="${x+size/2}" y="${y+size/2}">${n}</text>` : ""}`;
  }).join("");
  return `<svg viewBox="0 0 240 140" aria-hidden="true">${cellsMarkup}</svg>`;
}

function numberedNetVisual(accent = null) {
  const cells = [[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]];
  return `<svg viewBox="0 0 600 420" role="img" aria-label="标有一到六的正方体展开图">
    <text class="visual-title" x="300" y="42" text-anchor="middle">编号展开图</text>
    <g transform="translate(90 72) scale(1.75)">${netSvg(cells,[1,2,3,4,5,6],accent).replace(/<\/?svg[^>]*>/g,"")}</g>
  </svg>`;
}

function faceOrientationVisual() {
  return `<svg viewBox="0 0 600 420" role="img" aria-label="上面为三、前面为一的正方体">${svgDefs()}${cubeBase({questionFace:true})}
    <path class="accent-line" d="M325 95 C358 115 405 137 437 170" marker-end="url(#arrowhead)" opacity=".55"/>
    <text class="visual-sub" x="300" y="387" text-anchor="middle">保持编号展开图的折叠关系</text>
  </svg>`;
}

function diagramGrid(question) {
  return `<div class="net-choice-grid">${question.diagrams.map((item,i)=>`
    <button class="diagram-choice" type="button" data-diagram="${i}" aria-label="选项${letters[i]}">
      <span class="choice-badge">${letters[i]}</span>${netSvg(item.cells,item.numbers || null,item.accent ?? null)}
    </button>`).join("")}</div>`;
}

function convexHull(points) {
  const pts = [...points].sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  const cross = (o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lower=[]; for (const p of pts) { while(lower.length>=2 && cross(lower.at(-2),lower.at(-1),p)<=1e-8) lower.pop(); lower.push(p); }
  const upper=[]; for (const p of pts.slice().reverse()) { while(upper.length>=2 && cross(upper.at(-2),upper.at(-1),p)<=1e-8) upper.pop(); upper.push(p); }
  return lower.slice(0,-1).concat(upper.slice(0,-1));
}

function projectedHull(direction) {
  const d=vec.unit(direction);
  const guide=Math.abs(d[2])<.92 ? [0,0,1] : [0,1,0];
  const u=vec.unit(vec.cross(d,guide));
  const v=vec.cross(d,u);
  const vertices=[];
  for (let x=0;x<=1;x++) for(let y=0;y<=1;y++) for(let z=0;z<=1;z++) vertices.push([vec.dot([x,y,z],u),vec.dot([x,y,z],v)]);
  return convexHull(vertices);
}

function projectionVisual(config, reveal=false) {
  const smallIso = ([x,y,z]) => [62+165*x+42*y,315-37*y-130*z];
  const p=Object.fromEntries(Object.entries(cubeVertices).map(([k,v])=>[k,smallIso(v)]));
  const cubeFaces=`<polygon class="cube-face" points="${[p.A1,p.B1,p.C1,p.D1].map(a=>a.join(",")).join(" ")}"/>`;
  const lines=cubeEdges.map(([a,b,h])=>`<line class="${h?"cube-hidden":"cube-line"}" x1="${p[a][0]}" y1="${p[a][1]}" x2="${p[b][0]}" y2="${p[b][1]}"/>`).join("");
  let silhouette="";
  if(reveal){
    const hull=projectedHull(config.direction);
    const xs=hull.map(q=>q[0]), ys=hull.map(q=>q[1]);
    const w=Math.max(...xs)-Math.min(...xs) || 1, h=Math.max(...ys)-Math.min(...ys) || 1;
    const scale=Math.min(162/w,205/h);
    const cx=(Math.max(...xs)+Math.min(...xs))/2, cy=(Math.max(...ys)+Math.min(...ys))/2;
    const mapped=hull.map(([x,y])=>[463+(x-cx)*scale,210-(y-cy)*scale]);
    silhouette=`<polygon class="reveal-shape" points="${mapped.map(a=>a.join(",")).join(" ")}"/><text class="visual-title" x="463" y="356" text-anchor="middle">${config.shape}</text>`;
  } else {
    silhouette=`<text class="visual-sub" x="463" y="210" text-anchor="middle">等待成像…</text>`;
  }
  return `<svg viewBox="0 0 600 420" role="img" aria-label="正方体沿给定方向的正投影示意图">${svgDefs()}
    ${cubeFaces}${lines}
    <path class="projection-arrow" d="M255 146 L340 110"/>
    <rect class="projection-screen" x="355" y="64" width="216" height="292" rx="14"/>
    <text class="visual-title" x="170" y="55" text-anchor="middle">正方体</text>
    <text class="visual-title" x="463" y="45" text-anchor="middle">投影屏</text>
    <g><rect class="formula-badge" x="80" y="350" width="205" height="35" rx="9"/><text class="formula-text" x="182" y="372" text-anchor="middle">方向 ${config.label}</text></g>
    ${silhouette}
  </svg><span class="stage-note">黄色箭头表示投影方向</span>`;
}

function packingVisual(type, reveal=false) {
  let body="", badge="";
  const sphere=(x,y,r=27,back=false)=>`<circle class="pack-sphere${back?" back":""}" cx="${x}" cy="${y}" r="${r}"/>`;
  if(type==="box18"){
    for(let layer=1;layer>=0;layer--) for(let row=2;row>=0;row--) for(let col=0;col<3;col++) body+=sphere(174+col*72+row*25+layer*18,310-row*34-layer*83,27,layer===1);
    body+=`<path class="cube-line" d="M125 337 L366 337 L455 218 L455 97 L214 97 L125 216 Z M366 337 L455 218 M125 216 L366 216 L455 97 M366 216 L366 337 M214 97 L214 218" opacity=".42"/>`;
    badge=reveal?"3 × 3 × 2 = 18":"箱体：6r × 6r × 4r";
  } else if(type==="pairs54"){
    for(let layer=2;layer>=0;layer--) for(let row=2;row>=0;row--) for(let col=0;col<3;col++) body+=sphere(175+col*64+row*22+layer*16,315-row*31-layer*68,23,layer>0);
    body+=`<path class="accent-line" d="M174 315 L302 315 M174 315 L218 253 M174 315 L206 179" opacity="${reveal?1:.22}"/>`;
    badge=reveal?"三方向各 18 对，共 54 对":"3 × 3 × 3 简单立方堆积";
  } else if(type==="triangle15"){
    for(let row=0;row<5;row++) for(let col=0;col<=row;col++) body+=sphere(300-row*33+col*66,92+row*58,25);
    badge=reveal?"1 + 2 + 3 + 4 + 5 = 15":"三角形密堆层：每边 5 个";
  } else if(type==="tetra20"){
    const counts=[1,3,6,10];
    counts.forEach((n,i)=>{
      const y=82+i*83;
      for(let j=0;j<n;j++) body+=sphere(115+i*16+j*(Math.min(220/(Math.max(1,n-1)),42)),y,18,i<3);
      body+=`<text class="visual-title" x="470" y="${y+5}" text-anchor="middle">第 ${i+1} 层：${n} 个</text>`;
    });
    badge=reveal?"1 + 3 + 6 + 10 = 20":"四层四面体球堆";
  } else {
    body=`${sphere(212,258,92)}${sphere(388,258,92)}${sphere(300,105,92,true)}${sphere(300,216,22)}
      <path class="motion-path" d="M212 258 L388 258 L300 105 Z"/><text class="cube-label" x="300" y="221" text-anchor="middle">r</text>`;
    badge=reveal?"r = (√6/2 − 1)R":"四个半径 R 的球两两相切";
  }
  return `<svg viewBox="0 0 600 420" role="img" aria-label="空间球体密堆示意图">${svgDefs()}${body}
    <rect class="formula-badge" x="145" y="370" width="310" height="34" rx="9"/><text class="formula-text" x="300" y="392" text-anchor="middle">${badge}</text>
  </svg>`;
}

function miniCube(projector=iso) {
  const p=Object.fromEntries(Object.entries(cubeVertices).map(([k,v])=>[k,projector(v)]));
  return cubeEdges.map(([a,b,h])=>`<line class="${h?"cube-hidden":"cube-line"}" x1="${p[a][0]}" y1="${p[a][1]}" x2="${p[b][0]}" y2="${p[b][1]}"/>`).join("");
}

function locusVisual(type,reveal=false) {
  let content="";
  const coords=Object.fromEntries(Object.entries(cubeVertices).map(([k,v])=>[k,iso(v)]));
  if(type==="segment"){
    const a=coords.A,b=coords.B,a1=coords.A1,m0=[(a[0]+a1[0])/2,(a[1]+a1[1])/2],m1=[(b[0]+a1[0])/2,(b[1]+a1[1])/2];
    content=`${cubeBase({labels:true})}<path class="motion-path" d="M${a.join(" ")} L${b.join(" ")}"/>
      <circle class="motion-point" r="7"><animateMotion dur="3.4s" repeatCount="indefinite" values="${a.join(",")};${b.join(",")};${a.join(",")}"/></circle>
      <circle fill="#64f5b5" r="6"><animateMotion dur="3.4s" repeatCount="indefinite" values="${m0.join(",")};${m1.join(",")};${m0.join(",")}"/></circle>
      ${reveal?`<path class="locus-shape" d="M${m0.join(" ")} L${m1.join(" ")}"/><text class="cube-label" x="${m1[0]+12}" y="${m1[1]-8}">M 的轨迹</text>`:""}`;
  } else if(type==="boundary" || type==="region"){
    const bottom=[cubeVertices.A,cubeVertices.B,cubeVertices.C,cubeVertices.D];
    const mapped=bottom.map(p=>vec.scale(vec.add(cubeVertices.A1,p),.5));
    const path=pointString(bottom)+" "+iso(bottom[0]).join(",");
    const mpath=pointString(mapped)+" "+iso(mapped[0]).join(",");
    content=`${cubeBase({labels:true})}<polyline class="motion-path" points="${path}"/>
      <circle class="motion-point" r="7"><animateMotion dur="7s" repeatCount="indefinite" path="M${path.replaceAll(" "," L")}"/></circle>
      ${reveal?`<polygon class="locus-shape" points="${pointString(mapped)}" fill-opacity="${type==="boundary"?0:.24}"/><text class="cube-label" x="355" y="205">${type==="boundary"?"正方形边界":"正方形区域"}</text>`:""}`;
  } else if(type==="sphere"){
    content=`<g transform="translate(20 0)"><ellipse cx="235" cy="210" rx="130" ry="130" fill="rgba(80,230,255,.07)" stroke="#78cbe4" stroke-width="2"/>
      <ellipse cx="235" cy="210" rx="130" ry="46" fill="none" stroke="#6b93a8" stroke-dasharray="6 7"/><line class="axis-line" x1="235" y1="210" x2="365" y2="210"/><text class="cube-label" x="225" y="205">O</text><text class="visual-sub" x="302" y="199">R</text>
      <circle class="motion-point" cx="320" cy="112" r="7"><animate attributeName="cy" values="112;306;112" dur="4s" repeatCount="indefinite"/></circle></g>
      <circle class="cube-point" cx="520" cy="210" r="7"/><text class="cube-label" x="530" y="203">Q</text>
      ${reveal?`<g><ellipse class="locus-shape" cx="377" cy="210" rx="65" ry="65"/><ellipse cx="377" cy="210" rx="65" ry="23" fill="none" stroke="#64f5b5" stroke-dasharray="5 6"/><text class="cube-label" x="357" y="205">O′</text><text class="visual-sub" x="395" y="270">半径 R/2</text></g>`:""}`;
  } else {
    const smallProject=([x,y,z])=>iso([.5+.5*x,.5+.5*y,.5*z]);
    content=`${cubeBase({labels:true})}<circle class="motion-point" r="7"><animateMotion dur="7s" repeatCount="indefinite" path="M150 315 L430 315 L500 255 L500 55 L220 55 L150 115 L150 315"/></circle>
      ${reveal?`<g opacity=".95">${miniCube(smallProject)}</g><text class="cube-label" x="338" y="340">棱长为原来 1/2</text>`:""}`;
  }
  return `<svg viewBox="0 0 600 420" role="img" aria-label="立体几何动点轨迹示意图">${svgDefs()}${content}</svg><span class="stage-note">黄色点 P 运动，绿色表示 M 的轨迹</span>`;
}

const sectionConfigs = [
  { name:"三角形", points:[[.42,0,1],[0,.42,1],[0,0,.58]], section:[[.42,0,1],[0,.42,1],[0,0,.58]] },
  { name:"正方形", points:[[0,0,.5],[1,0,.5],[1,1,.5]], section:[[0,0,.5],[1,0,.5],[1,1,.5],[0,1,.5]] },
  { name:"矩形", points:[[0,0,1],[1,0,0],[0,1,1]], section:[[0,0,1],[1,0,0],[1,1,0],[0,1,1]] },
  { name:"五边形", points:[[0,0,.75],[0,1,.25],[.5,1,0]], section:[[0,0,.75],[0,1,.25],[.5,1,0],[1,.5,0],[1,0,.25]] },
  { name:"六边形", points:[[1,.5,0],[1,0,.5],[.5,0,1]], section:[[1,.5,0],[1,0,.5],[.5,0,1],[0,.5,1],[0,1,.5],[.5,1,0]] }
];

const validA=[[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]];
const validB=[[0,0],[0,1],[1,1],[2,1],[2,2],[3,1]];
const validC=[[0,1],[1,0],[1,1],[1,2],[1,3],[2,1]];
const invalidBlock=[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]];
const invalidLine=[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0]];
const invalidZig=[[0,0],[1,0],[2,0],[1,1],[2,1],[3,1]];

const sectionChoices=["三角形","正方形","矩形","五边形","六边形"];

const levels = [
  {
    title:"展开与折叠", short:"展开图", code:"NET",
    questions:[
      { prompt:"下列图形中，哪一个能折成立方体？", hint:"想象每个方格绕公共边旋转 90°，注意是否有两个面重合。", answer:"A", explanation:"A 折叠后六个面的法向方向互不重复；其余方案会有面重合，或无法围成立方体。", diagrams:[{cells:validA},{cells:invalidBlock},{cells:invalidLine},{cells:invalidZig}] },
      { prompt:"四个候选图中，哪一个不是立方体展开图？", hint:"这次找反例：如果折起后两个方格占据同一个面，它就不成立。", answer:"D", explanation:"D 的两排错位结构折起后会发生面重合。A、B、C 都属于立方体的 11 种基本展开图。", diagrams:[{cells:validA},{cells:validB},{cells:validC},{cells:invalidZig}] },
      { prompt:"按图折成立方体后，与 1 号面相对的是哪一面？", hint:"沿 1—3—5 这条连续带折叠，观察法向方向。", answer:"5", choices:["2","4","5","6"], explanation:"1 与 5 折叠后法向相反，因此互为对面；另外两组对面是 2 与 4、3 与 6。", visual:()=>numberedNetVisual(0) },
      { prompt:"下列哪组三个面可以在同一个顶点相遇？", hint:"同一顶点不能同时包含一对相对面。", answer:"1、2、3", choices:["1、2、3","1、3、5","2、4、6","2、3、6"], explanation:"三面共点时，必须从三组相对面（1,5）、（2,4）、（3,6）中各取一个。只有 1、2、3 符合。", visual:()=>numberedNetVisual() },
      { prompt:"折叠后若 3 号面朝上、1 号面朝前，右侧面是几号？", hint:"先固定上面与前面，立方体的左右方向也随之唯一确定。", answer:"4", choices:["2","4","5","6"], explanation:"由展开图的相邻次序可知：3 为上、1 为前时，4 恰好转到右侧；2 则位于左侧。", visual:()=>faceOrientationVisual() }
    ]
  },
  {
    title:"三点定截面", short:"截面", code:"CUT",
    questions:sectionConfigs.map((config,i)=>({
      prompt:`平面经过正方体表面的 P、Q、R 三点，所得截面是什么形状？（第 ${i+1} 组）`,
      hint:"先判断截平面会依次穿过正方体的哪些棱，再连接同一表面上的交点。",
      answer:config.name,
      choices:sectionChoices,
      explanation:[
        "三个点都靠近同一顶点 A₁，截平面只切到从该顶点出发的三条棱，所以截面是三角形。",
        "三点位于同一水平高度，截平面平行于上、下底面，截得与底面全等的正方形。",
        "截平面同时穿过两组互相平行的棱，四个交点组成矩形；在这里并非正方形。",
        "该平面共穿过五条棱，按所在表面的邻接顺序连接，得到五边形。",
        "平面 x+y+z=3/2 穿过六条棱，六个交点组成六边形；这是正方体的典型截面。"
      ][i],
      visual:reveal=>sectionVisual(config,reveal)
    }))
  },
  {
    title:"方向与投影", short:"投影", code:"VIEW",
    questions:[
      {prompt:"正方体沿垂直于一个面的方向作正投影，轮廓是什么？",hint:"投影方向与一组棱平行，前后两面完全重合。",answer:"正方形",choices:["正方形","长方形","正六边形","一般六边形"],explanation:"沿面法向观察时，前后两个正方形完全重合，外轮廓就是正方形。",visual:r=>projectionVisual({direction:[1,0,0],label:"(1, 0, 0)",shape:"正方形"},r)},
      {prompt:"正方体沿一个侧面的面对角线方向作正投影，轮廓是什么？",hint:"该方向可写成 (1,1,0)，竖直棱仍保持原长。",answer:"长方形",choices:["正方形","长方形","正六边形","菱形"],explanation:"沿 (1,1,0) 投影时，水平方向宽为 √2，竖直方向高为 1，轮廓是长方形。",visual:r=>projectionVisual({direction:[1,1,0],label:"(1, 1, 0)",shape:"长方形"},r)},
      {prompt:"正方体沿一条体对角线方向作正投影，轮廓是什么？",hint:"方向 (1,1,1) 对三个坐标轴完全对称。",answer:"正六边形",choices:["正三角形","正方形","正六边形","一般六边形"],explanation:"沿体对角线观察，三组棱的投影地位对称，轮廓为正六边形。",visual:r=>projectionVisual({direction:[1,1,1],label:"(1, 1, 1)",shape:"正六边形"},r)},
      {prompt:"沿方向 (2,1,1) 作正投影，正方体的轮廓最准确的描述是？",hint:"三个方向分量都非零，所以通常能看到三组棱；但三个分量不相等。",answer:"一般六边形",choices:["正方形","长方形","正六边形","一般六边形"],explanation:"三个分量都非零，轮廓有六条边；方向对三个轴不对称，所以不是正六边形，而是一般六边形。",visual:r=>projectionVisual({direction:[2,1,1],label:"(2, 1, 1)",shape:"一般六边形"},r)},
      {prompt:"棱长为 1 的正方体沿方向 (1,2,2) 正投影，投影面积是多少？",hint:"长方体投影面积公式：S=|l|yz+|m|xz+|n|xy，其中 (l,m,n) 是单位方向向量。",answer:"5/3",choices:["1","√2","5/3","√5"],explanation:"单位方向为 (1,2,2)/3。三个面的面积均为 1，所以投影面积 S=(1+2+2)/3=5/3。",visual:r=>projectionVisual({direction:[1,2,2],label:"(1, 2, 2)",shape:r?"面积 5/3":""},r)}
    ]
  },
  {
    title:"空间密堆", short:"密堆", code:"PACK",
    questions:[
      {prompt:"半径为 r 的相同球作简单立方堆积，恰好装入 6r×6r×4r 的长方体，最多装几个？",hint:"每个球在三个方向都占据一个直径 2r。",answer:"18",choices:["12","18","24","36"],explanation:"三个方向分别能放 6r/2r=3、3、2 个，所以总数是 3×3×2=18。",visual:r=>packingVisual("box18",r)},
      {prompt:"3×3×3 的简单立方球堆中，共有多少对彼此相切的球？",hint:"分别统计沿长、宽、高三个方向的相切对数。",answer:"54",choices:["36","45","54","81"],explanation:"每个方向有 (3−1)×3×3=18 对，三个方向共 3×18=54 对。",visual:r=>packingVisual("pairs54",r)},
      {prompt:"平面上把相同圆作三角形密堆，每边排 5 个，这一层共有多少个球？",hint:"从顶行到底行依次为 1、2、3、4、5 个。",answer:"15",choices:["10","15","20","25"],explanation:"总数是三角形数 T₅=1+2+3+4+5=15。",visual:r=>packingVisual("triangle15",r)},
      {prompt:"用相同球堆成 4 层正四面体：各层为边长 1、2、3、4 的三角形层，共有多少球？",hint:"每层先用三角形数计数，再把四层相加。",answer:"20",choices:["16","20","24","30"],explanation:"四层球数依次为 1、3、6、10，总数 1+3+6+10=20，这是第 4 个四面体数。",visual:r=>packingVisual("tetra20",r)},
      {prompt:"四个半径为 R 的球两两相切，它们围成的四面体空隙中心放一个相切小球，小球半径 r 为？",hint:"四个大球球心构成棱长 2R 的正四面体；其中心到顶点的距离是 √6R/2。",answer:"(√6−2)R/2",choices:["(√2−1)R","(√3−1)R/2","(√6−2)R/2","R/3"],explanation:"正四面体中心到顶点的距离为 √6R/2，又等于 R+r，所以 r=(√6/2−1)R=(√6−2)R/2。",visual:r=>packingVisual("void",r)}
    ]
  },
  {
    title:"动态轨迹", short:"轨迹", code:"LOCUS",
    questions:[
      {prompt:"P 在线段 AB 上运动，M 为 A₁P 的中点。M 的轨迹是什么？",hint:"中点映射等价于以 A₁ 为中心、比例 1/2 的位似。",answer:"一条线段",choices:["一条线段","一条圆弧","一个正方形边界","一个三角形区域"],explanation:"AB 在以 A₁ 为中心、比例 1/2 的位似下仍是一条线段，端点分别是 A₁A、A₁B 的中点。",visual:r=>locusVisual("segment",r)},
      {prompt:"P 沿正方形 ABCD 的边界运动，M 为 A₁P 的中点。M 的轨迹是？",hint:"整个边界经过同一个位似变换，形状不会改变。",answer:"正方形边界",choices:["四条独立线段","正方形边界","正方形区域","圆周"],explanation:"M 是 P 在位似中心 A₁、比例 1/2 下的像，所以轨迹是一个与 ABCD 平行、边长为其一半的正方形边界。",visual:r=>locusVisual("boundary",r)},
      {prompt:"P 可在正方形面 ABCD 内部及边界任意运动，M 为 A₁P 的中点。M 的轨迹是？",hint:"注意 P 的运动范围从“边界”扩大成了“整个面”。",answer:"正方形区域",choices:["正方形边界","正方形区域","四棱锥表面","一条线段"],explanation:"位似会把整个正方形面映成一个边长减半的正方形区域，而不只是它的边界。",visual:r=>locusVisual("region",r)},
      {prompt:"P 在球 O 的球面上运动，Q 为球外一定点，M 为 PQ 的中点。M 的轨迹是？",hint:"把球面以 Q 为中心作比例 1/2 的位似。",answer:"半径 R/2 的球面",choices:["半径 R/2 的球面","半径 R 的球面","一个圆面","一条椭圆"],explanation:"M 是 P 关于位似中心 Q、比例 1/2 的像，故轨迹为球面；球心是 OQ 中点，半径为 R/2。",visual:r=>locusVisual("sphere",r)},
      {prompt:"P 在正方体的整个表面运动，C 为固定顶点，M 为 CP 的中点。M 的轨迹是？",hint:"仍是位似，但这次被映射的是整个正方体表面。",answer:"棱长减半的小正方体表面",choices:["棱长减半的小正方体表面","小正方体内部","以 C 为球心的球面","六个互不相连的正方形"],explanation:"以 C 为中心、比例 1/2 位似，正方体表面映成一个与原正方体同向、棱长为原来一半的小正方体表面。",visual:r=>locusVisual("cube",r)}
    ]
  }
];

const totalQuestions=levels.reduce((sum,l)=>sum+l.questions.length,0);
let state={level:0,question:0,score:0,streak:0,results:Array(totalQuestions).fill(null),answered:false,practice:false,musicOn:true};

function globalIndex(){ return state.level*5+state.question; }
function currentQuestion(){ return levels[state.level].questions[state.question]; }

function renderRoute(){
  const current=globalIndex();
  dom.route.innerHTML=levels.map((level,li)=>{
    const start=li*5;
    const complete=state.results.slice(start,start+5).every(v=>v!==null);
    const cls=li===state.level?" active":complete?" complete":"";
    const dots=level.questions.map((_,qi)=>{
      const idx=start+qi;
      return `<i class="route-dot${state.results[idx]!==null?" done":""}${idx===current?" current":""}"></i>`;
    }).join("");
    return `<div class="route-level${cls}" data-level="${li}"><div class="route-top"><span class="route-index">0${li+1}</span><span class="route-title">${level.short}</span></div><div class="route-dots">${dots}</div></div>`;
  }).join("");
  requestAnimationFrame(()=>dom.route.querySelector(".active")?.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}));
}

function renderQuestion(){
  state.answered=false;
  const q=currentQuestion(), level=levels[state.level], idx=globalIndex();
  dom.levelName.textContent=`第${["一","二","三","四","五"][state.level]}关 · ${level.title}`;
  dom.counter.textContent=`${String(idx+1).padStart(2,"0")} / ${totalQuestions}`;
  dom.question.textContent=q.prompt;
  dom.hint.textContent=q.hint;
  dom.feedback.className="feedback";
  dom.feedback.innerHTML="";
  dom.retry.hidden=true;
  dom.next.disabled=true;
  dom.next.querySelector("span").textContent="确认后继续";

  if(q.diagrams){
    dom.stage.innerHTML=diagramGrid(q);
    dom.choices.innerHTML=`<p class="diagram-instruction">请直接点击左侧（手机端为上方）的图形作答。折叠时可以把某个方格想象成底面，再逐个竖起相邻面。</p>`;
    dom.stage.querySelectorAll(".diagram-choice").forEach((button,i)=>button.addEventListener("click",()=>grade(letters[i],button)));
  } else {
    dom.stage.innerHTML=q.visual ? q.visual(false) : "";
    dom.choices.innerHTML=q.choices.map((choice,i)=>`<button class="answer-button" type="button"><span class="option-letter">${letters[i]}</span><span class="option-text">${choice}</span></button>`).join("");
    dom.choices.querySelectorAll(".answer-button").forEach((button,i)=>button.addEventListener("click",()=>grade(q.choices[i],button)));
  }
  renderRoute();
}

function grade(value,selectedButton){
  if(state.answered) return;
  state.answered=true;
  const q=currentQuestion(), correct=value===q.answer, idx=globalIndex();
  const buttons=[...document.querySelectorAll(".answer-button, .diagram-choice")];
  buttons.forEach((button,i)=>{
    button.disabled=true;
    const buttonValue=q.diagrams?letters[i]:q.choices[i];
    if(buttonValue===q.answer) button.classList.add("correct");
    else if(button===selectedButton) button.classList.add("wrong");
    else button.classList.add("dimmed");
  });

  if(state.results[idx]===null){
    state.results[idx]=correct;
    if(correct){ state.score++; state.streak++; }
    else state.streak=0;
  }
  dom.score.textContent=state.score;
  dom.streak.textContent=state.streak;
  dom.feedback.className=`feedback show ${correct?"correct":"wrong"}`;
  dom.feedback.innerHTML=`<div class="feedback-head"><i></i>${correct?(state.practice?"练习答对了":"判断正确"):"这次差一点"}</div><p>${q.explanation}</p>`;
  if(q.visual) dom.stage.innerHTML=q.visual(true);
  dom.next.disabled=false;
  dom.next.querySelector("span").textContent=idx===totalQuestions-1?"查看任务报告":correct?"进入下一题":"带着解析继续";
  dom.retry.hidden=correct;
  renderRoute();
  playTone(correct);
}

function nextQuestion(){
  if(!state.answered) return;
  if(globalIndex()===totalQuestions-1){ showFinal(); return; }
  if(state.question<levels[state.level].questions.length-1) state.question++;
  else { state.level++; state.question=0; playLevelTone(); }
  state.practice=false;
  renderQuestion();
  document.querySelector(".game-card").scrollIntoView({behavior:"smooth",block:"start"});
}

function retryQuestion(){
  state.practice=true;
  renderQuestion();
  dom.hint.textContent="练习重答不再改变得分。"+currentQuestion().hint;
}

function showFinal(){
  dom.finalScore.textContent=`${state.score} / ${totalQuestions}`;
  const rate=state.score/totalQuestions;
  dom.finalText.textContent=rate>=.88?"空间感非常敏锐，你已经能稳定切换二维与三维视角。":rate>=.64?"基础很稳。再复盘截面与动态轨迹题，你的空间推理会更完整。":"完成本身就是一次空间训练。重新挑战时，优先借助每题的棱、面与位似关系。";
  dom.rankGrid.innerHTML=state.results.map((hit,i)=>`<span class="${hit?"hit":""}" title="第${i+1}题${hit?"答对":"答错"}">${String(i+1).padStart(2,"0")}</span>`).join("");
  dom.finalModal.hidden=false;
  playWinTone();
}

function restartGame(){
  state={...state,level:0,question:0,score:0,streak:0,results:Array(totalQuestions).fill(null),answered:false,practice:false};
  dom.score.textContent="0"; dom.streak.textContent="0"; dom.finalModal.hidden=true;
  renderQuestion();
  window.scrollTo({top:0,behavior:"smooth"});
}

let audio=null;
function initAudio(){
  if(audio) return;
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx) return;
  const ctx=new AudioCtx();
  const master=ctx.createGain(); master.gain.value=.62; master.connect(ctx.destination);
  const pad=ctx.createGain(); pad.gain.value=.012; pad.connect(master);
  [110,164.81,220].forEach((frequency,i)=>{
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type=i===1?"triangle":"sine"; osc.frequency.value=frequency; gain.gain.value=i===0?.5:.22;
    osc.connect(gain).connect(pad); osc.start();
  });
  audio={ctx,master,pad,timer:null,step:0};
  const notes=[261.63,329.63,392,493.88,392,329.63,293.66,392];
  const tick=()=>{
    if(!state.musicOn||ctx.state!=="running") return;
    const osc=ctx.createOscillator(), gain=ctx.createGain(), now=ctx.currentTime;
    osc.type="sine"; osc.frequency.value=notes[audio.step++%notes.length]/2;
    gain.gain.setValueAtTime(0,now); gain.gain.linearRampToValueAtTime(.018,now+.06); gain.gain.exponentialRampToValueAtTime(.0001,now+.65);
    osc.connect(gain).connect(master); osc.start(now); osc.stop(now+.7);
  };
  tick(); audio.timer=setInterval(tick,760);
}

function playTone(correct){
  if(!audio||!state.musicOn) return;
  const now=audio.ctx.currentTime;
  (correct?[523.25,659.25]:[220,185]).forEach((f,i)=>{
    const osc=audio.ctx.createOscillator(), gain=audio.ctx.createGain();
    osc.type=correct?"sine":"triangle"; osc.frequency.value=f;
    gain.gain.setValueAtTime(.0001,now+i*.09); gain.gain.exponentialRampToValueAtTime(.08,now+i*.09+.018); gain.gain.exponentialRampToValueAtTime(.0001,now+i*.09+.23);
    osc.connect(gain).connect(audio.master); osc.start(now+i*.09); osc.stop(now+i*.09+.25);
  });
}

function playLevelTone(){
  if(!audio||!state.musicOn) return;
  [392,523.25,659.25].forEach((f,i)=>setTimeout(()=>playSingle(f,.055),i*90));
}
function playWinTone(){
  if(!audio||!state.musicOn) return;
  [261.63,329.63,392,523.25].forEach((f,i)=>setTimeout(()=>playSingle(f,.075),i*120));
}
function playSingle(frequency,volume){
  if(!audio) return;
  const now=audio.ctx.currentTime, osc=audio.ctx.createOscillator(), gain=audio.ctx.createGain();
  osc.type="sine"; osc.frequency.value=frequency; gain.gain.setValueAtTime(volume,now); gain.gain.exponentialRampToValueAtTime(.0001,now+.42);
  osc.connect(gain).connect(audio.master); osc.start(); osc.stop(now+.45);
}

async function toggleMusic(){
  initAudio(); state.musicOn=!state.musicOn;
  if(audio){ if(state.musicOn) await audio.ctx.resume(); else await audio.ctx.suspend(); }
  dom.music.setAttribute("aria-pressed",String(state.musicOn));
  dom.music.querySelector(".music-label").textContent=state.musicOn?"音乐开":"音乐关";
}

dom.start.addEventListener("click",async()=>{
  initAudio(); if(audio&&state.musicOn) await audio.ctx.resume();
  dom.startOverlay.classList.add("leaving");
  setTimeout(()=>{ dom.startOverlay.hidden=true; },720);
});
dom.music.addEventListener("click",toggleMusic);
dom.next.addEventListener("click",nextQuestion);
dom.retry.addEventListener("click",retryQuestion);
dom.restart.addEventListener("click",restartGame);
document.addEventListener("keydown",event=>{
  if(event.key==="Enter"&&!dom.startOverlay.hidden){ dom.start.click(); return; }
  if(state.answered&&event.key==="Enter") dom.next.click();
  if(!state.answered&&/^[1-5]$/.test(event.key)) document.querySelectorAll(".answer-button, .diagram-choice")[Number(event.key)-1]?.click();
});

renderQuestion();
