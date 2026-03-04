import { State } from '@/engine/state-machine/state';
import {
  drawEarthSky, materials, createSkybox, drawPurgatorySky, drawSkyPurple,
} from '@/texture-maker';
import { Scene } from '@/engine/renderer/scene';
import { Camera } from '@/engine/renderer/camera';
import { EnhancedDOMPoint } from '@/engine/enhanced-dom-point';
import { ThirdPersonPlayer } from '@/third-person-player';
import { Mesh } from '@/engine/renderer/mesh';
import { Material } from '@/engine/renderer/material';
import { MoldableCubeGeometry } from '@/engine/moldable-cube-geometry';
import { render } from '@/engine/renderer/renderer';
import { Face } from '@/engine/physics/face';
import { gameStateMachine } from '@/game-states/game-state-machine';
import { Object3d } from '@/engine/renderer/object-3d';
import { noiseMaker, NoiseType } from '@/engine/noise-maker';
import { getGridPosition } from '@/engine/physics/surface-collision';
import { clamp } from '@/engine/helpers';
import { Level } from '@/level';
import { Spirit } from '@/spirit';
import { hud } from '@/hud';
import { gameStates } from '@/index';
import { ghostFlyAwayAudio, ghostThankYouAudio } from '@/sound-effects';
import { makeDynamicBody } from '@/modeling/spirit.modeling';
import type { GLOverlayApp, OverlayWidget } from '../../../../trine/integration/gl-overlay';
import { canvasWidth, canvasHeight, setResizeCallback } from '@/main';

// Module-level overlay reference, set from main.ts
let overlayApp: GLOverlayApp | null = null;

export function setGameOverlay(app: GLOverlayApp) {
  overlayApp = app;
}

const arrowGuideGeo = new MoldableCubeGeometry(2, 0.3, 5)
  .selectBy(vertex => vertex.z < 0)
  .scale(0, 1, 0)
  .merge(new MoldableCubeGeometry(1, 0.3, 2.5).selectBy(vertex => vertex.z < 0).scale(0.6, 1, 1).all().translate(0, 0, 3.5).done())
  .computeNormalsPerPlane()
  .done();

export class GameState implements State {
  player: ThirdPersonPlayer;
  scene: Scene;
  groupedFaces: {floorFaces: Face[], wallFaces: Face[], ceilingFaces: Face[]};

  gridFaces: {floorFaces: Face[], wallFaces: Face[], ceilingFaces: Face[]}[];
  spirits: Spirit[] = [];

  arrowGuideWrapper: Object3d;
  arrowGuide: Mesh;

  private timePerDistanceUnit = 0.016;

  spiritsTransported = 0;
  currentLevel: Level;

  dynamicBody: Object3d;

  dropoffs: Mesh[];

  // HUD overlay widgets (created once, updated in-place)
  private hudTimeText: OverlayWidget | null = null;
  private hudScoreText: OverlayWidget | null = null;
  private hudTimeBonusText: OverlayWidget | null = null;
  private hudScoreBonusText: OverlayWidget | null = null;
  private prevTimeStr = '';
  private prevScoreStr = '';
  private prevTimeBonusActive = false;
  private prevScoreBonusActive = false;
  private prevTimeBonusStr = '';
  private prevScoreBonusStr = '';

  constructor() {
    const camera = new Camera(1.68, 16 / 9, 2, 1700);
    camera.position = new EnhancedDOMPoint(0, 5, -17);
    this.player = new ThirdPersonPlayer(camera);
    this.scene = new Scene();
    this.gridFaces = [];
    this.groupedFaces = { floorFaces: [], wallFaces: [], ceilingFaces: [] }

    this.arrowGuide = new Mesh(arrowGuideGeo, new Material());
    (this.arrowGuide as any)._drawTag = 'arrowGuide';
    this.arrowGuideWrapper = new Object3d(this.arrowGuide);

    this.currentLevel = {} as Level;
    this.dynamicBody = makeDynamicBody();
    // Tag all child meshes of the dynamic body
    [this.dynamicBody, ...this.dynamicBody.allChildren()].forEach((obj, i) => {
      if ((obj as any).geometry) (obj as any)._drawTag = `dynamicBody_${i}`;
    });
    this.dynamicBody.position.set(-10000, -10000, -10000);
    this.dropoffs = [];
  }

