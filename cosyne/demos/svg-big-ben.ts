/**
 * Big Ben (Elizabeth Tower) — SVG transform composition demo.
 *
 * Reuses `drawClockFace()` from svg-clock.ts, placing it into an
 * architectural scene via a single `s.g({ transform })` group.
 * Zero modification to the clock component — pure SVG composition.
 *
 * The standalone demo creates a courtyard scene: a smaller center
 * tower (further away) flanked by two larger perspective-angled
 * towers (nearer to the camera), connected by a cobblestone floor.
 *
 * Run: npx tsx cosyne/demos/svg-big-ben.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy, Popup } from 'tsyne';
import type { App, CompletionEntry } from 'tsyne';
import { cvg, CvgContext } from '../src';
import { drawClockFace, SIZE } from './svg-clock';
import { WORLD_CITIES, type City } from '../../ported-apps/nomad/nomad';

// ─── CityPicker — reusable city selection popup ───────────────

const CITY_OPTIONS = WORLD_CITIES.map(c => `${c.name}, ${c.country}`);

class CityPicker {
  private popup: Popup;
  private entry!: CompletionEntry;
  private onSelect: ((city: City) => void) | null = null;
  private suppressOnChanged = false;

  constructor(private a: App, windowId: string) {
    this.popup = a.popup(windowId, () => {
      a.card('Choose city', '', () => {
        this.entry = a.completionEntry(
          CITY_OPTIONS.slice(0, 5),
          'Type to search cities…',
          async (text: string) => {
            if (this.suppressOnChanged) return;
            if (text.length < 1) {
              await this.entry.hideCompletion();
              return;
            }
            const lc = text.toLowerCase();
            const filtered = CITY_OPTIONS.filter(o => o.toLowerCase().includes(lc)).slice(0, 20);
            await this.entry.setOptions(filtered);
            if (filtered.length > 0) {
              await this.entry.showCompletion();
            } else {
              await this.entry.hideCompletion();
            }
          },
          async (text: string) => {
            const match = WORLD_CITIES.find(c => `${c.name}, ${c.country}` === text);
            if (match) {
              this.onSelect?.(match);
            }
            await this.popup.hide();
          },
        );
      });
    });
  }

  /** Open the picker at (x, y) showing the current city. Calls onSelect if a city is chosen. */
  open(x: number, y: number, current: City, onSelect: (city: City) => void): void {
    this.onSelect = onSelect;
    // Defer to avoid Fyne thread errors when called from SVG tap callback
    setTimeout(async () => {
      // Show popup first so CompletionEntry has a canvas, then set text
      // with suppression to prevent onChanged → showCompletion during init
      await this.popup.showAt(x, y);
      this.suppressOnChanged = true;
      await this.entry.setText(`${current.name}, ${current.country}`);
      this.suppressOnChanged = false;
    }, 0);
  }
}

// ─── Tower dimensions ───────────────────────────────────────

const VB_W = 200;
const VB_H = 500;
const MID = VB_W / 2;

// Colors
const STONE      = '#c9b98a';
const STONE_DARK = '#a89660';
const STONE_BAND = '#b8a878';
const TRIM       = '#8a7d5a';
const SPIRE_COL  = '#6b6b6b';
const SKY        = '#d4e6f1';

// ─── Reusable SVG component ─────────────────────────────────

/**
 * Draw a stylized Big Ben tower with a live clock face.
 *
 * @param s     CvgContext to draw into (expects ~200x500 viewBox)
 * @param time  Function returning the current Date
 * @param opts  Optional: `sky: false` to skip the background (for composited scenes)
 */
