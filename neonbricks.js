// t776u-t779u NEON BRICKS in room 1's big window (Dave): the Tetris-style game with LEGO-style bricks that Dave's Tower Defence bot made
// (/workspace/lego-tetris, "Neon Bricks 3D"). Its RULES ENGINE (SRS rotation + kicks, 7-bag, lock delay, guideline scoring, T-spins,
// levels) and its BRICK GEOMETRY (rounded body + one stud facing you) are copied verbatim below; the rendering is new: only the
// falling-block playfield sits in the middle section of the window (no backdrop, so the window's space / jungle / beach view shows
// through and on both sides), score + level float in the right-hand section. Walk up to the middle of the window -> PLAY.
// While playing: joystick left/right moves (down = soft drop), the MOVE button (in the backpack's place) rotates, ZOOM once = the
// playfield fills the screen (again = back), swipes still turn the camera. Free play, no tickets (like the room's other free toys).
// Cheap: 3 instanced meshes + 1 canvas panel (redrawn only when the numbers change), no lights added, all compiled by the warm-up.
export function setupNeonBricks({ THREE, room, HALF, getMonkey, st, canStart, onState }) {
const HI_KEY = 'neonarcade.neonbricks.hi';
// ================= RULES ENGINE (verbatim from Neon Bricks 3D) =================
const W=10,H=22,HID=2;
const TYPES=['I','O','T','S','Z','J','L'];
const HEX={I:'#1fb6e8',O:'#ffcd03',T:'#a040c8',S:'#14b04a',Z:'#e3000b',J:'#0a5ad6',L:'#ff7a1a'};
const SHAPES={I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],O:[[1,1],[1,1]],T:[[0,1,0],[1,1,1],[0,0,0]],S:[[0,1,1],[1,1,0],[0,0,0]],Z:[[1,1,0],[0,1,1],[0,0,0]],J:[[1,0,0],[1,1,1],[0,0,0]],L:[[0,0,1],[1,1,1],[0,0,0]]};
const rotCW=m=>m.map((row,i)=>row.map((_,j)=>m[m.length-1-j][i]));
const CELLS={};
for(const t of TYPES){CELLS[t]=[];let m=SHAPES[t];for(let r=0;r<4;r++){const c=[];m.forEach((row,y)=>row.forEach((v,x)=>{if(v)c.push([x,y]);}));CELLS[t].push(c);m=rotCW(m);}}
// SRS kicks, (x, y-up) as in the guideline tables
const KJ={'01':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'10':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'12':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'21':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'23':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],'32':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'30':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'03':[[0,0],[1,0],[1,1],[0,-2],[1,-2]]};
const KI={'01':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],'10':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],'12':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],'21':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],'23':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],'32':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],'30':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],'03':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]};
function mulberry(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let hiStore=0;try{hiStore=+localStorage.getItem(HI_KEY)||0;}catch(e){}
const G={state:'title',board:emptyBoard(),cur:null,hold:null,holdUsed:false,queue:[],score:0,lines:0,level:1,startLevel:1,combo:-1,b2b:false,hi:hiStore,events:[],grav:0,lockT:0,resets:0,lowest:0,lastRot:false,lastKick:0,soft:false,rand:Math.random,overT:0,newHi:false,stats:{pieces:0,tetrises:0,tspins:0,maxCombo:0}};
const LOCK_DELAY=0.5,MAX_RESETS=15;
function emptyBoard(){return Array.from({length:H},()=>new Array(W).fill(0));}
function emit(type,d){G.events.push(Object.assign({type},d||{}));}
function refill(){while(G.queue.length<7){const b=TYPES.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(G.rand()*(i+1));const t=b[i];b[i]=b[j];b[j]=t;}G.queue.push(...b);}}
function fits(t,r,x,y){for(const c of CELLS[t][r]){const cx=x+c[0],cy=y+c[1];if(cx<0||cx>=W||cy>=H)return false;if(cy>=0&&G.board[cy][cx])return false;}return true;}
function gravInterval(lv){lv=Math.min(lv,20);return Math.pow(0.8-(lv-1)*0.007,lv-1);}
function newGame(seed,startLevel){
 G.rand=mulberry(seed==null?(Math.random()*4294967296)>>>0:seed);
 G.board=emptyBoard();G.queue=[];refill();G.hold=null;G.holdUsed=false;G.score=0;G.lines=0;G.startLevel=startLevel||1;G.level=G.startLevel;G.combo=-1;G.b2b=false;G.overT=0;G.newHi=false;G.soft=false;
 G.stats={pieces:0,tetrises:0,tspins:0,maxCombo:0};G.state='play';emit('newgame');spawn();}