  private levelNumber = 0;
  private isLoaded = false;
  onEnter(levelNumber: 0 | 1 | 2) {
    const t0 = performance.now();
    this.gridFaces = [];
    this.groupedFaces = { floorFaces: [], wallFaces: [], ceilingFaces: [] }
    this.levelNumber = levelNumber;
    if (levelNumber === 0) {
      noiseMaker.seed(22);
      let t = performance.now();
      const sampleHeightMap = noiseMaker.noiseLandscape(256, 1 / 64, 4, NoiseType.Perlin, 100);
      console.log(`[LOAD] heightmap noise: ${(performance.now()-t).toFixed(0)}ms`);
      t = performance.now();
      const skybox = createSkybox(drawEarthSky);
      console.log(`[LOAD] skybox: ${(performance.now()-t).toFixed(0)}ms`);
      t = performance.now();
      this.currentLevel = new Level(
        sampleHeightMap,
        skybox,
        -12,
        39,
        26,
        materials.grass,
        materials.dirtPath,
        true,
        materials.grass,
        materials.marble,
        materials.lake,
        materials.wood,
        new EnhancedDOMPoint(907, -41, 148),
        new EnhancedDOMPoint(-940, 45, -85),
        new EnhancedDOMPoint(61, -26, -390),
        new EnhancedDOMPoint(-556, 11, -760),
        []
      );
      console.log(`[LOAD] Level constructor: ${(performance.now()-t).toFixed(0)}ms`);
    } else if (levelNumber === 1) {
      noiseMaker.seed(75);
      const sampleHeightMap2 = noiseMaker.noiseLandscape(256, 1 / 64, 2, NoiseType.Perlin, 30)
        .map(val => {
          if (val > 0) {
            return val + 40;
          }
          else if (val > 1) {
            return val + 50;
          } else {
            return val;
          }
        })
        .map(val => clamp(val, -50, 50));
      this.currentLevel = new Level(
        sampleHeightMap2,
        createSkybox(drawPurgatorySky),
        -10000,
        undefined,
        4,
        materials.purgatoryFloor,
        undefined,
        false,
        materials.purgatoryGrass,
        materials.purgatoryRocks,
        materials.lake,
        materials.purgatoryBark,
        new EnhancedDOMPoint(-331, 50, -553),
        new EnhancedDOMPoint(700, -1.3, -765),
        new EnhancedDOMPoint(700, -7, 770),
        new EnhancedDOMPoint(-706, 50, 259),
        [
          {
            position: new EnhancedDOMPoint(252, -7.5 + 5.5, 117),
            rotation: 1.6,
          },
          {
            position: new EnhancedDOMPoint(685, -7.5 + 5.5, -60),
            rotation: 2.59,
          },
          {
            position: new EnhancedDOMPoint(148, -3.7 + 5.5, -371),
            rotation: 5.6,
          },
          {
            position: new EnhancedDOMPoint(-455, -9 + 5.5, 419),
            rotation: -2,
          },
          {
            position: new EnhancedDOMPoint(32, 41 + 5.5, 237),
            rotation: -1.8,
          },
          {
            position: new EnhancedDOMPoint(692, -7 + 5.5, -333),
            rotation: 6.23,
          },
          {
            position: new EnhancedDOMPoint(-223, 41 + 5.5, 55),
            rotation: -3.7,
          },
          {
            position: new EnhancedDOMPoint(475, 49 + 5.5, 400),
            rotation: 0.7,
          },
          {
            position: new EnhancedDOMPoint(-630, -11.5 + 5.5, -291),
            rotation: 8.2,
          },
          {
            position: new EnhancedDOMPoint(876, 42 + 5.5, -253),
            rotation: 3.2,
          }
        ]
      );
    } else {
      noiseMaker.seed(3);
      const sampleHeightMap3 = noiseMaker.noiseLandscape(256, 1 / 128, 3, NoiseType.Perlin, 180);
      // @ts-ignore
      // const sampleHeightMap3 = new Array(256 * 256).fill(0)//.map(item => 0);
      this.currentLevel = new Level(
        sampleHeightMap3,
        createSkybox(drawSkyPurple),
        -8,
        106,
        9,
        materials.underworldGround,
        materials.underworldPath,
        false,
        materials.underworldGrassMaterial,
        materials.underworldRocks,
        materials.underworldWater,
        materials.underworldBark,
        new EnhancedDOMPoint(22, 35, 891),
        new EnhancedDOMPoint(-411, 17, 215),
        new EnhancedDOMPoint(-556, 26, -760),
        new EnhancedDOMPoint(471, 7, -687),
        [
          {
            position: new EnhancedDOMPoint(-142, 32, -50),
            rotation: -0.7
          },
          {
            position: new EnhancedDOMPoint(-480, -1.3, 400),
            rotation: -0.3
          },
          {
            position: new EnhancedDOMPoint(138, 6.3, 501),
            rotation: 4
          }
        ]
      );
    }

    this.player.chassisCenter.set(-60, 51, -245);
    this.player.speed = 0;
    this.player.carriedSpirit = undefined;
    if (levelNumber === 1) {
      this.currentLevel.spiritPositions = this.currentLevel.spiritPositions.filter((spirit, index) => index % 2 === 0);
    }
    let tSpirits = performance.now();
    this.spirits = this.currentLevel.spiritPositions.map((position, i) => {
      const spirit = new Spirit(position);
      // Tag spirit child meshes for draw call identification
      if (spirit.children[0]) (spirit.children[0] as any)._drawTag = `spirit_${i}_body`;
      if (spirit.children[1]) (spirit.children[1] as any)._drawTag = `spirit_${i}_icon`;
      return spirit;
    });
    console.log(`[LOAD] spirits (${this.spirits.length}): ${(performance.now()-tSpirits).toFixed(0)}ms`);

    this.scene = new Scene();


    function onlyUnique(value: any, index: number, array: any[]) {
      return array.indexOf(value) === index;
    }

    let tGrid = performance.now();
    this.currentLevel.facesToCollideWith.floorFaces.forEach(face => {
      const gridPositions = face.points.map(getGridPosition);

      gridPositions.filter(onlyUnique).forEach(position => {
        if (!this.gridFaces[position]) {
          this.gridFaces[position] = { floorFaces: [], wallFaces: [], ceilingFaces: [] };
        }
        this.gridFaces[position].floorFaces.push(face);
      });
    });

    this.currentLevel.facesToCollideWith.wallFaces.forEach(face => {
      const gridPositions = face.points.map(getGridPosition);

      gridPositions.filter(onlyUnique).forEach(position => {
        if (!this.gridFaces[position]) {
          this.gridFaces[position] = { floorFaces: [], wallFaces: [], ceilingFaces: [] };
        }
        this.gridFaces[position].wallFaces.push(face);
      });
    });

    console.log(`[LOAD] grid face bucketing: ${(performance.now()-tGrid).toFixed(0)}ms`);

    let tDropoffs = performance.now();
    this.dropoffs = [];
    this.currentLevel.dropOffs.forEach((dropOff, index) => {
      const dropOffMesh = new Mesh(new MoldableCubeGeometry(1, 5, 1, 4, 1, 4).cylindrify(40).done(), new Material({ texture: materials.dropOff.texture, emissive: Spirit.Colors[index], isTransparent: true }));
      (dropOffMesh as any)._drawTag = `dropoff_${index}_front`;
      dropOffMesh.position.set(dropOff);
      this.dropoffs.push(dropOffMesh);
      const dropOffGeo = new MoldableCubeGeometry(1, 5, 1, 4, 1, 4).cylindrify(40).done();
      dropOffGeo.getIndices()?.reverse();
      const dropOffMesh2 = new Mesh(dropOffGeo, new Material({ texture: materials.dropOff.texture, emissive: Spirit.Colors[index], isTransparent: true }));
      (dropOffMesh2 as any)._drawTag = `dropoff_${index}_back`;
      dropOffMesh2.position.set(dropOff);
      this.dropoffs.push(dropOffMesh2);
    })

    console.log(`[LOAD] dropoffs: ${(performance.now()-tDropoffs).toFixed(0)}ms`);

    let tScene = performance.now();
    this.scene.add(this.player.mesh, ...this.spirits, ...this.dropoffs);
    this.scene.add(...this.currentLevel.meshesToRender, this.dynamicBody);
    console.log(`[LOAD] scene.add: ${(performance.now()-tScene).toFixed(0)}ms`);

    // Dump scene inventory for GPU hang diagnosis
    const allMeshes = [...this.scene.solidMeshes, ...this.scene.transparentMeshes];
    console.log(`[SCENE] ${allMeshes.length} meshes, ${this.scene.solidMeshes.length} solid, ${this.scene.transparentMeshes.length} transparent`);
    for (const mesh of allMeshes) {
      const tag = (mesh as any)._drawTag || '(untagged)';
      const indices = (mesh as any).geometry?.getIndices?.()?.length ?? 0;
      const isInst = (mesh as any).count !== undefined;
      const inst = isInst ? ` ×${(mesh as any).count}` : '';
      console.log(`[SCENE]   ${tag}: ${indices} indices${inst}`);
    }

    let tSkyBind = performance.now();
    this.scene.skybox = this.currentLevel.skybox;
    this.scene.skybox.bindGeometry();
    console.log(`[LOAD] skybox.bindGeometry: ${(performance.now()-tSkyBind).toFixed(0)}ms`);

    this.spiritsTransported = 0;
    hud.reset();

    this.buildHud();

    // Re-build HUD and update camera on window resize
    setResizeCallback((w, h) => {
      this.buildHud();
      this.player.camera.updateProjection(w / h);
    });

    this.isLoaded = true;
    this.player.engineGain.gain.value = 0.4;
    console.log(`[LOAD] TOTAL onEnter: ${(performance.now()-t0).toFixed(0)}ms`);
  }

