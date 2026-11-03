// BLASTER (arcade copy only, injected inside the game's IIFE): gold monkey tickets for each freighter destroyed (more on later levels,
// capped per kill and per run so it can't be farmed), a silent attract DEMO (autopilot, never dies, never saves the high score),
// one credit (5 tickets) = one run of 3 ships, no free restart on GAME OVER (the arcade returns to its demo). Every ticket is banked
// in the arcade at once (TicketArt.collect -> neonarcade.tickets); the ticket flying to the arcade's gold counter is just the show.
var TK={got:0,run:0,drops:0,kills:0,log:[],RUN_CAP:60};
TK.per=function(lv){return Math.min(6,1+Math.floor(lv*0.8));};   // L1 1, L2 2, L3 3, L4 4, L5-6 5, L7+ 6 per freighter
var D={on:false,runs:0,kills:0},CREDIT=false,HOLD=false,userSnd=soundOn;
function tgt(){try{var pt=parent.document.getElementById('tix'),fe=frameElement;if(pt&&fe){var a=pt.getBoundingClientRect(),b=fe.getBoundingClientRect(),k=b.width/innerWidth||1;
 if(a.width)return{left:(a.left-b.left)/k,top:(a.top-b.top)/k};}}catch(e){}return{left:8,top:8};}
function fly(gx,gy,k){var r=cv.getBoundingClientRect(),sx=r.left+gx*r.width/W,sy=r.top+gy*r.height/H,t=tgt();
 var c=document.createElement('canvas');c.className='tkFly';try{TicketArt.toCanvas(c,30,false);}catch(e){}
 c.style.left=(sx-15+(k%3-1)*16)+'px';c.style.top=(sy-10-Math.floor(k/3)*12)+'px';document.body.appendChild(c);
 setTimeout(function(){c.style.transform='translate('+(t.left+4-sx+15)+'px,'+(t.top+2-sy+10)+'px) scale(.8)';c.style.opacity='.4';},120+k*70);
 setTimeout(function(){c.remove();},950+k*70);}
var css=document.createElement('style');css.textContent='.tkFly{position:fixed;z-index:7;pointer-events:none;width:30px;height:20px;transition:transform .75s cubic-bezier(.5,-0.4,.7,1),opacity .75s;filter:drop-shadow(0 0 6px #ffd23a)}body.demo #pad,body.demo #snd{visibility:hidden}';document.head.appendChild(css);
function give(n,x,y,why){if(D.on||window.__DEMO)return;n=Math.min(n,TK.RUN_CAP-TK.run);if(n<=0)return;
 for(var i=0;i<n;i++){TicketArt.collect('blaster');TK.got++;TK.run++;fly(x,y,i);}TK.drops++;TK.log.push(why+':'+n+'@L'+S.level);
 beep(1568,.08,'triangle');setTimeout(function(){beep(2093,.1,'triangle');},70);}
TK.give=give;
// no free start: title / game over taps only start a run when the arcade has spent a credit on it
var _start=start;start=function(){if(D.on)return;if(!CREDIT)return;CREDIT=false;_start();};
var _hit=hitShip;hitShip=function(){if(D.on){S.lives++;}_hit();};
var _step=step;step=function(){if(HOLD)return;if(D.on)pilot();var m=S.mode,lv=S.level;_step();
 if(m==='play'&&S.mode==='win'){if(D.on){D.kills++;return;}TK.kills++;give(TK.per(lv),S.f.x+10,S.f.y+3,'freighter');}};
function pilot(){K.l=K.r=0;K.f=0;if(S.mode!=='play')return;var p=S.p,f=S.f,lead=f.dx*speed()*(p.y-f.y)/4,tx=f.x+10+lead-4,danger=0;
 S.bombs.forEach(function(b){if(b.y>p.y-50&&b.y<p.y+4&&b.x>p.x-4&&b.x<p.x+13)danger=b.x<p.x+4?1:-1;});
 if(S.beam)tx=p.x+(p.x>W/2?-30:30);if(danger)tx=p.x+danger*20;
 if(tx<p.x-2)K.l=1;else if(tx>p.x+2)K.r=1;if(Math.abs(f.x+10+lead-(p.x+4))<8&&S.t%12<6)K.f=1;}
function quiet(on){soundOn=on?false:userSnd;try{sl();}catch(e){}}
sb.addEventListener('click',function(){if(!D.on)userSnd=soundOn;else{soundOn=false;sl();}});
D.start=function(){D.on=true;window.__DEMO=true;D.runs++;document.body.classList.add('demo');quiet(true);_start();};
D.stop=function(){D.on=false;window.__DEMO=false;document.body.classList.remove('demo');K.l=K.r=K.f=0;quiet(false);};
window.__demo=D;window.__TK=TK;
window.__blaster={TK:TK,D:D,S:S,K:K,pilot:pilot,step:function(n){for(var i=0;i<(n||1);i++)step();},
 start:function(){D.stop();userSnd=localStorage.getItem('arcade_blaster_snd')!=='0';quiet(false);TK.run=0;S.hi=+(localStorage.getItem('arcade_blaster_hi')||0);CREDIT=true;start();},
 scene:function(){return S.mode==='over'?'over':S.mode==='title'?'title':'play';},
 hold:function(){if(S.mode==='title'||S.mode==='over')return false;HOLD=true;return true;},unhold:function(){HOLD=false;},get held(){return HOLD;}};
