// Room 1 east wall: one floor-to-ceiling glass window onto deep space. Nebula (painted texture) + procedural stars on parallax
// layers that slowly recede from the glass (each layer drifts away and fades, a new one takes its place). The glass reflects
// nothing of the room: only the monkey, via a small planar mirror pass that renders just him (layer 30), faded in within ~2.8 m.
import * as THREE from 'three';
export function setupSpaceWindow({ scene, room, renderer, HALF, H, isMobile, getMonkey, getCamera }) {
  const W = HALF * 2, X = HALF - 0.012;
  const neb = new THREE.TextureLoader().load('tex/space_nebula.webp', () => api.dirty());
  neb.colorSpace = THREE.SRGBColorSpace; neb.wrapS = neb.wrapT = THREE.MirroredRepeatWrapping;
  const LAYER = 30, RS = isMobile ? 256 : 512, NEAR0 = 1.4, NEAR1 = 2.8;
  const rt = new THREE.WebGLRenderTarget(RS, RS, { type: THREE.UnsignedByteType });
  const vcam = new THREE.PerspectiveCamera(); vcam.layers.set(LAYER);
  const texMat = new THREE.Matrix4(), bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uNeb: { value: neb }, uMir: { value: rt.texture }, uTM: { value: texMat }, uNear: { value: 0 }, uX: { value: X } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform float uT, uNear, uX; uniform sampler2D uNeb, uMir; uniform mat4 uTM; varying vec3 vW;
      float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      vec3 starL(vec2 uv, float cell){ vec2 g = uv / cell, id = floor(g), f = fract(g) - .5; float h = h21(id);
        vec2 o = vec2(h21(id + 3.1), h21(id + 7.7)) - .5; float d = length(f - o * .7);
        float b = smoothstep(.09, 0., d) * step(.62, h) * (h - .55) * 3.2 + smoothstep(.03, 0., d) * step(.62, h);
        return b * mix(vec3(.75, .85, 1.), vec3(1., .8, .95), h21(id + 9.)); }
      // a layer of space "depth" D metres behind the glass, seen from the camera: real parallax
      vec2 at(vec3 ro, vec3 rd, float D){ float t = (uX + D - ro.x) / max(rd.x, .02); vec3 p = ro + rd * t; return p.zy / D; }
      void main(){
        vec3 ro = cameraPosition, rd = normalize(vW - ro); vec3 col = vec3(.004, .002, .014);
        // nebula: two copies receding (zooming out) in turn, cross-faded
        for (int k = 0; k < 2; k++) { float ph = fract(uT * .006 + float(k) * .5), D = 60. * exp2(ph * 1.5);
          vec2 uv = at(ro, rd, D) * vec2(.11, .19) * (60. / D) * 6. + vec2(.5 + uT * .0015, .5) + float(k) * vec2(.37, .21);
          col += texture2D(uNeb, uv).rgb * sin(3.14159 * ph) * 1.1; }
        // stars: three receding layers
        for (int k = 0; k < 3; k++) { float ph = fract(uT * .012 + float(k) / 3.), D = 25. * exp2(ph * 2.);
          col += starL(at(ro, rd, D) * 40. + float(k) * 17.3, .55) * sin(3.14159 * ph); }
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
