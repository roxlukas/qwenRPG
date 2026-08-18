
"use strict";
// ---- stałe + paleta ----
const COLS=20, ROWS=15, CS=32;
const canvas=document.getElementById('view');
canvas.width=COLS*CS; canvas.height=ROWS*CS;
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

const P={
 '#':'#2b2420', o:'#b7aa95', W:'#1c1814', w:'#3f5f72', s:'#cfe0ea',
 g:'#7a6f3f', a:'#7f9a3a', A:'#c3d25c', m:'#c98a3b', M:'#4f5e67',
 K:'#e0b24d', k:'#7a5a22', E:'#3f8fd9', D:'#b0392f', d:'#e07a6f',
 v:'#4f8f5a', V:'#7fd08a', R:'#7a3a2a', T:'#8a5a3a', F:'#e8e0d0',
 b:'#d8cdb8', n:'#2e2a24', f:'#262b30', p:'#8491a0'
};
// ---- fabryka sprite'ów (16x16, skalowane 2x) ----
function R(g,x,y,w,h,c){ g.fillStyle=P[c]; g.fillRect(x,y,w,h); }
function makeSprite(draw){
  const c=document.createElement('canvas'); c.width=16; c.height=16;
  const g=c.getContext('2d'); g.fillStyle=P['#']; g.fillRect(0,0,16,16); draw(g); return c;
}
function blit(key,cx,cy){ ctx.drawImage(SPR[key], cx*CS, cy*CS, CS, CS); }

const SPR={
 floor:makeSprite(g=>{ g.fillStyle=P.f; g.fillRect(0,0,16,16); R(g,3,4,2,2,'p'); R(g,11,9,2,2,'p'); R(g,6,12,1,1,'p'); R(g,13,3,1,1,'p'); }),
 wall:makeSprite(g=>{ R(g,1,1,14,1,'o'); R(g,2,3,12,1,'g'); R(g,4,6,2,1,'o'); R(g,10,10,2,1,'o'); R(g,2,12,3,1,'o'); R(g,9,13,3,1,'o'); }),
 door:makeSprite(g=>{ R(g,3,1,1,14,'k'); R(g,12,1,1,14,'k'); R(g,4,1,8,14,'T'); R(g,5,2,6,13,'W'); R(g,9,8,1,2,'K'); }),
 stairs:makeSprite(g=>{ R(g,9,7,7,7,'W'); R(g,11,9,5,5,'o'); R(g,13,11,3,3,'W'); R(g,14,13,1,1,'#'); }),
 grass:makeSprite(g=>{ R(g,2,9,12,5,'g'); R(g,3,6,2,4,'a'); R(g,6,4,2,6,'a'); R(g,9,5,2,5,'a'); R(g,12,6,2,4,'A'); R(g,2,12,2,3,'a'); R(g,13,12,1,2,'A'); }),
 herb:makeSprite(g=>{ R(g,2,6,12,8,'g'); R(g,3,4,10,3,'a'); R(g,5,3,6,2,'A'); R(g,4,7,1,1,'F'); R(g,8,6,1,1,'F'); R(g,11,8,1,1,'F'); }),
 water:makeSprite(g=>{ R(g,1,1,14,14,'w'); R(g,3,4,2,1,'s'); R(g,8,6,3,1,'s'); R(g,4,9,2,1,'s'); R(g,11,11,2,1,'s'); R(g,2,13,3,1,'#'); }),
 key:makeSprite(g=>{ R(g,4,3,4,4,'K'); R(g,5,4,2,2,'#'); R(g,5,7,3,5,'K'); R(g,7,11,2,1,'k'); R(g,6,11,1,1,'k'); }),
 mushroom:makeSprite(g=>{ R(g,6,10,4,5,'F'); R(g,3,5,10,5,'m'); R(g,2,4,12,2,'m'); R(g,4,3,8,2,'m'); R(g,5,6,1,1,'F'); R(g,8,6,1,1,'F'); R(g,10,6,1,1,'F'); }),
 eye:makeSprite(g=>{ R(g,4,4,8,8,'M'); R(g,5,5,6,6,'E'); R(g,7,6,2,2,'F'); R(g,11,4,2,2,'M'); }),
 skeleton:makeSprite(g=>{ R(g,5,1,6,5,'b'); R(g,6,3,1,1,'D'); R(g,9,3,1,1,'D'); R(g,4,7,8,1,'b'); R(g,4,9,8,1,'b'); R(g,4,11,8,1,'b'); R(g,7,8,2,6,'#'); }),
 bat:makeSprite(g=>{ R(g,2,7,4,3,'M'); R(g,10,7,4,3,'M'); R(g,6,6,4,5,'M'); R(g,3,9,2,2,'M'); R(g,11,9,2,2,'M'); R(g,7,8,1,1,'D'); R(g,9,8,1,1,'D'); }),
 goblin:makeSprite(g=>{ R(g,5,2,6,4,'a'); R(g,3,3,2,3,'a'); R(g,11,3,2,3,'a'); R(g,6,3,1,1,'D'); R(g,9,3,1,1,'D'); R(g,4,6,8,6,'a'); R(g,5,7,6,3,'A'); R(g,4,12,8,2,'a'); }),
 player:makeSprite(g=>{ R(g,5,1,6,4,'v'); R(g,6,2,4,2,'F'); R(g,7,2,1,1,'R'); R(g,8,2,1,1,'R'); R(g,4,5,8,6,'v'); R(g,5,6,6,4,'V'); R(g,4,11,8,3,'v'); R(g,11,5,1,4,'K'); R(g,12,4,1,2,'b'); R(g,5,7,5,1,'k'); })
};
// ---- stan gry ----------------------------------------------------------------
let map, explored, visible, enemies=[], player=null;
let depth=1, turn=0, potions=2, keys=0, coins=0, state='playing', shake=0;
let stairs={x:0,y:0};
const MAXDEPTH=5;
const ROMAN=['I','II','III','IV','V'];
const $=id=>document.getElementById(id);
const logEl=$('log');

