# Machine numbers (hidden menu > DEV > NUMBERS)

Only cabinets with a game are numbered; blank cabinets get no number. The numbers follow a walk around room 1: north wall (with the doorway) from left to right as you face it, then the west wall. Room 2 has only blank cabinets. Slot key = `FEATURED['wall:index']` in main.js (wall 0=north, 1=west, 2=south, 3=east/space window; index 0..4 along the wall, north 2 = doorway).

| # | Slot key | Wall / position | Game (FEATURED value) |
|---|----------|-----------------|-----------------------|
| 1 | 0:0 | room 1 north, x=-8 (NW corner) | STRIKE (`strikeCab`, 'strike') |
| 2 | 0:1 | room 1 north, x=-4 | BERSERKER (`berserkerCab`, 'berserker') |
| 3 | 0:3 | room 1 north, x=+4 (right of door) | MONKEY CROSSING (`monkeyCab`, 'monkey') |
| 4 | 0:4 | room 1 north, x=+8 (NE corner) | NOVA TETHER (`novaCab`, 'nova') |
| 5 | 1:2 | room 1 west, z=0 (middle) | CYBER CITY (`cyberCab`, 'cyber') |
| 6 | 1:3 | room 1 west, z=-4 | ORC ATTACK (`orcCab`, 'orc') |
| 7 | 1:4 | room 1 west, z=-8 (NW corner) | GHOST 256 (`ghostCab`, 'ghost') |

To swap machine A and B, swap their two `[cab, name]` values in `FEATURED`. Numbers are assigned by slot, so after a swap each number stays on its slot and the game shown under it changes. Free blank slots: north 0:2 is the doorway; west 1:0 and 1:1; south 2:0 to 2:4. The east wall is the space window and has no cabinets.
