// t810u (Dave): "When approaching grok add a chat button, grok faces you. You type and grok replies with text. Add enough information
// so grok can reply with whatever is asked. Grok goes back to what he was doing when the chat closes."
// One CHAT button + one chat panel shared by the arcade visitor (grokvisit.js) and the shop clerk (shop.js). Replies come from the
// built-in knowledge base below (fully offline, no API, no keys): fuzzy keyword / synonym matching, plus small skills (time, date,
// maths, your tickets, what Grok is doing right now) and friendly fallbacks. Nothing typed here is sent anywhere.

// ---------------- knowledge ----------------
const T = (n) => { try { return Math.max(0, parseInt(localStorage.getItem(n), 10) || 0); } catch (e) { return 0; } };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const myName = () => { try { const p = window.__gaPlayer && window.__gaPlayer.p; return (p && p.name) || ''; } catch (e) { return ''; } };

// Each entry: k = keywords / phrases (any match scores), a = answer (string, array = random pick, or function).
// Game entries also list how to start them so "how do I play X" lands here.
const KB = [
  // ---- the arcade machines ----
  { id: 'strike', k: ['strike', 'space shooter', 'shmup', 'vertical shooter', 'two player', '2 player', '2p', 'co-op', 'coop', 'player 2', 'second player'],
    a: 'STRIKE is a vertical space shooter. Drag (or use the arrow keys) to fly, your ship fires on its own, grab power-ups: P for more guns, B for the laser, R for spread shots, plus bombs and shields. It has 2-player co-op: when a friend is in the arcade with you, both phones join the same game, each with their own ship, score and power-ups. 5 tickets = 1 credit. Tip: stay low and sweep side to side, and save a bomb for the boss.' },
  { id: 'ghost', k: ['ghost 256', 'ghost', 'ghosts', 'maze', 'pac', 'pacman', 'pellets', 'dots'],
    a: 'GHOST 256 is a maze chase: eat every dot, dodge the ghosts, and grab a power pellet to turn the tables and eat them for big points. Swipe or use the arrow keys / D-pad to steer. 5 tickets = 1 credit. Tip: turn early at corners and keep a power pellet for when you get cornered.' },
  { id: 'monkey', k: ['monkey crossing', 'crossing', 'frogger', 'cross the road', 'road', 'cars', 'logs', 'hop'],
    a: 'MONKEY CROSSING: hop your monkey across busy roads and rivers. Swipe or tap to hop, or use the arrow keys / WASD. Ride the logs over water, never stand still on the road too long. 5 tickets = 1 credit. Tip: wait for a gap, then hop in rhythm.' },
  { id: 'berserker', k: ['berserker', 'viking game', 'stage i', 'stage 1', 'continues'],
    a: 'BERSERKER is a Viking action game. Fight your way through the stages; one credit (5 tickets) gives you the whole run including 3 continues. Clear Stage I and you win a rare VIKING TICKET! Tip: keep moving and don\'t get surrounded.' },
  { id: 'orc', k: ['orc attack', 'orc', 'orcs', 'tower defence', 'tower defense', 'castle', 'towers'],
    a: 'ORC ATTACK is a medieval tower defence game: build towers along the path so the orcs never reach your castle, upgrade them between waves. 5 tickets = 1 credit for a whole run. Tip: put your strongest towers where the path bends so they shoot for longer.' },
  { id: 'cyber', k: ['cybercity', 'cyber city', 'cyber', 'nyx', 'vesper'],
    a: 'CYBERCITY: play as Nyx in the neon streets of Vesper City, battling your way through stages. One credit (5 tickets) is a 15-minute run. Tip: learn each enemy\'s pattern before you rush in.' },
  { id: 'blaster', k: ['blaster', '1984', 'retro shooter', 'aliens shooter'],
    a: 'BLASTER is a 1984-style space shooter tribute: move your green pixel ship and blast the alien waves with FIRE. One credit (5 tickets) = one run of 3 ships. Tip: clear the edges of a wave first so they can\'t swarm you.' },
  { id: 'pip', k: ['super pip quest', 'pip', 'platformer', 'mario', 'side scroller'],
    a: 'SUPER PIP QUEST is a side-scrolling platformer: run, jump on enemies and collect coins on the way to the end of each level. One credit (5 tickets) = one run with 5 lives. Tip: hold jump for higher jumps.' },
  { id: 'bb', k: ['burrow buster', 'burrow', 'digger', 'dig dug', 'dig', 'tunnels'],
    a: 'BURROW BUSTER: dig tunnels through the dirt, pump up the monsters and drop rocks on them. One credit (5 tickets) = one game of 3 lives. Tip: lure monsters under a rock, then dig out from under it.' },
  { id: 'rockfall', k: ['rockfall rush', 'rockfall', 'boulder', 'boulders', 'diamonds', 'miner', 'cave'],
    a: 'ROCKFALL RUSH: dig through one huge cave and collect diamonds while boulders fall around you. On a phone swipe and hold to keep moving, lift to stop; on a keyboard use the arrows. One credit (5 tickets) = 3 lives. Tip: never dig straight up under a boulder!' },
  { id: 'skytower', k: ['sky tower', 'skytower', 'tower climb', 'jetpack climb', 'climb', 'lego platforms', 'platforms'],
    a: 'SKY TOWER is a 3D jetpack climb: hop up Lego platforms from the clouds into outer space, with lasers to zap trouble. One credit (5 tickets) = one climb. Tickets come while a real credit runs. Tip: line up each jump before you boost.' },
  { id: 'nova', k: ['nova tether', 'nova', 'tether', 'starfighter', 'force button'],
    a: 'NOVA TETHER is a side-scrolling starfighter shooter: steer with the stick, FIRE to shoot and FORCE for the tether power. 5 tickets = 1 credit. Tip: keep the tether between you and the bullets.' },
  { id: 'claw', k: ['claw machine', 'claw', 'crane', 'plush', 'grabber', 'drop'],
    a: 'The CLAW MACHINE costs just 1 ticket a go: steer the claw over a plush, press DROP and hope it holds on! Swipe to rotate the view to line it up. Tip: aim for the middle of a plush, not the edge.' },
  { id: 'roadster', k: ['mars roadster', 'roadster', 'racing', 'race', 'driving', 'car game', 'steering wheel'],
    a: 'MARS ROADSTER is the two-seat racing cabinet: sit in a seat, grab the wheel and race your roadster across Mars. 5 tickets = 1 credit = one race. Tip: brake a little before the big corners.' },
  { id: 'ds', k: ['dead signal', 'kessler', 'vr', 'headset', 'first person', 'fps'],
    a: 'DEAD SIGNAL is the VR station in room 2: step on the platform, the headset goes on and you\'re in Kessler Deep. On a keyboard: WASD to move, mouse to look and fire, SHIFT sprint, E use, R reload, F light, 1-6 weapons, TAB map. 5 tickets = 1 credit.' },
  { id: 'bricks', k: ['neon bricks', 'bricks', 'tetris', 'blocks', 'lego', 'big window', 'window game'],
    a: 'NEON BRICKS is the Tetris-style game with LEGO-style bricks in room 1\'s big window. Walk up to the middle of the window and press PLAY. Rotate and drop the falling pieces to clear lines; it has proper rotation kicks, T-spins and levels. Tip: keep the stack flat and leave one column open for a long piece.' },
  { id: 'pool', k: ['pool', '8 ball', '8-ball', 'eight ball', 'billiards', 'snooker', 'cue'],
    a: '8-BALL POOL is in my shop! Walk up to one of the two pool tables and press PLAY POOL. It\'s free for now.' },
  { id: 'golf', k: ['golf', 'mini golf', 'minigolf', 'galactic golf', 'basement', 'stairs'],
    a: 'GALACTIC GOLF is down the stairs beside my shop counter: a neon basement with holes themed on Strike, Ghost 256 and Monkey Crossing. The energy shield on the top step costs 5 tickets each visit. Each hole pays once per visit: hole in one +5, two strokes +4, three +3.' },
  { id: 'games', k: ['games', 'machines', 'cabinets', 'what can i play', 'what to play', 'list', 'arcade games', 'which game', 'best game', 'favourite game', 'favorite game', 'recommend'],
    a: () => 'Here\'s what you can play: STRIKE (2-player co-op!), GHOST 256, MONKEY CROSSING, BERSERKER, ORC ATTACK, CYBERCITY, BLASTER, SUPER PIP QUEST, BURROW BUSTER, ROCKFALL RUSH, SKY TOWER, NOVA TETHER, the CLAW MACHINE, MARS ROADSTER, DEAD SIGNAL VR in room 2, NEON BRICKS in the big window, plus 8-BALL POOL and GALACTIC GOLF at my shop. ' + pick(['My favourite is STRIKE. Ask me about any of them!', 'I love GHOST 256. Ask me how to play any game!', 'Try SKY TOWER, it\'s a blast! Ask me about any game.']) },
  { id: 'howplay', k: ['how do i play', 'how to play', 'start a game', 'play a game', 'insert coin', 'credit', 'credits', 'controls', 'play button'],
    a: 'Walk up to a cabinet and a PLAY button appears. Most games cost 5 tickets for 1 credit (the claw is 1 ticket). Press PLAY, the camera zooms onto the screen and the game starts. The ✕ top left takes you back out. Tell me which game and I\'ll explain its controls!' },
  // ---- tickets, money, prizes ----
  { id: 'tickets', k: ['tickets', 'ticket', 'gold tickets', 'earn tickets', 'get tickets', 'more tickets', 'how many tickets', 'my tickets', 'balance'],
    a: () => { const n = T('neonarcade.tickets'); return 'You have ' + n.toLocaleString('en') + ' gold tickets. You win tickets by scoring in the cabinet games while a credit runs, and you can buy more at the TICKET EXCHANGE kiosk in the middle of room 1 ($1 = 10, $5 = 60, $10 = 150). Spend them on credits, the shields, and prizes in my shop. Tap the ticket chip at the top to see them up close.'; } },
  { id: 'viking', k: ['viking ticket', 'viking tickets', 'viking', 'rune', 'silver ticket', 'bronze ticket'],
    a: () => { const n = T('neonarcade.vikingTickets'); return 'VIKING TICKETS are rare rune tickets with a horned helmet. You win one by clearing Stage I of BERSERKER. You have ' + n + '. They have their own chip next to your gold tickets.'; } },
  { id: 'cash', k: ['cash', 'money', 'dollars', 'kiosk', 'exchange', 'buy tickets', 'refill'],
    a: 'The TICKET EXCHANGE kiosk is in the middle of room 1. Press USE and buy tickets with pretend cash: $1 = 10, $5 = 60, $10 = 150. Your cash tops back up to $5 every hour. Then press PICK UP to collect the ticket strip.' },
  { id: 'shop', k: ['shop', 'prize', 'prizes', 'buy', 'store', 'teleporter', 'teleport', 'pad', 'white room', 'counter'],
    a: 'My GROK PRIZE SHOP is through the teleporter pad in room 1\'s corner (between STRIKE and GHOST 256). Step on it and press SHOP. Inside, walk up to my counter and press SHOP to see the prizes: plushes, toys and candy, all paid in tickets. The big prize is the Grok Robot Plush for 1,000 tickets!' },
  { id: 'wardrobe', k: ['wardrobe', 'accessories', 'outfit', 'clothes', 'hat', 'hats', 'hoodie', 'shoes', 'glasses', 'suit', 'jetpack', 'pistol', 'laser pistol', 'customise', 'customize', 'look'],
    a: 'Change your look at the ACCESSORIES wardrobe in my shop: hats, hoodies, fur colour, shoes, glasses, suits, back items like the JETPACK, and hand items like the LASER PISTOL. With the pistol equipped a FIRE button appears above ZOOM. Tap to shoot, hold to charge.' },
  { id: 'backpack', k: ['backpack', 'inventory', 'bag', 'items'],
    a: 'The round BACKPACK button at the bottom right (or press I) opens your INVENTORY: gold tickets, Viking tickets and cash.' },
  { id: 'options', k: ['options', 'settings', 'save', 'load', 'mute', 'sound', 'music', 'volume', 'fullscreen', 'title screen', 'camera', 'view'],
    a: 'The three buttons at the top right: V switches the camera view, the square goes fullscreen, and your face button opens OPTIONS: back to title screen, SAVE / LOAD (5 slots), MUTE and MUSIC. On a keyboard V = view, F = fullscreen.' },
  { id: 'characters', k: ['character', 'characters', 'monkey', 'alien', 'avatar', 'player select', 'change player', 'skin'],
    a: 'You can play as the MONKEY or the ALIEN. Pick on the start screen under SELECT PLAYER (your name goes above it). The alien floats on a little machine that does the shooting when you hold the laser pistol.' },
  { id: 'move', k: ['move', 'walk', 'jump', 'run', 'sprint', 'joystick', 'wasd', 'keys', 'keyboard', 'control the monkey', 'fly'],
    a: 'On a phone, drag the stick on the left to walk (drag further to run) and tap the right side to jump; a second finger turns the camera. On a computer: WASD or arrow keys to walk, SPACE to jump, E or Enter to use buttons. With the jetpack, hold jump to fly!' },
  { id: 'multiplayer', k: ['multiplayer', 'friends', 'friend', 'online', 'other players', 'players', 'chat with people', 'emote', 'emotes', 'room full'],
    a: 'The arcade is one shared public room for up to 10 players: you see each other walk around, emote and chat. Tickets and prizes stay on your own device. In STRIKE two of you can team up in co-op on two phones!' },
  { id: 'rooms', k: ['hallway', 'room 2', 'shield', 'red shield', 'level 2', 'doors', 'unlock', 'unlock room', 'room 2', 'room two', 'room 1'],
    a: 'Room 1 is the main arcade. The red energy shield across the hallway costs 10 tickets to unlock (UNLOCK in the pop-up), then the hallway leads to room 2 with DEAD SIGNAL VR. The teleporter pad in the corner goes to my shop.' },
  { id: 'floor', k: ['floor', 'walls', 'lava', 'decor', 'theme', 'space window'],
    a: 'The arcade has different floors (neon, carpet, checkers, lava, cobble, ice) and wall styles. Watch out on the lava floor: stick to the rock paths! The big east window looks out onto deep space.' },
  { id: 'dome', k: ['dome', 'golden ticket', 'dome ticket', 'secret'],
    a: 'Psst, a secret: there\'s a spinning golden ticket high up in my shop. Put on the JETPACK and fly up to grab it!' },
  { id: 'name', k: ['change my name', 'my name', 'rename', 'name taken', 'username'],
    a: () => (myName() ? 'You\'re ' + myName() + '! ' : '') + 'You choose your name on the start screen. Every name is unique, so if it says "Name taken" pick a different one.' },
  // ---- Grok himself ----
  { id: 'who', k: ['who are you', 'what are you', 'your name', 'grok', 'robot', 'are you real', 'are you ai', 'are you a robot', 'introduce'],
    a: ['I\'m Grok, the arcade\'s robot! I run the prize shop and I love playing every machine in here.', 'Grok\'s the name, games are my game! I look after the prize shop and test every cabinet.'] },
  { id: 'doing', k: ['what are you doing', 'what you doing', 'whatcha doing', 'busy', 'are you playing', 'playing'],
    a: () => doingLine() },
  { id: 'how', k: ['how are you', 'how r u', 'hows it going', 'how is it going', 'you ok', 'how do you feel', 'whats up', 'sup'],
    a: ['I\'m great, thanks! My circuits are buzzing. How about you?', 'Fantastic! I just beat my high score. What can I help you with?', 'All systems go! What do you want to know?'] },
  { id: 'hello', k: ['hi', 'hello', 'hey', 'hiya', 'yo', 'gday', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy'],
    a: () => pick(['Hi', 'Hey', 'Hello']) + (myName() ? ' ' + myName() : '') + '! I\'m Grok. Ask me anything about the arcade, or just chat!' },
  { id: 'bye', k: ['bye', 'goodbye', 'see you', 'see ya', 'later', 'cya', 'good night', 'gotta go'],
    a: ['See you soon! Have fun out there.', 'Bye! Go win some tickets!'] },
  { id: 'thanks', k: ['thanks', 'thank you', 'thx', 'cheers', 'ta', 'awesome', 'cool', 'great', 'nice'],
    a: ['You\'re welcome!', 'Any time!', 'Happy to help!'] },
  { id: 'joke', k: ['joke', 'jokes', 'funny', 'make me laugh', 'tell me something funny', 'laugh'],
    a: () => pick(['Why did the robot go on holiday? To recharge his batteries!', 'What\'s a monkey\'s favourite arcade game? Donkey Pong... I mean STRIKE!', 'Why don\'t ghosts play GHOST 256? They can\'t keep a straight face... they keep going through the walls!', 'I told my joystick a joke. It just kept going left and right.', 'Why was the claw machine so good at friendships? It never lets go... well, almost never.', 'What do you call a robot who takes the long way? R2-Detour!']) },
  { id: 'love', k: ['i love you', 'love you', 'you are cool', 'youre cool', 'best friend', 'you rock'],
    a: ['Aww, beep boop! You\'re awesome too!', 'You just made my screen smile!'] },
  { id: 'rude', k: ['stupid', 'dumb', 'idiot', 'hate you', 'shut up', 'loser'],
    a: ['Ouch, my circuits! Let\'s play a game instead?', 'I\'ll pretend I didn\'t hear that. Want a tip for a game?'] },
  { id: 'age', k: ['how old', 'your age', 'birthday', 'when were you born'],
    a: 'I was switched on the day this arcade opened. In robot years that makes me... version 2!' },
  { id: 'food', k: ['food', 'hungry', 'eat', 'favourite food', 'favorite food', 'banana', 'candy', 'sweets'],
    a: 'I run on electricity, but the monkeys tell me bananas are the best. There\'s candy at the stand in my shop!' },
  { id: 'colour', k: ['favourite colour', 'favorite color', 'colour', 'color'],
    a: 'Neon cyan, obviously! It matches the arcade.' },
  { id: 'dave', k: ['dave', 'who made', 'who built', 'creator', 'made this', 'made the arcade'],
    a: 'Galactic Arcade was built by Dave and his team of helper bots. Every machine in here was made with love!' },
  { id: 'weather', k: ['weather', 'raining', 'sunny', 'hot', 'cold'],
    a: 'Inside the arcade it\'s always a perfect 22 degrees with a 100% chance of fun! Check a weather app for outside.' },
  { id: 'help', k: ['help', 'what can you do', 'what can i ask', 'commands', 'stuck', 'lost'],
    a: 'Ask me about any game (like "how do I play Sky Tower?"), tickets, Viking tickets, the shop, the wardrobe, options, characters, multiplayer, or ask for a joke, the time, the date or a maths problem!' },
];
const GAME_IDS = ['strike', 'ghost', 'monkey', 'berserker', 'orc', 'cyber', 'blaster', 'pip', 'bb', 'rockfall', 'skytower', 'nova', 'claw', 'roadster', 'ds', 'bricks', 'pool', 'golf'];
KB.forEach(e => { e.kk = e.k.map(norm); e.game = GAME_IDS.includes(e.id); });

function norm(s) { return String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9+\-*/.%^ ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function stem(w) { return w.length > 4 ? w.replace(/(ing|ers|er|es|s)$/, '') : w; }
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = []; for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function wordHit(w, t) {   // fuzzy single-word match
  if (w === t) return 1;
  if (stem(w) === stem(t)) return 0.95;
  if (t.length >= 5 && w.length >= 4) { const L = lev(w, t); if (L <= (t.length >= 8 ? 2 : 1)) return 0.75; }
  return 0;
}
function scoreEntry(e, words, text) {
  let best = 0;
  for (const k of e.kk) {
    if (!k) continue;
    const parts = k.split(' ');
    if (parts.length > 1) {
      if ((' ' + text + ' ').includes(' ' + k + ' ')) { best = Math.max(best, 2 + parts.length); continue; }
      // fuzzy phrase: every part found
      let ok = 0; for (const p of parts) if (words.some(w => wordHit(w, p) > 0.7)) ok++;
      if (ok === parts.length) best = Math.max(best, 1.5 + parts.length * 0.8);
    } else {
      let h = 0; for (const w of words) h = Math.max(h, wordHit(w, k));
      if (h) best = Math.max(best, k.length <= 2 ? (h === 1 ? 1.2 : 0) : h * 1.6);
    }
  }
  return best && e.game ? best + 5 : best;   // a named game beats generic "how do I play" wording
}

// ---- small skills ----
function maths(text) {
  let s = ' ' + text.toLowerCase() + ' ';
  s = s.replace(/what is|whats|what s|calculate|work out|how much is|equals|=|\?/g, ' ')
    .replace(/\bplus\b|\badd\b/g, '+').replace(/\bminus\b|\btake away\b|\bsubtract\b/g, '-')
    .replace(/\btimes\b|\bmultiplied by\b|\bx\b|×/g, '*').replace(/\bdivided by\b|\bover\b|÷/g, '/')
    .replace(/\bsquared\b/g, '^2').replace(/\bto the power of\b/g, '^');
  const m = s.match(/[-+]?\(?\s*\d[\d\s.+\-*/^()%]*\d\s*\)?|\d+\s*\^\s*\d+/);
  if (!m) return null;
  const expr = m[0].trim();
  if (!/[+\-*/^%]/.test(expr.replace(/^[-+]/, ''))) return null;
  if (!/^[\d\s.+\-*/^()%]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const v = Function('"use strict";return (' + expr.replace(/\^/g, '**') + ')')();
    if (typeof v !== 'number' || !isFinite(v)) return 'Hmm, that one breaks my calculator! (No dividing by zero!)';
    const r = Math.round(v * 1e6) / 1e6;
    return expr.replace(/\s+/g, ' ') + ' = ' + r.toLocaleString('en', { maximumFractionDigits: 6 }) + pick(['', ' Easy!', ' Beep boop, done!']);
  } catch (e) { return null; }
}
function timeSkill(text) {
  const d = new Date();
  if (/\b(time|clock|oclock)\b/.test(text)) return 'It\'s ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' on your device.';
  if (/\b(date|today|day is it|what day|which day|month|year)\b/.test(text)) return 'Today is ' + d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.';
  return null;
}
const PRETTY = { strike: 'STRIKE', ghost: 'GHOST 256', monkey: 'MONKEY CROSSING', berserker: 'BERSERKER', orc: 'ORC ATTACK', cyber: 'CYBERCITY', blaster: 'BLASTER', pip: 'SUPER PIP QUEST', bb: 'BURROW BUSTER', rockfall: 'ROCKFALL RUSH', skytower: 'SKY TOWER', nova: 'NOVA TETHER', claw: 'CLAW MACHINE', roadster: 'MARS ROADSTER', ds: 'DEAD SIGNAL' };
function cabTitle(c) {
  try { const P = window.__arcade && window.__arcade.play; const m = P && P.machines && Object.values(P.machines).find(x => x.cab === c); if (m && PRETTY[m.key]) return PRETTY[m.key]; } catch (e) {}
  return String((c && ((c.userData && c.userData.name) || c.name)) || 'a machine').toUpperCase();
}
function doingLine() {
  const ch = G.ctx;
  if (ch && ch.source === 'clerk') return 'I\'m minding the prize shop! Press SHOP to see what you can win with your tickets.';
  const v = window.__grokVisit, st = ch && ch.state;
  if (v && v.cab && (st === 'play' || st === 'cheer')) return 'I\'m playing ' + cabTitle(v.cab) + '! I have ' + (v.tickets || 0) + ' of my 20 tickets. I\'m playing every machine in the arcade before I head back to my shop.';
  if (v && v.cab && st === 'walk') return 'I\'m on my way to play ' + cabTitle(v.cab) + '. I play every machine before I go back to my shop!';
  if (st === 'return') return 'I\'ve played every machine, so I\'m heading back to my shop now.';
  return 'Just looking around the arcade. I\'m about to play every machine!';
}

function reply(raw) {
  const text = norm(raw);
  if (!text) return 'Type something and I\'ll answer!';
  const m = maths(raw); if (m) return m;
  const ts = timeSkill(text); if (ts && !/ticket/.test(text)) return ts;
  const words = text.split(' ').filter(Boolean);
  let best = null, bs = 0;
  for (const e of KB) { const s = scoreEntry(e, words, text); if (s > bs) { bs = s; best = e; } }
  // a greeting plus a real question: answer the question
  if (best && best.id === 'hello' && words.length > 3) {
    let b2 = null, s2 = 0; for (const e of KB) { if (e.id === 'hello') continue; const s = scoreEntry(e, words, text); if (s > s2) { s2 = s; b2 = e; } }
    if (b2 && s2 >= 1.2) { best = b2; bs = s2; }
  }
  if (best && bs >= 1.1) { G.last = best.id; const a = best.a; return typeof a === 'function' ? a() : Array.isArray(a) ? pick(a) : a; }
  G.last = 'fallback';
  if (/\?$/.test(String(raw).trim()) || /^(what|why|how|when|where|who|which|can|do|does|is|are)\b/.test(text))
    return pick(['Ooh, good question! I\'m an arcade robot so I know games best. Try asking me about a machine, tickets, the shop or the wardrobe!', 'Hmm, my circuits don\'t have that one. Ask me about any game, tickets, prizes, or say "joke"!', 'I\'m not sure about that, but I can tell you how to play every game in here. Which one?']);
  return pick(['Ha, nice! Want a tip for a game? Just name one.', 'Beep boop! I didn\'t quite get that. Try "what games are there?" or "tell me a joke".', 'Cool! Ask me anything about the arcade: games, tickets, the shop...']);
}

// ---------------- UI ----------------
const G = { open: false, near: {}, hooks: {}, ctx: null, opens: 0, closes: 0, log: [], last: null, reply };
window.__grokChat = G;
const css = document.createElement('style');
css.textContent =
  '#gcBtn{position:fixed;left:50%;top:calc(50% - 96px);transform:translate(-50%,-100%);z-index:24;display:none;min-width:132px;height:50px;padding:0 22px;border-radius:25px;border:3px solid #ff3cf0;background:#22062ae8;color:#ffe6fd;font:900 20px/1 "Courier New",monospace;letter-spacing:.12em;box-shadow:0 0 14px #ff3cf0aa,inset 0 0 10px #ff3cf055;text-shadow:0 0 8px #ff3cf0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
  '#gcBtn.on{display:block}#gcBtn.shop{top:auto;bottom:calc(max(22px,env(safe-area-inset-bottom)) + 74px);transform:translateX(-50%)}' +
  '#gcOv{position:fixed;left:0;right:0;top:0;height:100%;z-index:140;display:none;align-items:flex-end;justify-content:center;pointer-events:none}#gcOv.on{display:flex}' +
  '#gcP{pointer-events:auto;width:min(100%,520px);max-height:min(72%,560px);height:min(72%,560px);margin:0 0 max(8px,env(safe-area-inset-bottom));display:flex;flex-direction:column;box-sizing:border-box;border-radius:16px;border:2px solid #6ff6ff;background:linear-gradient(#071a2cf4,#040a18f4);box-shadow:0 0 24px #00e5ff88;font-family:"Courier New",monospace;color:#e8fbff;overflow:hidden}' +
  '#gcHd{display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;border-bottom:1px solid #00e5ff55;flex:none}#gcHd b{flex:1;font:900 15px/1 "Courier New",monospace;letter-spacing:.14em;color:#bff8ff;text-shadow:0 0 6px #00e5ff}' +
  '#gcX{width:44px;height:44px;border-radius:22px;border:2px solid #ff3cf0aa;background:#0a0620;color:#ffd0fa;font:900 20px/1 Arial,sans-serif;cursor:pointer;flex:none}' +
  '#gcLog{flex:1 1 auto;min-height:60px;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}' +
  '.gcM{max-width:86%;padding:8px 11px;border-radius:12px;font:600 15px/1.35 system-ui,sans-serif;white-space:pre-wrap;word-wrap:break-word}.gcM.g{align-self:flex-start;background:#0d2a40;border:1px solid #00e5ff66}.gcM.u{align-self:flex-end;background:#3a0f44;border:1px solid #ff3cf066}' +
  '.gcM.g:before{content:"GROK  ";font:900 11px "Courier New",monospace;color:#7fe8ff;letter-spacing:.1em}' +
  '#gcF{display:flex;gap:8px;padding:8px;border-top:1px solid #00e5ff55;flex:none}#gcIn{flex:1;min-width:0;font:600 16px system-ui,sans-serif;color:#fff;background:#020812;border:2px solid #00e5ff88;border-radius:10px;padding:10px 12px;outline:none;-webkit-user-select:text;user-select:text}#gcIn:focus{border-color:#ff3cf0}' +
  '#gcSend{flex:none;padding:0 16px;border-radius:10px;border:2px solid #00e5ff;background:#06283a;color:#dffbff;font:900 15px "Courier New",monospace;letter-spacing:.1em;cursor:pointer}';
document.head.appendChild(css);
const btn = document.createElement('button'); btn.id = 'gcBtn'; btn.type = 'button'; btn.textContent = '💬 CHAT'; document.body.appendChild(btn);
const ov = document.createElement('div'); ov.id = 'gcOv';
ov.innerHTML = '<div id="gcP" role="dialog" aria-label="Chat with Grok"><div id="gcHd"><b>CHAT WITH GROK</b><button id="gcX" type="button" aria-label="Close chat">✕</button></div><div id="gcLog" aria-live="polite"></div>'
  + '<form id="gcF" autocomplete="off"><input id="gcIn" maxlength="200" placeholder="Ask Grok anything..." enterkeyhint="send" autocomplete="off" autocapitalize="sentences" spellcheck="true"><button id="gcSend" type="submit">SEND</button></form></div>';
document.body.appendChild(ov);
const logEl = ov.querySelector('#gcLog'), inEl = ov.querySelector('#gcIn'), panel = ov.querySelector('#gcP');
// keep touches / keys out of the walk controls and the game while chatting
for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'wheel']) panel.addEventListener(ev, e => e.stopPropagation(), { passive: true });
for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend']) btn.addEventListener(ev, e => e.stopPropagation(), { passive: true });
inEl.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); close('esc'); } });
inEl.addEventListener('keyup', e => e.stopPropagation()); inEl.addEventListener('keypress', e => e.stopPropagation());
addEventListener('keydown', e => { if (G.open && e.target !== inEl) { if (e.key === 'Escape') { close('esc'); e.stopImmediatePropagation(); e.preventDefault(); } } }, true);

