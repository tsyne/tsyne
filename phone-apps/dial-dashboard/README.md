# Dial Dashboard

A showcase demo for the Cosyne dial primitive - an interactive rotary knob control widget.

## Features

- **Multiple Style Presets**: Classic, Minimal, Vintage, Modern
- **Customizable Angles**: Support for 90°, 180°, 270°, and 360° sweeps
- **Tick Marks**: Configurable tick count with major/minor distinction
- **Value Display**: Optional value text with prefix/suffix and decimal places
- **Interactive**: Drag-to-rotate, click-to-set, scroll wheel support
- **Reactive Bindings**: Value binding for animation and data synchronization
- **Callbacks**: onValueChange and onChangeEnded events

## Dial Styles

```
┌────────────────────────────────────────────────────────────┐
│                    DIAL DASHBOARD                           │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  [CLASSIC]      [MINIMAL]      [VINTAGE]      [MODERN]     │
│    ┌───┐          ┌───┐          ┌───┐          ┌───┐      │
│   ╭│ 50│╮        ╭│65%│╮        ╭│21°│╮        ╭│75 │╮     │
│   ╰─────╯        ╰─────╯        ╰─────╯        ╰─────╯     │
│   Volume        Brightness       Temp           Speed       │
│                                                             │
│  [HUE 360°]    [ANGLE 180°]    [PAN L/R]      [GAIN]       │
│    ╭───╮          ───           ┌───┐          ┌───┐       │
│   │ ° │         ╰ 90° ╯        ╭│  0│╮        ╭│5.0│╮      │
│    ╰───╯                       ╰─────╯        ╰─────╯      │
│                                                             │
│  [SMALL]       [MEDIUM]        [LARGE]        [BOUND]      │
│    ╭─╮           ╭──╮           ╭───╮          ╭───╮       │
│    ╰─╯          ╭│60│╮         ╭│ 80│╮        ╭│~~ │╮      │
│                 ╰────╯         ╰─────╯        ╰─────╯      │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Usage

```typescript
import { cosyne } from 'cosyne';

cosyne(app, (c) => {
  // Classic volume knob
  c.dial(100, 100, {
    minValue: 0,
    maxValue: 100,
    value: 50,
    style: 'classic',
    valueSuffix: '%',
    showTicks: true,
    onValueChange: (v) => console.log('Volume:', v),
  }).withId('volume-dial');

  // Temperature dial with vintage style
  c.dial(200, 100, {
    minValue: 15,
    maxValue: 30,
    value: 21.5,
    style: 'vintage',
    valueSuffix: '°',
    valueDecimals: 1,
    step: 0.5,
  }).withId('temp-dial');

  // Full 360° hue selector
  c.dial(300, 100, {
    minValue: 0,
    maxValue: 360,
    startAngle: 0,
    endAngle: 360,
    accentColor: '#ff6b6b',
    valueSuffix: '°',
  }).withId('hue-dial');

  // Pan control with centered range
  c.dial(400, 100, {
    minValue: -100,
    maxValue: 100,
    value: 0,  // Center
    accentColor: '#27ae60',
  }).withId('pan-dial');
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minValue` | number | 0 | Minimum value |
| `maxValue` | number | 100 | Maximum value |
| `value` | number | minValue | Current value |
| `step` | number | 1 | Increment step |
| `radius` | number | 40 | Dial radius in pixels |
| `startAngle` | number | -135 | Start angle in degrees |
| `endAngle` | number | 135 | End angle in degrees |
| `style` | DialStyle | 'classic' | Style preset |
| `trackColor` | string | (from style) | Background track color |
| `accentColor` | string | (from style) | Value indicator color |
| `knobColor` | string | (from style) | Center knob fill |
| `showTicks` | boolean | true | Show tick marks |
| `tickCount` | number | 11 | Number of tick marks |
| `majorTickInterval` | number | 5 | Interval for major ticks |
| `showValue` | boolean | true | Show value text |
| `valueSuffix` | string | '' | Suffix for value (e.g., '%') |
| `valuePrefix` | string | '' | Prefix for value (e.g., '$') |
| `valueDecimals` | number | 0 | Decimal places |
| `wrapping` | boolean | false | Allow value wrapping |
| `onValueChange` | function | - | Callback on value change |
| `onChangeEnded` | function | - | Callback when drag ends |

## Running

```bash
npx tsx phone-apps/dial-dashboard/dial-cosyne.ts
```

## Testing

```bash
cd phone-apps/dial-dashboard
pnpm test
```

## Inspired By

- Fyne RotaryControl widget
- Vintage audio equipment (Marshall amps, tube preamps)
- Modern synth UIs (Serum, Vital, etc.)