function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i];a[i]=a[j];a[j]=t; } return a; }
function inBounds(x,y){ return x>=0&&y>=0&&x<COLS&&y<ROWS; }
function roman(d){ return ROMAN[d-1] || (d+''); }

function log(msg, cls){
  const div=document.createElement('div');
  div.className=cls||'n'; div.textContent=msg;
  logEl.appendChild(div); logEl.scrollTop=logEl.scrollHeight;
  while(logEl.children.length>40) logEl.removeChild(logEl.firstChild);
}
function floatText(cx,cy,text,color){
  const el=document.createElement('div');
  el.className='fx'; el.textContent=text; el.style.color=color;
  el.style.left=(cx*CS+CS/2)+'px'; el.style.top=(cy*CS+CS/2)+'px';
  $('fx').appendChild(el); setTimeout(()=>el.remove(),1000);
}
function hud(){
  $('lvl').textContent=player.level;
  $('hpsub').textContent=player.hp+'/'+player.maxhp;
  $('hp').firstElementChild.style.width=Math.max(0,player.hp/player.maxhp*100)+'%';
  $('xpsub').textContent=player.xp+'/'+player.xpNeed;
  $('xp').firstElementChild.style.width=Math.max(0,player.xp/player.xpNeed*100)+'%';
  $('depth').textContent=roman(depth);
  $('potcnt').textContent=potions;
  $('keycnt').textContent=keys;
  $('coincnt').textContent=coins;
}

const ETYPES={
 bat:{name:'nietoperz', hp:6, atk:3, xp:6, flying:true},
 goblin:{name:'goblin', hp:12, atk:4, xp:10},
 skeleton:{name:'szkielet', hp:16, atk:5, xp:14},
 eye:{name:'magiczna okula', hp:20, atk:6, xp:20},
 boss:{name:'Strażnik Głębin', hp:42, atk:8, xp:60}
};
// ---- generowanie krypt ------------------------------------------------------
function newGrid(){ const a=[]; for(let y=0;y<ROWS;y++) a.push(new Array(COLS).fill('wall')); return a; }