function spawn(t){
 if(!t){t=G.queue.shift();refill();}
 const x=t==='O'?4:3;G.cur={t,r:0,x,y:0};
 G.grav=0;G.lockT=0;G.resets=0;G.lastRot=false;G.lastKick=0;
 if(!fits(t,0,x,0)){gameOver('blockout');return false;}
 if(fits(t,0,x,1))G.cur.y=1;
 G.lowest=G.cur.y;emit('spawn',{t});emit('queue');return true;}
function grounded(){const c=G.cur;return !fits(c.t,c.r,c.x,c.y+1);}
function moveReset(){if((G.lockT>0||grounded())&&G.resets<MAX_RESETS){G.lockT=0;G.resets++;}}
function checkLowest(){if(G.cur.y>G.lowest){G.lowest=G.cur.y;G.resets=0;}}
function move(dx){if(G.state!=='play'||!G.cur)return false;const c=G.cur;if(fits(c.t,c.r,c.x+dx,c.y)){c.x+=dx;G.lastRot=false;moveReset();emit('move');return true;}emit('bump');return false;}
function rotate(dir){
 if(G.state!=='play'||!G.cur)return false;const c=G.cur;if(c.t==='O'){emit('rotate',{kick:0});return true;}
 const nr=(c.r+dir+4)%4,ks=(c.t==='I'?KI:KJ)[''+c.r+nr];
 for(let i=0;i<ks.length;i++){const nx=c.x+ks[i][0],ny=c.y-ks[i][1];if(fits(c.t,nr,nx,ny)){c.x=nx;c.y=ny;c.r=nr;G.lastRot=true;G.lastKick=i;moveReset();checkLowest();emit('rotate',{kick:i});return true;}}
 return false;}
function softDrop(){if(G.state!=='play'||!G.cur)return false;const c=G.cur;if(fits(c.t,c.r,c.x,c.y+1)){c.y++;G.score+=1;G.grav=0;G.lastRot=false;checkLowest();emit('soft');return true;}return false;}
function ghostY(){const c=G.cur;let y=c.y;while(fits(c.t,c.r,c.x,y+1))y++;return y;}
function hardDrop(){if(G.state!=='play'||!G.cur)return false;const c=G.cur;const y0=c.y,y1=ghostY();const d=y1-y0;if(d>0)G.lastRot=false;c.y=y1;G.score+=2*d;
 emit('hard',{d,t:c.t,cells:CELLS[c.t][c.r].map(([dx,dy])=>[c.x+dx,y0+dy,y1+dy])});lock();return true;}
function hold(){if(G.state!=='play'||!G.cur||G.holdUsed)return false;const t=G.cur.t,h=G.hold;G.hold=t;G.holdUsed=true;emit('hold',{t});spawn(h||undefined);return true;}
function tspinType(){
 const c=G.cur;if(c.t!=='T'||!G.lastRot)return 0;
 const cx=c.x+1,cy=c.y+1,occ=(dx,dy)=>{const x=cx+dx,y=cy+dy;if(x<0||x>=W||y>=H)return true;return y>=0&&!!G.board[y][x];};
 const C=[[-1,-1],[1,-1],[1,1],[-1,1]];const filled=C.map(([a,b])=>occ(a,b));const n=filled.filter(Boolean).length;if(n<3)return 0;
 const front=[[0,1],[1,2],[2,3],[3,0]][c.r];const f=filled[front[0]]&&filled[front[1]];return (f||G.lastKick===4)?2:1;}
