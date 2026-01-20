// Mock the tsyne module for testing
// The game logic doesn't actually use these - they're only for the UI layer
jest.mock('tsyne', () => ({
  App: class MockApp {},
  TappableCanvasRaster: class MockTappableCanvasRaster {
    withId() { return this; }
    requestFocus() { return Promise.resolve(); }
    setPixelBuffer() { return Promise.resolve(); }
  },
  Label: class MockLabel {
    withId() { return this; }
    setText() {}
  },
  app: jest.fn(),
  resolveTransport: jest.fn(),
}), { virtual: true });