function genDungeon(){
  map=newGrid(); explored=newGrid(); for(let y=0;y<ROWS;y++) explored[y]=explored[y].map(()=>false);
  visible=newGrid(); for(let y=0;y<ROWS;y++) visible[y]=visible[y].map(()=>false);
  const rooms=[];
  for(let i=0;i<7;i++){
    const w=ri(3,6), h=ri(3,4);
    const x=ri(1,COLS-1-w), y=ri(1,ROWS-1-h);
    for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) map[yy][xx]='floor';
    rooms.push({x,y,w,h,cx:x+(w>>1),cy:y+(h>>1)});
  }
  for(let i=1;i<rooms.length;i++){
    const a=rooms[i-1], b=rooms[i];
    let x=a.cx; while(x!==b.cx){ map[a.cy][x]='floor'; x+=Math.sign(b.cx-a.cx)||1; }
    let y=a.cy; while(y!==b.cy){ map[y][b.cx]='floor'; y+=Math.sign(b.cy-a.cy)||1; }
  }
  // start: gwarantowana komora w centrum
  const cx=COLS>>1, cy=ROWS>>1;
  for(let yy=cy-1;yy<=cy+1;yy++) for(let xx=cx-2;xx<=cx+2;xx++) if(inBounds(xx,yy)) map[yy][xx]='floor';

  if(depth<2){ // dekoracje: trawa
    scatter('grass',3);
  }
  // drabiny w najbardziej oddalonej komorze
  let far=rooms[0], best=-1;
  for(const r of rooms){ const d=(r.cx-cx)*(r.cx-cx)+(r.cy-cy)*(r.cy-cy); if(d>best){best=d;far=r;} }
  stairs={x:far.cx,y:far.cy}; map[stairs.y][stairs.x]='stairs';

  // trawa / woda
  scatter('grass', 2+depth);
  const wat=placeWater(depth);
  // zioła / klucze
  const cands=listWalk().filter(t=>!(t.x===player.x&&t.y===player.y)&&!(t.x===stairs.x&&t.y===stairs.y));
  shuffle(cands);
  let used=0;
  const herbs=depth===1?2:1;
  for(let i=0;i<herbs&&cands.length;i++){ map[cands[used].y][cands[used].x]='herb'; used++; }
  if(depth>=2 && cands.length>used){ map[cands[used].y][cands[used].x]='key'; used++; }
  if(depth>=2 && cands.length>used){ map[cands[used].y][cands[used].x]='door'; used++; }

  // wrogi
  spawnEnemies();
}
function scatter(type,n){
  for(let i=0;i<n;i++){
    const x=ri(1,COLS-2), y=ri(1,ROWS-2);
    if(map[y][x]==='floor' && !(x===player.x&&y===player.y) && !(x===stairs.x&&y===stairs.y)) map[y][x]=type;
  }
}
function placeWater(n){
  let placed=0;
  for(let i=0;i<n&&placed<n;i++){
    const x=ri(1,COLS-2), y=ri(1,ROWS-2);
    if(map[y][x]!=='floor') continue;
    if(x===player.x&&y===player.y) continue; if(x===stairs.x&&y===stairs.y) continue;
    map[y][x]='water';
    if(!connected(player.x,player.y,stairs.x,stairs.y)){ map[y][x]='floor'; continue; }
    placed++;
  }
  return placed;
}
function listWalk(){
  const a=[]; for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){ const t=map[y][x]; if(t==='floor'||t==='grass') a.push({x,y}); } return a;
}
function passable(x,y){ if(!inBounds(x,y)) return false; return map[y][x]!=='wall' && map[y][x]!=='water'; }
function connected(x0,y0,x1,y1){
  const seen={}; const q=[[x0,y0]]; seen[x0+','+y0]=1;
  while(q.length){
    const [x,y]=q.shift();
    if(x===x1&&y===y1) return true;
    const dd=[[1,0],[-1,0],[0,1],[0,-1]];
    for(const d of dd){ const nx=x+d[0],ny=y+d[1]; if(passable(nx,ny)&&!seen[nx+','+ny]){ seen[nx+','+ny]=1; q.push([nx,ny]); } }
  }
  return false;
}
function spawnEnemies(){
  let pool=['bat','goblin','skeleton','eye'];
  if(depth===5) pool=['eye','skeleton','bat','boss'];
  const count=3+depth;
  const cands=listWalk().filter(t=>!(t.x===player.x&&t.y===player.y)&&!(t.x===stairs.x&&t.y===stairs.y));
  shuffle(cands);
  enemies=[];
  for(let i=0;i<count&&i<cands.length;i++){
    const t=cands[i], type=pool[i%pool.length], s=ETYPES[type];
    enemies.push({type,name:s.name,x:t.x,y:t.y,hp:s.hp+depth,maxhp:s.hp+depth,
      atk:s.atk+Math.floor(depth/3),xp:s.xp,flying:!!s.flying,alive:true});
  }
}
//__FOV__
// ---- FOV (pole widzenia) ----
const VISION=6;
function los(x0,y0,x1,y1){
  let dx=Math.abs(x1-x0), dy=Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1, err=dx-dy, x=x0, y=y0;
  while(!(x===x1 && y===y1)){
    if(map[y][x]==='wall') return false;
    const e2=2*err;
    if(e2>=-dy){ err-=dy; x+=sx; }
    if(e2<=dx){ err+=dx; y+=sy; }
  }
  return true;
}
function computeFov(){
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) visible[y][x]=false;
  for(let dy=-VISION;dy<=VISION;dy++) for(let dx=-VISION;dx<=VISION;dx++){
    const x=player.x+dx, y=player.y+dy;
    if(!inBounds(x,y) || dx*dx+dy*dy>VISION*VISION) continue;
    if(los(player.x,player.y,x,y)){ visible[y][x]=true; explored[y][x]=true; }
  }
  visible[player.y][player.x]=true; explored[player.y][player.x]=true;
}
// ---- ruch, walka, skrzynia ----
function tryMove(dx,dy){
  const nx=player.x+dx, ny=player.y+dy;
  const e=enemies.find(o=>o.alive && o.x===nx && o.y===ny);
  if(e){ attack(e); return; }
  if(!inBounds(nx,ny)) return;
  const t=map[ny][nx];
  if(t==='wall' || t==='water') return;
  if(t==='door'){
    if(keys>0){ const c=ri(3,20)+depth; keys--; map[ny][nx]='floor'; coins+=c; if(c===20+depth) log('Otwierasz drzwi! ✨ CRITICAL: +'+c+' monet!','g'); else log('Otwierasz drzwi (−1 klucza). +'+c+' monet.','p'); }
    else { log('Zamknięte — potrzebujesz klucza.','t'); endTurn(); return; }
  }
  player.x=nx; player.y=ny;
  pickUp(nx,ny);
  endTurn();
}
function pickUp(x,y){
  const t=map[y][x];
  if(t==='herb'){ map[y][x]='floor'; potions++; log('Zbierasz zioło. (+1 miód)','g'); }
  else if(t==='key'){ map[y][x]='floor'; keys++; log('Zbierasz klucz. (+1)','g'); }
  else if(t==='stairs') descend();
}
function descend(){
  depth++;
  log('Znajdujesz zejście w dół…','p');
  if(depth>MAXDEPTH){ win(); return; }
  log('Schodzisz na pogłębienie '+roman(depth)+'.','p');
  setPlayerStart(); genDungeon();
}
function setPlayerStart(){ player.x=COLS>>1; player.y=ROWS>>1; }
function attack(e){
  const dmg=Math.max(1, player.atk+ri(0,3));
  e.hp-=dmg;
  floatText(e.x,e.y,'−'+dmg,'#ff0000');
  if(e.hp<=0){ e.alive=false; const c=ri(0,4)+depth; if(c>0){ coins+=c; log(e.name+' pada! +'+e.xp+' XP, +'+c+' monet.','g'); } else { log(e.name+' pada! +'+e.xp+' XP.','g'); } gainXp(e.xp); }
  else log('Uderzasz: '+e.name+' (−'+dmg+').','n');
  endTurn();
}
function gainXp(n){
  player.xp+=n;
  while(player.xp>=player.xpNeed){
    player.xp-=player.xpNeed; player.level++;
    const healed=player.maxhp+8-player.hp;
    player.maxhp+=8; player.hp=player.maxhp; player.atk+=1;
    player.xpNeed=Math.round(player.xpNeed*1.6);
    floatText(player.x,player.y,'+'+healed,'#00dd00');
    log('Awans! Poziom '+player.level+' — HP uleczone, +1 atak.','g');
  }
}
function usePotion(){
  if(state!=='playing') return;
  if(potions<=0){ log('Nie masz miodu.','t'); return; }
  if(player.hp>=player.maxhp){ log('Pełne HP.','n'); return; }
  potions--;
  const heal=12+player.level*2;
  const before=player.hp;
  player.hp=Math.min(player.maxhp, before+heal);
  floatText(player.x,player.y,'+'+(player.hp-before),'#00dd00');
  log('Wypijasz miód. (+'+heal+' HP)','g');
  endTurn();
}
// ---- wrogowie (AI) ----
function enemiesAct(){
  for(const e of enemies){
    if(!e.alive) continue;
    const dx=player.x-e.x, dy=player.y-e.y;
    if(Math.abs(dx)+Math.abs(dy)===1){ damagePlayer(e); if(state!=='playing') return; continue; }
    stepToward(e,dx,dy);
  }
}
function stepToward(e,dx,dy){
  const adx=Math.abs(dx), ady=Math.abs(dy), opts=[];
  if(adx>ady) opts.push([Math.sign(dx),0],[0,Math.sign(dy)]);
  else if(ady>adx) opts.push([0,Math.sign(dy)],[Math.sign(dx),0]);
  else { const sx=Math.sign(dx), sy=Math.sign(dy); if(sx)opts.push([sx,0]); if(sy)opts.push([0,sy]); }
  for(const [ox,oy] of opts){ if(!ox&&!oy) continue; if(canOccupy(e,e.x+ox,e.y+oy)){ e.x+=ox; e.y+=oy; return; } }
}
function canOccupy(e,x,y){
  if(!inBounds(x,y)) return false;
  const t=map[y][x];
  if(t==='wall') return false;
  if(t==='water' && !e.flying) return false;
  if(t==='door') return false;
  if(x===player.x && y===player.y) return false;
  for(const o of enemies){ if(o!==e && o.alive && o.x===x && o.y===y) return false; }
  return true;
}
function damagePlayer(e){
  const dmg=Math.max(1, e.atk-1+ri(0,1));
  player.hp-=dmg; shake=5;
  floatText(player.x,player.y,'−'+dmg,'#ff0000');
  log(e.name+' atakuje. (−'+dmg+' HP)','t');
  if(player.hp<=0){ player.hp=0; gameOver(); }
}
// ---- tury, koniec ----
function endTurn(){
  if(state!=='playing') return;
  turn++;
  enemiesAct();
  if(state!=='playing') return;
  computeFov(); hud(); render();
}
function gameOver(){
  state='dead'; computeFov(); hud(); render();
  log('Ciemność pochłania wszystko…','t');
  showOverlay('Kres wyprawy','Zginąłeś na pogłębieniu '+roman(depth)+' po '+turn+' ruchach. Krypty wciąż szepczą o kolejnych odważnych.', 'Wstań i spróbuj znów', startGame);
}
function win(){
  state='won'; render();
  log('Światło na powierzchni! Uciekłeś z Głębi Krypt.','g');
  showOverlay('Odwaga nagrodzona','Pięć pogłębień pod stopami, a ty wracasz ze światłem w oczach. Głębia oddaje ci wolność — i kolejny skarb.', 'Zagraj ponownie', startGame);
}
// ---- nakładka / start ----
function showOverlay(title,text,btn,cb){
  $('ovtitle').textContent=title; $('ovtext').textContent=text;
  const b=$('ovbtn'); b.textContent=btn; b.onclick=cb;
  $('overlay').hidden=false; state='menu';
}
function showIntro(){
  showOverlay('Głębia Krypt','Schodź pięć pogłębień: zbieraj zioła i klucze, pokonuj strażników i znajdź wyjście w ciemności.  Ruch: strzały / WASD · Miód: H lub 1 · Atak: wchodź na wroga.','Wchodź', startGame);
}
function startGame(){
  state='playing'; depth=1; turn=0; potions=2; keys=0; coins=0; shake=0;
  player={x:COLS>>1,y:ROWS>>1, level:1, hp:30, maxhp:30, atk:4, xp:0, xpNeed:24};
  logEl.innerHTML=''; $('overlay').hidden=true; shopOpen=false; $('shop').hidden=true;
  log('Wkraczasz w korytarze Głębi Krypt…','p');
  log('Wskazówka: szukaj ziół, kluczy i zejścia. [T] — sklep.','n');
  setPlayerStart(); genDungeon(); computeFov(); hud(); render();
}
// ---- render + sprite bossa ----
SPR.boss=makeSprite(g=>{ R(g,3,1,10,5,'M'); R(g,4,3,2,2,'D'); R(g,9,3,2,2,'D'); R(g,4,6,8,7,'M'); R(g,6,7,4,3,'E'); R(g,4,13,4,2,'M'); R(g,9,13,4,2,'M'); R(g,7,1,2,1,'K'); });
const TILE_SPRITE={wall:'wall',floor:'floor',grass:'grass',water:'water',herb:'herb',key:'key',door:'door',stairs:'stairs'};
function render(){
  ctx.save();
  if(shake>0){ const t=shake*.7; ctx.translate(ri(-t,t),ri(-t,t)); shake=Math.max(0,shake-1); }
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    if(!explored[y][x]){ ctx.fillStyle='#0d0a08'; ctx.fillRect(x*CS,y*CS,CS,CS); continue; }
    blit(TILE_SPRITE[map[y][x]]||'floor',x,y);
    if(!visible[y][x]){ ctx.fillStyle='rgba(10,8,5,.55)'; ctx.fillRect(x*CS,y*CS,CS,CS); }
  }
  for(const e of enemies){ if(e.alive && visible[e.y][e.x]) blit(e.type,e.x,e.y); }
  blit('player',player.x,player.y);
  ctx.restore();
}
// ---- sklep ----
let shopOpen=false;
const POTION_PRICE=10;
function toggleShop(){
  shopOpen=!shopOpen;
  const el=$('shop');
  el.hidden=!shopOpen;
  if(shopOpen){ $('shopcoins').textContent=coins; log('Otwierasz sklep. [Enter] kup, [T] zamknij.','p'); }
}
function buyPotion(){
  if(coins<POTION_PRICE){ log('Za mało monet (potrzeba '+POTION_PRICE+').','t'); return; }
  coins-=POTION_PRICE; potions++;
  $('shopcoins').textContent=coins;
  log('Kupujesz miód (−'+POTION_PRICE+' 🪙).','g');
  hud();
}
// ---- wejście + uruchomienie ----
function onKey(ev){
  const k=ev.key.toLowerCase();
  if(state!=='playing'){
    if(k==='enter'||k===' '||k==='escape'){ const cb=$('ovbtn').onclick; if(cb) cb(); }
    return;
  }
  if(shopOpen){
    if(k==='t'||k==='escape') toggleShop();
    else if(k==='enter'||k===' ') buyPotion();
    ev.preventDefault(); return;
  }
  if(k==='t'){ toggleShop(); ev.preventDefault(); }
  else if(k==='arrowup'||k==='w'){ tryMove(0,-1); ev.preventDefault(); }
  else if(k==='arrowdown'||k==='s'){ tryMove(0,1); ev.preventDefault(); }
  else if(k==='arrowleft'||k==='a'){ tryMove(-1,0); ev.preventDefault(); }
  else if(k==='arrowright'||k==='d'){ tryMove(1,0); ev.preventDefault(); }
  else if(k==='h'||k==='1'||k==='p'){ usePotion(); ev.preventDefault(); }
}
window.addEventListener('keydown',onKey);
showIntro();