function lock(){
 const c=G.cur;const ts=tspinType();let allHidden=true;const placed=[];const v=TYPES.indexOf(c.t)+1;
 for(const [dx,dy] of CELLS[c.t][c.r]){const x=c.x+dx,y=c.y+dy;if(y>=0)G.board[y][x]=v;if(y>=HID)allHidden=false;placed.push([x,y]);}
 G.stats.pieces++;emit('lock',{cells:placed,t:c.t});G.cur=null;
 if(allHidden){gameOver('lockout');return;}
 const rows=[];for(let y=0;y<H;y++)if(G.board[y].every(Boolean))rows.push(y);
 const n=rows.length,cleared=rows.map(y=>G.board[y].slice());
 if(n){rows.slice().sort((a,b)=>b-a).forEach(y=>G.board.splice(y,1));for(let i=0;i<n;i++)G.board.unshift(new Array(W).fill(0));}
 let base,diff;
 if(ts===2){base=[400,800,1200,1600][n];diff=n>0;}else if(ts===1){base=[100,200,400,400][n];diff=n>0;}else{base=[0,100,300,500,800][n];diff=n===4;}
 let b2bHit=false;
 if(n>0){if(diff&&G.b2b){base*=1.5;b2bHit=true;}G.b2b=diff;G.combo++;}else G.combo=-1;
 let pts=base*G.level;if(n>0&&G.combo>0)pts+=50*G.combo*G.level;
 let perfect=n>0&&G.board.every(r=>r.every(x=>!x));if(perfect)pts+=[0,800,1200,1800,2000][n]*G.level;
 G.score+=pts;G.lines+=n;if(n===4)G.stats.tetrises++;if(ts&&n)G.stats.tspins++;G.stats.maxCombo=Math.max(G.stats.maxCombo,G.combo);
 const oldLv=G.level;G.level=Math.floor(G.lines/10)+G.startLevel;
 if(n||ts)emit('clear',{rows,n,cleared,ts,b2b:b2bHit,combo:G.combo,pts,perfect});
 if(G.level>oldLv)emit('levelup',{level:G.level});
 G.holdUsed=false;spawn();}
function gameOver(why){G.state='over';G.overT=0;G.cur=G.cur||null;G.newHi=false;if(G.score>G.hi){G.hi=G.score;G.newHi=true;try{localStorage.setItem(HI_KEY,String(G.hi));}catch(e){}}emit('gameover',{why});}
function update(dt){
 if(G.state!=='play'||!G.cur)return;
 const g=gravInterval(G.level),iv=G.soft?Math.max(g/20,0.02):g;
 G.grav+=dt;
 while(G.grav>=iv&&G.cur){G.grav-=iv;const c=G.cur;if(fits(c.t,c.r,c.x,c.y+1)){c.y++;if(G.soft){G.score+=1;emit('soft');}G.lastRot=false;checkLowest();}else{G.grav=0;break;}}
 if(G.cur&&grounded()){G.lockT+=dt;if(G.lockT>=LOCK_DELAY)lock();}else G.lockT=0;}
// ================= BRICK GEOMETRY (verbatim) =================
function brickGeometry(){
 const s=0.9,r=0.13,h=s/2,sh=new THREE.Shape();
 sh.moveTo(-h+r,-h);sh.lineTo(h-r,-h);sh.quadraticCurveTo(h,-h,h,-h+r);sh.lineTo(h,h-r);sh.quadraticCurveTo(h,h,h-r,h);sh.lineTo(-h+r,h);sh.quadraticCurveTo(-h,h,-h,h-r);sh.lineTo(-h,-h+r);sh.quadraticCurveTo(-h,-h,-h+r,-h);
 const body=new THREE.ExtrudeGeometry(sh,{depth:0.62,bevelEnabled:true,bevelThickness:0.05,bevelSize:0.04,bevelSegments:2,curveSegments:3});body.translate(0,0,-0.36);
 const stud=new THREE.CylinderGeometry(0.255,0.275,0.17,16,1,false);stud.rotateX(Math.PI/2);stud.translate(0,0,0.31+0.085);
 const top=new THREE.CylinderGeometry(0.22,0.255,0.03,16,1,false);top.rotateX(Math.PI/2);top.translate(0,0,0.31+0.17+0.015);
 const parts=[body,stud,top].map(g=>g.index?g.toNonIndexed():g);
 let n=0;parts.forEach(g=>n+=g.attributes.position.count);const P=new Float32Array(n*3),N=new Float32Array(n*3);let o=0;
 parts.forEach(g=>{P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);o+=g.attributes.position.count;});
 const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(P,3));out.setAttribute('normal',new THREE.BufferAttribute(N,3));return out;}
