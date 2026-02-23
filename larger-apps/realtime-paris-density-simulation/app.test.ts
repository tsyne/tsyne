/**
 * GUI Tests for Paris Density Simulation using TsyneTest
 *
 * Tests the GPU shader-based heatmap rendering pipeline.
 */

import { buildParisDensity } from './app';

// Helper: create a deeply-chainable mock object (any property/method returns another chainable mock)
function createChainableMock(): any {
  const handler: ProxyHandler<any> = {
    get: (_target: any, prop: string) => {
      if (prop === 'then') return undefined; // prevent Promise-like behavior
      return jest.fn().mockReturnValue(new Proxy({}, handler));
    }
  };
  return new Proxy({}, handler);
}

// Build a mock App that supports the GPU shader pipeline
function createMockApp() {
  const shaderMock = {
    setUniform: jest.fn(),
    setUniforms: jest.fn(),
    setTextureData: jest.fn().mockReturnValue(Promise.resolve()),
    setHeightmapTexture: jest.fn().mockReturnValue(Promise.resolve()),
    showTooltip: jest.fn().mockReturnValue(Promise.resolve()),
    hideTooltip: jest.fn().mockReturnValue(Promise.resolve()),
    setAutoAnimate: jest.fn().mockReturnValue(Promise.resolve()),
    resize: jest.fn().mockReturnValue(Promise.resolve()),
    withId: jest.fn().mockReturnThis(),
  };

  const mockApp = {
    window: jest.fn().mockImplementation((_options: any, builder?: Function) => {
      const windowObj = {
        setContent: jest.fn().mockImplementation(async (fn: Function) => { await fn(); }),
        show: jest.fn().mockReturnValue(Promise.resolve()),
        onResize: jest.fn().mockReturnThis(),
      };
      if (builder) builder(windowObj);
      return windowObj;
    }),
    stack: jest.fn().mockImplementation((fn: Function) => { fn(); return createChainableMock(); }),
    vbox: jest.fn().mockImplementation((fn: Function) => { fn(); return createChainableMock(); }),
    hbox: jest.fn().mockImplementation((fn: Function) => { fn(); return createChainableMock(); }),
    scroll: jest.fn().mockImplementation((fn: Function) => { fn(); return createChainableMock(); }),
    max: jest.fn().mockImplementation((fn: Function) => { fn(); return createChainableMock(); }),
    themeoverride: jest.fn().mockImplementation((_theme: string, fn: Function) => { fn(); return createChainableMock(); }),
    rectangle: jest.fn().mockReturnValue(createChainableMock()),
    canvasShader: jest.fn().mockReturnValue(shaderMock),
    label: jest.fn().mockReturnValue({
      setText: jest.fn(),
      withId: jest.fn().mockReturnValue({ setText: jest.fn() }),
    }),
    button: jest.fn().mockReturnValue({
      withId: jest.fn().mockReturnValue({}),
    }),
    slider: jest.fn().mockReturnValue({
      withId: jest.fn().mockReturnValue({}),
    }),
    spacer: jest.fn().mockReturnValue({}),
    setCustomTheme: jest.fn(),
    setCustomSizes: jest.fn(),
  } as any;

  return { mockApp, shaderMock };
}

describe('Paris Density Simulation App Tests', () => {
  test('should export buildParisDensity function', () => {
    expect(typeof buildParisDensity).toBe('function');
  });

  test('app should create window with correct options', () => {
    const { mockApp } = createMockApp();

    buildParisDensity(mockApp);

    expect(mockApp.window).toHaveBeenCalled();
    expect(mockApp.window.mock.calls[0][0]).toMatchObject({
      title: 'Paris Density Simulation',
    });
    expect(mockApp.setCustomTheme).toHaveBeenCalled();
    expect(mockApp.setCustomSizes).toHaveBeenCalled();
  });

  test('app should create a canvasShader with GLSL source', () => {
    const { mockApp } = createMockApp();

    buildParisDensity(mockApp);

    expect(mockApp.canvasShader).toHaveBeenCalledWith(
      800, 600,
      expect.stringContaining('void main()'),
      expect.objectContaining({
        onScroll: expect.any(Function),
        onDrag: expect.any(Function),
        onMouseMoved: expect.any(Function),
        onMouseOut: expect.any(Function),
      }),
    );
  });
});
