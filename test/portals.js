// t187 PORTALS walls: picker tile, swirling portal shader on the room-1 walls, hue/motion over time, saved choice. node test/portals.js [phone]
const { open } = require('./lib');
const PH = process.argv[2] === 'phone';
(async () => { const { page, errors, close } = await open({ phone: PH }); let ok = true; const chk = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };
  const r = await page.evaluate(() => { const A = window.__arcade; const m = A.setWalls('portals'); const w = A.scene.getObjectByName('wall1') || null; return { m, mat: w && w.material.name, ls: localStorage.getItem('neonarcade.walls'), tile: !!document.querySelector('.wlT[data-walls="portals"]') || !!(window.__startUI && window.__startUI.opt.querySelector('.wlT[data-walls="portals"]')) }; });
  chk(r.m === 'portals' && r.mat === 'portalWalls' && r.ls === 'portals' && r.tile, 'PORTALS walls: tile in the picker, shader on the walls, saved ' + JSON.stringify(r));
  await page.evaluate(PH => { const A = window.__arcade; A.monkey.position.set(0, 0, 6); A.st.yaw = 0.35; A.st.pitch = 0.12; window.__camOverride = { pos: PH ? [3, 1.8, 7] : [4, 2.2, 8], at: [-6, 3.2, -12] }; }, PH);
  await page.waitForTimeout(2500);
  const A1 = '/tmp/por_a.png', B1 = '/tmp/por_b.png';
  await page.screenshot({ path: PH ? 'shots/walls_portals_room1_phone.png' : 'shots/walls_portals_desktop.png' }); await page.screenshot({ path: A1 });
  await page.waitForTimeout(2500); await page.screenshot({ path: B1 });
  const st = JSON.parse(require('child_process').execSync(`python3 -c "
from PIL import Image, ImageChops; import json, colorsys
a = Image.open('${A1}').convert('RGB'); b = Image.open('${B1}').convert('RGB'); w, h = a.size; box = (0, int(h*0.3), w, int(h*0.55)); a = a.crop(box); b = b.crop(box)
d = ImageChops.difference(a, b).convert('L'); m = sum(d.getdata()) / (d.size[0]*d.size[1])
hs = set(); px = list(a.resize((48, 24)).getdata())
for r, g, bb in px:
  hh, ss, vv = colorsys.rgb_to_hsv(r/255, g/255, bb/255)
  if ss > 0.4 and vv > 0.3: hs.add(int(hh*6))
print(json.dumps({'m': m, 'hues': len(hs)}))"`).toString());
  chk(st.m > 2, 'portals move / change colour over time (mean diff ' + st.m.toFixed(1) + ')');
  chk(st.hues >= 3, 'multi-colour (' + st.hues + ' hue bands)');
  await page.evaluate(() => { window.__camOverride = null; window.__arcade.setWalls('current'); });
  chk(errors.length === 0, 'no page errors ' + errors.join('|'));
  await close(); process.exit(ok ? 0 : 1); })();