// ================= ARCADE WINDOW RENDERING =================
const CELL = 0.355, X0 = HALF - 0.32, ZC = 0, YB = 0.55;          // board 10 x 20 visible rows = 3.55 x 7.1 m, centred in the middle window pane (z -4..4)
const VIS = H - HID;
const grp = new THREE.Group(); grp.name = 'neonBricks'; grp.position.set(X0, YB, ZC - W * CELL / 2 + CELL / 2); grp.rotation.y = -Math.PI / 2; grp.scale.setScalar(CELL); room.add(grp);
// local x = column (-> world +z, left to right as you face the window), local y = row up from the bottom, studs face the room
const BRICK = brickGeometry();
const brickMat = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xb0b0b0, shininess: 120, emissive: 0x2a2a2a }); brickMat.name = 'neonBricks';
const ghostMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, transparent: true, opacity: 0.26, depthWrite: false, shininess: 30 }); ghostMat.name = 'neonBricksGhost';
const HEXC = {}; TYPES.forEach(t => HEXC[t] = new THREE.Color(HEX[t]));
function inst(n, mat, name) { const m = new THREE.InstancedMesh(BRICK, mat, n); m.name = name; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); const w = new THREE.Color(1, 1, 1);
  for (let i = 0; i < n; i++) m.setColorAt(i, w); m.count = 0; m.frustumCulled = false; grp.add(m); return m; }
