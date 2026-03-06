# Real-Time Paris Density Simulation

A native desktop application that visualizes foot traffic density patterns across Paris using a probabilistic simulation engine. Originally created by Yvann Barbot and ported to the Tsyne framework.

## Overview

This application simulates realistic crowd movement patterns throughout Paris by analyzing:

- **50+ Major Hotspots**: Eiffel Tower, Louvre, Notre-Dame, business districts, transport hubs, shopping areas, parks, and residential zones
- **Temporal Profiles**: 168 unique time patterns (one for each hour of the week) modeling different activity levels by location type and time
- **Gaussian Density Fields**: Smooth, overlapping influence zones that decay exponentially from each hotspot
- **Day-of-Week Variations**: Different patterns for weekdays vs. weekends across location categories

## Technology Stack

**Core Simulation**:
- H3 hexagonal grid system for spatial analysis
- Gaussian falloff functions for smooth density interpolation
- Temporal multipliers based on location type and time
- Seeded random generation for consistent animation

**Visualization**:
- Tsyne native GUI framework
- Fyne.io canvas rendering
- Real-time density heatmap visualization
- Color gradient: Blue → Green → Yellow → Orange → Red

## Features

- **Interactive Time Control**: Navigate through any hour and day of the week
- **Live Animation**: Watch density patterns transition smoothly across hours
- **Speed Control**: Adjust animation speed from 0.25x to 2.0x
- **Pause/Resume**: Stop animation to examine specific times
- **Reset Function**: Return to default view (Sunday 12:00)

## Architecture

### Simulation Engine (`simulation.ts`)

The core algorithm generates density grids based on:

1. **Hotspot Influence**: Each hotspot radiates influence based on a Gaussian falloff function
2. **Time Multipliers**: Activity levels vary by hour (shops peak midday, nightlife peaks evening)
3. **Day Multipliers**: Different patterns for each day of the week
4. **Smooth Interpolation**: Linear interpolation between hourly snapshots with easing

```typescript
// Core API
generateDensityGrid(time: TimeOfWeek, resolution: number): DensityPoint[]
interpolateDensityGrids(grid1: DensityPoint[], grid2: DensityPoint[], t: number): DensityPoint[]
```

### Color Mapping (`colorScale.ts`)

Density values (0-100) map to a vibrant gradient for intuitive visualization:

- **0-25**: Blue → Cyan (low activity)
- **25-50**: Cyan → Green (moderate activity)
- **50-65**: Green → Amber (high activity)
- **65-100**: Amber → Red (very high activity)

### UI (`app.ts`)

Pseudo-declarative Tsyne builder pattern with:
- TappableCanvasRaster for efficient pixel-based rendering
- Real-time density heatmap visualization
- Interactive time/day selection
- Animation loop with configurable speed

## Running the Application

### Development

```bash
cd larger-apps/realtime-paris-density-simulation
npm install
npm run test      # Run all tests
npm run test:gui  # Run GUI tests with visual output (TSYNE_HEADED=1 for display)
```

### Standalone

```bash
npx tsx larger-apps/realtime-paris-density-simulation/app.ts
```

## Testing

### Unit Tests (Jest)

Tests for simulation logic:
```bash
npm run test:unit
```

Coverage includes:
- Density grid generation
- Hour/day variations
- Interpolation accuracy
- Edge cases (midnight, week boundaries)

### GUI Tests (TsyneTest)

Interactive tests with the native UI:
```bash
npm run test:gui
```

Features:
- Element existence and visibility
- Time navigation (forward/backward)
- Day wrapping (Sunday → Monday)
- Control button responses
- Canvas rendering verification

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 7/10 | Rich `vbox > hbox(controls) + canvasRaster(map)` nesting with 13 layout containers |
| **Core declarative** | Fluent method chaining | 6/10 | `.withId()` on 14 elements: simulation controls, stat labels, mode toggles. No `.when()` or `.bindTo()` |
| **Core declarative** | Programmatic generation | 3/10 | Minimal loop-based widget generation. Map rendered via GPU shader |
| **State architecture** | Observable store | 3/10 | No Observable store. Simulation state managed directly in class |
| **Declarative updates** | `.when()` + `.bindTo()` | 1/10 | No reactive bindings. 13 `setText()` calls for simulation stats |
| **Anti-declarative** | No `removeAll()`/`setContent()` | -1 | 1 `setContent()` call |
| **Testing** | `.withId()` coverage | 6/10 | Good coverage on simulation controls and stat displays |
| **Design** | Separation of concerns | 6/10 | GPU shader computation separated from UI controls. Heavy use of imperative `setText()` for real-time stats |
| | **Overall** | **4/10** | Rich control panel with good `.withId()` coverage wrapping a GPU shader simulation. No Observable store or reactive bindings — 13 `setText()` calls drive all updates |

## License

**CC0-1.0 (Public Domain)**

Portions copyright Yvann Barbot and portions copyright Paul Hammant 2025

This software is released to the public domain. No copyright, no attribution, no restrictions.

See [LICENSE.md](LICENSE.md) for details.

## Original Project

Based on https://github.com/yvann-ba/realtime-paris-density-simulation

Original implementation features:
- WebGL rendering via Deck.gl and Mapbox GL
- Node.js backend for probability calculations
- H3 hexagonal grid aggregation
- 3D visualization with GPU acceleration

This Tsyne port adapts the simulation engine to native desktop rendering while maintaining the core algorithms and temporal modeling.

## Architecture Differences from Original

| Aspect | Original | Tsyne Port |
|--------|----------|-----------|
| Rendering | WebGL (Deck.gl) | Native Fyne Canvas |
| Backend | Node.js Express server | Integrated TypeScript |
| Visualization | 3D hexagon layers | 2D heatmap with smooth gradients |
| Platform | Web browser | Native desktop (multi-platform) |
| Performance | GPU-accelerated | CPU-optimized canvas rendering |

## Future Enhancements

Possible extensions:
- Real-time data integration with actual foot traffic sensors
- Custom hotspot editor
- Export density data as GeoJSON
- Overlay with map tiles
- Mobile phone app version
- Multi-city simulations

## Contributing

This is a public domain project. All improvements, modifications, and derivatives are welcome and require no attribution.

---

**Screenshot** (Generated via TsyneTest):

[Screenshot placeholder - captured via automated testing]