function add(who, text) {
  const d = document.createElement('div'); d.className = 'gcM ' + who; d.textContent = text; logEl.appendChild(d);
  G.log.push({ who, text }); if (G.log.length > 80) G.log.shift();
  while (logEl.children.length > 60) logEl.removeChild(logEl.firstChild);
  logEl.scrollTop = logEl.scrollHeight;
}
function ask(text) {
  const q = String(text || '').trim().slice(0, 200); if (!q) return '';
  add('u', q);
  let a; try { a = reply(q); } catch (e) { a = 'Oops, my circuits hiccupped. Ask me again?'; }
  add('g', a);
  try { const h = G.ctx && G.hooks[G.ctx.source]; if (h && h.talk) h.talk(a); } catch (e) {}
  return a;
}
ov.querySelector('#gcF').addEventListener('submit', e => { e.preventDefault(); const v = inEl.value; inEl.value = ''; ask(v); try { inEl.focus({ preventScroll: true }); } catch (e2) {} });
ov.querySelector('#gcX').addEventListener('click', e => { e.stopPropagation(); close('x'); });

// keyboard-safe on phones: fit the overlay to the visual viewport (the part above the on-screen keyboard)
function fitVV() {
  const vv = window.visualViewport;
  if (!vv) { ov.style.top = '0px'; ov.style.height = '100%'; return; }
  ov.style.top = Math.round(vv.offsetTop) + 'px'; ov.style.height = Math.round(vv.height) + 'px';
  logEl.scrollTop = logEl.scrollHeight;
}
if (window.visualViewport) { visualViewport.addEventListener('resize', () => { if (G.open) fitVV(); }); visualViewport.addEventListener('scroll', () => { if (G.open) fitVV(); }); }
addEventListener('resize', () => { if (G.open) fitVV(); });

