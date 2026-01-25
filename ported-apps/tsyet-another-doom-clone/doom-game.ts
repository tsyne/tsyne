import { Vector3, urandom } from 'cosyne';
import { Player } from './player';
import { GameMap, getLevelCount, getLevelInfo, LevelInfo } from './game-map';
import { RaycastRenderer } from './renderer';
import { Enemy } from './enemy';
import { WalkingEnemy } from './walking-enemy';
import { FlyingEnemy } from './flying-enemy';
import { BodyPart, createWalkingEnemyBodyParts, createFlyingEnemyBodyParts } from './body-part';
import { Chaingun } from './chaingun';
import { HitParticle, LightFlash, createWallHitParticles, createEnemyHitParticles } from './hit-particle';
import { ZERO, rayLineIntersect, checkWallCollision } from './physics';

// ============================================================================
// Game State Management
// ============================================================================

export type GameState = 'playing' | 'paused' | 'gameover' | 'won';
export type ChangeListener = () => void;

// ============================================================================
// Screen Shake System
// ============================================================================

/**
 * ScreenShake - handles screen shake effects when shooting
 * Uses damped oscillation for natural-feeling shake
 */
export class ScreenShake {
  private intensity: number = 0;
  private decay: number = 0.9;       // How fast shake decays (0-1)
  private frequency: number = 25;    // Oscillation frequency
  private time: number = 0;

  // Current offset values
  offsetX: number = 0;
  offsetY: number = 0;
  rotation: number = 0;

  /**
   * Trigger a new shake
   * @param intensity Initial shake intensity (pixels)
   */
  shake(intensity: number = 3): void {
    this.intensity = Math.min(this.intensity + intensity, 10);
  }

  /**
   * Update shake state
   * @param dt Delta time in milliseconds
   */
  update(dt: number): void {
    if (this.intensity < 0.01) {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.rotation = 0;
      return;
    }

    this.time += dt;

    // Damped oscillation
    const shake = this.intensity * Math.exp(-this.time * 0.005);

    // Random direction per frame for chaotic feel
    const angle = this.time * this.frequency * 0.001;
    this.offsetX = Math.sin(angle * 1.1) * shake;
    this.offsetY = Math.cos(angle * 1.3) * shake;
    this.rotation = Math.sin(angle * 0.7) * shake * 0.003;

    // Decay intensity
    this.intensity *= Math.pow(this.decay, dt / 16);
  }

  /**
   * Get current shake offsets
   */
  getOffsets(): { x: number; y: number; rotation: number } {
    return { x: this.offsetX, y: this.offsetY, rotation: this.rotation };
  }
}

export class DoomGame {
  map: GameMap;
  player: Player;
  enemies: Enemy[] = [];
  bodyParts: BodyPart[] = [];    // Death explosion particles
  hitParticles: HitParticle[] = [];  // Bullet impact sparks
  lightFlashes: LightFlash[] = [];   // Impact light effects
  chaingun: Chaingun;            // 3D gun model
  renderer: RaycastRenderer;
  screenShake: ScreenShake;      // Screen shake effect

  gameState: GameState = 'playing';
  score: number = 0;
  keysHeld: Set<string> = new Set();
  currentLevel: number = 0;      // Current level index

  // Visual feedback
  shootFlashFrames: number = 0;  // Frames remaining for muzzle flash effect
  playerMoving: boolean = false; // Track if player is moving (for gun bob)

  private changeListeners: ChangeListener[] = [];
  private lastTime: number = 0;

  constructor(width: number, height: number, levelIndex: number = 0) {
    this.currentLevel = levelIndex;
    this.map = new GameMap(levelIndex);
    this.screenShake = new ScreenShake();

    // Start player at level-defined spawn point
    const levelInfo = getLevelInfo(levelIndex);
    const startPos = levelInfo?.startPosition || new Vector3(20, -15, 10);
    this.player = new Player(startPos.clone());

    this.chaingun = new Chaingun();
    this.renderer = new RaycastRenderer(width, height);

    // Spawn enemies based on level spawn points
    this.spawnEnemies();
  }

