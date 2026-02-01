# Pseudo-Declarative UI Composition in Tsyne

Tsyne's pseudo-declarative style combines declarative UI readability with TypeScript's full programming power. A fluent builder API nests UI components within anonymous functions, creating code that visually mirrors the application's layout.

## Table of Contents

1. [Core Concepts: The Builder Pattern](#core-concepts-the-builder-pattern)
2. [Fluent Method Chaining](#fluent-method-chaining)
3. [State Management Patterns](#state-management-and-ui-generation-patterns)
4. [Reactive and Imperative Updates](#reactive-and-imperative-ui-updates)
5. [Animation and Canvas Patterns](#animation-and-canvas-patterns) — NEW
6. [GPU-Accelerated Rendering (CanvasShader)](#gpu-accelerated-rendering-canvasshader) — NEW
7. [Lessons from Ported Apps](#lessons-from-ported-apps-7-complete-applications)
8. [Best Practices](#best-practices)
9. [Pattern Quick Reference](#pattern-quick-reference)
10. [Related Resources](#related-resources)

## Example Applications

This document draws lessons from key examples and real-world applications:
- **`calculator.ts`**: Simple layout with direct event handling
- **`todomvc.ts`**: State management with reactive data binding
- **`05-live-clock.ts`**: Imperative updates for continuously changing data
- **`phone-apps/keyboard/`**: Programmatic UI generation avoiding static config files
- **`ported-apps/ebooks/`**: Production app (730 lines, 61 tests) using Observable pattern
- **`cosyne/demos/`**: 17 educational demos showing all patterns in action

## Core Concepts: The Builder Pattern

The foundation of Tsyne's UI composition is the builder pattern. You start with a top-level `app` function and nest layout widgets like `window`, `vbox` (vertical box), and `hbox` (horizontal box) inside it. Each layout widget accepts an anonymous function that defines its children.

This creates a clean, indented structure that's easy to read and understand.

### Example: `calculator.ts`

The calculator example provides a clear demonstration of this foundational structure. The entire UI is defined within nested blocks.

```typescript
// from examples/calculator.ts

a.window({ title: "Calculator" }, (win: Window) => {
  win.setContent(() => {
    a.vbox(() => {
      // Display label
      display = a.label(currentValue).withId('calc-display');

      // 4x4 grid for buttons
      a.grid(4, () => {
        // Button creation
        a.button("7").onClick(() => handleNumber("7"));
        a.button("8").onClick(() => handleNumber("8"));
        // ... more buttons
      });
    });
  });
});
```

Key takeaways:
- **Hierarchy in Code**: The `vbox` is visually "inside" the `window`, and the `grid` is inside the `vbox`, just like in the final UI.
- **Implicit Context**: Children automatically attach to their parent container. The builder (`a`) tracks the current context and automatically adds newly created widgets—no manual parenting needed.
- **Readability**: The structure is immediately scannable. You see the layout (a vertical box with a label and a grid) without parsing complex object literals or XML.

## Fluent Method Chaining

Widgets created by the builder (`a.button`, `a.label`, etc.) return an instance of the widget, allowing you to chain configuration methods fluently. This is the primary way to attach event handlers, set properties, and control visibility.

### Key Methods:
- **`.onClick(handler)`**: Attaches a click event handler.
- **`.withId(id)`**: Assigns a stable ID for testing, making tests more robust.
- **`.when(condition)`**: Declaratively controls the widget's visibility based on a boolean condition.

### Example: Combining Layout and Logic in `calculator.ts`

The calculator's buttons are created and configured in a single, expressive line.

```typescript
// from examples/calculator.ts

// A button is created, an event handler is attached, and it's added to the parent grid.
a.button("=").onClick(() => calculate());
```

This is highly readable and keeps the logic for a widget co-located with its definition.

### Example: Declarative Visibility in `todomvc.ts`

The TodoMVC example declaratively controls todo visibility with `.when()` based on the current filter (All, Active, Completed). The framework automatically re-evaluates this condition when the data changes.

```typescript
// from examples/todomvc.ts

// The hbox containing the todo item is visible when `shouldShowTodo` returns true.
const todoHBox = a.hbox(() => {
  // ... checkbox, buttons, etc.
}).when(shouldShowTodo);
```

This fluent API eliminates messy `if/else` blocks for managing UI state, resulting in cleaner, more maintainable view code.

## State Management and UI Generation Patterns

A key principle: UI and state are separate. UI is declared once; state changes trigger reactive updates.

### Pattern 1: Self-Contained State (`calculator.ts`)

For simpler components, the state can be managed directly within the builder function.

- **State variables**: `currentValue`, `operator`, `previousValue` are defined as local variables.
- **Event handlers**: Functions like `handleNumber`, `handleOperator`, and `calculate` are defined to manipulate this state.
- **UI Updates**: These handlers directly call methods on widget instances (e.g., `display.setText(value)`) to update the view.

```typescript
// from examples/calculator.ts

// Instance-local state
let display: Label | undefined;
let currentValue = "0";
// ...

function updateDisplay(value: string) {
  // ...
  if (display) {
    // Imperative update
    display.setText(value);
  }
}
```

This pattern is simple and effective for components that don't need to share state with other parts of the application.

### Pattern 2: External Observable Store (`todomvc.ts`)

For more complex applications, state should be managed in a dedicated store that the UI can observe. The TodoMVC example implements a `TodoStore` class.

- **Centralized State**: The `TodoStore` holds the list of todos, the current filter, and all business logic.
- **Observable Pattern**: The store allows the UI to `subscribe` to changes, which triggers listeners that update the view.
- **One-Way Data Flow**: UI event handlers only call methods on the store. They do not update the UI directly.

```typescript
// from examples/todomvc.ts

// Event handler only modifies the model
a.button('Add').onClick(async () => {
  // ...
  await store.addTodo(text); // No direct UI manipulation here
});

// The store subscription handles all UI updates
store.subscribe(async () => {
  boundList.update();
  // ...
});
```

This creates a predictable, one-way data flow that is easier to debug and scales well to larger applications.

### Pattern 3: Programmatic UI Generation (`phone-apps/keyboard/`)

Complex, repetitive UIs are generated programmatically, not defined in static config files. Use loops, functions, and TypeScript logic—the on-screen keyboard exemplifies this approach.

#### Dynamic Layout from Data

The keyboard layout in `phone-apps/keyboard/en-us/keyboard.ts` is not defined in a static file. Instead, each row of keys is generated by looping over a simple string of characters. This makes the layout concise, easy to modify, and type-safe.

```typescript
// from phone-apps/keyboard/en-us/keyboard.ts

// ROW 1: Q W E R T Y U I O P
a.hbox(() => {
  for (const c of ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']) {
    a.button(c).onClick((b) => k.key(c, b)).when(isLower);
    a.button(c.toUpperCase()).onClick((b) => k.key(c, b)).when(isUpper);
  }
});
```

This approach is powerful:
- **Maintainable**: To change the layout, you just edit a string, not a large block of boilerplate.
- **Data-Driven**: The layout could easily be loaded from a JSON file or an API response at runtime.
- **DRY (Don't Repeat Yourself)**: The logic for creating a button is written once and reused for every key in the row.

#### Declarative Layer Switching with `.when()`

The keyboard has multiple layers (standard, symbols, function keys). Instead of manually hiding and showing hundreds of individual buttons, each layer is wrapped in a container widget whose visibility is controlled by a single `.when()` condition.

```typescript
// from phone-apps/keyboard/en-us/keyboard.ts

const isAbc = () => k.mode === 'abc';
const isSymbols = () => k.mode === 'symbols';

// The entire container for the "abc" (QWERTY) layout
a.vbox(() => {
  // ... all the hbox rows for QWERTY keys ...
}).when(isAbc);

// The entire container for the "symbols" layout
a.vbox(() => {
  // ... all the hbox rows for symbol keys ...
}).when(isSymbols);
```

When the controller's mode changes (e.g., `k.cycleMode()`), the framework automatically re-evaluates the `.when()` conditions. It hides the entire `vbox` for the old layer and shows the `vbox` for the new one. This is an extremely efficient and declarative way to manage complex UI states.

## Animation and Canvas Patterns

For time-based or frame-based updates, Tsyne supports animation loops that continuously redraw the UI.

### Pattern 4: Animation Loop (Canvas and Cosyne)

Animation is driven by a timer loop that increments state and triggers redraws via `refreshAllCosyneContexts()`:

```typescript
// from cosyne/demos/cosyne-animated-shapes.ts

let time = 0;
let animationSpeed = 1.0;

a.canvasStack(() => {
  cosyne(a, (c: CosyneContext) => {
    // Drawing logic uses `time` to compute positions/angles
    const angle = (time * 0.02) * animationSpeed;
    const radius = 80 + Math.sin(time * 0.03) * 20;
    // ... draw shapes based on time ...
  });
});

// Timer-driven animation
const animate = async () => {
  while (true) {
    time++;  // Increment animation state
    refreshAllCosyneContexts();  // Trigger redraw
    await new Promise(r => setTimeout(r, 16));  // ~60 FPS
  }
};
setTimeout(animate, 100);  // Start after UI is ready
```

**Key Points:**
- Time variable lives in outer scope (external to Cosyne)
- `refreshAllCosyneContexts()` triggers all Cosyne canvases to redraw
- Each redraw recalculates positions/angles based on current time
- 16ms interval ≈ 60 FPS; adjust for desired frame rate
- Animation logic is decoupled from UI definition

**Examples:** Rotating shapes, particle systems, procedural patterns, live clocks

### Pattern 5: Reactive Canvas Updates with `.bindTo()`

For dynamic list animations, combine `.bindTo()` with time-based rendering:

```typescript
// Animated list that updates as data changes and time advances
const animate = async () => {
  while (true) {
    time++;
    await boundList.update();  // Re-renders with current time
    refreshAllCosyneContexts();
    await new Promise(r => setTimeout(r, 16));
  }
};
```

This pattern keeps data binding and animation separate—list updates trigger redraws, which incorporate time-based state.

---

## GPU-Accelerated Rendering (CanvasShader)

For computationally intensive visuals, CanvasShader offloads work to the GPU via GLSL fragment shaders.

### Overview: What is CanvasShader?

`CanvasShader` is a canvas primitive that executes a custom GLSL fragment shader on the GPU. It enables real-time rendering of fractals, procedural generation, raymarching, and other GPU-friendly effects at 60+ FPS.

**Key Concepts:**
- **Fragment Shader**: GLSL code that computes pixel color based on position
- **Uniforms**: Shader parameters (floats, vectors) updated from TypeScript
- **u_time**: Built-in uniform (seconds since start) for animation
- **u_resolution**: Canvas size in pixels for coordinate calculation
- **Viewport**: Each shader has its own viewport for positioned rendering

### Basic CanvasShader Usage

```typescript
// from cosyne/demos/shader-perlin-noise.ts

const noiseShader = `
#version 110  // Desktop OpenGL, no precision qualifiers

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_noiseType;

float noise(vec3 p) {
  // ... Perlin noise implementation ...
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float n = noise(vec3(uv, u_time));
  gl_FragColor = vec4(vec3(n), 1.0);
}
`;

let shader: CanvasShader | null = null;

a.canvasStack(() => {
  shader = a.canvasShader(WIDTH, HEIGHT, noiseShader, {
    uniforms: {
      u_noiseType: 1,
    }
  });
});

// Update uniform reactively
await shader.setUniform('u_noiseType', 2);

// Or update multiple uniforms at once
await shader.setUniforms({
  u_noiseType: 2,
  u_offset: [50, 100],
});

// Change shader source dynamically
await shader.setSource(differentShader);
```

### CanvasShader Patterns

#### Pattern A: Procedural Generation (Fractals, Noise)

GPU-accelerated computation of mathematical patterns:

```typescript
// Mandelbrot fractal
const mandelbrotShader = `
#version 110
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform float u_maxIter;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 c = (uv - 0.5) * 3.0 / u_zoom + u_center;

  vec2 z = vec2(0.0);
  float iter = 0.0;

  for (int i = 0; i < 256; i++) {
    if (float(i) >= u_maxIter) break;
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    if (length(z) > 2.0) break;
    iter += 1.0;
  }

  float t = iter / u_maxIter;
  gl_FragColor = vec4(vec3(t), 1.0);
}
`;
```

#### Pattern B: Raymarching (3D Rendering)

Render 3D scenes using signed distance functions:

```typescript
// Simple sphere via raymarching
const raymarchShader = `
#version 110
uniform vec2 u_resolution;

float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 ro = vec3(0.0, 0.0, 3.0);  // Camera position
  vec3 rd = normalize(vec3(uv, -1.5));  // Ray direction

  vec3 col = vec3(0.1);
  float t = 0.0;

  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * t;
    float d = sdSphere(p, 1.0);
    if (d < 0.001) {
      col = vec3(0.8, 0.2, 0.2);  // Hit!
      break;
    }
    t += d;
    if (t > 10.0) break;
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
```

#### Pattern C: Animated Shader Effects

Use `u_time` for animation:

```typescript
// Animated plasma
const plasmaShader = `
#version 110
uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  float v = sin(uv.x * 10.0 + u_time);
  v += sin(uv.y * 10.0 + u_time);
  v += sin(length(uv) * 10.0 - u_time * 2.0);

  vec3 col = vec3(
    sin(v + 0.0) * 0.5 + 0.5,
    sin(v + 2.094) * 0.5 + 0.5,
    sin(v + 4.188) * 0.5 + 0.5
  );

  gl_FragColor = vec4(col, 1.0);
}
`;

// Shader animates automatically via u_time
shader = a.canvasShader(WIDTH, HEIGHT, plasmaShader, {});
```

#### Pattern D: Reactive Uniforms

Change shader parameters in response to UI events:

```typescript
let shader: CanvasShader | null = null;
let noiseType = 0;

a.hbox(() => {
  a.button('Simple').onClick(() => {
    noiseType = 0;
    shader?.setUniform('u_noiseType', noiseType);
  });
  a.button('FBM').onClick(() => {
    noiseType = 1;
    shader?.setUniform('u_noiseType', noiseType);
  });
});

a.canvasStack(() => {
  shader = a.canvasShader(WIDTH, HEIGHT, noiseShader, {
    uniforms: { u_noiseType: noiseType }
  });
});
```

### CanvasShader API Reference

| Method | Parameters | Purpose |
|--------|-----------|---------|
| `canvasShader(w, h, source, opts)` | width, height, GLSL source, options | Create shader canvas |
| `setUniform(name, value)` | uniform name, value | Update single uniform |
| `setUniforms(dict)` | object with name: value pairs | Update multiple uniforms |
| `setSource(source)` | GLSL source code | Change shader dynamically |
| `withId(id)` | string ID | Assign stable ID for testing |

**Supported Uniform Types:**
- `float`: `setUniform('u_scale', 2.5)`
- `vec2`: `setUniform('u_pos', [10, 20])`
- `vec3`: `setUniform('u_color', [1, 0, 0])`
- `vec4`: `setUniform('u_color', [1, 0, 0, 0.5])`

**GLSL Requirements:**
- `#version 110` (desktop OpenGL 1.10)
- NO `precision` qualifiers (those are OpenGL ES only)
- NO `uniform int` (causes silent failures—use `uniform float` instead)

### Performance Considerations

- **GPU-based**: 100-1000x faster than CPU for complex computations
- **60+ FPS**: Achievable on modern hardware with reasonable shader complexity
- **Compile time**: First render includes shader compilation (~10ms)
- **Memory**: Minimal; no vertex buffers needed for most effects
- **Compatibility**: Requires desktop OpenGL (not WebGL/ES)

### CanvasShader Debugging Tips

```typescript
// Check shader compilation errors
// (printed to console during first render)

// Test with simple shader first
const testShader = `
#version 110
uniform vec2 u_resolution;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  gl_FragColor = vec4(uv, 0.0, 1.0);  // Gradient
}
`;

// Gradually add complexity to identify issues

// Common mistakes:
// ❌ #version 100 (WebGL syntax)
// ❌ precision highp float; (OpenGL ES syntax)
// ❌ uniform int (silent failure)
// ✅ #version 110
// ✅ uniform float u_palette; (use float for integers)
```

---

## Reactive and Imperative UI Updates

Tsyne supports both fully reactive and direct imperative approaches to updating the UI after the initial render.

### Reactive Updates with `.bindTo()`

The most powerful pattern for dynamic lists is using `.bindTo()` on a container. This method links the container's content to a data source.

In `todomvc.ts`, a `vbox` is bound to the list of todos from the store.

```typescript
// from examples/todomvc.ts

boundList = a.vbox(() => {}).bindTo({
  items: () => store.getAllTodos(),
  render: (todo: TodoItem) => {
    // ... logic to create the hbox for a single todo item ...
  },
  trackBy: (todo: TodoItem) => todo.id
});
```

When `boundList.update()` is called, Tsyne intelligently re-renders the list, only updating what has changed. This is the most efficient way to manage collections.

### Imperative Updates for Simple Cases

Sometimes, a full reactive binding is overkill. The `05-live-clock.ts` example updates the time every 500 milliseconds by holding a reference to the label and calling `.setText()` directly.

```typescript
// from examples/05-live-clock.ts

let timeLabel: any;

win.setContent(() => {
  a.vbox(() => {
    timeLabel = a.label(new Date().toString());
  });
});

setInterval(async () => {
  await timeLabel.setText(new Date().toString());
}, 500);
```

This approach is perfectly suitable for cases like the clock, where the change is isolated and simple.

### More Sophisticated Imperative Updates with Custom Bindings

For animating canvas primitives, see `phone-apps/clock/clock.ts:98-114` which creates a custom `bindLine()` method. This combines declarative binding setup (specifying a rotation function) with imperative updates (calling `line.update()` in a timer loop). Useful when canvas primitives need computed transforms.

### Property Binding Methods

Beyond `.bindTo()` for lists, Tsyne provides property-specific bindings:

**`.bindText()` - Dynamic Text:**
```typescript
// Status display that auto-updates
a.label('').bindText(() => `${store.getActiveCount()} items left`);

// Computed values
a.label('').bindText(() => {
  const total = store.getTotal();
  const done = store.getCompletedCount();
  return `${done}/${total} complete (${Math.round(done/total*100)}%)`;
});
```

**`.bindFillColor()` / `.bindColor()` - Visual State:**
```typescript
// Background color based on state
a.rectangle('#DC143C').bindFillColor(() =>
  store.isChecked(index) ? 'transparent' : '#DC143C'
);

// Text color based on state
a.canvasText(item.text).bindColor(() =>
  store.isChecked(index) ? '#888888' : '#000000'
);
```

**`.bindVisible()` - Programmatic Visibility:**
```typescript
a.vbox(() => {
  a.label('Loading...');
  a.progressBar();
}).bindVisible(() => store.isLoading());
```

**Chaining Multiple Bindings:**
```typescript
a.label('Error')
  .bindText(() => store.getErrorMessage())
  .when(() => store.hasError());
```

**Global Binding Refresh:**
```typescript
import { refreshAllBindings } from 'tsyne';

// Re-evaluate all registered bindings across the app
await refreshAllBindings();
```

### MVC vs MVVM in Render Functions

When using `.bindTo()`, you can choose between two patterns:

**MVVM Pattern (Widget References)** - render returns widget refs for manual updates:
```typescript
render: (item, index, existing) => {
  if (existing) {
    existing.bg.update({ fillColor: getColor(index) });
    existing.text.update({ text: item.name });
    return existing;
  }
  const bg = a.rectangle(getColor(index));
  const text = a.canvasText(item.name);
  return { bg, text };
}
```

**MVC Pattern (Declarative Bindings)** - render returns void, uses property bindings:
```typescript
render: (item, index) => {
  a.rectangle('transparent').bindFillColor(() => getColor(index));
  a.canvasText(item.name).bindColor(() => getTextColor(index));
}
```

**MVC is preferred** because:
- Simpler render functions
- No manual update logic
- Framework handles widget lifecycle
- Easier to reason about

## Lessons from Ported Apps (7 Complete Real-World Applications)

Seven complete mobile/web applications have been successfully ported to Tsyne, demonstrating the effectiveness of the pseudo-declarative pattern at scale:

### Tab-Based Navigation

Using `.when()` for declarative visibility across all 7 apps:

```typescript
let selectedTab = 'library';

a.vbox(() => { /* Library content */ })
  .when(() => selectedTab === 'library');

a.vbox(() => { /* Reading content */ })
  .when(() => selectedTab === 'reading');

a.button('📚 Library').onClick(async () => {
  selectedTab = 'library';
  await viewStack.refresh();  // Re-evaluate all .when()
});

store.subscribe(async () => {
  await updateLabels();
  await viewStack.refresh();  // Refresh on data changes
});
```

### Observable Store Pattern

All 7 apps use the same observable pattern for reactive updates:

```typescript
class AppStore {
  private changeListeners: ChangeListener[] = [];

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => this.changeListeners = this.changeListeners.filter(l => l !== listener);
  }

  private notifyChange() {
    this.changeListeners.forEach(listener => listener());
  }
}

// Subscribe returns unsubscriber for cleanup
const unsubscribe = store.subscribe(async () => {
  await updateUI();
});
```

### Smart List Rendering with `.bindTo()` and `trackBy`

**Efficient List Updates:** All ported apps with collections use `.bindTo()` with `trackBy`:

```typescript
a.vbox(() => {})
  .bindTo({
    items: () => store.getBooks(),
    render: (book: Ebook) => {
      return a.hbox(() => {
        a.label(() => book.title);
        a.button('Favorite', async () => {
          store.toggleFavorite(book.id);
          await updateLabels();
          await viewStack.refresh();
        });
      });
    },
    trackBy: (book: Ebook) => book.id  // Critical for diffing!
  });
```

**Important:** The `trackBy` function identifies items uniquely. Without it, Tsyne can't diff the list efficiently.

### Defensive Copying for State Management

**Critical Pattern:** All 7 apps strictly enforce immutability:

```typescript
// ❌ WRONG - mutates returned array
getBooks(): Ebook[] {
  return this.books;  // Direct reference!
}

// ✅ CORRECT - returns defensive copy
getBooks(): Ebook[] {
  return [...this.books];  // Spread operator
}

// ❌ WRONG - mutates returned object
getPreferences(): Preferences {
  return this.preferences;
}

// ✅ CORRECT - returns copy
getPreferences(): Preferences {
  return { ...this.preferences };  // Shallow copy
}
```

**Why it matters:** Tests verify immutability with `expect(arr1).not.toBe(arr2)`. Mutation breaks Observable pattern and causes state synchronization bugs.

### Counter-Based ID Generation

**Pattern Used in All Ported Apps:**

```typescript
private nextBookId = 13;  // Start after initial data

addBook(data: BookData): Book {
  const id = `book-${String(this.nextBookId++).padStart(3, '0')}`;
  // book-013, book-014, book-015, ...
}
```

**Why not timestamp?** IDs generated from `Date.now()` are identical when called rapidly in tests, causing false collisions.

### Async Label Updates in Observable Callbacks

**Pattern for Reactive Stats:**

```typescript
let userLabel: any;
let statsLabel: any;

store.subscribe(async () => {
  // Async operations are safe in callbacks
  const downloaded = store.getDownloadedCount();
  const favorites = store.getFavoriteCount();

  userLabel?.setText(`👤 User | Downloaded: ${downloaded}`);
  statsLabel?.setText(`Favorites: ${favorites}`);

  // Always refresh after updates
  await viewStack.refresh();
});
```

**Key:** Store subscription handler is async, enabling conditional updates based on store state.

### Multi-Level Forms with `.bindTo()`

**Example from Expense Tracker (61 tests):**

```typescript
// Render categories dynamically
a.vbox(() => {})
  .bindTo({
    items: () => store.getCategories(),
    render: (category: Category) => {
      const expenses = store.getExpensesByCategory(category.id);
      return a.vbox(() => {
        a.label(() => `${category.emoji} ${category.name}`).withBold();

        // Nested list with .bindTo()
        a.vbox(() => {})
          .bindTo({
            items: () => expenses,
            render: (expense: Expense) => {
              return a.label(() => `$${expense.amount} - ${expense.description}`);
            },
            trackBy: (e) => e.id
          });
      });
    },
    trackBy: (cat) => cat.id
  });
```

## Pattern Quick Reference

Choose the right pattern for your use case:

| Pattern | Best For | Complexity | Examples |
|---------|----------|-----------|----------|
| **Self-Contained State** | Simple components | Low | Calculator, timer, form |
| **Observable Store** | Shared state, multiple views | Medium | TodoMVC, ported apps |
| **Programmatic UI** | Repetitive layouts | Medium | Keyboard, galleries |
| **Canvas Animation** | Time-based updates | Medium | Animated shapes, clocks |
| **CanvasShader (GPU)** | Computation-heavy visuals | High | Fractals, raymarching, noise |

---

## Best Practices

### Layout & Composition ✅

- Use `.withId()` on interactive elements for testing
- Nest layout logically: `window` > `vbox` > `hbox` > widgets
- Keep render functions focused; move complex logic to store
- Use loops to generate repetitive UI (keyboard rows, galleries)

### State Management ✅

- Use Observable pattern for reactive updates across all 7 apps
- **Defensive copy**: Return `[...items]` not `items`
- Store is source of truth—never mutate shared state
- Immutability enables proper change detection

### Visibility & Interaction ✅

- Use `.when()` for conditional visibility (not manual show/hide)
- Use `.bindTo()` with `trackBy` for dynamic lists
- Use `.bindText()` for reactive text (not `setText()` calls)
- Use `.onClick()` for event handling (chainable fluent style)

### Performance ✅

- Use `.bindTo()` + `trackBy` for efficient list diffing
- Use `CanvasShader` for expensive GPU computations
- Use `.when()` for conditional rendering (entire subtrees)
- Only refresh affected UI sections, not entire app

### Testing ✅

- Use `.withId()` to make elements queryable
- Return unsubscriber from `store.subscribe()`
- Verify immutability with `expect(arr1).not.toBe(arr2)`
- Use counter-based IDs (`book-001`) not timestamps

### Common Mistakes ❌

- ❌ Mutating shared state directly
- ❌ Calling `setText()` instead of using `.bindText()`
- ❌ Forgetting `trackBy` on dynamic lists
- ❌ Using timestamps for generated IDs (causes collisions)
- ❌ Updating UI directly in event handlers (use store instead)
- ❌ Mixing MVVM and MVC patterns in the same render function

## Conclusion

Tsyne's pseudo-declarative style combines declarative UI readability with TypeScript's full power. By using the builder pattern for layout and fluent chaining for configuration, you create readable, maintainable code. The framework supports multiple patterns—from simple self-contained state to observable stores, programmatic UI generation, canvas animation, and GPU-accelerated rendering. Both reactive data binding and imperative updates are supported, giving you flexibility for any scenario.

The 7 ported apps (500-730 lines each, 40-61 tests) demonstrate these patterns scale effectively while maintaining code clarity and testability.

---

## Related Resources

### Documentation
- **[Cosyne Demos Catalog](../cosyne/DEMOS_CATALOG.md)** - 17 educational demos showing all patterns in action
- **[OpenGL Integration Plan](../cosyne/OPENGL_INTEGRATION_PLAN.md)** - GPU rendering and shader patterns
- **[Shader Fixes Guide](../cosyne/SHADER_FIXES.md)** - GLSL compatibility and optimization

### Example Applications
- **[Ebook Reader](../ported-apps/ebooks/)** - Production app (730 lines, 61 tests) using all patterns
- **[Wikipedia](../ported-apps/wikipedia/)** - Complex data models with multi-level binding
- **[Element Chat](../ported-apps/element/)** - Real-time messaging with subscriptions
- **[Expense Tracker](../ported-apps/expense-tracker/)** - Nested lists and filtering

### Educational Demos
- **Cosyne Animated Shapes** - Animation loops with TypeScript drawing
- **Raymarching Intro** - GPU 3D rendering basics
- **Perlin Noise** - Procedural generation patterns
- **Voronoi Diagrams** - Cellular pattern generation

---

**Key Lessons for Future Development**

1. ✅ **Observable Pattern**: All 7 apps use identical subscription pattern—proven and scalable
2. ✅ **Declarative Visibility**: Use `.when()` + `await refresh()` instead of manual show/hide
3. ✅ **Defensive Copies**: Return `[...items]` not `items`—essential for state synchronization
4. ✅ **Counter-based IDs**: Use `book-001`, `book-002` not `Date.now()`—prevents test collisions
5. ✅ **Tab-based Navigation**: Cleaner than modal/stack patterns for most applications
6. ✅ **Store-driven Updates**: Store subscriptions handle ALL view updates—never mutate UI directly
7. ✅ **Comprehensive Testing**: 50-61 tests per app achievable with well-structured stores
8. ✅ **Animation Loops**: Use timer-driven `refreshAllCosyneContexts()` for frame-based updates
9. ✅ **GPU Rendering**: Use `CanvasShader` for computation-heavy visualizations (100-1000x faster)

---

## Summary

Tsyne's pseudo-declarative approach elegantly combines markup-like readability with full TypeScript power. The framework provides clear patterns for every scenario—from simple state to complex distributed apps, animated graphics, and GPU-accelerated visuals. All patterns are proven across 7 production applications and 17+ educational demos. Start with the pattern that fits your use case and scale with confidence.
