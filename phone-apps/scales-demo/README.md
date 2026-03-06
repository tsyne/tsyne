# Scales Demo

**Interactive visualization of D3-style scales**

Demonstrates different scale types (linear, logarithmic, square root, power, ordinal) for data transformation and visualization.

![Scales Demo](screenshots/scales-demo.png)

## Features

- 5 scale types with live switching
- Real-time data point visualization
- Axes with automatic tick generation
- Grid lines for reference

## Scale Types

### Linear Scale
```
┌─────────────────────────────┐
│  Data:        Visual:       │
│  0  ━━━━━━━━  0 ┌───┐      │
│  5  ━━━━━━    125 │  │      │
│  10 ━━━━━     250 │  │      │
│  15 ━━━      375 │  │      │
│  20 ━         500 └───┘      │
└─────────────────────────────┘
   Input          Output
   (data)       (visual)
```

### Logarithmic Scale
```
┌─────────────────────────────┐
│  Data:        Visual:       │
│  1   ━━━       0 ┌────────  │
│  10  ━━━━      166 │        │
│  100 ━━━━━     333 │        │
│  1000 ━━━━━━   500 └────   │
└─────────────────────────────┘
   Exponential data          Compressed
```

### Square Root Scale
```
┌─────────────────────────────┐
│  Data:        Visual:       │
│  0   ━         0            │
│  25  ━━━       250          │
│  50  ━━━       354          │
│  75  ━━━       433          │
│  100 ━━━━      500          │
└─────────────────────────────┘
   Area-based             Radius
```

### Power Scale (n²)
```
┌─────────────────────────────┐
│  Data:        Visual:       │
│  0   ━         0            │
│  5   ━        25            │
│  7.5 ━        56            │
│  10  ━━━     100            │
└─────────────────────────────┘
   Input       Quadratic
```

### Ordinal Scale
```
┌────────────────────────────┐
│    ┌─  ┌─  ┌─  ┌─  ┌─     │
│    │A  │B  │C  │D  │E     │
│    └─  └─  └─  └─  └─     │
│   [----][----][----][--]   │
│   Categories  Bands        │
└────────────────────────────┘
```

## Usage

Run the demo:

```bash
npx tsx phone-apps/scales-demo/scales-demo.ts
```

## Controls

- **Scale Buttons**: Switch between different scale types
- **Visualization**: Shows data points connected with lines
- **Grid**: Reference grid lines help read values
- **Axes**: Automatic tick marks and labels

## Files

- `scales-demo.ts` - Main application
- `README.md` - This file

## API Used

```typescript
import { LinearScale, LogScale, SqrtScale, PowerScale, OrdinalScale } from 'cosyne';
import { Axis, GridLines } from 'cosyne';

// Create scale
const scale = new LinearScale().domain(0, 100).range(0, 500);

// Transform data
const visualValue = scale.scale(50);  // → 250

// Draw axis with automatic ticks
const axis = new Axis(scale, {x: 50, y: 450}, 500)
  .setOrientation('bottom')
  .render(ctx);
```

## Test

Run TsyneTest integration tests:

```bash
pnpm test -- scales-demo/scales-demo.test.ts
```

## Screenshots

To generate screenshots for the README:

```bash
# Run in headed mode to see the UI
TSYNE_HEADED=1 pnpm test -- scales-demo/scales-demo.test.ts

# Screenshot should be saved to:
# phone-apps/scales-demo/screenshots/scales-demo.png
```

> **Note**: Screenshot generation requires the Tsyne GUI to be available. This works in environments with a display (desktop) or through screenshots captured during headed test runs.

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 6/10 | `vbox > hbox(controls) + canvasStack(chart)` nesting |
| **Core declarative** | Fluent method chaining | 5/10 | `.withId()` on 8 elements. 1 `.when()` for conditional rendering |
| **Core declarative** | Programmatic generation | 6/10 | Loop-based data point generation for scale demonstrations |
| **State architecture** | Observable store | 5/10 | `subscribe()` pattern. Store-driven scale updates |
| **Declarative updates** | `.when()` + `.bindTo()` | 4/10 | 1 `.when()` for conditional visibility. `clearAllCosyneContexts()` + subscribe for reactive updates |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 0 | No `removeAll()`/`setContent()` |
| **Testing** | `.withId()` coverage | 5/10 | IDs on scale controls |
| **Design** | Separation of concerns | 6/10 | D3-style scale configuration separated from rendering |
| | **Overall** | **5/10** | Uses subscribe pattern and `.when()`. Demonstrates D3-style scale types with reactive configuration |

## See Also

- [D3/P5 Components Guide](../../cosyne/D3_P5_COMPONENTS.md)
- [Scales Documentation](../../cosyne/D3_P5_COMPONENTS.md#scales)
- [Axes Documentation](../../cosyne/D3_P5_COMPONENTS.md#axes)