const boardM = inst(W * VIS, brickMat, 'nbBoard'), curM = inst(4, brickMat, 'nbCur'), ghostM = inst(4, ghostMat, 'nbGhost');
// neon well outline (sides + floor), so the empty playfield reads against the sky
const tubeC = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3ff3ff).multiplyScalar(1.6), fog: false }), tubeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3fd2).multiplyScalar(1.6), fog: false });
for (const [w, h, x, y, m] of [[0.12, VIS + 0.4, -0.62, (VIS - 1) / 2, tubeC], [0.12, VIS + 0.4, W - 0.38, (VIS - 1) / 2, tubeC], [W + 0.36, 0.14, (W - 1) / 2, -0.62, tubeM]]) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), m); b.position.set(x, y, 0); b.name = 'nbWell'; grp.add(b); }
const M4 = new THREE.Matrix4(), V3 = new THREE.Vector3(), camBase = { on: false, p: new THREE.Vector3(), q: new THREE.Quaternion() };
const put = (m, i, x, y, col) => { M4.makeTranslation(x, VIS - 1 - (y - HID), 0); m.setMatrixAt(i, M4); m.setColorAt(i, col); };
// ---- score / level panel in the right-hand window section ----
let msg = '', msgT = 0;
const pc = document.createElement('canvas'); pc.width = 512; pc.height = 640; const px = pc.getContext('2d');
const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.75), new THREE.MeshBasicMaterial({ map: ptex, transparent: true, depthWrite: false, fog: false }));
panel.name = 'nbPanel'; panel.position.set(HALF - 0.3, 4.6, 7.6); panel.rotation.y = -Math.PI / 2; panel.renderOrder = 3; room.add(panel);
let panelKey = '';
function drawPanel(msg) {
  const nx = G.queue && G.queue[0], key = [G.state, G.score, G.level, G.lines, G.hi, nx, msg || ''].join('|'); if (key === panelKey) return; panelKey = key;
  const g = px, w = 512, h = 640; g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(8,4,20,0.45)'; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 26); g.fill(); g.lineWidth = 4; g.strokeStyle = '#ff3fd2'; g.shadowColor = '#ff3fd2'; g.shadowBlur = 14; g.stroke(); g.shadowBlur = 0;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const neonT = (t, y, size, col, glow) => { g.font = `900 ${size}px "Arial Black", Arial, sans-serif`; g.shadowColor = glow || col; g.shadowBlur = 16; g.fillStyle = col; g.fillText(t, w / 2, y); g.shadowBlur = 0; };
  neonT('NEON', 62, 54, '#ffe14a', '#ff9a1a'); neonT('BRICKS', 118, 54, '#3ff3ff');
  const row = (lab, val, y) => { g.font = '700 28px "Courier New", monospace'; g.fillStyle = '#c8b8ff'; g.fillText(lab, w / 2, y); neonT(String(val), y + 40, 44, '#ffffff', '#ff3fd2'); };
  row('SCORE', G.score, 180); row('LEVEL', G.level, 280); row('LINES', G.lines, 380);
  g.font = '700 24px "Courier New", monospace'; g.fillStyle = '#ffe14a'; g.fillText('HI ' + G.hi, w / 2, 470);
  if (G.state === 'play' && nx) { g.font = '700 22px "Courier New", monospace'; g.fillStyle = '#c8b8ff'; g.fillText('NEXT', w / 2, 510);
    const cs = CELLS[nx][0], s = 26, minx = Math.min(...cs.map(c => c[0])), maxx = Math.max(...cs.map(c => c[0])), miny = Math.min(...cs.map(c => c[1])), maxy = Math.max(...cs.map(c => c[1]));
    const ox = w / 2 - (maxx - minx + 1) * s / 2, oy = 548 - (maxy - miny + 1) * s / 2 + 20;
    for (const [cx, cy] of cs) { const x = ox + (cx - minx) * s, y = oy + (cy - miny) * s; g.fillStyle = HEX[nx]; g.fillRect(x + 1, y + 1, s - 2, s - 2); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x + s / 2, y + s / 2, s * 0.28, 0, 7); g.fill(); }
    if (msg) neonT(msg, 612, msg.length > 10 ? 28 : 34, '#fff6b0', '#ffe14a'); }
  else { neonT(msg || (G.state === 'over' ? 'GAME OVER' : 'WALK UP + PLAY'), 560, msg && msg.length > 10 ? 30 : 36, '#ff6fd8'); }
  ptex.needsUpdate = true; }
// ---- render the board state into the instanced meshes ----
let boardDirty = true;
function sync() {
  if (boardDirty) { let n = 0; for (let y = HID; y < H; y++) for (let x = 0; x < W; x++) { const v = G.board[y][x]; if (v) put(boardM, n++, x, y, HEXC[TYPES[v - 1]]); }
    boardM.count = n; boardM.instanceMatrix.needsUpdate = true; if (boardM.instanceColor) boardM.instanceColor.needsUpdate = true; boardDirty = false; }
  const c = G.state === 'play' && G.cur; let n = 0, ng = 0;
  if (c) { const gy = ghostY(); for (const [dx, dy] of CELLS[c.t][c.r]) { if (c.y + dy >= HID) put(curM, n++, c.x + dx, c.y + dy, HEXC[c.t]); if (gy !== c.y && gy + dy >= HID) put(ghostM, ng++, c.x + dx, gy + dy, HEXC[c.t]); } }
  curM.count = n; ghostM.count = ng; curM.instanceMatrix.needsUpdate = ghostM.instanceMatrix.needsUpdate = true; if (curM.instanceColor) curM.instanceColor.needsUpdate = true; if (ghostM.instanceColor) ghostM.instanceColor.needsUpdate = true; }