  private buildHud() {
    if (!overlayApp) return;
    overlayApp.clear();
    const w = canvasWidth;
    // Background bar
    overlayApp.canvasRectangle({ x: 0, y: 0, width: w, height: 45, fillColor: 'rgba(48, 16, 48, 0.5)' });
    // "Time" label (static)
    overlayApp.canvasText('Time', { x: 15, y: 7, color: '#cccccc', textSize: 20 });
    // Time value
    this.hudTimeText = overlayApp.canvasText('100.0', { x: 70, y: 3, color: '#ffffff', textSize: 28, bold: true });
    // Score (right-aligned via x position)
    this.hudScoreText = overlayApp.canvasText('$0', { x: w - 90, y: 3, color: '#ffffff', textSize: 28, bold: true });
    // Time bonus popup (initially hidden)
    this.hudTimeBonusText = overlayApp.canvasText('', { x: 70, y: 30, color: '#44ff44', textSize: 16 });
    this.hudTimeBonusText.hide();
    // Score bonus popup (initially hidden)
    this.hudScoreBonusText = overlayApp.canvasText('', { x: w - 90, y: 30, color: '#ffff44', textSize: 16 });
    this.hudScoreBonusText.hide();
    // Reset tracking
    this.prevTimeStr = '100.0';
    this.prevScoreStr = '$0';
    this.prevTimeBonusActive = false;
    this.prevScoreBonusActive = false;
  }

