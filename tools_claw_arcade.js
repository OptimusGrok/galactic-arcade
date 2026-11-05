// CLAW MACHINE (arcade copy only, injected inside the game's own scope). 1 Galactic Arcade ticket = 1 credit = ONE drop. The copy starts with
// 0 credits (the original's 50 free local credits are gone); the arcade inserts the credit with __clawA.start(). After that drop has fully
// resolved (claw home, no prize still falling) the scene reports 'over' and the arcade returns to its demo. Prizes behave exactly like the
// original (plush goes to the shelf + the PRIZES collection, kept in the arcade copy's own key arcade_clawMachine.collection); the original
// never paid tickets, so neither does the copy. t288u (Videos 74f34d5): swipe on the glass orbits 360 deg, gold FRONT snaps back (also on demo /
// new credit), 8 prizes, 4 gone -> 4 more appear. credits/toys are lexical lets here (the new window getters just mirror them). Silent attract DEMO: the claw wanders, never drops, nothing saved.
var D={on:false,t:0,iv:0},RUN=false,USED=false,IDLE=0,HOLD=false;
var _drop=drop;drop=function(){if(D.on||HOLD)return;if(RUN&&credits>0)USED=true;_drop();};
D.start=function(){try{snapFront();}catch(e){}D.on=true;window.__DEMO=true;RUN=false;USED=false;credits=0;clearInterval(D.iv);D.iv=setInterval(function(){if(!D.on)return;D.t+=0.05;joy.dx=Math.sin(D.t*0.9)*0.8;joy.dy=Math.cos(D.t*0.6)*0.6;},50);};
D.stop=function(){D.on=false;window.__DEMO=false;clearInterval(D.iv);joy.dx=joy.dy=0;};
function busy(){return C.st!=='idle'||toys.some(function(t){return t.held||(t.fall&&!t.done);});}
setInterval(function(){IDLE=RUN&&USED&&credits===0&&!busy()?IDLE+1:0;},100);
window.__demo=D;
window.__clawA={D:D,start:function(){D.stop();try{snapFront();}catch(e){}HOLD=false;RUN=true;USED=false;IDLE=0;credits=1;try{sCoin();}catch(e){}},
  scene:function(){return RUN&&USED&&IDLE>=15?'over':RUN?'play':'title';},active:function(){return RUN&&!(USED&&IDLE>=15);},
  hold:function(){if(!RUN)return false;HOLD=true;return true;},unhold:function(){HOLD=false;},get resetBtn(){return L.reset;},get run(){return RUN;},get used(){return USED;},get credits(){return credits;}};
