/**
 * Yet Another Doom Clone - GPU Version
 *
 * Keeps all game logic (movement, collision, enemies, shooting) on the CPU
 * but moves the entire rendering pipeline to a GPU fragment shader doing
 * classic DDA raycasting.
 *
 * Original: https://github.com/carlini/js13k2019-yet-another-doom-clone
 * Original writeup: https://nicholas.carlini.com/writing/2019/javascript-doom-clone-13k.html
 *
 * @tsyne-app:name Doom Clone GPU
 * @tsyne-app:category games
 * @tsyne-app:builder buildDoomGPUApp
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, CanvasShader, Label, Window } from 'tsyne';
import { Vector3 } from 'cosyne';
import { DoomGame } from './doom-game';
import type { Enemy } from './enemy';
import { GameMap, getLevelInfo } from './game-map';

const GRID_SIZE = 128;
const MAX_ENEMIES = 10;

// DDA raycasting fragment shader
const doomShader = `
#version 110
uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_map;
uniform float u_gridSize;
uniform float u_cellSize;    // world units per grid cell
uniform vec3 u_gridOrigin;   // world-space origin of grid (minX, minY, 0)
uniform vec3 u_playerPos;    // x, y, z (eye position)
uniform float u_playerAngle;
uniform float u_health;
uniform float u_shootFlash;
uniform float u_numEnemies;

// Gun state
uniform float u_gunOffsetX;   // horizontal bob
uniform float u_gunOffsetY;   // recoil (negative = kick back)
uniform float u_gunBobZ;      // vertical bob
uniform float u_gunBarrelAngle; // barrel spin
uniform float u_gunFiring;    // 1.0 when firing

// Enemy data: up to 10 enemies, each as vec4(x, y, z, type)
// type: 0=walking, 1=flying
uniform vec4 u_enemy0;
uniform vec4 u_enemy1;
uniform vec4 u_enemy2;
uniform vec4 u_enemy3;
uniform vec4 u_enemy4;
uniform vec4 u_enemy5;
uniform vec4 u_enemy6;
uniform vec4 u_enemy7;
uniform vec4 u_enemy8;
uniform vec4 u_enemy9;

varying vec2 v_texCoord;

// Procedural brick pattern
vec3 brickTexture(vec2 uv, vec3 baseColor) {
  float brickH = 0.125;  // 1/8
  float brickW = 0.25;   // 1/4
  float mortarW = 0.02;

  float row = floor(uv.y / brickH);
  float offsetX = mod(row, 2.0) * brickW * 0.5;
  vec2 brickUV = vec2(mod(uv.x + offsetX, brickW), mod(uv.y, brickH));

  // Mortar lines
  float mortar = 0.0;
  if (brickUV.x < mortarW || brickUV.y < mortarW) {
    mortar = 1.0;
  }

  // Brick surface noise
  float noise = sin(uv.x * 47.3 + uv.y * 91.7) * 0.5 + 0.5;
  noise = noise * 0.15 + 0.85;

  vec3 brickColor = baseColor * noise;
  vec3 mortarColor = baseColor * 0.5;

  return mix(brickColor, mortarColor, mortar);
}

// Procedural tile texture for floor
vec3 tileTexture(vec2 uv) {
  float scale = 4.0;
  vec2 p = uv * scale;

  // Grid lines
  vec2 f = fract(p);
  float line = 0.0;
  if (f.x < 0.04 || f.y < 0.04) line = 1.0;

  float noise = sin(p.x * 12.3 + p.y * 7.1) * 0.5 + 0.5;
  vec3 tileSurface = vec3(0.35, 0.35, 0.32) * (0.8 + noise * 0.4);
  vec3 groutColor = vec3(0.15, 0.15, 0.13);

  return mix(tileSurface, groutColor, line);
}

vec4 getEnemy(int i) {
  if (i == 0) return u_enemy0;
  if (i == 1) return u_enemy1;
  if (i == 2) return u_enemy2;
  if (i == 3) return u_enemy3;
  if (i == 4) return u_enemy4;
  if (i == 5) return u_enemy5;
  if (i == 6) return u_enemy6;
  if (i == 7) return u_enemy7;
  if (i == 8) return u_enemy8;
  return u_enemy9;
}

void main() {
  vec2 uv = v_texCoord;
  float screenX = uv.x;
  float screenY = 1.0 - uv.y; // flip Y: 0=top, 1=bottom

  float width = u_resolution.x;
  float height = u_resolution.y;

  // FOV and projection factor (in normalized screen coords)
  float fov = 1.0472; // PI/3 = 60 degrees
  float halfFov = fov * 0.5;
  // projFactor maps world-height/distance to normalized screen fraction
  float projFactor = 1.0 / (2.0 * tan(halfFov));

  float rayAngle = u_playerAngle + halfFov - screenX * fov;
  float rayDirX = cos(rayAngle);
  float rayDirY = sin(rayAngle);

  // Player position in grid space (uniform cell size = square cells)
  float playerGridX = (u_playerPos.x - u_gridOrigin.x) / u_cellSize;
  float playerGridY = (u_playerPos.y - u_gridOrigin.y) / u_cellSize;

  // DDA raycasting in grid space
  float mapX = floor(playerGridX);
  float mapY = floor(playerGridY);

  float deltaDistX = abs(1.0 / rayDirX);
  float deltaDistY = abs(1.0 / rayDirY);

  float stepX, stepY;
  float sideDistX, sideDistY;

  if (rayDirX < 0.0) {
    stepX = -1.0;
    sideDistX = (playerGridX - mapX) * deltaDistX;
  } else {
    stepX = 1.0;
    sideDistX = (mapX + 1.0 - playerGridX) * deltaDistX;
  }

  if (rayDirY < 0.0) {
    stepY = -1.0;
    sideDistY = (playerGridY - mapY) * deltaDistY;
  } else {
    stepY = 1.0;
    sideDistY = (mapY + 1.0 - playerGridY) * deltaDistY;
  }

  // Step through grid
  float maxDist = 200.0;
  float wallDist = maxDist;
  float wallFloor = 0.0;
  float wallCeil = 40.0;
  int side = 0; // 0=NS, 1=EW
  bool hitWall = false;
  float hitU = 0.0; // texture coordinate along wall

  for (int i = 0; i < 128; i++) {
    if (mapX < 0.0 || mapX >= u_gridSize || mapY < 0.0 || mapY >= u_gridSize) break;

    // Sample grid texture
    vec2 gridUV = vec2((mapX + 0.5) / u_gridSize, (mapY + 0.5) / u_gridSize);
    vec4 cell = texture2D(u_map, gridUV);

    // A channel > 0.5 means wall
    if (cell.a > 0.5) {
      hitWall = true;
      wallFloor = cell.r * 100.0 - 20.0;  // decode floor height
      wallCeil = cell.g * 100.0 - 20.0;   // decode ceiling height

      // Calculate perpendicular distance in grid units (avoid fisheye)
      float gridDist;
      if (side == 0) {
        gridDist = sideDistX - deltaDistX;
        hitU = playerGridY + gridDist * rayDirY;
      } else {
        gridDist = sideDistY - deltaDistY;
        hitU = playerGridX + gridDist * rayDirX;
      }
      hitU = fract(hitU);

      // Convert grid distance to world distance
      wallDist = gridDist * u_cellSize;
      break;
    }

    // DDA step
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
  }

  // Calculate wall projection
  float eyeZ = u_playerPos.z;

  // Correct for fisheye
  float angleDiff = rayAngle - u_playerAngle;
  float correctedDist = wallDist * cos(angleDiff);
  if (correctedDist < 0.1) correctedDist = 0.1;

  // Wall top and bottom in screen space (0=top, 1=bottom)
  // Using projFactor: screenOffset = (worldHeight / distance) * projFactor
  float wallTopScreen = 0.5 - (wallCeil - eyeZ) / correctedDist * projFactor;
  float wallBotScreen = 0.5 - (wallFloor - eyeZ) / correctedDist * projFactor;

  // Distance fog
  float fog = max(0.3, 1.0 - correctedDist / maxDist);

  vec3 color = vec3(0.0);

  if (hitWall && screenY >= wallTopScreen && screenY <= wallBotScreen) {
    // Wall rendering
    float wallV = (screenY - wallTopScreen) / (wallBotScreen - wallTopScreen);

    vec3 wallColor;
    if (side == 0) {
      // NS wall
      wallColor = brickTexture(vec2(hitU, wallV), vec3(0.55, 0.39, 0.31));
    } else {
      // EW wall (darker)
      wallColor = brickTexture(vec2(hitU, wallV), vec3(0.47, 0.33, 0.27));
    }

    color = wallColor * fog;
  } else if (screenY > 0.5) {
    // Floor: screenY > 0.5 is below horizon
    // Solve for distance: screenY = 0.5 + eyeZ / dist * projFactor
    // => dist = eyeZ * projFactor / (screenY - 0.5)
    float floorDist = eyeZ * projFactor / (screenY - 0.5);
    float floorFog = max(0.3, 1.0 - floorDist / maxDist);

    // Floor world position for texture
    float floorWorldX = u_playerPos.x + cos(rayAngle) * floorDist;
    float floorWorldY = u_playerPos.y + sin(rayAngle) * floorDist;

    color = tileTexture(vec2(floorWorldX * 0.02, floorWorldY * 0.02)) * floorFog;
  } else {
    // Ceiling: screenY < 0.5 is above horizon
    float defaultCeil = 40.0;
    float ceilDist = (defaultCeil - eyeZ) * projFactor / (0.5 - screenY);
    float ceilFog = max(0.3, 1.0 - ceilDist / maxDist);
    color = vec3(0.15, 0.15, 0.18) * ceilFog;
  }

  // Enemy billboards
  int numEnemies = int(u_numEnemies);
  for (int i = 0; i < 10; i++) {
    if (i >= numEnemies) break;

    vec4 enemy = getEnemy(i);
    float ex = enemy.x;
    float ey = enemy.y;
    float ez = enemy.z;
    float etype = enemy.w;

    // Project enemy to screen
    float dx = ex - u_playerPos.x;
    float dy = ey - u_playerPos.y;
    float dist = length(vec2(dx, dy));

    // Skip if too far or behind player
    if (dist > maxDist || dist < 0.5) continue;

    // Skip if behind wall
    if (hitWall && dist > correctedDist) continue;

    // Angle to enemy
    float enemyAngle = atan(dy, dx);
    float screenAngle = enemyAngle - u_playerAngle;
    // Normalize to [-PI, PI]
    if (screenAngle > 3.14159) screenAngle -= 6.28318;
    if (screenAngle < -3.14159) screenAngle += 6.28318;

    // Skip if outside FOV
    if (abs(screenAngle) > halfFov) continue;

    // Enemy screen X position
    float enemyScreenX = 0.5 - screenAngle / fov;

    // Enemy size on screen using projFactor
    float enemyHeight = 5.0;
    float spriteHNorm = enemyHeight / dist * projFactor;
    float spriteWNorm = spriteHNorm * 0.8;

    // EXPLOSION: body parts flying apart (like original)
    if (etype >= 2.0) {
      float progress = etype - 2.0; // 0 to 1
      float t = progress * 3.0;
      float enemyFog = max(0.3, 1.0 - dist / maxDist);
      float enemyCenterY = 0.5 - (ez - eyeZ) / dist * projFactor;

      // Body parts flying outward with spin + strong gravity
      for (int p = 0; p < 6; p++) {
        float seed = float(p) * 7.13 + ex * 3.1 + ey * 5.7;
        float vx = (fract(sin(seed) * 43758.5453) - 0.5) * 3.0;
        float vy = fract(sin(seed * 1.31 + 17.3) * 27183.1) - 2.0;
        float partX = enemyScreenX + vx * spriteWNorm * t;
        float partY = enemyCenterY + (vy * t + 4.0 * t * t) * spriteHNorm;
        float partW = spriteWNorm * 0.16 * (1.0 - progress * 0.3);
        float partH = spriteHNorm * 0.10 * (1.0 - progress * 0.3);
        // Spinning rectangle
        float ang = t * (3.0 + fract(seed * 7.7) * 5.0);
        float lx = screenX - partX;
        float ly = screenY - partY;
        float cs = cos(ang), sn = sin(ang);
        if (abs(lx * cs + ly * sn) < partW && abs(-lx * sn + ly * cs) < partH) {
          float fade = 1.0 - progress;
          vec3 pc;
          if (p == 0) pc = vec3(0.8, 0.1, 0.05); // head
          else if (p < 3) pc = vec3(0.55, 0.55, 0.55); // torso
          else pc = vec3(0.4, 0.4, 0.42); // limbs
          color = mix(color, pc * enemyFog, fade);
        }
      }
      // Spark particles
      for (int s = 0; s < 10; s++) {
        float seed2 = float(s) * 11.37 + ex * 7.3 + ey * 2.9 + 200.0;
        float sx = (fract(sin(seed2) * 43758.5453) - 0.5) * 4.5;
        float sy = fract(sin(seed2 * 1.73 + 5.1) * 27183.1) - 2.5;
        float sparkX = enemyScreenX + sx * spriteWNorm * t;
        float sparkY = enemyCenterY + (sy * t + 5.0 * t * t) * spriteHNorm;
        float sparkSz = spriteHNorm * 0.035 * max(0.0, 1.0 - progress * 1.3);
        if (length(vec2(screenX - sparkX, screenY - sparkY)) < sparkSz) {
          float fade2 = max(0.0, 1.0 - progress * 1.3);
          float hue2 = fract(sin(seed2 * 2.31) * 12345.6);
          vec3 sc = mix(vec3(1.0, 0.4, 0.0), vec3(1.0, 0.9, 0.3), hue2);
          color = mix(color, sc * 2.0 * enemyFog, fade2);
        }
      }

    } else if (abs(screenX - enemyScreenX) < spriteWNorm * 0.5) {
      // ALIVE ENEMY SPRITE (detailed)
      float enemyTopScreen = 0.5 - (ez + enemyHeight * 0.5 - eyeZ) / dist * projFactor;
      float enemyBotScreen = 0.5 - (ez - enemyHeight * 0.5 - eyeZ) / dist * projFactor;

      if (screenY >= enemyTopScreen && screenY <= enemyBotScreen) {
        float spriteV = (screenY - enemyTopScreen) / (enemyBotScreen - enemyTopScreen);
        float spriteU = (screenX - enemyScreenX + spriteWNorm * 0.5) / spriteWNorm;
        float enemyFog = max(0.3, 1.0 - dist / maxDist);
        float animPhase = u_time * 3.0 + ex * 1.7 + ey * 2.3;
        float centerU = abs(spriteU - 0.5);

        vec3 ec = vec3(-1.0); // sentinel = transparent

        if (etype < 0.5) {
          // Walking enemy: humanoid
          if (spriteV < 0.22) {
            // Head (red, rounded)
            float headR = 0.20 - spriteV * 0.08;
            if (centerU < headR) {
              ec = vec3(0.75, 0.12, 0.08);
              // Eyes
              if (spriteV > 0.10 && spriteV < 0.17) {
                if (abs(spriteU - 0.40) < 0.04 || abs(spriteU - 0.60) < 0.04)
                  ec = vec3(1.0, 0.0, 0.0);
              }
            }
          } else if (spriteV < 0.26) {
            if (centerU < 0.07) ec = vec3(0.60, 0.60, 0.60); // neck
          } else if (spriteV < 0.55) {
            // Torso + arms
            if (centerU < 0.20) {
              float sh = 0.72 + 0.06 * sin(spriteV * 12.0);
              ec = vec3(sh, sh, sh + 0.02);
            } else if (centerU < 0.35) {
              // Arms with swing
              float armOff = sin(animPhase) * 0.06 * (spriteU > 0.5 ? 1.0 : -1.0);
              float armV = spriteV - 0.28 + armOff;
              if (armV > 0.0 && armV < 0.22)
                ec = vec3(0.55, 0.55, 0.57);
            }
          } else if (spriteV < 0.60) {
            if (centerU < 0.14) ec = vec3(0.45, 0.45, 0.47); // waist
          } else {
            // Legs (walking)
            float legW = 0.08;
            float swing = sin(animPhase) * 0.04;
            float legL = 0.5 - 0.11 + swing;
            float legR = 0.5 + 0.11 - swing;
            if (abs(spriteU - legL) < legW || abs(spriteU - legR) < legW) {
              float ls = 0.38 + 0.08 * sin(spriteV * 14.0 + animPhase);
              ec = vec3(ls, ls, ls + 0.02);
            }
          }
        } else {
          // Flying enemy: winged creature
          float wingFlap = sin(u_time * 5.0 + ex * 2.1) * 0.12;
          if (centerU < 0.10) {
            // Body
            ec = vec3(0.35, 0.35, 0.38);
            if (spriteV > 0.35 && spriteV < 0.55 && centerU < 0.05) {
              float g = 0.7 + 0.3 * sin(u_time * 4.0 + ey);
              ec = vec3(g, 0.05, 0.0); // red glow core
            }
            if (spriteV > 0.18 && spriteV < 0.28) {
              if (abs(spriteU - 0.43) < 0.03 || abs(spriteU - 0.57) < 0.03)
                ec = vec3(1.0, 0.0, 0.0); // eyes
            }
          } else if (centerU < 0.48) {
            // Wings (tapered, flapping)
            float wingV = spriteV - 0.35 + wingFlap * (spriteU > 0.5 ? 1.0 : -1.0);
            float thick = 0.25 * (1.0 - (centerU - 0.10) / 0.38);
            if (abs(wingV) < thick) {
              float ws = 0.25 + 0.07 * (1.0 - centerU);
              ec = vec3(ws, ws, ws + 0.02);
            }
          }
        }

        if (ec.r >= 0.0) {
          color = ec * enemyFog;
        }
      }
    }
  }

  // ============ GUN RENDERING ============
  {
    float asp = width / height;
    // Gun position: bottom center with bob/recoil
    vec2 gc = vec2(0.5 + u_gunOffsetX * 0.5, 0.82 - u_gunBobZ * 0.5 - u_gunOffsetY * 0.3);
    float gx = (screenX - gc.x) * asp;
    float gy = screenY - gc.y;
    float sc = 0.14;

    // Body housing
    float bodyW = sc * 0.75;
    float bodyTop = -sc * 0.25;
    float bodyBot = sc * 1.0;
    if (abs(gx) < bodyW && gy > bodyTop && gy < bodyBot) {
      float shade = 0.32 + 0.07 * (1.0 - abs(gx) / bodyW);
      shade -= 0.05 * (gy - bodyTop) / (bodyBot - bodyTop);
      // Edge highlights
      if (abs(abs(gx) - bodyW * 0.92) < bodyW * 0.06) shade += 0.08;
      color = vec3(shade, shade, shade + 0.012);
    }

    // Barrel cluster (8 barrels in ring, viewed from behind)
    float ringR = sc * 0.44;
    vec2 bc = vec2(0.0, -sc * 0.25);
    float rd = length(vec2(gx - bc.x, gy - bc.y));

    if (rd < ringR * 1.15) {
      color = vec3(0.28, 0.28, 0.30);
      if (rd > ringR * 0.92) color = vec3(0.42, 0.42, 0.45);
      for (int b = 0; b < 8; b++) {
        float ba = float(b) * 0.7854 + u_gunBarrelAngle;
        vec2 bp = ringR * 0.6 * vec2(cos(ba), sin(ba));
        float bd = length(vec2(gx - bc.x - bp.x, gy - bc.y - bp.y));
        float br = sc * 0.065;
        if (bd < br) {
          color = vec3(0.05, 0.05, 0.07);
        } else if (bd < br * 1.7) {
          color = vec3(0.48, 0.47, 0.50);
        }
      }
    }

    // Grip
    if (abs(gx) < sc * 0.18 && gy > bodyBot && gy < bodyBot + sc * 0.45) {
      color = vec3(0.18, 0.15, 0.12);
    }

    // Muzzle flash at barrel tips
    if (u_shootFlash > 0.1) {
      float fd = length(vec2(gx - bc.x, gy - bc.y + sc * 0.4));
      float fr = sc * 0.55 * u_shootFlash;
      if (fd < fr) {
        float fi = (1.0 - fd / fr) * u_shootFlash;
        color += vec3(1.0, 0.7, 0.2) * fi * 3.0;
      }
    }
  }

  // ============ HUD ============
  // Crosshair
  float crossSz = 5.0 / width;
  float crossTh = 1.0 / width;
  if ((abs(screenX - 0.5) < crossSz && abs(screenY - 0.5) < crossTh) ||
      (abs(screenY - 0.5) < crossSz && abs(screenX - 0.5) < crossTh)) {
    color = vec3(1.0);
  }

  // Health bar (bottom-left)
  if (screenX > 0.02 && screenX < 0.22 &&
      screenY > 0.96 && screenY < 0.985) {
    float hf = u_health / 100.0;
    if (screenX < 0.02 + 0.20 * hf) {
      color = mix(vec3(0.8, 0.1, 0.1), vec3(0.1, 0.8, 0.1), hf);
    } else {
      color = vec3(0.2, 0.0, 0.0);
    }
  }

  // Screen-wide muzzle flash tint
  if (u_shootFlash > 0.0) {
    color += vec3(0.15, 0.10, 0.03) * u_shootFlash;
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Convert the polygon-based map to a 2D grid texture.
 * Uses uniform cell size (square cells in world space) to avoid DDA distortion.
 */
