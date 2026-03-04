import { Scene } from '@/engine/renderer/scene';
import { State } from '@/engine/state-machine/state';
import { Skybox } from '@/engine/skybox';
import { Camera } from '@/engine/renderer/camera';
import { render } from '@/engine/renderer/renderer';
import { controls } from '@/controls';
import { gameStateMachine } from '@/game-states/game-state-machine';
import { makeTruck, TruckObject3d } from '@/modeling/truck.modeling';
import { gameStates } from '@/index';
import { createSkybox, drawSkyPurple, materials } from '@/texture-maker';
import { clamp, getRankFromScore } from '@/engine/helpers';
import { Mesh } from '@/engine/renderer/mesh';
import { makeTombstoneGeo } from '@/modeling/stone.modeling';
import type { GLOverlayApp } from '../../../../trine/integration/gl-overlay';
import { canvasWidth, canvasHeight, setResizeCallback } from '@/main';

// Module-level overlay reference, set from main.ts
let overlayApp: GLOverlayApp | null = null;

export function setMenuOverlay(app: GLOverlayApp) {
  overlayApp = app;
}

// Level names and their vertical positions as fractions of canvas height
const LEVELS = [
  { name: 'EARTH', yFrac: 190 / 540 },
  { name: 'PURGATORY', yFrac: 290 / 540 },
  { name: 'UNDERWORLD', yFrac: 390 / 540 },
];

const SELECTED_COLOR = '#ffffff';
const UNSELECTED_COLOR = '#888888';

export class MenuState implements State {
  scene?: Scene;
  camera: Camera;
  truck: TruckObject3d;
  tombstone: Mesh;
  private selectedOption = 0;
  private lastRenderedOption = -1;

  constructor() {
    this.camera = new Camera(Math.PI / 6, 16 / 9, 1, 400);
    this.truck = makeTruck();
    this.truck.scale.set(0.4, 0.4, 0.4);

    this.tombstone = new Mesh(makeTombstoneGeo(15, 10, 5, 9,18), materials.underworldRocks);
    this.tombstone.position.set(4.6, -1.5, -27.0);
    this.tombstone.setRotation(0.1, -0.6, 0);
  }

  onEnter() {
    this.selectedOption = 0;
    this.lastRenderedOption = -1;
    this.scene = new Scene();
    this.truck.position.set(-6, -1, -23);
    this.truck.setRotation(0.3, 0, 0);
    this.scene = new Scene();
    this.scene.skybox = new Skybox(...createSkybox(drawSkyPurple));
    this.scene.skybox.bindGeometry();
    this.scene.add(this.truck, this.tombstone);

    // Render overlay text on first frame
    this.renderOverlay();

    // Re-render overlay and update camera on window resize
    setResizeCallback((w, h) => {
      this.camera.updateProjection(w / h);
      this.renderOverlay();
    });
  }

  private renderOverlay() {
    if (!overlayApp) return;
    this.lastRenderedOption = this.selectedOption;

    const w = canvasWidth;
    const h = canvasHeight;

    // Clear previous overlay
    overlayApp.clear();

    // Title text
    overlayApp.canvasText('CHARON JR.', {
      x: Math.round(w * 0.354), y: Math.round(h * 0.074),
      color: '#ffffff',
      textSize: 60,
      bold: true,
      italic: true,
      alignment: 'center',
    });

    // Level options
    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i];
      const isSelected = i === this.selectedOption;
      const color = isSelected ? SELECTED_COLOR : UNSELECTED_COLOR;
      const y = Math.round(h * level.yFrac);

      // Level name
      overlayApp.canvasText(level.name, {
        x: Math.round(w * 0.396), y,
        color,
        textSize: 36,
        bold: isSelected,
        alignment: 'center',
      });

      // Score
      const scoreKey = `ddamt_score-${2 - i}`;
      const score = localStorage.getItem(scoreKey);
      const scoreText = score ? `Best: $${score}` : '';
      if (scoreText) {
        overlayApp.canvasText(scoreText, {
          x: Math.round(w * 0.427), y: y + 40,
          color: isSelected ? '#cccccc' : '#666666',
          textSize: 18,
          alignment: 'center',
        });
      }

      // Selection indicator
      if (isSelected) {
        overlayApp.canvasText('>', {
          x: Math.round(w * 0.354), y,
          color: '#ffffff',
          textSize: 36,
          bold: true,
        });
      }
    }
  }

  onUpdate() {
    if (controls.isDown && !controls.previousState.isDown) {
      this.selectedOption += 1;
    }

    if (controls.isUp && !controls.previousState.isUp) {
      this.selectedOption -= 1;
    }

    this.selectedOption = clamp(this.selectedOption, 0, 2);

    // Only re-render overlay when selection changes
    if (this.selectedOption !== this.lastRenderedOption) {
      this.renderOverlay();
    }

    this.truck.wrapper.rotate(0, -0.01, 0);
    this.truck.setDriveRotationRate(0.1);
    this.truck.setSteeringAngle(-0.3);
    this.scene!.updateWorldMatrix();

    render(this.camera, this.scene!);

    // Auto-start for elimination tests: __CHARON_AUTO_LEVEL = 0|1|2
    const autoLevel = (globalThis as any).__CHARON_AUTO_LEVEL;
    if (autoLevel !== undefined) {
      delete (globalThis as any).__CHARON_AUTO_LEVEL;
      gameStateMachine.setState(gameStates.gameState, autoLevel);
      return;
    }

    if (controls.isSelect && !controls.previousState.isSelect) {
      gameStateMachine.setState(gameStates.gameState, 2 - this.selectedOption);
    }
  }

  onLeave() {
    setResizeCallback(null);
    if (overlayApp) {
      overlayApp.clear();
    }
    this.scene = undefined;
  }
}
