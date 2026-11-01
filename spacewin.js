// Room 1 east wall: one floor-to-ceiling glass window onto deep space. Nebula (painted texture) + procedural stars on parallax
// layers that slowly recede from the glass (each layer drifts away and fades, a new one takes its place), plus a faint
// reflection of the real room from a small cube capture that is refreshed when Options WALLS / FLOOR change.
import * as THREE from 'three';
export function setupSpaceWindow({ scene, room, renderer, HALF, H, isMobile }) {
  const W = HALF * 2, X = HALF - 0.012;
  const neb = new THREE.TextureLoader().load('tex/space_nebula.webp', () => api.dirty());
  neb.colorSpace = THREE.SRGBColorSpace; neb.wrapS = neb.wrapT = THREE.MirroredRepeatWrapping;
  const crt = new THREE.WebGLCubeRenderTarget(isMobile ? 64 : 128, { type: THREE.UnsignedByteType });
  const cube = new THREE.CubeCamera(0.1, 60, crt); cube.position.set(0, 2.6, 0); scene.add(cube);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uNeb: { value: neb }, uEnv: { value: crt.texture }, uRefl: { value: 1 }, uX: { value: X } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `
      uniform float uT, uRefl, uX; uniform sampler2D uNeb; uniform samplerCube uEnv; varying vec3 vW;
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
        // glass: faint reflection of the room (fresnel), tinted
        vec3 r = reflect(rd, vec3(-1., 0., 0.)); float fr = .16 + .55 * pow(1. - abs(rd.x), 4.);
        col += textureCube(uEnv, r).rgb * fr * uRefl * 1.5;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H).rotateY(-Math.PI / 2), mat);
  glass.position.set(X, H / 2, 0); glass.name = 'spaceWindow'; room.add(glass);
  // slim dark frame: sill, head and two mullions
  const fm = new THREE.MeshStandardMaterial({ color: 0x0c0912, roughness: 0.5, metalness: 0.7 }), fg = [];
  const bar = (y, z, h, w) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, w), fm); m.position.set(HALF - 0.06, y, z); m.name = 'windowFrame'; room.add(m); fg.push(m); };
  bar(0.04, 0, 0.08, W); bar(H - 0.04, 0, 0.08, W); bar(H / 2, -W / 6, H, 0.1); bar(H / 2, W / 6, H, 0.1);
  let pend = [], t0 = performance.now();
  const api = { cube, crt, glass, frame: fg, captures: 0, mat,
    dirty() { const n = performance.now(); pend = [n + 60, n + 900, n + 2500]; },   // a few captures so late-loading textures land too
    capture() { const refl = []; scene.traverse(o => { if (o.isReflector && o.visible) { refl.push(o); o.visible = false; } }); glass.visible = false; fg.forEach(m => m.visible = false); const was = renderer.getRenderTarget(); cube.update(renderer, scene); renderer.setRenderTarget(was); glass.visible = true; fg.forEach(m => m.visible = true); refl.forEach(o => o.visible = true); api.captures++; },
    update(now) { mat.uniforms.uT.value = (now - t0) / 1000; if (pend.length && now >= pend[0]) { pend.shift(); api.capture(); } },
  };
  api.dirty();
  return api;
}