function convertMapToGrid(map: GameMap): { data: Uint8Array; originX: number; originY: number; cellSize: number } {
  // Find map bounds from all regions
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const region of map.regions) {
    for (const v of region.vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
  }

  // Add margin
  const margin = 10;
  minX -= margin;
  minY -= margin;
  maxX += margin;
  maxY += margin;

  // Use uniform cell size: square cells based on the larger dimension
  const mapWidth = maxX - minX;
  const mapHeight = maxY - minY;
  const maxDim = Math.max(mapWidth, mapHeight);
  const cellSize = maxDim / GRID_SIZE;

  // Center the smaller dimension within the grid
  const originX = minX - (maxDim - mapWidth) / 2;
  const originY = minY - (maxDim - mapHeight) / 2;

  const data = new Uint8Array(GRID_SIZE * GRID_SIZE * 4);

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const worldX = originX + (gx + 0.5) * cellSize;
      const worldY = originY + (gy + 0.5) * cellSize;
      const testPos = new Vector3(worldX, worldY, 0);

      const idx = (gy * GRID_SIZE + gx) * 4;

      // Check if point is inside any region
      const region = map.getRegionAt(testPos);
      if (region) {
        // Inside a region = passable space
        // Encode floor and ceiling heights into [0,255]
        // Range: -20 to +80 world units maps to 0-255
        const floorEncoded = Math.max(0, Math.min(255, Math.round((region.floorHeight + 20) / 100 * 255)));
        const ceilEncoded = Math.max(0, Math.min(255, Math.round((region.ceilHeight + 20) / 100 * 255)));

        data[idx] = floorEncoded;     // R = floor height
        data[idx + 1] = ceilEncoded;  // G = ceiling height
        data[idx + 2] = 0;            // B = not a wall
        data[idx + 3] = 0;            // A = passable
      } else {
        // Outside all regions = solid wall
        data[idx] = 0;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;          // A > 0.5 = wall
      }
    }
  }

  return { data, originX, originY, cellSize };
}

