/**
 * Tests for ELIZA Chatbot
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createElizaApp } from './eliza';
import { elizaResponse, getInitialGreeting, isQuitCommand } from './eliza-engine';
import type { App } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';

describe('ELIZA Chatbot', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display ELIZA window with controls', async () => {
    const testApp = await tsyneTest.createApp((app: App) => { createElizaApp(app); });
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getById('btn-clear').shouldExist();
    await ctx.getById('btn-debug').shouldExist();
    await ctx.getById('btn-send').shouldExist();
    await ctx.getById('input').shouldExist();
  }, 30000);

  test('should show initial greeting', async () => {
    const testApp = await tsyneTest.createApp((app: App) => { createElizaApp(app); });
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    // The help text should be visible
    await ctx.getById('help-text').shouldExist();
  }, 30000);

  test('should toggle debug mode', async () => {
    const testApp = await tsyneTest.createApp((app: App) => { createElizaApp(app); });
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getById('btn-debug').click();
    await ctx.wait(500);

    const status = await ctx.getById('status');
    const text = await status.getText();
    expect(text).toContain('Debug mode');
  }, 30000);

  test('should clear conversation', async () => {
    const testApp = await tsyneTest.createApp((app: App) => { createElizaApp(app); });
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1000);

    await ctx.getById('btn-clear').click();
    await ctx.wait(500);

    const status = await ctx.getById('status');
    const text = await status.getText();
    expect(text).toContain('cleared');
  }, 30000);

  test('should take screenshot', async () => {
    const testApp = await tsyneTest.createApp((app: App) => { createElizaApp(app); });
    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(1500);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await tsyneTest.screenshot(path.join(screenshotDir, 'eliza-chat.png'));
  }, 30000);
});

describe('ELIZA Engine', () => {
  test('should return initial greeting', () => {
    const greeting = getInitialGreeting();
    expect(greeting).toContain('ELIZA');
    expect(greeting).toContain('problem');
  });

  test('should detect quit commands', () => {
    expect(isQuitCommand('quit')).toBe(true);
    expect(isQuitCommand('bye')).toBe(true);
    expect(isQuitCommand('goodbye')).toBe(true);
    expect(isQuitCommand('exit')).toBe(true);
    expect(isQuitCommand('hello')).toBe(false);
    expect(isQuitCommand('I want to quit my job')).toBe(true);
  });

  test('should respond to hello', () => {
    const result = elizaResponse('hello');
    expect(result.response).not.toBeNull();
    expect(result.response).toBeTruthy();
  });

  test('should respond to sad input', () => {
    const result = elizaResponse('I am feeling sad');
    expect(result.response).not.toBeNull();
    expect(result.response!.toLowerCase()).toMatch(/sad|pleasant|sorry/);
  });

  test('should respond to remember input', () => {
    const result = elizaResponse('I remember my childhood');
    expect(result.response).not.toBeNull();
    expect(result.debug?.pattern).toContain('remember');
    expect(result.debug?.rank).toBeGreaterThan(0);
  });

  test('should reflect pronouns', () => {
    const result = elizaResponse('I am happy');
    expect(result.response).not.toBeNull();
    // Response should have reflected "you are" instead of "I am"
    expect(result.response!.toLowerCase()).not.toContain('i am');
  });

  test('should handle computer keyword', () => {
    const result = elizaResponse('Are you a computer?');
    expect(result.response).not.toBeNull();
    expect(result.debug?.pattern).toBeDefined();
  });

  test('should return null response for quit', () => {
    const result = elizaResponse('bye');
    expect(result.response).toBeNull();
  });

  test('should provide default response for unknown input', () => {
    const result = elizaResponse('asdfghjkl');
    expect(result.response).not.toBeNull();
    expect(result.response).toBeTruthy();
  });

  test('should include debug info', () => {
    const result = elizaResponse('I want to be happy');
    expect(result.debug).toBeDefined();
    expect(result.debug?.pattern).toBeDefined();
    expect(result.debug?.rank).toBeDefined();
    expect(result.debug?.matches).toBeDefined();
  });
});
