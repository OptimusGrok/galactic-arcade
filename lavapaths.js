// LAVA floor cave paths: ONE source of truth for the lava shader (main.js) and the lava-fall test (step()).
// World x/z. Capsule segments [x1, z1, x2, z2], rings [cx, cz, r] (a band along the circle), discs [cx, cz, r] (solid: pads, platforms).
export const PATH_HW = 0.94;     // half width of a path where the shader draws rock (its rough edge wobbles about +-0.22 around this)
export const PATH_TOL = 0.22;    // fairness: feet this far past the drawn edge still count as on the path
export const ISLAND_R = 0.15, JUMP_GAP = 1.22;   // disc radius (+PATH_HW = drawn radius 1.09) and the lava gap each side
const ISLANDS = Z2 => { const a = PATH_HW + JUMP_GAP + PATH_HW + ISLAND_R, b = a + 2 * (PATH_HW + ISLAND_R) + JUMP_GAP; return [[-a, 4.5, ISLAND_R], [-b, 4.5, ISLAND_R], [a, Z2 + 5, ISLAND_R], [b, Z2 + 5, ISLAND_R]]; };
export function lavaPaths(Z2, WX) {
  const S = [], R = [], D = [], rect = (cx, cz, h) => S.push([cx - h, cz - h, cx + h, cz - h], [cx + h, cz - h, cx + h, cz + h], [cx + h, cz + h, cx - h, cz + h], [cx - h, cz + h, cx - h, cz - h]);
  rect(0, 0, 9.9); rect(0, Z2, 9.9); rect(WX, 0, 9.9);                                   // along the cabinet fronts of each room
  S.push([0, 9.9, 0, 1.9], [0, -1.9, 0, Z2 + 2.7], [0, Z2 - 2.7, 0, Z2 - 9.9], [-9.9, Z2, -2.7, Z2], [2.7, Z2, 9.9, Z2],   // doorways, hallway centre, room 2 spokes
    [-9.9, -9.9, -10.75 + 1.2, -10.75 + 1.2], [WX - 9.9, 0, WX - 1.8, 0], [WX + 1.8, 0, WX + 9.9, 0], [WX, 1.8, WX, 9.9], [WX, -1.8, WX, -9.9],
    [2.85, 9.9, 2.85, 6.9], [2.85, 6.9, 9.15, 6.9], [9.15, 6.9, 9.15, 9.9]);                // round the MARS ROADSTER: both seat sides + the open end
  R.push([0, 0, 1.9], [-10.75, -10.75, 1.75], [0, Z2, 2.7], [WX, 0, 1.8]);                   // round the kiosk, teleporter pads, Dead Signal station
  D.push([-10.75, -10.75, 1.3], [WX, 0, 1.3], [0, Z2, 2.4]);                               // standing on the pads / the VR platform is always safe
  // STEPPING STONES (t187, Dave: 'a small section of the path in between two paths in the middle so the player can jump onto it'):
  // small rock islands (drawn ~2.2 m across) with JUMP_GAP-wide lava gaps between them and the paths - jumpable, not walkable.
  // room 1: two stones in the west-middle lava between the centre spoke (x=0) and the west cabinet path (x=-9.9);
  // room 2: two stones in its south-east lava between the centre spoke and the east path.
  D.push(...ISLANDS(Z2));
  // t189: Chief of Staff's shop.js moves the white-room teleporter pad (tp.PAD2) to the corner (WX-12, 12); give it the same ring + safe disc,
  // and a short spur from the cabinet-path corner (test/lava.js reads the live pad position and checks it is on a path).
  const P2 = [WX - 12, 12]; S.push([WX - 9.9, 9.9, P2[0] + 1.2, P2[1] - 1.2]); R.push([P2[0], P2[1], 1.8]); D.push([P2[0], P2[1], 1.3]);
  function dist(x, z) { let d = 1e9;
    for (const [ax, az, bx, bz] of S) { const ex = bx - ax, ez = bz - az, h = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / Math.max(ex * ex + ez * ez, 1e-6))); d = Math.min(d, Math.hypot(x - ax - ex * h, z - az - ez * h)); }
    for (const [cx, cz, r] of R) d = Math.min(d, Math.abs(Math.hypot(x - cx, z - cz) - r));
    for (const [cx, cz, r] of D) d = Math.min(d, Math.max(0, Math.hypot(x - cx, z - cz) - r));
    return d; }
  const onPath = (x, z, tol = PATH_TOL) => dist(x, z) <= PATH_HW + tol;
  // centre-line sample points (every 0.25 m) for respawning
  function samples() { const o = [];
    for (const [ax, az, bx, bz] of S) { const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25)); for (let i = 0; i <= n; i++) o.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]); }
    for (const [cx, cz, r] of R) { const n = Math.ceil(2 * Math.PI * r / 0.25); for (let i = 0; i < n; i++) o.push([cx + Math.cos(i / n * 6.2832) * r, cz + Math.sin(i / n * 6.2832) * r]); }
    return o; }
  return { S, R, D, dist, onPath, samples };
}