class DoomGPUUI {
  private a: App;
  private game: DoomGame;
  private shader: CanvasShader | null = null;
  private scoreLabel: Label | null = null;
  private healthLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private levelLabel: Label | null = null;
  private gameLoop: ReturnType<typeof setInterval> | null = null;
  private gridOriginX = 0;
  private gridOriginY = 0;
  private cellSize = 1;
  private deathTimers = new Map<Enemy, number>(); // enemy -> death timestamp

  private canvasWidth: number;
  private canvasHeight: number;

  constructor(a: App, canvasWidth: number = 400, canvasHeight: number = 300) {
    this.a = a;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.game = new DoomGame(canvasWidth, canvasHeight);
  }

  build(): void {
    this.a.window({ title: 'Doom Clone (GPU)', width: 500, height: 480 }, (win: Window) => {
      win.setContent(() => {
        this.a.border({
          top: () => {
            this.a.vbox(() => {
              this.a.hbox(() => {
                this.a.label('Doom Clone GPU');
                this.a.spacer();
                this.levelLabel = this.a.label('Level 1: Training Ground');
              });
              this.a.hbox(() => {
                this.scoreLabel = this.a.label('Score: 0');
                this.a.spacer();
                this.healthLabel = this.a.label('Health: 100');
                this.a.spacer();
                this.statusLabel = this.a.label('Playing');
              });
            });
          },
          center: () => {
            this.shader = this.a.canvasShader(this.canvasWidth, this.canvasHeight, doomShader, {
              uniforms: {
                u_gridSize: GRID_SIZE,
                u_cellSize: 1.0,
                u_gridOrigin: [0, 0, 0],
                u_playerPos: [0, 0, 0],
                u_playerAngle: 0,
                u_health: 100,
                u_shootFlash: 0,
                u_numEnemies: 0,
                u_gunOffsetX: 0,
                u_gunOffsetY: 0,
                u_gunBobZ: 0,
                u_gunBarrelAngle: 0,
                u_gunFiring: 0,
              },
              onKeyDown: (e) => {
                if (this.game.getGameState() === 'won') {
                  if (this.game.currentLevel + 1 < this.game.getTotalLevels()) {
                    this.game.nextLevel();
                    this.uploadMap();
                    this.startGameLoop();
                    this.updateUI();
                  }
                } else {
                  this.game.setKey(e.key, true);
                }
              },
              onKeyUp: (e) => {
                this.game.setKey(e.key, false);
              },
            });
          },
          bottom: () => {
            this.a.vbox(() => {
              this.a.label('WASD/Arrows: Move | Space: Shoot');
              this.a.hbox(() => {
                this.a.button('New Game', {
                  onClick: async () => {
                    this.game.reset();
                    await this.uploadMap();
                    this.startGameLoop();
                    this.updateUI();
                    if (this.shader) await this.shader.requestFocus();
                  },
                });
                this.a.button('Pause', {
                  onClick: async () => {
                    if (this.gameLoop) {
                      clearInterval(this.gameLoop);
                      this.gameLoop = null;
                      this.statusLabel?.setText('Paused');
                    } else {
                      this.startGameLoop();
                      this.statusLabel?.setText('Playing');
                    }
                    if (this.shader) await this.shader.requestFocus();
                  },
                });
                this.a.button('<<', {
                  onClick: async () => {
                    const prev = (this.game.currentLevel - 1 + this.game.getTotalLevels()) % this.game.getTotalLevels();
                    this.game.loadLevel(prev);
                    await this.uploadMap();
                    this.startGameLoop();
                    this.updateUI();
                    if (this.shader) await this.shader.requestFocus();
                  },
                });
                this.a.button('>>', {
                  onClick: async () => {
                    this.game.nextLevel();
                    await this.uploadMap();
                    this.startGameLoop();
                    this.updateUI();
                    if (this.shader) await this.shader.requestFocus();
                  },
                });
              });
            });
          },
        });
      });

      win.show();

      setTimeout(async () => {
        await this.uploadMap();
        if (this.shader) {
          await this.shader.setAutoAnimate(true);
          await this.shader.requestFocus();
        }
        this.startGameLoop();
      }, 100);
    });
  }

