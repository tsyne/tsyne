#!/usr/bin/env tsyne

/**
 * Effects, Gradients, Clipping Demo
 *
 * @tsyne-app:name SVG Graphics Demo
 * @tsyne-app:icon chartIcon
 * @tsyne-app:category Visualization
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app } from 'tsyne';
import {
  cosyne,
  refreshAllCosyneContexts,
  LinearGradient,
  RadialGradient,
  PRESET_GRADIENTS,
  ClippingRegion,
} from 'cosyne';

type DemoTab = 'effects' | 'gradients' | 'clipping';

class SVGDemoStore {
  private changeListeners: Array<() => void> = [];
  public selectedTab: DemoTab = 'effects';
  public effectType: 'shadow' | 'glow' | 'blend' | 'dash' = 'shadow';
  public gradientType: 'linear' | 'radial' = 'linear';
  public clipType: 'circle' | 'rect' | 'polygon' = 'circle';

  subscribe(listener: () => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((l) => l());
  }

  selectTab(tab: DemoTab) {
    this.selectedTab = tab;
    this.notifyChange();
  }

  selectEffect(type: 'shadow' | 'glow' | 'blend' | 'dash') {
    this.effectType = type;
    this.notifyChange();
  }

  selectGradient(type: 'linear' | 'radial') {
    this.gradientType = type;
    this.notifyChange();
  }

  selectClip(type: 'circle' | 'rect' | 'polygon') {
    this.clipType = type;
    this.notifyChange();
  }
}

export function buildSVGDemoApp(a: any) {
  const store = new SVGDemoStore();
  let tabLabel: any;

  a.window({ title: 'SVG Graphics Demo: Effects, Gradients, Clipping', width: 1000, height: 800 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('SVG Graphics: Effects, Gradients & Clipping', undefined, undefined, undefined, { bold: true });

        // Tab controls
        a.hbox(() => {
          a.button('Effects')
            .onClick(async () => store.selectTab('effects'))
            .withId('tab-effects')
            .when(() => store.selectedTab !== 'effects');
          a.button('Gradients')
            .onClick(async () => store.selectTab('gradients'))
            .withId('tab-gradients')
            .when(() => store.selectedTab !== 'gradients');
          a.button('Clipping')
            .onClick(async () => store.selectTab('clipping'))
            .withId('tab-clipping')
            .when(() => store.selectedTab !== 'clipping');
          tabLabel = a.label(`(${store.selectedTab})`).withId('tabLabel');
        });

        // Content area
        a.canvasStack(() => {
          const ctx = cosyne(a, (c) => {
            const width = 900;
            const height = 600;

            // Background
            c.rect(0, 0, width, height)
              .fill('#f0f0f0')
              .withId('bg');

            switch (store.selectedTab) {
              case 'effects':
                renderEffects(c, store, width, height);
                break;
              case 'gradients':
                renderGradients(c, store, width, height);
                break;
              case 'clipping':
                renderClipping(c, store, width, height);
                break;
            }
          });
        });

        // Sub-controls
        if (store.selectedTab === 'effects') {
          a.hbox(() => {
            a.label('Effect:');
            (['shadow', 'glow', 'blend', 'dash'] as const).forEach((effect) => {
              a.button(effect)
                .onClick(async () => store.selectEffect(effect))
                .withId(`effect-${effect}`)
                .when(() => store.effectType !== effect);
            });
          });
        } else if (store.selectedTab === 'gradients') {
          a.hbox(() => {
            a.label('Gradient:');
            a.button('Linear')
              .onClick(async () => store.selectGradient('linear'))
              .withId('grad-linear')
              .when(() => store.gradientType !== 'linear');
            a.button('Radial')
              .onClick(async () => store.selectGradient('radial'))
              .withId('grad-radial')
              .when(() => store.gradientType !== 'radial');
          });
        } else if (store.selectedTab === 'clipping') {
          a.hbox(() => {
            a.label('Clip Shape:');
            (['circle', 'rect', 'polygon'] as const).forEach((clip) => {
              a.button(clip)
                .onClick(async () => store.selectClip(clip))
                .withId(`clip-${clip}`)
                .when(() => store.clipType !== clip);
            });
          });
        }
      });
    });
    win.show();
  });

  store.subscribe(async () => {
    tabLabel?.setText?.(`(${store.selectedTab})`);
    await refreshAllCosyneContexts();
  });
}

// Demo renderers

function renderEffects(c: any, store: SVGDemoStore, width: number, height: number) {
  const centerX = width / 2;
  const centerY = height / 2;

  switch (store.effectType) {
    case 'shadow':
      // Drop shadow on circle
      c.circle(centerX - 150, centerY, 50)
        .fill('#FF6B6B')
        .stroke('#333333', 2)
        .dropShadow({
          dx: 4,
          dy: 4,
          blur: 8,
          color: '#000000',
          alpha: 0.5,
        })
        .withId('shadow-circle');

      c.text(centerX - 150, centerY + 80, 'Drop Shadow')
        .fill('#333333')
        .withId('label-shadow');

      // Drop shadow on rect
      c.rect(centerX + 50, centerY - 50, 100, 100)
        .fill('#4ECDC4')
        .stroke('#333333', 2)
        .dropShadow({
          dx: 6,
          dy: 6,
          blur: 10,
          color: '#333333',
          alpha: 0.6,
        })
        .withId('shadow-rect');

      c.text(centerX + 100, centerY + 80, 'Drop Shadow')
        .fill('#333333')
        .withId('label-shadow-rect');
      break;

    case 'glow':
      // Glowing circle
      c.circle(centerX - 150, centerY, 50)
        .fill('#FFD93D')
        .glow({
          color: '#FF6B6B',
          blur: 12,
          alpha: 0.7,
          mode: 'outer',
        })
        .withId('glow-circle');

      c.text(centerX - 150, centerY + 80, 'Outer Glow')
        .fill('#333333')
        .withId('label-glow');

      // Inner glow
      c.rect(centerX + 50, centerY - 50, 100, 100)
        .fill('#6BCB77')
        .glow({
          color: '#FFFFFF',
          blur: 10,
          alpha: 0.6,
          mode: 'inner',
        })
        .withId('glow-rect');

      c.text(centerX + 100, centerY + 80, 'Inner Glow')
        .fill('#333333')
        .withId('label-inner-glow');
      break;

    case 'blend':
      // Normal blend
      c.rect(centerX - 200, centerY - 50, 80, 80)
        .fill('#FF6B6B')
        .withId('blend-normal');

      c.rect(centerX - 160, centerY - 30, 80, 80)
        .fill('#4ECDC4')
        .blendMode('multiply')
        .alpha(0.7)
        .withId('blend-multiply');

      c.text(centerX - 160, centerY + 80, 'Multiply')
        .fill('#333333')
        .withId('label-multiply');

      // Screen blend
      c.rect(centerX + 80, centerY - 50, 80, 80)
        .fill('#333333')
        .withId('blend-screen-bg');

      c.rect(centerX + 120, centerY - 30, 80, 80)
        .fill('#FFD93D')
        .blendMode('screen')
        .alpha(0.7)
        .withId('blend-screen');

      c.text(centerX + 120, centerY + 80, 'Screen')
        .fill('#333333')
        .withId('label-screen');
      break;

    case 'dash':
      // Solid line
      c.line(centerX - 200, centerY - 100, centerX - 50, centerY - 100)
        .stroke('#333333', 3)
        .withId('dash-solid');

      c.text(centerX - 125, centerY - 120, 'Solid')
        .fill('#333333')
        .withId('label-solid');

      // Dashed line
      c.line(centerX - 200, centerY, centerX - 50, centerY)
        .stroke('#FF6B6B', 3)
        .strokeDash([10, 5])
        .withId('dash-dashed');

      c.text(centerX - 125, centerY - 20, 'Dashed')
        .fill('#333333')
        .withId('label-dashed');

      // Dotted line
      c.line(centerX - 200, centerY + 100, centerX - 50, centerY + 100)
        .stroke('#4ECDC4', 3)
        .strokeDash([3, 5])
        .withId('dash-dotted');

      c.text(centerX - 125, centerY + 80, 'Dotted')
        .fill('#333333')
        .withId('label-dotted');

      // Complex pattern
      c.line(centerX + 50, centerY - 100, centerX + 200, centerY - 100)
        .stroke('#FFD93D', 3)
        .strokeDash([10, 5, 5, 5])
        .withId('dash-complex');

      c.text(centerX + 125, centerY - 120, 'Complex')
        .fill('#333333')
        .withId('label-complex');
      break;
  }
}

function renderGradients(c: any, store: SVGDemoStore, width: number, height: number) {
  const centerX = width / 2;
  const centerY = height / 2;

  if (store.gradientType === 'linear') {
    // Preset gradients
    const gradients = [
      { name: 'Sunset', grad: PRESET_GRADIENTS.sunset() },
      { name: 'Ocean', grad: PRESET_GRADIENTS.ocean() },
      { name: 'Forest', grad: PRESET_GRADIENTS.forest() },
      { name: 'Sky', grad: PRESET_GRADIENTS.sky() },
      { name: 'Flame', grad: PRESET_GRADIENTS.flame() },
      { name: 'Cool', grad: PRESET_GRADIENTS.cool() },
    ];

    gradients.forEach((item, idx) => {
      const x = 50 + (idx % 3) * 300;
      const y = 50 + Math.floor(idx / 3) * 200;

      // Draw gradient rect
      c.rect(x, y, 200, 100)
        .fill(item.grad)
        .stroke('#333333', 2)
        .withId(`grad-${item.name}`);

      c.text(x + 100, y + 120, item.name)
        .fill('#333333')
        .withId(`label-${item.name}`);
    });
  } else {
    // Radial gradients
    const radialGradients = [
      PRESET_GRADIENTS.sunsetRadial(),
      new RadialGradient(50, 50, 50)
        .addStop(0, '#FFFFFF', 1)
        .addStop(1, '#000000', 1),
    ];

    // Sunset radial
    c.circle(150, centerY, 80)
      .fill(radialGradients[0])
      .stroke('#333333', 2)
      .withId('radial-sunset');

    c.text(150, centerY + 120, 'Sunset Radial')
      .fill('#333333')
      .withId('label-radial-sunset');

    // White to black radial
    c.circle(centerX + 150, centerY, 80)
      .fill(radialGradients[1])
      .stroke('#333333', 2)
      .withId('radial-bw');

    c.text(centerX + 150, centerY + 120, 'White → Black')
      .fill('#333333')
      .withId('label-radial-bw');
  }
}

function renderClipping(c: any, store: SVGDemoStore, width: number, height: number) {
  const centerX = width / 2;
  const centerY = height / 2;

  switch (store.clipType) {
    case 'circle':
      // Draw pattern rectangle
      c.rect(centerX - 150, centerY - 100, 200, 200)
        .fill('#FF6B6B')
        .withId('clip-bg-circle');

      // Draw grid pattern on clipped area
      for (let i = 0; i < 10; i++) {
        c.line(centerX - 150 + i * 20, centerY - 100, centerX - 150 + i * 20, centerY + 100)
          .stroke('#FFFFFF', 1)
          .alpha(0.5)
          .withId(`grid-v-${i}`);
      }

      for (let i = 0; i < 10; i++) {
        c.line(centerX - 150, centerY - 100 + i * 20, centerX + 50, centerY - 100 + i * 20)
          .stroke('#FFFFFF', 1)
          .alpha(0.5)
          .withId(`grid-h-${i}`);
      }

      // Clipping circle visual indicator
      c.circle(centerX - 50, centerY, 60)
        .fill('none')
        .stroke('#333333', 2)
        .withId('clip-circle-outline');

      c.text(centerX - 50, centerY + 130, 'Circle Clipping')
        .fill('#333333')
        .withId('label-circle-clip');

      // Second example: clipped gradient
      const grad = PRESET_GRADIENTS.sunset();
      c.rect(centerX + 100, centerY - 100, 200, 200)
        .fill(grad)
        .stroke('#333333', 2)
        .withId('clip-gradient');

      c.circle(centerX + 200, centerY, 60)
        .fill('none')
        .stroke('#FFFFFF', 2)
        .withId('clip-circle-outline-2');

      c.text(centerX + 200, centerY + 130, 'Clipped Gradient')
        .fill('#333333')
        .withId('label-clipped-grad');
      break;

    case 'rect':
      // Pattern rectangle
      c.rect(centerX - 150, centerY - 100, 200, 200)
        .fill('#4ECDC4')
        .withId('clip-bg-rect');

      for (let i = 0; i < 10; i++) {
        c.circle(centerX - 150 + i * 20, centerY - 100 + ((i % 2) * 40), 5)
          .fill('#FFFFFF')
          .alpha(0.7)
          .withId(`dot-${i}`);
      }

      // Clipping rect indicator
      c.rect(centerX - 120, centerY - 70, 140, 140)
        .fill('none')
        .stroke('#333333', 2)
        .withId('clip-rect-outline');

      c.text(centerX - 50, centerY + 130, 'Rect Clipping')
        .fill('#333333')
        .withId('label-rect-clip');

      // Rounded rect clipping
      const grad2 = PRESET_GRADIENTS.ocean();
      c.rect(centerX + 100, centerY - 100, 200, 200)
        .fill(grad2)
        .stroke('#333333', 2)
        .withId('clip-bg-rounded');

      c.rect(centerX + 130, centerY - 70, 140, 140)
        .fill('none')
        .stroke('#FFFFFF', 2)
        .withId('clip-rounded-outline');

      c.text(centerX + 200, centerY + 130, 'Rounded Rect Clip')
        .fill('#FFFFFF')
        .withId('label-rounded-clip');
      break;

    case 'polygon':
      // Background
      c.rect(centerX - 200, centerY - 150, 300, 300)
        .fill('#FFD93D')
        .withId('clip-bg-poly');

      // Triangle clipping indicator
      c.polygon(centerX - 50, centerY, [
        { x: -60, y: -80 },
        { x: 60, y: -80 },
        { x: 0, y: 80 },
      ])
        .fill('none')
        .stroke('#333333', 2)
        .withId('clip-triangle-outline');

      c.text(centerX - 50, centerY + 120, 'Triangle Clipping')
        .fill('#333333')
        .withId('label-poly-clip');

      // Star clipping
      c.polygon(centerX + 150, centerY, [
        { x: 0, y: -80 },
        { x: 24, y: -24 },
        { x: 80, y: 0 },
        { x: 24, y: 24 },
        { x: 0, y: 80 },
        { x: -24, y: 24 },
        { x: -80, y: 0 },
        { x: -24, y: -24 },
      ])
        .fill('none')
        .stroke('#6BCB77', 2)
        .withId('clip-star-outline');

      c.text(centerX + 150, centerY + 120, 'Star Clipping')
        .fill('#333333')
        .withId('label-star-clip');
      break;
  }
}

// Auto-run when executed directly
if (require.main === module) {
  const { resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'SVG Graphics Demo' }, buildSVGDemoApp);
}