export function drawBigBen(s: CvgContext, time: () => Date, opts?: { sky?: boolean }) {
  // Sky background (skip when compositing multiple towers into a shared scene)
  if (opts?.sky !== false) {
    s.rect({ x: 0, y: 0, width: VB_W, height: VB_H, fill: SKY });
  }

  // ── Base ──────────────────────────────────────────────────
  const baseY = 440;
  const baseH = 60;
  s.rect({ x: 30, y: baseY, width: 140, height: baseH, fill: STONE_DARK });
  // Base detail lines
  for (const dy of [10, 20]) {
    s.line({ x1: 32, y1: baseY + dy, x2: 168, y2: baseY + dy, stroke: TRIM, 'stroke-width': 1 });
  }

  // ── Main shaft ────────────────────────────────────────────
  const shaftX = 55;
  const shaftW = 90;
  const shaftY = 200;
  const shaftH = baseY - shaftY;
  s.rect({ x: shaftX, y: shaftY, width: shaftW, height: shaftH, fill: STONE });

  // Horizontal bands on the shaft
  for (let row = 0; row < 5; row++) {
    const y = shaftY + 30 + row * 45;
    s.line({ x1: shaftX, y1: y, x2: shaftX + shaftW, y2: y, stroke: STONE_BAND, 'stroke-width': 2 });
  }

  // Small windows on the shaft
  for (let row = 0; row < 4; row++) {
    const wy = shaftY + 50 + row * 45;
    s.rect({ x: MID - 5, y: wy, width: 10, height: 15, fill: TRIM, rx: 2 });
  }

  // ── Clock housing ─────────────────────────────────────────
  const housingSize = 80;
  const housingX = MID - housingSize / 2;
  const housingY = 140;
  const housingH = shaftY - housingY;

  // Wider housing section
  s.rect({ x: housingX - 8, y: housingY, width: housingSize + 16, height: housingH, fill: STONE });
  // Decorative border
  s.rect({
    x: housingX - 10, y: housingY - 2,
    width: housingSize + 20, height: housingH + 4,
    fill: 'none', stroke: TRIM, 'stroke-width': 2,
  });

  // ── Clock face — transform composition ────────────────────
  const clockScale = housingSize / SIZE;
  const clockX = housingX;
  const clockY = housingY + (housingH - housingSize) / 2;

  s.g({ transform: { translate: [clockX, clockY], scale: clockScale } }, () => {
    drawClockFace(s, time);
  });

  // ── Belfry ────────────────────────────────────────────────
  const belfryX = 52;
  const belfryW = 96;
  const belfryY = 80;
  const belfryH = housingY - belfryY;

  s.rect({ x: belfryX, y: belfryY, width: belfryW, height: belfryH, fill: STONE });
  // Arched openings (simplified as dark rects with rounded tops)
  const archW = 16;
  const archH = 30;
  const archY = belfryY + 10;
  for (const ax of [MID - 28, MID - 8, MID + 12]) {
    s.rect({ x: ax, y: archY, width: archW, height: archH, fill: STONE_DARK, rx: 8 });
  }
  // Top band
  s.line({ x1: belfryX, y1: belfryY + 2, x2: belfryX + belfryW, y2: belfryY + 2, stroke: TRIM, 'stroke-width': 2 });

  // ── Spire ─────────────────────────────────────────────────
  const spireBase = belfryY;
  const spireTop = 10;
  s.polygon({
    points: [[MID, spireTop], [MID - 20, spireBase], [MID + 20, spireBase]],
    fill: SPIRE_COL,
  });
  // Spire detail — small horizontal line
  s.line({ x1: MID - 10, y1: spireBase - 20, x2: MID + 10, y2: spireBase - 20, stroke: TRIM, 'stroke-width': 1 });

  // ── Corner turrets (small rectangles flanking the belfry) ─
  for (const tx of [belfryX - 8, belfryX + belfryW]) {
    s.rect({ x: tx, y: belfryY + 5, width: 8, height: belfryH - 5, fill: STONE_DARK });
    // Tiny pinnacle
    s.polygon({
      points: [[tx + 4, belfryY - 5], [tx, belfryY + 5], [tx + 8, belfryY + 5]],
      fill: SPIRE_COL,
    });
  }
}

// ─── Standalone — courtyard scene ────────────────────────────