// ---- little sounds (shared arcade audio context, respects mute) ----
function blip(f0, f1, dur, vol, type) { try { const ac = window.__unlockAC; if (!ac || window.__muted || (window.__mute && window.__mute.muted)) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02); } catch (e) {} }
function drain() { for (const e of G.events) {
  if (e.type === 'lock' || e.type === 'clear' || e.type === 'newgame' || e.type === 'hard') boardDirty = true;
  if (e.type === 'rotate') blip(660, 880, 0.05, 0.05); else if (e.type === 'move') blip(330, 300, 0.03, 0.03); else if (e.type === 'lock') blip(180, 90, 0.08, 0.07, 'triangle');
  else if (e.type === 'clear' && e.n) { blip(500, 1400, 0.25, 0.07, 'sawtooth'); msg = e.n === 4 ? 'NEON BRICKS!' : ['', 'SINGLE', 'DOUBLE', 'TRIPLE'][e.n]; if (e.ts) msg = 'T-SPIN ' + msg; msgT = 1.4; api.clears++; }
  else if (e.type === 'levelup') { msg = 'LEVEL ' + e.level; msgT = 1.4; }
  else if (e.type === 'gameover') { blip(400, 60, 0.9, 0.08, 'sawtooth'); stop('over'); } }
  G.events.length = 0; }
// ---- input ----
const rep = { dir: 0, t: 0 }, DAS = 0.2, ARR = 0.07;
function joy(jx, jy, dt) {   // joystick / keys: left-right auto-repeat, down = soft drop
  const d = jx > 0.45 ? 1 : jx < -0.45 ? -1 : 0;
  if (d !== rep.dir) { rep.dir = d; rep.t = 0; if (d) move(d); } else if (d) { rep.t += dt; while (rep.t >= DAS) { move(d); rep.t -= ARR; } }
  G.soft = jy > 0.6 && Math.abs(jy) > Math.abs(jx); }
const api = { G, grp, panel, playing: false, zoom: false, zoomK: 0, near: false, clears: 0, starts: 0, rotates: 0, moves: 0,
  get mats() { return [brickMat, ghostMat]; },
  start() { if (api.playing) return; newGame(); api.playing = true; api.starts++; boardDirty = true; G.events.length = 0; boardDirty = true; msg = ''; drawPanel(); onState && onState(true); },
  stop, rotate() { if (api.playing && rotate(1)) api.rotates++; }, hardDrop() { if (api.playing) hardDrop(); },
  move(d) { if (api.playing && move(d)) api.moves++; },
  joy, toggleZoom() { if (api.playing) api.zoom = !api.zoom; },
  update(dt) {
    const m = getMonkey(); api.near = !!(m && !api.playing && m.position.x > HALF - 4.2 && Math.abs(m.position.z - ZC) < 2.4 && m.position.y < 1);
    if (api.playing) { update(Math.min(dt, 0.1)); drain(); }
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) msg = ''; }
    api.zoomK += ((api.playing && api.zoom ? 1 : 0) - api.zoomK) * (1 - Math.exp(-dt * 7)); if (api.zoomK < 0.002) api.zoomK = 0;
    sync(); drawPanel(msg); },
  // ZOOM: frame the 10 x 20 playfield so it fills the screen, eased with zoomK
  restoreCam(cam) { if (camBase.on) { cam.position.copy(camBase.p); cam.quaternion.copy(camBase.q); camBase.on = false; } },   // undo last frame's zoom before the follow camera runs
  camera(cam) { if (api.zoomK <= 0) return false;
    camBase.p.copy(cam.position); camBase.q.copy(cam.quaternion); camBase.on = true;
    const hh = VIS * CELL / 2 + 0.35, hw = W * CELL / 2 + 0.3, yc = YB + (VIS - 1) * CELL / 2, t = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const d = Math.max(hh / t, hw / (t * cam.aspect)), zx = X0 - 0.3 - d;
    const k = api.zoomK * api.zoomK * (3 - 2 * api.zoomK);
    V3.copy(cam.position); cam.position.lerp(V3.set(zx, yc, ZC), k);
    const look = new THREE.Vector3(); cam.getWorldDirection(look); look.multiplyScalar(10).add(V3.copy(cam.position));
    cam.lookAt(look.lerp(new THREE.Vector3(X0, yc, ZC), k)); return k > 0.35; } };
function stop(why) { if (!api.playing) return; api.playing = false; api.zoom = false; rep.dir = 0; G.soft = false; if (why !== 'over') G.state = 'title'; msg = ''; panelKey = ''; drawPanel(); onState && onState(false); }
drawPanel(); sync();
return api; }