  private async uploadMap(): Promise<void> {
    if (!this.shader) return;
    this.deathTimers.clear();

    const { data, originX, originY, cellSize } = convertMapToGrid(this.game.map);
    this.gridOriginX = originX;
    this.gridOriginY = originY;
    this.cellSize = cellSize;

    await this.shader.setTextureData('u_map', data, GRID_SIZE, GRID_SIZE);
    await this.shader.setUniforms({
      u_cellSize: cellSize,
      u_gridOrigin: [originX, originY, 0],
    });
  }

  private startGameLoop(): void {
    if (this.gameLoop) clearInterval(this.gameLoop);

    this.gameLoop = setInterval(() => {
      try {
        this.game.tick(Date.now());
        this.updateShaderUniforms();
        this.updateUI();
      } catch (err) {
        console.error('[DOOM GPU] Game loop error:', err);
      }
    }, 33); // ~30 FPS game logic
  }

  private updateShaderUniforms(): void {
    if (!this.shader) return;

    const player = this.game.player;
    const eyePos = player.getEyePosition();

    // Build enemy data: alive enemies + recently-dead enemies (explosion effect)
    const EXPLOSION_DURATION = 350; // ms — short sharp burst like original
    const now = Date.now();

    // Track newly dead enemies
    for (const e of this.game.enemies) {
      if (e.dead && !this.deathTimers.has(e)) {
        this.deathTimers.set(e, now);
      }
    }

    // Collect visible enemies: alive + exploding (within duration)
    const visibleEnemies: { enemy: Enemy; type: number }[] = [];
    for (const e of this.game.enemies) {
      if (!e.dead) {
        visibleEnemies.push({ enemy: e, type: e.type === 'walking' ? 0 : 1 });
      } else {
        const deathTime = this.deathTimers.get(e);
        if (deathTime !== undefined) {
          const elapsed = now - deathTime;
          if (elapsed < EXPLOSION_DURATION) {
            // type >= 2.0 means exploding; fractional part = progress (0 to ~1)
            visibleEnemies.push({ enemy: e, type: 2.0 + elapsed / EXPLOSION_DURATION });
          }
          // Don't delete — entry must stay so the first loop won't re-add it
        }
      }
    }

    const numEnemies = Math.min(visibleEnemies.length, MAX_ENEMIES);

    const gun = this.game.chaingun;
    const uniforms: Record<string, number | number[]> = {
      u_playerPos: [player.position.x, player.position.y, eyePos.z],
      u_playerAngle: player.theta,
      u_health: Math.max(0, player.health),
      u_shootFlash: this.game.shootFlashFrames > 0 ? this.game.shootFlashFrames / 3.0 : 0,
      u_numEnemies: numEnemies,
      u_gunOffsetX: gun.offsetX,
      u_gunOffsetY: gun.recoilY,
      u_gunBobZ: gun.offsetZ,
      u_gunBarrelAngle: gun.barrelRotation,
      u_gunFiring: gun.firing ? 1.0 : 0.0,
    };

    // Set individual enemy uniforms
    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (i < numEnemies) {
        const v = visibleEnemies[i];
        uniforms[`u_enemy${i}`] = [v.enemy.position.x, v.enemy.position.y, v.enemy.position.z, v.type];
      } else {
        uniforms[`u_enemy${i}`] = [0, 0, -1000, 0];
      }
    }