  private spawnEnemies(): void {
    const levelInfo = getLevelInfo(this.currentLevel);
    if (!levelInfo) return;

    // Spawn walking enemies from level spawn points
    for (const pos of levelInfo.enemySpawnPoints.walking) {
      const enemy = new WalkingEnemy(pos.clone(), Math.random() * Math.PI * 2);
      
      // Fix Z height: snap to floor + half height (center) to prevent levitation
      const floorH = this.map.getFloorHeight(pos);
      if (floorH > -50) {
        enemy.position.z = floorH + enemy.height / 2;
      }

      this.enemies.push(enemy);
    }

    // Spawn flying enemies from level spawn points
    for (const pos of levelInfo.enemySpawnPoints.flying) {
      const enemy = new FlyingEnemy(pos.clone(), Math.random() * Math.PI * 2);
      this.enemies.push(enemy);
    }
  }

  /**
   * Load a specific level
   */
  loadLevel(levelIndex: number): void {
    this.currentLevel = levelIndex % getLevelCount();
    this.map.loadLevel(this.currentLevel);

    const levelInfo = getLevelInfo(this.currentLevel);
    const startPos = levelInfo?.startPosition || new Vector3(20, -15, 10);
    this.player = new Player(startPos.clone());

    this.enemies = [];
    this.bodyParts = [];
    this.hitParticles = [];
    this.lightFlashes = [];
    this.chaingun = new Chaingun();
    this.gameState = 'playing';
    this.score = 0;
    this.keysHeld.clear();
    this.playerMoving = false;

    this.spawnEnemies();
    this.notifyChange();
  }

  /**
   * Advance to next level
   */
  nextLevel(): void {
    this.loadLevel(this.currentLevel + 1);
  }

  /**
   * Get current level info
   */
  getLevelInfo(): LevelInfo | null {
    return getLevelInfo(this.currentLevel);
  }

  /**
   * Get total number of levels
   */
  getTotalLevels(): number {
    return getLevelCount();
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  setKey(key: string, pressed: boolean): void {
    if (pressed) {
      this.keysHeld.add(key);
    } else {
      this.keysHeld.delete(key);
    }
  }

  tick(currentTime: number): void {
    if (this.gameState !== 'playing') return;

    const dt = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    // Handle player input
    this.handleInput(dt);

    // Update camera bob (smooth start/stop transitions)
    this.player.updateBob(dt, this.playerMoving);

    // Update screen shake
    this.screenShake.update(dt);
    const shake = this.screenShake.getOffsets();
    this.renderer.setRenderOffset(shake.x, shake.y);

    // Update chaingun (bob, recoil, spin)
    this.chaingun.update(dt, this.playerMoving, false);

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.position, this.map);
    }

    // Update body parts (death particles)
    for (const part of this.bodyParts) {
      part.update(dt, this.map);
    }
    // Remove dead body parts
    this.bodyParts = this.bodyParts.filter((p) => !p.dead);

    // Update hit particles (bullet impact sparks)
    for (const particle of this.hitParticles) {
      particle.update(dt, this.map);
    }
    // Remove dead hit particles
    this.hitParticles = this.hitParticles.filter((p) => !p.dead);

    // Update light flashes
    for (const flash of this.lightFlashes) {
      flash.update(dt);
    }
    // Remove dead flashes
    this.lightFlashes = this.lightFlashes.filter((f) => !f.dead);

    // Check player-enemy collision (damage)
    for (const enemy of this.enemies) {
      if (!enemy.dead && enemy.distanceTo(this.player) < 10) {
        this.player.health -= 0.01 * dt;
        if (this.player.health <= 0) {
          this.gameState = 'gameover';
          this.notifyChange();
        }
      }
    }

