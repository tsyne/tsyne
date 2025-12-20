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
      spacer: jest.fn().mockReturnValue({})
    } as any;

    // Should not throw
    expect(() => buildParisDensity(mockApp)).not.toThrow();
  });

  test('app should create UI without errors', () => {
    // Create mocks with proper chaining support
    const createLabelMock = () => {
      const labelObj: any = {
        setText: jest.fn(),
        withId: jest.fn()
      };
      labelObj.withId.mockReturnValue(labelObj);
      return labelObj;
    };

    const createButtonMock = () => {
      const buttonObj: any = {
        onClick: jest.fn(),
        withId: jest.fn()
      };
      buttonObj.onClick.mockReturnValue(buttonObj);
      buttonObj.withId.mockReturnValue(buttonObj);
      return buttonObj;
    };

    const createCanvasMock = () => {
      const canvasObj: any = {
        withId: jest.fn(),
        setPixelBuffer: jest.fn().mockReturnValue(Promise.resolve())
      };
      canvasObj.withId.mockReturnValue(canvasObj);
      return canvasObj;
    };

    const createSliderMock = () => {
      const sliderObj: any = {
        withId: jest.fn()
      };
      sliderObj.withId.mockReturnValue(sliderObj);
      return sliderObj;
    };

    const createHBoxMock = (builder?: Function) => {
      if (builder) builder();
      return { when: jest.fn().mockReturnValue({}) };
    };

    const createVBoxMock = (builder?: Function) => {
      if (builder) builder();
      return { when: jest.fn().mockReturnValue({}) };
    };

    const mockApp = {
      window: jest.fn().mockImplementation((options: any, builder?: Function) => {
        const windowObj = {
          setContent: jest.fn().mockImplementation((contentBuilder?: Function) => {
            if (contentBuilder) contentBuilder();
            return {};
          }),
          show: jest.fn().mockReturnValue(Promise.resolve())
        };
        if (builder) builder(windowObj);
        return windowObj;
      }),
      vbox: jest.fn().mockImplementation((builder?: Function) => createVBoxMock(builder)),
      hbox: jest.fn().mockImplementation((builder?: Function) => createHBoxMock(builder)),
      label: jest.fn().mockImplementation(() => createLabelMock()),
      tappableCanvasRaster: jest.fn().mockImplementation(() => createCanvasMock()),
      button: jest.fn().mockImplementation(() => createButtonMock()),
      slider: jest.fn().mockImplementation(() => createSliderMock()),
      spacer: jest.fn().mockReturnValue({})
    } as any;

    // Execute the app builder
    buildParisDensity(mockApp);

    // Verify window was created
    expect(mockApp.window).toHaveBeenCalled();

    // Verify key widget factory methods were called
    expect(mockApp.label.mock.calls.length).toBeGreaterThan(0);
    expect(mockApp.button.mock.calls.length).toBeGreaterThan(0);
    expect(mockApp.tappableCanvasRaster).toHaveBeenCalled();
  });
});