if (require.main === module) {
  // Scene constants
  const SCENE_W = 700;
  const SCENE_H = 550;

  // ─── Per-tower city state ─────────────────────────────────
  type TowerKey = 'left' | 'center' | 'right';
  const towerCities: Record<TowerKey, City> = {
    left:   WORLD_CITIES.find(c => c.id === 'london')!,
    center: WORLD_CITIES.find(c => c.id === 'new-york')!,
    right:  WORLD_CITIES.find(c => c.id === 'tokyo')!,
  };

  /** Return a `() => Date` whose local-time methods reflect the given IANA timezone. */
  function timeInTimezone(tz: string): () => Date {
    return () => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
      }).formatToParts(now);
      const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
      const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
      const s = Number(parts.find(p => p.type === 'second')?.value ?? 0);
      const d = new Date(now);
      d.setHours(h, m, s);
      return d;
    };
  }

  // Mutable: controlled by sliders
  let sceneDepth = 50;   // center tower depth (0 = far, 100 = close)
  let vpY = 200;         // vanishing point Y (50 = far/subtle, 350 = close/dramatic)
  let rebuildTimer: ReturnType<typeof setTimeout> | undefined;

  // Fixed: side towers
  const SIDE_SCALE = 1.2;
  const LEFT_X  = -15;
  const LEFT_Y  = -20;
  const RIGHT_X = SCENE_W - VB_W * SIDE_SCALE + 15;
  const RIGHT_Y = LEFT_Y;

  // Fixed: vanishing point X, panel angle
  const VP_X = SCENE_W / 2;
  const PANEL_ANGLE = 75;

  // IoC: derive per-tower perspective from the single scene VP
  function perspectiveForVP(tx: number, ty: number, scale: number) {
    const ox = MID;
    const oy = (vpY - ty) / scale;
    const dx = (VP_X - tx) / scale - ox;
    const distance = dx * Math.tan(PANEL_ANGLE * Math.PI / 180);
    return { rotateY: PANEL_ANGLE, distance, origin: [ox, oy] as [number, number] };
  }

  // Fixed: courtyard near edge
  const CYARD_NEAR_Y = SCENE_H;
  const CYARD_NEAR_L = LEFT_X + 30 * SIDE_SCALE + 60;
  const CYARD_NEAR_R = RIGHT_X + 170 * SIDE_SCALE - 60;

  // Colors
  const GROUND      = '#968060';
  const GROUND_LINE = '#a89070';
  const GROUND_EDGE = '#7a6850';

  const appInstance = app(resolveTransport(), { title: 'Big Ben Courtyard' }, async (a: App) => {
    let svgCtx: CvgContext;
    let cityPicker: CityPicker | undefined;

    // Build the full window content (slider + scene), called on init and on slider change.
    function buildContent() {
      // Derive center tower params from depth slider
      const cScale = 0.35 + (sceneDepth / 100) * 0.6;   // 0.35 (far) → 0.95 (close)
      const cY = 120 - sceneDepth * 0.9;                 // 120 (far) → 30 (close)
      const cX = (SCENE_W - VB_W * cScale) / 2;

      // Courtyard far edge aligns with center tower base
      const cyardFarY = cY + 440 * cScale;
      const farT = (cyardFarY - vpY) / (CYARD_NEAR_Y - vpY);
      const cyardFarL = VP_X + (CYARD_NEAR_L - VP_X) * farT;
      const cyardFarR = VP_X + (CYARD_NEAR_R - VP_X) * farT;

      a.border({
        // ── Slider row (top — fixed height) ─────────────
        top: () => {
          a.vbox(() => {
            a.hbox(() => {
              a.label('Depth:');
              a.slider(0, 100, sceneDepth, (value: number) => {
                sceneDepth = Math.round(value);
                if (rebuildTimer) clearTimeout(rebuildTimer);
                rebuildTimer = setTimeout(async () => {
                  if (svgCtx) svgCtx.stopPolling();
                  await win.setContent(() => buildContent());
                }, 150);
              });
            });
            a.hbox(() => {
              a.label('VP:');
              a.slider(50, 350, vpY, (value: number) => {
                vpY = Math.round(value);
                if (rebuildTimer) clearTimeout(rebuildTimer);
                rebuildTimer = setTimeout(async () => {
                  if (svgCtx) svgCtx.stopPolling();
                  await win.setContent(() => buildContent());
                }, 150);
              });
            });
          });
        },

        // ── SVG scene (center — expands to fill) ────────
        center: () => {
          a.canvasStack(() => {
          svgCtx = cvg(a, { viewBox: `0 0 ${SCENE_W} ${SCENE_H}`, width: 900, height: 560 }, (s) => {
            // Sky
            s.rect({ x: 0, y: 0, width: SCENE_W, height: SCENE_H, fill: SKY });

            // ── Courtyard floor ─────────────────────────
            s.polygon({
              points: [
                [CYARD_NEAR_L, CYARD_NEAR_Y], [CYARD_NEAR_R, CYARD_NEAR_Y],
                [cyardFarR, cyardFarY],        [cyardFarL, cyardFarY],
              ],
              fill: GROUND,
            });
            // Perspective depth lines — converge to VP
            for (let i = 1; i <= 5; i++) {
              const t = i / 6;
              const y  = cyardFarY + (CYARD_NEAR_Y - cyardFarY) * t;
              const lineT = (y - vpY) / (CYARD_NEAR_Y - vpY);
              const xl = VP_X + (CYARD_NEAR_L - VP_X) * lineT;
              const xr = VP_X + (CYARD_NEAR_R - VP_X) * lineT;
              s.line({ x1: xl, y1: y, x2: xr, y2: y, stroke: GROUND_LINE, 'stroke-width': 1 });
            }
            // Radial depth lines
            for (const nearX of [
              CYARD_NEAR_L + (CYARD_NEAR_R - CYARD_NEAR_L) * 0.25,
              VP_X,
              CYARD_NEAR_L + (CYARD_NEAR_R - CYARD_NEAR_L) * 0.75,
            ]) {
              const farLT = (cyardFarY - vpY) / (CYARD_NEAR_Y - vpY);
              const farX = VP_X + (nearX - VP_X) * farLT;
              s.line({ x1: nearX, y1: CYARD_NEAR_Y, x2: farX, y2: cyardFarY, stroke: GROUND_LINE, 'stroke-width': 1 });
            }
            // Courtyard edge line
            s.line({
              x1: cyardFarL - 10, y1: cyardFarY,
              x2: cyardFarR + 10, y2: cyardFarY,
              stroke: GROUND_EDGE, 'stroke-width': 2,
            });

            // ── City label helper (drawn inside tower group, tower coords) ──
            const LABEL_Y = 320; // mid-shaft in tower coords (shaft 200–440)
            const scaleX = 900 / SCENE_W;
            const scaleY = 560 / SCENE_H;
            // Approximate popup positions in window coords per tower
            const popupPos: Record<TowerKey, { x: number; y: number }> = {
              left:   { x: (LEFT_X + MID * SIDE_SCALE) * scaleX, y: (LEFT_Y + LABEL_Y * SIDE_SCALE) * scaleY + 60 },
              center: { x: (cX + MID * cScale) * scaleX, y: (cY + LABEL_Y * cScale) * scaleY + 60 },
              right:  { x: (RIGHT_X + MID * SIDE_SCALE) * scaleX, y: (RIGHT_Y + LABEL_Y * SIDE_SCALE) * scaleY + 60 },
            };

            function drawCityLabel(key: TowerKey) {
              const city = towerCities[key];
              const label = city.name;
              const bgW = label.length * 9 + 16;
              const bgH = 22;
              const openPicker = () => {
                const pos = popupPos[key];
                cityPicker?.open(pos.x, pos.y, towerCities[key], async (selected) => {
                  towerCities[key] = selected;
                  if (svgCtx) svgCtx.stopPolling();
                  await win.setContent(() => buildContent());
                });
              };
              s.rect({
                x: MID - bgW / 2, y: LABEL_Y - 16,
                width: bgW, height: bgH, rx: 4,
                fill: 'rgba(0,0,0,0.55)',
                cursor: 'pointer' as const,
                onClick: openPicker,
              }).name(`label-bg-${key}`);
              s.text({
                x: MID, y: LABEL_Y,
                fill: 'white', 'font-size': 15, 'text-anchor': 'middle',
                cursor: 'pointer' as const,
                onClick: openPicker,
              }, label).name(`label-${key}`);
            }

            // ── Center tower (depth-controlled) ─────────
            s.g({ transform: { translate: [cX, cY], scale: cScale } }, () => {
              drawBigBen(s, timeInTimezone(towerCities.center.timezone), { sky: false });
              drawCityLabel('center');
            });

            // ── Left tower (fixed, perspective converges to scene VP) ─
            s.g({ transform: {
              translate: [LEFT_X, LEFT_Y],
              scale: SIDE_SCALE,
              cosynePerspective: perspectiveForVP(LEFT_X, LEFT_Y, SIDE_SCALE),
            } }, () => {
              drawBigBen(s, timeInTimezone(towerCities.left.timezone), { sky: false });
              drawCityLabel('left');
            });

            // ── Right tower (fixed, perspective converges to scene VP) ─
            s.g({ transform: {
              translate: [RIGHT_X, RIGHT_Y],
              scale: SIDE_SCALE,
              cosynePerspective: perspectiveForVP(RIGHT_X, RIGHT_Y, SIDE_SCALE),
            } }, () => {
              drawBigBen(s, timeInTimezone(towerCities.right.timezone), { sky: false });
              drawCityLabel('right');
            });
          });
          svgCtx!.enableEvents();
          }); // canvasStack
          svgCtx!.poll(1000);
        },
      });
    }

    const win = a.window({ title: 'Big Ben Courtyard', width: 900, height: 600, padded: false }, () => {
      buildContent();
    });

    await win.show();
    cityPicker = new CityPicker(a, win.id);
  });

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