  private resetSpiritBody() {
    this.dynamicBody.position.set(-10000, -10000, -10000);
  }

  onLeave() {
    setResizeCallback(null);
    this.player.engineGain.gain.value = 0;
    this.player.drivingThroughWaterGain.gain.value = 0;
    this.spirits.forEach(spirit => spirit.audioPlayer?.stop());
    this.resetSpiritBody();
    if (overlayApp) overlayApp.clear();
    this.hudTimeText = null;
    this.hudScoreText = null;
    this.hudTimeBonusText = null;
    this.hudScoreBonusText = null;
  }

  private spiritPlayerDistance = new EnhancedDOMPoint();
  private dropOffPlayerDistance = new EnhancedDOMPoint();
  private spiritDropOffDistance = new EnhancedDOMPoint();

  handleDropOffPickUp() {

    // Drop Off
    if (this.player.carriedSpirit) {
      if (this.player.velocity.magnitude < 0.2) {
        const dropOffPosition = this.currentLevel.dropOffs[this.player.carriedSpirit.dropOffPoint];
        this.dropOffPlayerDistance.subtractVectors(dropOffPosition, this.player.chassisCenter);
        if (Math.abs(this.dropOffPlayerDistance.x) <= 40 && Math.abs(this.dropOffPlayerDistance.z) <= 40) {
          this.dropoffs[this.player.carriedSpirit.dropOffPoint * 2].scale.y = 2;
          this.dropoffs[this.player.carriedSpirit.dropOffPoint * 2 + 1].scale.y = 2;
          ghostFlyAwayAudio().start();

          this.resetSpiritBody();
          this.player.mesh.wrapper.remove(this.dynamicBody);
          this.scene.remove(this.arrowGuideWrapper);
          this.player.carriedSpirit = undefined;

          this.spiritsTransported++;
        }
      }
    }
    else {
      // Pick Up
      if (this.player.velocity.magnitude < 0.2) {
        this.spirits.some((spirit, index) => {
          this.spiritPlayerDistance.subtractVectors(spirit.position, this.player.chassisCenter)
          if (Math.abs(this.spiritPlayerDistance.x) < 17 && Math.abs(this.spiritPlayerDistance.z) < 17) {
            this.arrowGuide.material.color = spirit.color.map(val => val * 1.5);
            this.dropoffs[spirit.dropOffPoint * 2].scale.y = 800;
            this.dropoffs[spirit.dropOffPoint * 2 + 1].scale.y = 800;

            // Find distance from spirit pickup point to it's drop off point and add a relative amount of time
            this.spiritDropOffDistance.subtractVectors(this.currentLevel.dropOffs[spirit.dropOffPoint], spirit.position);
            this.spiritDropOffDistance.y = 0;
            const bonus = this.spiritDropOffDistance.magnitude * this.timePerDistanceUnit;
            hud.setTimeBonus(bonus);
            hud.score += Math.round(bonus);

            ghostThankYouAudio().start();

            this.dynamicBody.position.set(0, 3, -3);
            this.dynamicBody.setRotation(0, Math.PI, 0);
            this.player.mesh.wrapper.add(this.dynamicBody);
            this.player.carriedSpirit = spirit;
            spirit.audioPlayer?.stop();
            this.scene.add(this.arrowGuideWrapper);
            this.scene.remove(spirit);
            this.spirits.splice(index, 1);
            return true;
          }
        });
      }
    }
  }