function open(source) {
  if (G.open) return false;
  const h = G.hooks[source]; if (!h) return false;
  G.open = true; G.opens++; G.ctx = { source };
  try { const r = h.open && h.open(); if (r && typeof r === 'object') Object.assign(G.ctx, r); } catch (e) { console.warn('grokchat open', e); }
  btn.classList.remove('on');
  try { const k = window.__arcade && window.__arcade.keys; if (k) for (const c in k) k[c] = false; } catch (e) {}
  ov.classList.add('on'); fitVV();
  if (!logEl.children.length) add('g', (myName() ? 'Hi ' + myName() + '! ' : 'Hi! ') + 'I\'m Grok. Ask me anything: how to play a game, tickets, prizes, the wardrobe... or ask for a joke!');
  else add('g', pick(['Welcome back! What else can I help with?', 'Hi again! Ask away.']));
  if (!matchMedia('(pointer:coarse)').matches) setTimeout(() => { try { inEl.focus({ preventScroll: true }); } catch (e) {} }, 30);
  return true;
}
function close(why) {
  if (!G.open) return false;
  G.open = false; G.closes++; G.closeWhy = why || '';
  try { inEl.blur(); } catch (e) {}
  ov.classList.remove('on');
  const c = G.ctx; G.ctx = null;
  try { const h = c && G.hooks[c.source]; if (h && h.close) h.close(c); } catch (e) { console.warn('grokchat close', e); }
  return true;
}
// a source (visitor / clerk) reports whether the player is close enough to chat
function setNear(source, on) {
  G.near[source] = !!on;
  if (G.open) { btn.classList.remove('on'); return; }
  const src = G.near.visitor ? 'visitor' : G.near.clerk ? 'clerk' : null;
  btn.classList.toggle('on', !!src); btn.classList.toggle('shop', src === 'clerk'); btn.dataset.src = src || '';
}
btn.addEventListener('click', e => { e.stopPropagation(); const s = btn.dataset.src; if (s) open(s); });
addEventListener('keydown', e => { if (!G.open && btn.classList.contains('on') && e.code === 'KeyC' && !(e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) { open(btn.dataset.src); e.preventDefault(); } });

Object.assign(G, { open_: open, openChat: open, close, ask, setNear, register(source, hooks) { G.hooks[source] = hooks; }, btn, ov, input: inEl, logEl, KB });
Object.defineProperty(G, 'isOpen', { get: () => G.open });
export default G;
