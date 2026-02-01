# JS/TS Ecosystem Patterns vs Tsyne Design Choices

A comparative analysis of JavaScript/TypeScript patterns and how Tsyne's design relates to them. Updated to reflect actual implementation decisions.

---

## 1. Reactivity Models

### The Landscape

| Library | Pattern | Mechanism |
|---------|---------|-----------|
| Svelte | `$: doubled = count * 2` | Compiler rewrites assignments |
| Vue 3 | `ref()`, `computed()`, `watch()` | Proxy-based tracking |
| Solid.js | `createSignal()`, `createEffect()` | Fine-grained, no VDOM |
| MobX | `observable`, `autorun` | Transparent reactive proxies |
| RxJS | `Observable.pipe(map, filter)` | Stream composition |

### What Tsyne Chose

**Explicit binding functions** with manual refresh:

```typescript
c.circle(0, 0, 10)
  .bindPosition(() => ({ x: state.x, y: state.y }))
  .bindAlpha(() => state.opacity);

// App controls when to update
setInterval(() => refreshAllCosyneContexts(), 16);
```

### Trade-offs

| Tsyne Approach | Pros | Cons |
|----------------|------|------|
| Explicit `bind*()` | No magic, predictable, debuggable | More verbose |
| Manual refresh | Full control over timing, batching | Must remember to call |
| No dependency tracking | Simple mental model | Can't auto-optimize |

### Future Consideration

**Solid.js-style fine-grained reactivity** could eliminate manual refresh:
```typescript
// Hypothetical auto-reactive Cosyne
const [x, setX] = createSignal(0);
c.circle(x, 100, 10);  // Auto-updates when x changes
```

Worth exploring if manual refresh becomes a pain point.

---

## 2. Animation

### The Landscape

| Library | Pattern | Strength |
|---------|---------|----------|
| Framer Motion | `animate={{ x: 100 }}` | Declarative, physics-based |
| GSAP | `gsap.to('.box', { x: 100, duration: 1 })` | Timeline sequencing, scrubbing |
| Anime.js | `anime({ targets, translateX: 250 })` | Simple, lightweight |
| Motion One | `animate(el, { x: 100 })` | Web Animations API native |
| Lottie | JSON animation files | Designer-friendly, After Effects |

### What Cosyne Chose

**Easing functions + animation manager**:

```typescript
// cosyne/src/easing.ts - standard easing functions
easeInOut, easeInQuad, easeOutBounce, elastic, etc.

// cosyne/src/animation.ts - animation primitives
// cosyne/src/animation-manager.ts - orchestration
```

### Trade-offs

| Cosyne Approach | Pros | Cons |
|-----------------|------|------|
| Easing library | Covers common cases | No timeline/sequencing |
| App-controlled loops | Flexible | DIY choreography |

### Future Consideration

**GSAP-style timeline API** for complex sequences:
```typescript
// Hypothetical
cosyne.timeline()
  .to(ball, { x: 100 }, 0)
  .to(ball, { y: 200 }, 0.5)
  .to(ball, { scale: 2 }, 1)
  .play();
```

Also: **Spring physics** (Framer Motion style) for natural feel:
```typescript
c.circle(0, 0, 10).spring({ x: targetX, stiffness: 100, damping: 10 });
```

---

## 3. Data Visualization

### The Landscape

| Library | Pattern | Philosophy |
|---------|---------|------------|
| D3.js | `select().data().enter().append()` | Low-level, maximum control |
| Vega-Lite | JSON grammar spec | Declarative, auto-scales |
| Observable Plot | `Plot.dot(data, {x, y})` | Concise, sensible defaults |
| Chart.js | `new Chart(ctx, config)` | Simple config objects |
| ECharts | Option-based | Rich built-in chart types |

### What Cosyne Chose

**D3-influenced primitives** with Tsyne integration:

```typescript
// scales.ts - D3-style scale functions
const xScale = linearScale([0, 100], [0, width]);

// axes.ts - axis rendering
c.axis('bottom', xScale);

// Collection binding (D3 enter/update/exit pattern)
c.circles().bindTo({
  items: () => data,
  render: (d) => c.circle(xScale(d.x), yScale(d.y), 5),
  trackBy: (d) => d.id
});
```

### Trade-offs