    this.shader.setUniforms(uniforms);
  }

  private updateUI(): void {
    if (this.scoreLabel) {
      this.scoreLabel.setText(`Score: ${this.game.getScore()}`);
    }
    if (this.healthLabel) {
      this.healthLabel.setText(`Health: ${this.game.getHealth()}`);
    }
    if (this.levelLabel) {
      const info = this.game.getLevelInfo();
      if (info) {
        this.levelLabel.setText(`Level ${this.game.currentLevel + 1}: ${info.name}`);
      }
    }

    const state = this.game.getGameState();
    if (this.statusLabel) {
      if (state === 'gameover') {
        this.statusLabel.setText('Game Over!');
        if (this.gameLoop) {
          clearInterval(this.gameLoop);
          this.gameLoop = null;
        }
      } else if (state === 'won') {
        const hasNext = this.game.currentLevel + 1 < this.game.getTotalLevels();
        this.statusLabel.setText(hasNext ? 'Level Complete!' : 'You Win!');
        if (this.gameLoop) {
          clearInterval(this.gameLoop);
          this.gameLoop = null;
        }
      } else if (state === 'playing') {
        this.statusLabel.setText(`${this.game.getEnemiesAlive()} enemies`);
      }
    }
  }
}

export function buildDoomGPUApp(a: App, windowWidth?: number, windowHeight?: number): void {
  const canvasWidth = windowWidth ? Math.max(200, windowWidth - 20) : 400;
  const canvasHeight = windowHeight ? Math.max(150, windowHeight - 160) : 300;

  const ui = new DoomGPUUI(a, canvasWidth, canvasHeight);
  ui.build();
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Doom Clone GPU' }, buildDoomGPUApp);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
