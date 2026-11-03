# Machine numbers (hidden menu > DEV > NUMBERS)

Cabinets with a game get yellow numbers; blank cabinets get cyan letters (see below). The numbers follow a walk around room 1: north wall (with the doorway) from left to right as you face it, then the west wall. Room 2 has blank wall cabinets plus the free-standing DEAD SIGNAL VR station (#9) in its exact centre. Slot key = `FEATURED['wall:index']` in main.js (wall 0=north, 1=west, 2=south, 3=east/space window; index 0..4 along the wall, north 2 = doorway).

| # | Slot key | Wall / position | Game (FEATURED value) |
|---|----------|-----------------|-----------------------|
| 1 | 0:0 | room 1 north, x=-8 (NW corner) | STRIKE (`strikeCab`, 'strike') |
| 2 | 0:1 | room 1 north, x=-4 | BERSERKER (`berserkerCab`, 'berserker') |
| 3 | 0:3 | room 1 north, x=+4 (right of door) | MONKEY CROSSING (`monkeyCab`, 'monkey') |
| 4 | 0:4 | room 1 north, x=+8 (NE corner) | NOVA TETHER (`novaCab`, 'nova') |
| 5 | 1:2 | room 1 west, z=0 (middle) | CYBER CITY (`cyberCab`, 'cyber') |
| 6 | 1:3 | room 1 west, z=-4 | ORC ATTACK (`orcCab`, 'orc') |
| 7 | 1:4 | room 1 west, z=-8 (NW corner) | GHOST 256 (`ghostCab`, 'ghost') |
| 8 | 2:0 (+2:1) | room 1 south, x=+8 and x=+4 (C + D), runs 4 m into the room (z 11.55 to 7.55) | MARS ROADSTER (`roadsterCab`, 'roadster'): two-seat driving cabinet, 2 slots wide, 4 long. Not a normal FSCALE cabinet, so it is placed by its own branch in the ROWS loop (`ROADSTER_SLOTS`) |
| 9 | r2:centre | room 2, exact middle (0, -29), free-standing (round platform r 2.05 + curved screen to the north) | DEAD SIGNAL VR STATION (`dsCab`, 'deadsignal'): not a wall slot; built by `dscab.js`, added as a room-2 child in main.js. Every machine costs 5 tickets |
| 10 | 1:1 | room 1 west, z=+4 (was blank B) | BLASTER (`blasterCab`, 'blaster'): RPG's 1984 tribute shooter, built by `blastercab.js`; copy `blaster-play/` from `tools_build_blaster_play.py`. Numbered 10 via `LATE_NUM` in main.js (after DEAD SIGNAL), so 1-9 keep their numbers |

To swap machine A and B, swap their two `[cab, name]` values in `FEATURED`. Numbers are assigned by slot, so after a swap each number stays on its slot and the game shown under it changes. Free blank slots: north 0:2 is the doorway; west 1:0; south 2:2 to 2:4 (2:0 and 2:1 hold MARS ROADSTER). The east wall is the space window and has no cabinets.

## Letters (blank cabinets)

Blank cabinets get cyan letter badges when NUMBERS is on. Letters run through room 1 first (west row, then south row), then the 19 slots in room 2. Each letter belongs to its slot, so B is skipped now that BLASTER (#10) is there, and C and D are skipped now that MARS ROADSTER covers them (A and E-Z keep their letters; `R1L` in main.js).

| Letter | Slot key | Where (world x, z) |
|---|---|---|
| A | `1:0` | room 1 west wall, (-12, 8) |
| ~~B~~ | `1:1` | retired: BLASTER (#10) |
| ~~C~~ | `2:0` | retired: MARS ROADSTER (#8) |
| ~~D~~ | `2:1` | retired: MARS ROADSTER (#8) |
| E | `2:2` | room 1 south wall, (0, 12) |
| F | `2:3` | room 1 south wall, (-4, 12) |
| G | `2:4` | room 1 south wall, (-8, 12) |
| H | `r2:0:0` | room 2 south (doorway) wall, (8, -17) |
| I | `r2:0:1` | room 2 south (doorway) wall, (4, -17) |
| J | `r2:0:3` | room 2 south (doorway) wall, (-4, -17) |
| K | `r2:0:4` | room 2 south (doorway) wall, (-8, -17) |
| L | `r2:1:0` | room 2 east wall, (12, -37) |
| M | `r2:1:1` | room 2 east wall, (12, -33) |
| N | `r2:1:2` | room 2 east wall, (12, -29) |
| O | `r2:1:3` | room 2 east wall, (12, -25) |
| P | `r2:1:4` | room 2 east wall, (12, -21) |
| Q | `r2:2:0` | room 2 north wall, (-8, -41) |
| R | `r2:2:1` | room 2 north wall, (-4, -41) |
| S | `r2:2:2` | room 2 north wall, (-0, -41) |
| T | `r2:2:3` | room 2 north wall, (4, -41) |
| U | `r2:2:4` | room 2 north wall, (8, -41) |
| V | `r2:3:0` | room 2 west wall, (-12, -21) |
| W | `r2:3:1` | room 2 west wall, (-12, -25) |
| X | `r2:3:2` | room 2 west wall, (-12, -29) |
| Y | `r2:3:3` | room 2 west wall, (-12, -33) |
| Z | `r2:3:4` | room 2 west wall, (-12, -37) |

### Putting a game in a lettered cabinet
- **Room 1 letters (A, B, E-G):** add the slot key to `FEATURED` in main.js, e.g. "put ORC in B" becomes `'1:1': [orcCab, 'orc']`. To move a game out of a numbered slot, delete its old key. The badge then becomes a number automatically, and plinth, neon and collision all follow.
- **Room 2 letters (H-Z):** room 2 cabinets are copies of room 1's blank layout (rotated 180 degrees), and the code can't yet put a game there. The first time it's needed, add a small hook: a `FEATURED2` map keyed by `w:i` that hides that copy and places the cabinet in `room2` at the slot's position, with a blocker and world-space front/facing. Slot `w:i` in room 2 sits at world (-x, Z2 - z) of room 1's slot `w:i`.
