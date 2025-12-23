/**
 * Image Effects Module
 *
 * Modular collection of pixel manipulation effects.
 * Each effect is a pure function that operates on Uint8ClampedArray pixel data.
 */

// Basic adjustments
export { brightness } from './brightness';
export { contrast } from './contrast';
export { saturation } from './saturation';
export { gamma } from './gamma';
export { exposure } from './exposure';

// Color effects
export { grayscale } from './grayscale';
export { sepia } from './sepia';
export { invert } from './invert';
export { posterize } from './posterize';
export { threshold } from './threshold';
export { solarize } from './solarize';
export { hueRotate } from './hue-rotate';
export { colorBalance } from './color-balance';
export { colorTemperature } from './color-temperature';
export { swapChannels } from './swap-channels';
export { tint } from './tint';
export { colorSplash } from './color-splash';
export { normalize } from './normalize';
export { vibrance } from './vibrance';
export { duotone } from './duotone';
export { splitToning } from './split-toning';
export { colorQuantize } from './color-quantize';
export { shadowsHighlights } from './shadows-highlights';
export { clarity } from './clarity';
export { replaceColor } from './replace-color';

// Channel effects
export { redChannel } from './red-channel';
export { greenChannel } from './green-channel';
export { blueChannel } from './blue-channel';

// Transform effects
export { flipHorizontal } from './flip-horizontal';
export { flipVertical } from './flip-vertical';
export { rotate90CW } from './rotate-90-cw';
export { rotate90CCW } from './rotate-90-ccw';
export { rotate180 } from './rotate-180';

// Blur effects
export { blur } from './blur';
export { gaussianBlur } from './gaussian-blur';
export { motionBlur } from './motion-blur';
export { radialBlur } from './radial-blur';
export { lensBlur } from './lens-blur';
export { bokeh } from './bokeh';
export { discBlur } from './disc-blur';
export { zoomBlur } from './zoom-blur';
export { tiltShift } from './tilt-shift';
export { focusBlur } from './focus-blur';
export { spinBlur } from './spin-blur';

// Sharpen effects
export { sharpen } from './sharpen';
export { sharpenLuminance } from './sharpen-luminance';
export { smartSharpen } from './smart-sharpen';
export { sharpenEdges } from './sharpen-edges';
export { sharpenSubtle } from './sharpen-subtle';
export { sharpenAggressive } from './sharpen-aggressive';
export { unsharpMask } from './unsharp-mask';

// Filter effects
export { pixelate } from './pixelate';
export { vignette } from './vignette';
export { edgeDetect } from './edge-detect';
export { emboss } from './emboss';
export { medianFilter } from './median-filter';
export { highPass } from './high-pass';

// Screen/Halftone effects
export { halftone } from './halftone';
export { dotScreen } from './dot-screen';
export { lineScreen } from './line-screen';
export { hatchedScreen } from './hatched-screen';
export { circularScreen } from './circular-screen';
export { cmykHalftone } from './cmyk-halftone';

// Distortion effects
export { wave } from './wave';
export { swirl } from './swirl';
export { twirl } from './twirl';
export { dither } from './dither';
export { chromaticAberration } from './chromatic-aberration';
export { glitch } from './glitch';
export { spherize } from './spherize';
export { pinch } from './pinch';
export { bump } from './bump';
export { ripple } from './ripple';
export { frostedGlass } from './frosted-glass';
export { crystallize } from './crystallize';
export { circleSplash } from './circle-splash';
export { displacementMap, generateNoiseMap } from './displacement-map';
export { hole } from './hole';
export { lightTunnel } from './light-tunnel';
export { vortex } from './vortex';

// Artistic effects
export { oilPaint } from './oil-paint';
export { pencilSketch } from './pencil-sketch';
export { popArt } from './pop-art';
export { cartoon } from './cartoon';
export { comics } from './comics';
export { mosaic } from './mosaic';
export { pointillism } from './pointillism';

// Light effects
export { lightLeak } from './light-leak';
export { spotlight } from './spotlight';
export { bloom } from './bloom';
export { gloom } from './gloom';
export { halo } from './halo';
export { star } from './star';
export { sunbeams } from './sunbeams';

// Retro effects
export { filmGrain } from './film-grain';
export { noise } from './noise';
export { vintage } from './vintage';
export { crossProcess } from './cross-process';
export { nightVision } from './night-vision';
export { thermal } from './thermal';
export { scanlines } from './scanlines';
export { crt } from './crt';
export { vhs } from './vhs';

// Pattern generators
export { checkerboard } from './checkerboard';
export { stripes } from './stripes';
export { clouds } from './clouds';
export { gradientFill, radialGradientFill } from './gradient-fill';

// Test utilities (for use in tests)
export * from './test-utils';
