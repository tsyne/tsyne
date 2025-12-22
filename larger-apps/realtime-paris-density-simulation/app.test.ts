/**
 * GUI Tests for Paris Density Simulation using TsyneTest
 *
 * This file demonstrates the app can be instantiated and provides
 * a template for TsyneTest integration testing. Full TsyneTest setup
 * requires the core Tsyne dependencies to be resolved in the monorepo.
 *
 * To run full GUI tests:
 * 1. Ensure core dependencies are available via monorepo setup
 * 2. npm run test:gui
 */

import { buildParisDensity } from './app';

describe('Paris Density Simulation App Tests', () => {
  test('should export buildParisDensity function', () => {
    expect(typeof buildParisDensity).toBe('function');
  });

  test('buildParisDensity should be callable with mock App', () => {
    // Mock a minimal App interface for testing without TsyneTest
    const mockApp = {
      window: jest.fn().mockReturnValue({
        setContent: jest.fn().mockReturnValue({}),
        show: jest.fn().mockReturnValue(Promise.resolve())
      }),
      vbox: jest.fn(),
      hbox: jest.fn(),
      label: jest.fn().mockReturnValue({
        setText: jest.fn(),
        withId: jest.fn().mockReturnValue({})
      }),
      tappableCanvasRaster: jest.fn().mockReturnValue({
        withId: jest.fn().mockReturnValue({}),
        setPixelBuffer: jest.fn().mockReturnValue(Promise.resolve())
      }),
      button: jest.fn().mockReturnValue({
        onClick: jest.fn().mockReturnValue({
          withId: jest.fn().mockReturnValue({})
        }),
        withId: jest.fn().mockReturnValue({})
      }),
      slider: jest.fn().mockReturnValue({
        withId: jest.fn().mockReturnValue({})
      }),
      spacer: jest.fn().mockReturnValue({}),
      setCustomTheme: jest.fn(),
      setCustomSizes: jest.fn()
    } as any;

    // Should not throw
    expect(() => buildParisDensity(mockApp)).not.toThrow();
  });

  test('app should create window without errors', () => {
    // Create mocks with proper chaining support
    const createChainableMock = () => {
      const obj: any = {};
      const handler = {
        get: (_target: any, prop: string) => {
          if (prop === 'mockReturnValue' || prop === 'mock') {
            return obj[prop];
          }
          // Return a function that returns the proxy for chaining
          return jest.fn().mockReturnValue(new Proxy({}, handler));
        }
      };
      return new Proxy({}, handler);
    };

    const mockApp = {
      window: jest.fn().mockImplementation((options: any, builder?: Function) => {
        const windowObj = {
          setContent: jest.fn().mockReturnValue({}),
          show: jest.fn().mockReturnValue(Promise.resolve())
        };
        if (builder) builder(windowObj);
        return windowObj;
      }),
      vbox: jest.fn().mockImplementation(() => createChainableMock()),
      hbox: jest.fn().mockImplementation(() => createChainableMock()),
      stack: jest.fn().mockImplementation(() => createChainableMock()),
      label: jest.fn().mockImplementation(() => createChainableMock()),
      tappableCanvasRaster: jest.fn().mockImplementation(() => createChainableMock()),
      button: jest.fn().mockImplementation(() => createChainableMock()),
      slider: jest.fn().mockImplementation(() => createChainableMock()),
      spacer: jest.fn().mockReturnValue({}),
      setCustomTheme: jest.fn(),
      setCustomSizes: jest.fn()
    } as any;

    // Execute the app builder - should not throw
    buildParisDensity(mockApp);

    // Verify window was created with correct options
    expect(mockApp.window).toHaveBeenCalled();
    expect(mockApp.window.mock.calls[0][0]).toMatchObject({
      title: 'Paris Density Simulation'
    });
    expect(mockApp.setCustomTheme).toHaveBeenCalled();
    expect(mockApp.setCustomSizes).toHaveBeenCalled();
  });
});
