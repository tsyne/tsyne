/*
 * Copyright (c) 2025 Paul Hammant
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 */

/**
 * TsyneTest UI tests for Dialer app with ModemManager
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createDialerApp } from './dialer';
import { MockContactsService } from '../services';
import { MockModemManagerService } from './modemmanager-service';

describe('Dialer App with ModemManager', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let modem: MockModemManagerService;
  let contacts: MockContactsService;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    modem = new MockModemManagerService();
    contacts = new MockContactsService();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
    modem.destroy();
  });

  test('should display empty input initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, modem, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('dialer-display').within(500).shouldBe('Enter number');
  });

  test('should enter digits when keypad pressed', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, modem, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Press some digits
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('555');
  });

  test('should clear display when Clear pressed', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, modem, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter some digits
    await ctx.getByID('key-1').click();
    await ctx.getByID('key-2').click();
    await ctx.getByID('key-3').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('123');

    // Clear
    await ctx.getByID('btn-clear').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('Enter number');
  });

  test('should delete last digit when Del pressed', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, modem, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter digits
    await ctx.getByID('key-1').click();
    await ctx.getByID('key-2').click();
    await ctx.getByID('key-3').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('123');

    // Delete last digit
    await ctx.getByID('btn-del').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('12');
  });

  test('should enter star and hash', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, modem, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('key-star').click();
    await ctx.getByID('key-6').click();
    await ctx.getByID('key-7').click();
    await ctx.getByID('key-hash').click();

    await ctx.getByID('dialer-display').within(500).shouldBe('*67#');
  });

  test('should update status when Call pressed', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, modem, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter a number
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-1').click();
    await ctx.getByID('key-2').click();
    await ctx.getByID('key-3').click();
    await ctx.getByID('key-4').click();

    // Press call
    await ctx.getByID('btn-call').click();

    // Status should show calling
    await ctx.getByID('dialer-status').within(500).shouldExist();
  });

  test('should show caller ID from contacts', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, modem, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Dial Alice's number
    const number = '555-0101';
    for (const digit of number) {
      if (digit !== '-') {
        await ctx.getByID(`key-${digit}`).click();
      }
    }

    await ctx.getByID('btn-call').click();

    // Status should show "Calling Alice Smith..."
    await ctx.getByID('dialer-status').within(500).shouldBe('Calling Alice Smith...');
  });

  test('should handle long calls', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, modem, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter a number and dial
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-0').click();
    await ctx.getByID('key-1').click();
    await ctx.getByID('key-0').click();
    await ctx.getByID('key-1').click();

    await ctx.getByID('btn-call').click();

    // Wait for call to connect
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Display should still show the number
    await ctx.getByID('dialer-display').within(500).shouldBe('5550101');
  });

  test('should take screenshot for documentation', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createDialerApp(app, modem, contacts);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter a sample phone number
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-5').click();
    await ctx.getByID('key-0').click();
    await ctx.getByID('key-1').click();
    await ctx.getByID('key-0').click();
    await ctx.getByID('key-1').click();

    // Take screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshot = await ctx.screenshot();
      console.log(`Screenshot saved: ${screenshot}`);
    }
  });
});
