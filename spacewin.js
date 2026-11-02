// Room 1 east wall: one floor-to-ceiling glass window onto deep space. Sky-sphere stars (incl. tiny red ones) + faint sparse
// nebula, plus planets/moons as real spheres at depth (ray-traced, so no smear at oblique angles). The glass reflects
// nothing of the room: only the monkey, via a small planar mirror pass that renders just him (layer 30), faded in within ~2.8 m.
import * as THREE from 'three';
export function setupSpaceWindow({ scene, room, renderer, HALF, H, isMobile, getMonkey, getCamera }) {
  const W = HALF * 2, X = HALF - 0.012;
  const LAYER = 30, RS = isMobile ? 256 : 512, NEAR0 = 1.4, NEAR1 = 2.8;
  const rt = new THREE.WebGLRenderTarget(RS, RS, { type: THREE.UnsignedByteType });
  const vcam = new THREE.PerspectiveCamera(); vcam.layers.set(LAYER);
  const texMat = new THREE.Matrix4(), bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uMir: { value: rt.texture }, uTM: { value: texMat }, uNear: { value: 0 }, uX: { value: X } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform float uT, uNear, uX; uniform sampler2D uMir; uniform mat4 uTM; varying vec3 vW;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      vec3 starL(vec2 uv, float cell){ vec2 g = uv / cell, id = floor(g), f = fract(g) - .5; float h = h21(id);
        vec2 o = vec2(h21(id + 3.1), h21(id + 7.7)) - .5; float d = length(f - o * .7);
        float b = smoothstep(.09, 0., d) * step(.62, h) * (h - .55) * 3.2 + smoothstep(.03, 0., d) * step(.62, h);
        return b * mix(vec3(.75, .85, 1.), vec3(1., .8, .95), h21(id + 9.)); }
      // a layer of space "depth" D metres behind the glass, seen from the camera: real parallax
      vec2 at(vec3 ro, vec3 rd, float D){ float t = (uX + D - ro.x) / max(rd.x, .02); vec3 p = ro + rd * t; return p.zy / D; }
      float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
      float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
      // stars on the sky sphere (direction only = infinitely far: no smear at oblique angles)
      vec3 stars(vec3 d, float sc, float dens, float sz){ vec3 g = d * sc, id = floor(g), f = fract(g) - .5; float h = h31(id);
        if (h > dens) return vec3(0.); vec3 o = vec3(h31(id + 3.1), h31(id + 7.7), h31(id + 1.3)) - .5; float r = length(f - o * .6);
        float b = smoothstep(sz, 0., r) * (.35 + .65 * h31(id + 5.5)); float t = h31(id + 9.9);
        vec3 c = t < .1 ? vec3(1., .22, .16) : t < .3 ? vec3(1., .85, .7) : vec3(.8, .88, 1.); return c * b * (t < .1 ? .8 : 1.); }
      // a planet: real sphere at depth behind the glass, lit from one side; ring optional
      vec3 planet(vec3 ro, vec3 rd, vec3 c, float R, vec3 base, vec3 L, inout float hit){
        vec3 oc = ro - c; float b = dot(oc, rd), q = dot(oc, oc) - R * R, h = b * b - q; if (h < 0. || hit > 0.) return vec3(0.);
        vec3 p = ro + rd * (-b - sqrt(h)), nn = normalize(p - c); hit = 1.;
        float band = .85 + .15 * sin(nn.y * 18. + vn(nn * 4.) * 4.); float l = max(dot(nn, L), 0.);
        return base * band * (l * .95 + .03) + vec3(.25, .3, .5) * pow(1. - max(dot(nn, -rd), 0.), 3.) * l * .5; }
      void main(){
        vec3 ro = cameraPosition, rd = normalize(vW - ro); vec3 col = vec3(.002, .001, .006);
        float a = uT * .004; vec3 d = vec3(rd.x, rd.y * cos(a) - rd.z * sin(a), rd.y * sin(a) + rd.z * cos(a));   // slow sky drift
        col += stars(d, 260., .55, .16) * .55 + stars(d, 140., .35, .14) * .8 + stars(d, 60., .18, .1) * 1.2 + stars(d, 420., .7, .2) * .3;
        // faint, sparse nebula wisps
        float nb = vn(d * 3.) * .6 + vn(d * 7.) * .3 + vn(d * 15.) * .1; nb = smoothstep(.58, .85, nb) * smoothstep(.3, .7, vn(d * 1.3 + 4.));
        col += nb * mix(vec3(.22, .05, .3), vec3(.04, .12, .28), vn(d * 2. + 9.)) * .35;
        // planets and moons at real depths, drifting slowly along the window
        float hit = 0.; vec3 L = normalize(vec3(-.4, .5, .75));
        float z1 = mod(uT * .35 + 60., 520.) - 260., z2 = mod(uT * .12 + 300., 900.) - 450., z3 = mod(uT * .6 + 20., 300.) - 150.;
        col += planet(ro, rd, vec3(uX + 26., 7., z3), 1.1, vec3(.62, .6, .58), L, hit);                 // small near moon
        col += planet(ro, rd, vec3(uX + 90., 18., z1), 9., vec3(.75, .42, .3), L, hit);                 // rusty planet
        col += planet(ro, rd, vec3(uX + 92., 26., z1 + 16.), 1.8, vec3(.7, .72, .78), L, hit);          // its moon
        col += planet(ro, rd, vec3(uX + 260., -30., z2), 40., vec3(.3, .45, .8), L, hit);               // far blue giant
        // glass: the monkey's own reflection only, when he is near the window
        if (uNear > .001) { vec4 pc = uTM * vec4(vW, 1.); vec4 m = texture2DProj(uMir, pc); col = mix(col, m.rgb * 1.7, m.a * .75 * uNear); }
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H).rotateY(-Math.PI / 2), mat);
  glass.position.set(X, H / 2, 0); glass.name = 'spaceWindow'; room.add(glass);
  // slim dark frame: sill, head and two mullions
  const fm = new THREE.MeshStandardMaterial({ color: 0x0c0912, roughness: 0.5, metalness: 0.7 }), fg = [];
  const bar = (y, z, h, w) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, w), fm); m.position.set(HALF - 0.06, y, z); m.name = 'windowFrame'; room.add(m); fg.push(m); };
  bar(0.04, 0, 0.08, W); bar(H - 0.04, 0, 0.08, W); bar(H / 2, -W / 6, H, 0.1); bar(H / 2, W / 6, H, 0.1);
  const t0 = performance.now(), n = new THREE.Vector3(), gp = new THREE.Vector3(), cp = new THREE.Vector3(), tg = new THREE.Vector3(), dir = new THREE.Vector3(), tagged = new WeakSet();
  const mirror = (v) => v.sub(n.clone().multiplyScalar(2 * v.clone().sub(gp).dot(n)));   // reflect a world point across the glass plane
  function tag() { const m = getMonkey && getMonkey(); if (m) m.traverse(o => { if (!tagged.has(o)) { tagged.add(o); o.layers.enable(LAYER); } });
    scene.traverse(o => { if (o.isLight && !tagged.has(o)) { tagged.add(o); o.layers.enable(LAYER); } }); }
  const api = { glass, frame: fg, mat, rt, renders: 0, near: 0, LAYER,
    dirty() {},   // nothing room-side is reflected any more (kept so Options WALLS / FLOOR callers still work)
    update(now) { mat.uniforms.uT.value = (now - t0) / 1000;
      const m = getMonkey && getMonkey(), cam = getCamera && getCamera(); if (!m || !cam) return;
      glass.updateMatrixWorld(); glass.getWorldPosition(gp); n.set(-1, 0, 0).transformDirection(glass.matrixWorld);   // normal pointing into the room
      const d = m.getWorldPosition(cp).sub(gp).dot(n), k = 1 - THREE.MathUtils.smoothstep(d, NEAR0, NEAR1);
      api.near = k > 0 && m.visible && d > -0.05 ? k : 0; mat.uniforms.uNear.value = api.near; if (!api.near) return;
      tag(); cam.updateMatrixWorld();
      vcam.position.copy(mirror(cam.getWorldPosition(new THREE.Vector3())));
      cam.getWorldDirection(dir); tg.copy(cam.getWorldPosition(new THREE.Vector3())).add(dir); vcam.up.set(0, 1, 0); vcam.lookAt(mirror(tg));
      vcam.fov = cam.fov; vcam.aspect = cam.aspect; vcam.near = cam.near; vcam.far = 30; vcam.updateProjectionMatrix(); vcam.updateMatrixWorld();
      texMat.copy(bias).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
      const was = renderer.getRenderTarget(), bg = scene.background, fog = scene.fog, cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha(), xr = renderer.shadowMap.autoUpdate;
      scene.background = null; renderer.shadowMap.autoUpdate = false; renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, vcam);
      renderer.setRenderTarget(was); renderer.setClearColor(cc, ca); scene.background = bg; scene.fog = fog; renderer.shadowMap.autoUpdate = xr; api.renders++; },
  };
  return api;
}