| Cosyne Approach | Pros | Cons |
|-----------------|------|------|
| Build from primitives | Full control, no abstraction leak | More code for standard charts |
| D3-style scales | Proven, flexible | Learning curve |
| No chart "types" | Composable | Must build bar/line/pie yourself |

### Future Consideration

**Higher-level chart components** (Observable Plot style):
```typescript
// Hypothetical convenience layer
cosyne.barChart(data, { x: 'category', y: 'value', color: 'group' });
cosyne.lineChart(timeSeries, { x: 'date', y: 'price' });
```

Keep primitives underneath for customization.

---

## 4. 3D Graphics

### The Landscape

| Library | Pattern | Focus |
|---------|---------|-------|
| Three.js | Scene graph, `Mesh`, `Geometry`, `Material` | Full 3D engine |
| Babylon.js | Similar to Three, more game-oriented | Physics, XR |
| React Three Fiber | `<mesh><boxGeometry/></mesh>` | React + Three.js |
| Zdog | Pseudo-3D, SVG-like | Flat illustration style |
| Spline | Visual editor, code export | Designer workflow |

### What Cosyne Chose

**Custom lightweight 3D** with multiple renderers:

```typescript
cosyne3d(a, (c3d) => {
  c3d.camera({ position: [0, 0, 5] });
  c3d.ambientLight(0.3);
  c3d.directionalLight([1, 1, 1], 0.7);
  c3d.sphere3d(0, 0, 0, 1).material('phong', { color: 'red' });
});
```

### Trade-offs

| Cosyne3D Approach | Pros | Cons |
|-------------------|------|------|
| Custom renderer | No 50MB dependency, Tsyne-native | Less features than Three.js |
| Canvas + buffer backends | Works everywhere Tsyne works | No WebGL acceleration |
| Simple primitive set | Easy to learn | Limited mesh complexity |

### Future Consideration

**Optional Three.js integration** for complex scenes:
```typescript
// Hypothetical bridge
cosyne3d.useThreeRenderer(canvas);
// or
cosyne3d.importGLTF('model.gltf');
```

Keep lightweight default, opt-in to heavyweight when needed.

---

## 5. State Management

### The Landscape

| Library | Pattern | Philosophy |
|---------|---------|------------|
| Redux | `dispatch(action)` → reducer → new state | Immutable, time-travel debug |
| MobX | `@observable` class properties | Mutable, automatic tracking |
| Zustand | `create((set) => ({ count: 0 }))` | Minimal, hooks-based |
| XState | Finite state machines | Explicit states/transitions |
| Jotai/Recoil | Atomic state primitives | Bottom-up composition |

### What Tsyne Chose

**Plain classes and closures**:

```typescript
class SpinnerState {
  baseTime: number = Date.now();
  getRotation(): number {
    return (Date.now() - this.baseTime) / 1000 * Math.PI * 2;
  }
}

// Used directly in bindings
c.wedge(150, 150, 60).bindAlpha(() => state.getSegmentAlpha(i));
```

### Trade-offs

| Tsyne Approach | Pros | Cons |
|----------------|------|------|
| Plain classes | No library, familiar JS | No dev tools, time-travel |
| Closures | Simple, zero overhead | Can get messy in large apps |
| No prescription | Flexibility | Inconsistent patterns |

### Future Consideration

**XState for complex UIs** (wizards, games, multi-step flows):
```typescript
// Hypothetical integration
const machine = createMachine({
  initial: 'idle',
  states: {
    idle: { on: { START: 'playing' } },
    playing: { on: { PAUSE: 'paused', END: 'gameOver' } },
    // ...
  }
});

tsyne.useMachine(machine);  // Bind UI to state machine
```

---

## 6. Component Architecture

### The Landscape

| Framework | Pattern | Key Idea |
|-----------|---------|----------|
| React | `function Component({ props })` | Pure functions + hooks |
| Vue SFC | `<template>`, `<script>`, `<style>` | Single-file encapsulation |
| Svelte | Compiled components | Less runtime, more compile |
| Lit | `class extends LitElement` | Web Components native |
| Solid | JSX but fine-grained | React-like DX, better perf |

### What Tsyne Chose

**Builder pattern with callbacks**:

```typescript
a.vbox(() => {
  a.label('Title');
  a.hbox(() => {
    a.button('OK').onTap(handleOk);
    a.button('Cancel').onTap(handleCancel);
  });
});
```

### Trade-offs

| Tsyne Approach | Pros | Cons |
|----------------|------|------|
| Builder callbacks | Natural nesting, no JSX | Not portable to web |
| No component model | Simple, direct | Reuse via functions only |
| Immediate mode | Easy to understand | Less optimization opportunity |

### Future Consideration

**Reusable component functions** could be formalized:
```typescript
// Pattern already works, could document better
function SearchBox(a: App, onSearch: (q: string) => void) {
  let query = '';
  a.hbox(() => {
    a.entry('Search...').onChange(v => query = v);
    a.button('Go').onTap(() => onSearch(query));
  });
}

// Usage
SearchBox(a, handleSearch);
```

---

## 7. Testing

### The Landscape

| Library | Pattern | Focus |
|---------|---------|-------|
| Playwright | `page.locator().click()` | Browser automation |
| Cypress | `cy.get().click()` | E2E with time-travel |
| Testing Library | `getByRole('button')` | Accessibility-first queries |
| Storybook | Component isolation | Visual testing, docs |
| Vitest | `expect().toBe()` | Fast unit tests |

### What Tsyne Chose

**TsyneTest with locators**:

```typescript
const ctx = test.getContext();
await ctx.getById('submit-btn').click();
await ctx.getById('result').shouldHaveText('Success');

// Cosyne-specific
await ctx.cosyne().circle('ball').shouldHavePosition(100, 100);
```

### Trade-offs

| TsyneTest Approach | Pros | Cons |
|--------------------|------|------|
| Custom test framework | Tailored to Tsyne/Cosyne | Not industry standard |
| Locator pattern | Familiar from Playwright | Different API to learn |
| Bridge-based | Tests real rendering | Requires running bridge |

### Future Consideration

**Visual regression testing** (Storybook/Chromatic style):
```typescript
// Hypothetical
await ctx.screenshot('login-form').shouldMatchBaseline();
```

---

## 8. Styling

### The Landscape

| Approach | Example | Philosophy |
|----------|---------|------------|
| Tailwind | `class="flex p-4 bg-blue-500"` | Utility-first atomic CSS |
| CSS-in-JS | `styled.div\`color: red\`` | Scoped, dynamic |
| CSS Modules | `styles.button` | Scoped class names |
| Vanilla Extract | Type-safe CSS in TS | Zero runtime |

### What Tsyne Chose

**Inline properties on widgets**:

```typescript
a.label('Hello')
  .fontSize(16)
  .textColor('#333')
  .padding(8);
```

### Trade-offs

| Tsyne Approach | Pros | Cons |
|----------------|------|------|
| Method chaining | Type-safe, discoverable | Verbose for many props |
| No CSS | Works on native targets | No ecosystem themes |
| Per-widget | Explicit | No global theming |

### Future Consideration

**Theme/design token system**:
```typescript
// Hypothetical
const theme = createTheme({
  colors: { primary: '#007bff', danger: '#dc3545' },
  spacing: { sm: 4, md: 8, lg: 16 },
  fonts: { body: 'Inter', heading: 'Poppins' }
});

a.button('Save').variant('primary');  // Uses theme
```

---

## Summary: Design Philosophy

Tsyne/Cosyne consistently chose:

1. **Explicit over magic** - No compiler transforms, clear data flow
2. **Lightweight over feature-complete** - Build what you need
3. **Control over convenience** - Apps own timing, state, structure
4. **Native over web** - Fyne backend, not browser-dependent

This makes Tsyne good for:
- Desktop/mobile apps via Fyne
- Apps where you want full control
- Learning (transparent, debuggable)

Less ideal for:
- Complex web apps (use React/Vue)
- Apps needing huge ecosystem (use web stack)
- Rapid prototyping with many pre-built components

---

## Worth Exploring

Ranked by potential value:

1. **Spring physics animation** - Natural feel, low effort
2. **XState integration** - Complex UI state made manageable
3. **Theme/design tokens** - Consistent styling at scale
4. **Higher-level chart API** - Common cases without boilerplate
5. **Visual regression testing** - Catch UI bugs automatically
6. **Fine-grained reactivity** - Eliminate manual refresh (big change)
