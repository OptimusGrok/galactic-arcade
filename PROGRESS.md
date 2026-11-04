
## t253 PORTALS in room 2 + hallway (sw v109)
- setWalls: room 2 walls R2_WALLS swap to the shared portalMat (window wall 1 stays hidden/window); hallway W/E walls use portalWallsHall (portalMat clone, uv scaled HALL_L x DOOR_H, shared portalU uniforms); originals restored via userData.mat0; medieval hallway code reads mat0.
- Draw calls in room 2 (phone): current 229 -> portals 223.
- test/portals_room2.js (phone 412x915), shots/portals_{room2_wide,room2_back,room2_window,hall}_phone.png
