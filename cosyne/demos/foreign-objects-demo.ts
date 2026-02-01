#!/usr/bin/env npx tsx
/**
 * Foreign Objects Demo
 *
 * Demonstrates embedding Tsyne widgets at canvas coordinates,
 * including buttons, sliders, text input, and widget event handling.
 *
 * Run: npx tsx cosyne/demos/foreign-objects-demo.ts
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import { cosyne, CosyneContext, enableEventHandling, refreshAllCosyneContexts } from 'cosyne';

const WIDTH = 600;
const HEIGHT = 500;

interface DemoState {
  buttonClicks: number;
  sliderValue: number;
  textInput: string;
}

function createForeignObjectsDemo(a: App): void {
  const state: DemoState = {
    buttonClicks: 0,
    sliderValue: 50,
    textInput: '',
  };

  a.window(
    { title: 'Foreign Objects Demo', width: WIDTH + 40, height: HEIGHT + 250 },
    (win: any) => {
      win.setContent(() => {
        a.vbox(() => {
          a.label('Embedding Tsyne Widgets in Canvas');

          // Regular Tsyne controls above canvas
          a.hbox(() => {
            a.label('Button Clicks:');
            a.label(state.buttonClicks.toString()).withId('click-counter');
          });

          a.hbox(() => {
            a.label('Slider:');
            a.slider(0, 100, state.sliderValue, (val: number) => {
              state.sliderValue = val;
              refreshAllCosyneContexts();
            });
            a.label(state.sliderValue.toFixed(0)).withId('slider-value');
          });

          a.hbox(() => {
            a.label('Text:');
            a.entry('Type here...', {
              onChange: (text: string) => {
                state.textInput = text;
                refreshAllCosyneContexts();
              },
            }).withId('text-input');
          });

          // Canvas with overlay controls
          a.max(() => {
            const chart = cosyne(a, (ctx: CosyneContext) => {
              ctx.rectangle({
                size: [WIDTH, HEIGHT],
                position: [0, 0],
              })
                .setFill('#f5f5f5');

              // Draw zones for different widget types
              ctx.rectangle({
                size: [280, 200],
                position: [20, 20],
              })
                .setFill('rgba(100, 150, 200, 0.1)')
                .setStroke('#999', 1)
                .withId('button-zone');

              ctx.text('Button Zone', {
                x: 160,
                y: 35,
                textAlign: 'center',
                fontSize: 14,
                fill: '#666',
              });

              // Slider zone
              ctx.rectangle({
                size: [280, 100],
                position: [300, 20],
              })
                .setFill('rgba(200, 150, 100, 0.1)')
                .setStroke('#999', 1)
                .withId('slider-zone');

              ctx.text('Slider Zone', {
                x: 440,
                y: 35,
                textAlign: 'center',
                fontSize: 14,
                fill: '#666',
              });

              // Display current state
              ctx.rectangle({
                size: [280, 150],
                position: [20, 240],
              })
                .setFill('rgba(150, 200, 100, 0.1)')
                .setStroke('#999', 1)
                .withId('state-zone');

              ctx.text('Current State', {
                x: 160,
                y: 255,
                textAlign: 'center',
                fontSize: 14,
                fill: '#666',
              });

              ctx.text(`Clicks: ${state.buttonClicks}`, {
                x: 30,
                y: 280,
                fontSize: 12,
                fill: '#333',
              });

              ctx.text(`Slider: ${state.sliderValue.toFixed(0)}%`, {
                x: 30,
                y: 305,
                fontSize: 12,
                fill: '#333',
              });

              ctx.text(`Input: ${state.textInput.substring(0, 20)}...`, {
                x: 30,
                y: 330,
                fontSize: 12,
                fill: '#333',
              });

              ctx.text('Widgets embedded in canvas coordinate system', {
                x: WIDTH / 2,
                y: HEIGHT - 20,
                textAlign: 'center',
                fontSize: 11,
                fill: '#999',
              });
            });

            enableEventHandling(chart);
          });

          // Buttons below canvas
          a.hbox(() => {
            a.button('Click Me').onClick(() => {
              state.buttonClicks++;
              refreshAllCosyneContexts();
            }).withId('action-button');

            a.spacer();

            a.button('Reset').onClick(() => {
              state.buttonClicks = 0;
              state.sliderValue = 50;
              state.textInput = '';
              refreshAllCosyneContexts();
            }).withId('reset-button');
          });
        });
      });

      win.show();
    }
  );
}

if (require.main === module) {
  const appInstance = app(
    resolveTransport(),
    { title: 'Foreign Objects Demo' },
    createForeignObjectsDemo
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