    // Check win condition
    if (this.enemies.every((e) => e.dead)) {
      this.gameState = 'won';
      this.notifyChange();
    }
  }

  private handleInput(dt: number): void {
    // Check if player is holding fire button
    const isShooting = this.keysHeld.has(' ') || this.keysHeld.has('Space');

    // Movement slowdown while shooting (50% speed reduction)
    const shootingSlowdown = isShooting ? 0.5 : 1.0;
    const moveSpeed = (dt / 10) * shootingSlowdown;
    const turnSpeed = dt / 300;

    // Rotation - Fyne sends "Left"/"Right", not "ArrowLeft"/"ArrowRight"
    if (this.keysHeld.has('Left')) {
      this.player.theta += turnSpeed;
    }
    if (this.keysHeld.has('Right')) {
      this.player.theta -= turnSpeed;
    }

    // Movement
    const forward = this.player.getForwardVector();
    const right = this.player.getRightVector();
    let moveDir = ZERO.clone();

    // Fyne sends "Up"/"Down" for arrow keys, "w"/"s" for WASD (lowercase from our normalizer)
    if (this.keysHeld.has('Up') || this.keysHeld.has('w')) {
      moveDir = moveDir.add(forward);
    }
    if (this.keysHeld.has('Down') || this.keysHeld.has('s')) {
      moveDir = moveDir.sub(forward);
    }
    if (this.keysHeld.has('a')) {
      moveDir = moveDir.sub(right);
    }
    if (this.keysHeld.has('d')) {
      moveDir = moveDir.add(right);
    }

    if (moveDir.lengthSquared() > 0) {
      this.playerMoving = true;
      moveDir = moveDir.normalize().multiplyScalar(moveSpeed);
      const desiredPos = this.player.position.add(moveDir);

      // Apply 8-ray wall collision detection
      const adjustedPos = checkWallCollision(
        this.player.position,
        desiredPos,
        this.map,
        5  // Collision radius
      );

      // Check floor height at adjusted position
      const floorHeight = this.map.getFloorHeight(adjustedPos);

      if (floorHeight > -50) {
        this.player.position = adjustedPos;
        this.player.position.z = floorHeight + this.player.height;
      }
    } else {
      this.playerMoving = false;
    }

    // Shooting - space key sends "Space", but TypedRune sends ' '
    if (isShooting) {
      this.shoot();
      this.keysHeld.delete(' ');
      this.keysHeld.delete('Space');
    }
  }

  private shoot(): void {
    // Trigger muzzle flash visual feedback
    this.shootFlashFrames = 3;

    // Trigger screen shake
    this.screenShake.shake(4);

    // Trigger chaingun recoil and spin
    this.chaingun.update(0, this.playerMoving, true);

    // Hitscan - check what the bullet hits
    const forward = this.player.getForwardVector();
    const pos = this.player.position;

    // Find closest enemy in crosshair
    let closestEnemy: Enemy | null = null;
    let closestEnemyDist = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;

      // Check if enemy is roughly in front
      const toEnemy = enemy.position.sub(pos);
      const dist = toEnemy.length();
      const dot = toEnemy.normalize().dot(forward);

      // Within ~15 degree cone
      if (dot > 0.95 && dist < closestEnemyDist && dist < this.renderer.maxRenderDistance) {
        closestEnemy = enemy;
        closestEnemyDist = dist;
      }
    }

    // Find closest wall hit
    let closestWallDist = Infinity;
    let wallHitPos: Vector3 | null = null;
    let wallNormal: Vector3 | null = null;

    for (const wall of this.map.walls) {
      const hit = rayLineIntersect(
        new Vector3(pos.x, pos.y, 0),
        forward,
        wall.p1,
        wall.p2
      );
      if (hit && hit[0] > 0.1 && hit[0] < closestWallDist) {
        closestWallDist = hit[0];
        // Calculate hit position
        wallHitPos = pos.add(forward.multiplyScalar(hit[0]));
        wallHitPos.z = pos.z;  // Keep at eye level
        // Calculate wall normal (perpendicular to wall)
        const wallDir = wall.p2.sub(wall.p1).normalize();
        wallNormal = new Vector3(-wallDir.y, wallDir.x, 0);
        // Make sure normal points toward player
        if (wallNormal.dot(forward) > 0) {
          wallNormal = wallNormal.multiplyScalar(-1);
        }
      }
    }

    // Determine what we hit (enemy or wall, whichever is closer)
    if (closestEnemy && closestEnemyDist < closestWallDist) {
      // Hit enemy
      const wasDead = closestEnemy.dead;
      closestEnemy.takeDamage(3);
      this.score += closestEnemy.dead ? 100 : 10;

      // Spawn hit particles at enemy position
      const impactDir = forward.clone();
      const particles = createEnemyHitParticles(closestEnemy.position, impactDir, 15);
      this.hitParticles.push(...particles);

      // Spawn light flash
      this.lightFlashes.push(new LightFlash(
        closestEnemy.position,
        [255, 100, 50],  // Orange flash for enemy hit
        40
      ));

      // Spawn death explosion when enemy dies
      if (closestEnemy.dead && !wasDead) {
        this.spawnDeathExplosion(closestEnemy);
      }

      this.notifyChange();
    } else if (wallHitPos && wallNormal) {
      // Hit wall - spawn sparks
      const particles = createWallHitParticles(wallHitPos, wallNormal, 12);
      this.hitParticles.push(...particles);

      // Spawn light flash at wall
      this.lightFlashes.push(new LightFlash(
        wallHitPos,
        [255, 200, 100],  // Yellow flash for wall hit
        30
      ));
    }
  }

  private spawnDeathExplosion(enemy: Enemy): void {
    // Calculate explosion direction (away from player)
    const toEnemy = enemy.position.sub(this.player.position).normalize();

    // Spawn body parts based on enemy type
    let parts: BodyPart[];
    if (enemy.type === 'walking') {
      parts = createWalkingEnemyBodyParts(enemy.position, toEnemy);
    } else {
      parts = createFlyingEnemyBodyParts(enemy.position, toEnemy);
    }

    this.bodyParts.push(...parts);
  }

  render(buffer: Uint8Array): void {
    this.renderer.render(
      buffer,
      this.player,
      this.map,
      this.enemies,
      this.bodyParts,
      this.chaingun,
      this.hitParticles,
      this.lightFlashes
    );

    const w = this.renderer.width;
    const h = this.renderer.height;

    // Apply muzzle flash effect
    if (this.shootFlashFrames > 0) {
      this.shootFlashFrames--;

      // Draw yellow flash bars on left and right edges
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < 20; x++) {
          const idxL = (y * w + x) * 4;
          buffer[idxL] = Math.min(255, buffer[idxL] + 100);
          buffer[idxL + 1] = Math.min(255, buffer[idxL + 1] + 80);

          const idxR = (y * w + (w - 1 - x)) * 4;
          buffer[idxR] = Math.min(255, buffer[idxR] + 100);
          buffer[idxR + 1] = Math.min(255, buffer[idxR + 1] + 80);
        }
      }

      // Draw flash at bottom center
      const gunX = Math.floor(w / 2);
      const gunY = h - 30;
      for (let dy = -15; dy < 15; dy++) {
        for (let dx = -10; dx < 10; dx++) {
          const px = gunX + dx;
          const py = gunY + dy;
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 12) {
              const idx = (py * w + px) * 4;
              const intensity = (12 - dist) / 12;
              buffer[idx] = Math.min(255, buffer[idx] + Math.floor(200 * intensity));
              buffer[idx + 1] = Math.min(255, buffer[idx + 1] + Math.floor(150 * intensity));
              buffer[idx + 2] = Math.min(255, buffer[idx + 2] + Math.floor(50 * intensity));
            }
          }
        }
      }
    }
  }

  reset(): void {
    this.loadLevel(this.currentLevel);
  }

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => l());
  }

  getScore(): number {
    return this.score;
  }

  getHealth(): number {
    return Math.max(0, Math.floor(this.player.health));
  }

  getGameState(): GameState {
    return this.gameState;
  }

  getEnemiesAlive(): number {
    return this.enemies.filter((e) => !e.dead).length;
  }
}