  arrowLookAtDropOff = new EnhancedDOMPoint();
  onUpdate(): void {
    if (!this.isLoaded) {
      return;
    }

    hud.draw();

    // Update HUD overlay — only send bridge commands when displayed values change
    if (this.hudTimeText) {
      const timeStr = hud.timeRemaining.toFixed(1);
      if (timeStr !== this.prevTimeStr) {
        this.prevTimeStr = timeStr;
        this.hudTimeText.update({ text: timeStr });
      }
      const score = hud.score + (hud.isScoreBonusActive ? hud.currentScoreBonus : 0);
      const scoreStr = '$' + score;
      if (scoreStr !== this.prevScoreStr) {
        this.prevScoreStr = scoreStr;
        this.hudScoreText!.update({ text: scoreStr });
      }
      if (hud.isTimeBonusActive !== this.prevTimeBonusActive) {
        this.prevTimeBonusActive = hud.isTimeBonusActive;
        if (hud.isTimeBonusActive) {
          this.hudTimeBonusText!.update({ text: '+' + hud.currentTimeBonus.toFixed(0) });
          this.hudTimeBonusText!.show();
        } else {
          this.hudTimeBonusText!.hide();
        }
      }
      if (hud.isScoreBonusActive !== this.prevScoreBonusActive) {
        this.prevScoreBonusActive = hud.isScoreBonusActive;
        if (hud.isScoreBonusActive) {
          this.hudScoreBonusText!.update({ text: '+$' + hud.currentScoreBonus });
          this.hudScoreBonusText!.show();
        } else {
          this.hudScoreBonusText!.hide();
        }
      }
    }

    this.player.update(this.gridFaces, this.currentLevel.waterLevel);
    this.handleDropOffPickUp();

    if (this.player.carriedSpirit) {
      this.arrowGuideWrapper.position.set(this.player.chassisCenter);
      this.arrowGuideWrapper.position.y += 14;
      this.arrowLookAtDropOff = this.currentLevel.dropOffs[this.player.carriedSpirit!.dropOffPoint];
      this.arrowLookAtDropOff.y = this.arrowGuideWrapper.position.y - 10;
      this.arrowGuideWrapper.lookAt(this.arrowLookAtDropOff);
    }

    this.dropoffs.forEach(dropoff => dropoff.rotate(0, 0.008, 0));

    this.scene.updateWorldMatrix();

    render(this.player.camera, this.scene);

    if (hud.timeRemaining <= 0) {
      gameStateMachine.setState(gameStates.levelOverState, this.spiritsTransported, hud.score, this.levelNumber);
    }
  }
}
