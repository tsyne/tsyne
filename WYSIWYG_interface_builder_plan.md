# Tsyne WYSIWYG Interface Builder Plan

**Inspired by**: Action! (Denny Bollay, 1988) - Lisp-based WYSIWYG with live execution and round-trip editing

**Core Principle**: *"Execute into different context (not parse)"* - Like Action! interpreted Lisp into a live, modifiable context, Tsyne WYSIWYG will execute TypeScript into a design-mode context while preserving the imperative nature of the code.

---

## Vision Statement

Create a WYSIWYG interface builder for Tsyne that:
1. **Executes** TypeScript applications (like `todomvc-ngshow.ts`) in a **design mode context**
2. Provides **visual editing** of UI layout and properties
3. **Saves back to TypeScript** with imperative logic preserved
4. Maintains **source-control compatibility** (readable diffs, no binary blobs)
5. Supports **live preview** with real event handlers and state

**Key Insight from Action!**: The Lisp code was *executed* and *interpreted into a context*, not just parsed. The UI was fully modifiable AS the program was running. Tsyne WYSIWYG will do the same - execute TypeScript to build a live, editable UI structure.

---

## Architecture Overview

**Key Principle**: Execute, don't parse! Just like Action! executed Lisp code.

```
┌─────────────────────────────────────────────────────────────┐
│                    Tsyne WYSIWYG Editor                     │
├─────────────────────────────────────────────────────────────┤
│  1. Load .ts file                                           │
│     ↓                                                       │
│  2. Swap Tsyne library → TsyneDesigner library                   │
│     - import 'tsyne' → import 'tsyne-designer'              │
│     - Module.require override (Node.js) or by hacky import replacement sed expression equiv on the source                    │
│     ↓                                                       │
│  3. Execute TypeScript code (ts-node / require)             │
│     - Runs user's code normally                             │
│     - Calls designer's a.vbox(), a.label(), etc.            │
│     - Provides mock data for loops (.tsyne-designer/mocks or a source code comment above the pertinent looping section with mock data as json  │
│     ↓                                                       │
│  4. Designer library captures metadata                      │
│     - Stack traces → source locations (file:line:column)    │
│     - Widget properties (text, width, etc.)                 │
│     - Event handler source (.toString())                    │
│     - Builds actual widgets (visual!)                       │
│     ↓                                                       │
│  5. Visual Editing                                          │
│     - Click to select widgets                               │
│     - Drag to reorder                                       │
│     - Property inspector                                    │
│     - Add/remove widgets                                    │
|     - pick new widgets from palette                         |
|     - State preview toggles (isEditing: [false] [true])     |
|     - theoretical use of real Tsyne (Fyne) widgets and container, though that may not work |
│     ↓                                                       │
│  6. Source Code Update (Text-based!)                        │
|     - visit the object tree and create TS source from that, maybe use LLM to ensure that all is preserved from prior save that was subject to designer action and that whirespace was not changed too much | 
|        OR
│     - Read .ts file as text                                 │
│     - Find line:column from metadata                        │
│     - Replace text: 'Add' → 'Submit'                        │
│     - Write back to .ts file                                │
│     ↓                                                       │
│  7. Hot Reload (stretch goal)                                              │
│     - Re-execute updated code                               │
│     - Designer captures new metadata                        │
│     - UI updates instantly                                  │
└─────────────────────────────────────────────────────────────┘
```

**No AST parsing/manipulation!** Just execute → capture → edit text → re-execute.

---

## Phase 1: Designer Library Execution (Not Parsing!)

### 1.1 The Designer Library Swap
**Key Insight from Action!**: Don't parse - **execute the code** with a designer library that captures metadata.

**Approach**:
1. User's code imports from `'tsyne'`
2. Designer **swaps** the import to point to `'tsyne-designer'`
3. User's code executes normally (runs the TypeScript)
4. Designer library intercepts widget creation and captures metadata

**Import Redirection - Two Approaches**:

#### Option A: Module.require Override (Clean)
```typescript
// In designer process:
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'tsyne' || id.endsWith('/src')) {
    return require('tsyne-designer');  // Swap!
  }
  return originalRequire.apply(this, arguments);
};

// Now execute user's code:
require('./todomvc-ngshow.ts');  // Calls designer library!
```

**Pros**: No source modification, reversible
**Cons**: Requires Node.js module system

#### Option B: Hacky Text Replacement (Simpler)
```bash
# Before execution: sed-like text replacement on source
sed 's/from ['\''"]tsyne['\''"]/from '\''tsyne-designer'\''/g' todomvc-ngshow.ts > /tmp/todomvc-designer.ts

# Execute modified source
ts-node /tmp/todomvc-designer.ts

# Original source unchanged!
```

**Pros**: Works anywhere, simpler implementation
**Cons**: Creates temp file, requires text parsing

**Recommendation**: Start with Option B (simpler), migrate to Option A if needed.

### 1.2 Designer Library Implementation
**Goal**: Identical API to production Tsyne, but captures metadata during execution.

**Stack Trace Magic**: Capture call site from stack trace
```typescript
// tsyne-designer/index.ts
import { App as ProductionApp, VBoxWidget, LabelWidget } from 'tsyne';

class DesignerApp extends ProductionApp {
  private metadata: Map<string, WidgetMetadata> = new Map();

  vbox(builder: () => void): VBoxWidget {
    // 1. Create actual widget (so UI renders visually)
    const widget = super.vbox(builder);

    // 2. Capture call site from stack trace
    const stackTrace = new Error().stack!;
    const sourceLocation = this.parseStackTrace(stackTrace);

    // 3. Store metadata
    const metadata: WidgetMetadata = {
      widgetId: widget.id,
      widgetType: 'vbox',
      sourceLocation: sourceLocation,  // file:line:column
      properties: {},
      eventHandlers: {},
      children: [],
      parent: this.currentParent
    };

    this.metadata.set(widget.id, metadata);
    return widget;
  }

  label(text: string, alignment?: string, wrapping?: string, importance?: string, style?: any): LabelWidget {
    const widget = super.label(text, alignment, wrapping, importance, style);
    const stackTrace = new Error().stack!;
    const sourceLocation = this.parseStackTrace(stackTrace);

    this.metadata.set(widget.id, {
      widgetId: widget.id,
      widgetType: 'label',
      sourceLocation: sourceLocation,
      properties: { text, alignment, wrapping, importance, style },
      eventHandlers: {},
      children: [],
      parent: this.currentParent
    });

    return widget;
  }

  button(text: string, onClick?: () => void, minWidth?: number): ButtonWidget {
    const widget = super.button(text, onClick, minWidth);
    const stackTrace = new Error().stack!;
    const sourceLocation = this.parseStackTrace(stackTrace);

    // CRITICAL: Capture the onClick handler source code!
    const handlerSource = onClick ? onClick.toString() : undefined;

    this.metadata.set(widget.id, {
      widgetId: widget.id,
      widgetType: 'button',
      sourceLocation: sourceLocation,
      properties: { text, minWidth },
      eventHandlers: {
        onClick: handlerSource  // Store as string for now
      },
      children: [],
      parent: this.currentParent
    });

    return widget;
  }

  private parseStackTrace(stack: string): SourceLocation {
    // Parse stack trace to extract file:line:column
    // Stack trace format:
    //   at DesignerApp.vbox (/path/to/tsyne-designer/index.ts:123:45)
    //   at Object.<anonymous> (/path/to/todomvc-ngshow.ts:336:7)  ← This one!
    const lines = stack.split('\n');
    const userCodeLine = lines[2];  // Skip Error + designer's call
    const match = userCodeLine.match(/\((.+):(\d+):(\d+)\)/);

    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3])
      };
    }

    return { file: 'unknown', line: 0, column: 0 };
  }
}

export { DesignerApp as App };
export * from 'tsyne';  // Re-export everything else
```

### 1.3 Widget Metadata Structure
**Data Structure** (captured at runtime, not from AST):
```typescript
interface SourceLocation {
  file: string;    // /path/to/todomvc-ngshow.ts
  line: number;    // 336
  column: number;  // 7
}

interface WidgetMetadata {
  widgetId: string;              // Runtime widget instance ID
  widgetType: string;            // 'vbox', 'label', 'button', etc.
  sourceLocation: SourceLocation; // Where in .ts file this widget was created
  properties: {                  // Current widget properties
    text?: string;
    width?: number;
    // ... etc
  };
  eventHandlers: {               // Event handler source code (as string)
    onClick?: string;            // "async () => { store.addTodo(text); }"
    onChange?: string;
  };
  children: WidgetMetadata[];    // Child widgets (for containers)
  parent: WidgetMetadata | null; // Parent widget
}
```

**No AST manipulation** - just source locations and runtime data!

---

## Phase 2: Mock Data Provision for ng-repeat Loops

### 2.1 The Problem: Dynamic Loops Need Data
**Challenge**: Code like TodoMVC has loops that create widgets dynamically:

```typescript
// In todomvc-ngshow.ts:
const allTodos = store.getAllTodos();  // Real data from file

listBinding = todoContainer
  .model(allTodos)                     // Needs data to loop!
  .trackBy((todo: TodoItem) => todo.id)
  .each(createTodoItemBuilder());      // Creates widget per todo
```

**In Designer Mode**: We need mock data so the loop executes and creates visual widgets.

### 2.2 Mock Store Implementation
**Approach**: Designer library provides mock versions of user's classes.

**Option 1**: Automatic Mock Detection
```typescript
// tsyne-designer runtime detects class instantiation
const store = new TodoStore(storePath);  // User's code

// Designer intercepts and wraps:
const store = new MockTodoStore(new TodoStore(storePath));
```

**Option 2**: Designer-Specific Mock Registration
```typescript
// In designer mode, user can provide mock data:
// .tsyne-designer.config.ts
export const designerMocks = {
  TodoStore: {
    getAllTodos: () => [
      { id: 1, text: 'Sample todo 1', completed: false },
      { id: 2, text: 'Sample todo 2', completed: true },
      { id: 3, text: 'Sample todo 3', completed: false }
    ],
    getActiveCount: () => 2,
    getCompletedCount: () => 1,
    getFilter: () => 'all' as const
  }
};
```

**Option 3**: Execute Real Code, Override File I/O
```typescript
// Designer's TodoStore wrapper:
class DesignerTodoStore extends TodoStore {
  load(): void {
    // Don't read from file system in designer mode
    // Load mock data instead
    this.todos = [
      { id: 1, text: 'Sample todo 1', completed: false },
      { id: 2, text: 'Sample todo 2', completed: true }
    ];
    this.notifyChange('load');
  }

  save(): void {
    // Don't write to file system in designer mode
    console.log('[Designer] Would save:', this.todos);
  }
}
```

### 2.3 Array/Loop Mocking Strategy
**For ng-repeat style loops**:

```typescript
// User's code:
todos.forEach(todo => {
  a.hbox(() => {
    a.checkbox(todo.text, ...);
    a.button('Delete', ...);
  });
});
```

**Designer executes this loop** with mock `todos` array:
- Mock data provides 2-3 sample items
- Loop executes normally
- Widgets are created visually
- Each widget's metadata captures its source location

**Key Insight**: We don't need to understand the loop structure - just execute it with sample data!

### 2.4 Mock Data Configuration - Two Approaches

#### Option A: Separate Configuration File
**Location**: `.tsyne-designer/mocks.ts` (in project root)

**Format**:
```typescript
// .tsyne-designer/mocks.ts
export interface DesignerMocks {
  // Class name → mock implementation
  [className: string]: {
    [methodName: string]: (...args: any[]) => any;
  };
}

export const mocks: DesignerMocks = {
  TodoStore: {
    getAllTodos: () => [
      { id: 1, text: 'Buy milk', completed: false },
      { id: 2, text: 'Walk dog', completed: true },
      { id: 3, text: 'Write code', completed: false }
    ],
    getFilteredTodos: () => [
      { id: 1, text: 'Buy milk', completed: false },
      { id: 3, text: 'Write code', completed: false }
    ],
    getActiveCount: () => 2,
    getCompletedCount: () => 1,
    getFilter: () => 'all'
  }
};
```

**Pros**: Clean separation, reusable across multiple files
**Cons**: Extra file to maintain

#### Option B: Inline Source Code Comments
**Format**: Special comment above the looping section with mock data as JSON

```typescript
// In todomvc-ngshow.ts:

// @designer-mock: [{"id": 1, "text": "Buy milk", "completed": false}, {"id": 2, "text": "Walk dog", "completed": true}]
const allTodos = store.getAllTodos();

listBinding = todoContainer
  .model(allTodos)
  .trackBy((todo: TodoItem) => todo.id)
  .each(createTodoItemBuilder());
```

**Designer Library**: Parse comments when executing
```typescript
// In tsyne-designer runtime:
function extractInlineMocks(sourceCode: string): Map<string, any> {
  const mockPattern = /@designer-mock:\s*(\[.*?\]|\{.*?\})/g;
  const mocks = new Map();
  let match;

  while ((match = mockPattern.exec(sourceCode)) !== null) {
    const mockData = JSON.parse(match[1]);
    // Associate with next line's variable
    mocks.set(/* line number */, mockData);
  }

  return mocks;
}
```

**Pros**: Mock data right next to the code that uses it, no extra files
**Cons**: Pollutes source code with designer-specific comments

**Recommendation**: Support both approaches - developers can choose based on preference

**Loading Mocks**:
```typescript
// In tsyne-designer runtime:
const userMocks = require('./.tsyne-designer/mocks.ts');

// Apply mocks when intercepting class instantiation:
if (userMocks.mocks[className]) {
  return new Proxy(instance, {
    get(target, prop) {
      if (userMocks.mocks[className][prop]) {
        return userMocks.mocks[className][prop];  // Use mock
      }
      return target[prop];  // Use real implementation
    }
  });
}
```

### 2.5 Fallback: No Mocks Provided
**If user doesn't provide mocks**:
1. Execute code normally (may fail if file doesn't exist)
2. Catch errors gracefully
3. Show empty state: "No mock data - add `.tsyne-designer/mocks.ts`"
4. Provide template for mocks

**Error Handling**:
```typescript
try {
  // Execute user's code
  require('./todomvc-ngshow.ts');
} catch (error) {
  if (error.message.includes('ENOENT')) {
    console.warn('[Designer] File not found - provide mock data');
    // Show template in UI
  }
  throw error;
}
```

---

## Phase 3: Design Mode Execution Context

### 3.1 DesignModeApp
**Concept**: A special Tsyne app context that intercepts widget creation to capture metadata.

```typescript
class DesignModeApp {
  private widgetMetadata: Map<string, WidgetMetadata> = new Map();
  private astNodeMap: Map<ts.Node, string> = new Map(); // AST → widgetId

  // Intercept widget creation calls
  vbox(builder: () => void): VBoxWidget {
    const widget = super.vbox(builder);
    const astNode = this.getCurrentASTNode(); // Track which AST node called this

    const metadata: WidgetMetadata = {
      widgetId: widget.id,
      astNode: astNode,
      sourceLocation: getNodeLocation(astNode),
      widgetType: 'vbox',
      properties: {},
      eventHandlers: {},
      children: [],
      parent: this.currentParent
    };

    this.widgetMetadata.set(widget.id, metadata);
    this.astNodeMap.set(astNode, widget.id);

    return widget;
  }

  label(text: string): LabelWidget {
    // Similar interception...
  }

  button(text: string, onClick?: () => void): ButtonWidget {
    const widget = super.button(text, onClick);
    const astNode = this.getCurrentASTNode();

    // Extract event handler AST
    const callExpr = astNode as ts.CallExpression;
    const handlerArg = callExpr.arguments[1]; // onClick callback

    const metadata: WidgetMetadata = {
      widgetId: widget.id,
      astNode: astNode,
      sourceLocation: getNodeLocation(astNode),
      widgetType: 'button',
      properties: { text },
      eventHandlers: {
        onClick: handlerArg // Preserve handler AST!
      },
      children: [],
      parent: this.currentParent
    };

    this.widgetMetadata.set(widget.id, metadata);
    return widget;
  }
}
```

### 2.2 Execution Strategy
**How to Execute Code in Design Mode**:

1. **Sandbox TypeScript Execution**:
   - Use `ts-node` or `esbuild` to compile TypeScript on-the-fly
   - Inject `DesignModeApp` in place of regular `app` context
   - Execute the file to build the UI

2. **AST-Aware Execution**:
   - Instrument the code with source mapping comments
   - Track call stack to map runtime calls → AST nodes
   - Use TypeScript transformer API to inject tracking code

3. **Preserve Imperative Context**:
   - Execute class definitions normally (`TodoStore`)
   - Execute state initialization normally (`const store = new TodoStore()`)
   - Execute event handlers with design-mode stubs (log instead of real actions)

---

## Phase 3: Visual Editor Features

### 3.1 Widget Selection & Highlighting
**Features**:
- Click widget in preview → highlight in visual editor
- Show widget hierarchy tree (like browser DevTools)
- Show source location (file:line:column)

**UI**:
```
┌─────────────────────────────────────────────────────────┐
│ Tsyne WYSIWYG Editor                                    │
├────────────────────┬────────────────────────────────────┤
│                    │                                    │
│  Widget Tree       │  Live Preview                      │
│  ──────────        │  ────────────                      │
│  ▼ VBox            │  ┌──────────────────────────────┐ │
│    □ Label         │  │ TodoMVC                      │ │
│    □ Separator     │  │ ──────                       │ │
│    ▼ HBox          │  │                              │ │
│      □ Entry       │  │ Add New Todo:                │ │
│      ■ Button      │  │ [What needs...] [Add]       │ │ ← Selected
│    □ Label         │  │                              │ │
│    ...             │  │ Filter:                      │ │
│                    │  │ [All] Active Completed       │ │
│                    │  └──────────────────────────────┘ │
│                    │                                    │
├────────────────────┴────────────────────────────────────┤
│  Property Inspector                                     │
│  ──────────────────                                     │
│  Widget: Button                                         │
│  Text: "Add"                                            │
│  Width: (auto)                                          │
│  OnClick: async () => { const text = await new...      │
│           ↳ [View/Edit Event Handler Code]             │
│  Source: todomvc-ngshow.ts:347:27                       │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Property Editing
**Editable Properties**:
- **Text** (Label, Button, Entry placeholder)
- **Dimensions** (width, height for containers)
- **Layout** (spacing, alignment)
- **Styling** (font, color - if Tsyne styling system applied)
- **Behavior** (visibility, enabled/disabled)

**Property Inspector UI**:
```typescript
interface PropertyInspector {
  // Simple properties → direct edit
  text: StringEditor;          // Text input
  width: NumberEditor;         // Number input with units
  height: NumberEditor;

  // Event handlers → code editor
  onClick: CodeEditor;         // Monaco editor with TypeScript
  onChange: CodeEditor;

  // Computed/derived → read-only or special handling
  ngShow: FunctionEditor;      // Edit predicate function
}
```

### 3.3 Widget Operations

#### Add Widget from Palette
**UI**: Widget palette panel with draggable widget types

**Widget Palette Layout**:
```
┌──────────────────────┐
│  Widget Palette      │
├──────────────────────┤
│  Containers:         │
│  [VBox] [HBox]       │
│  [Grid] [Scroll]     │
│  [Split] [Tabs]      │
│                      │
│  Controls:           │
│  [Label] [Button]    │
│  [Entry] [Checkbox]  │
│  [Select] [Slider]   │
│                      │
│  Advanced:           │
│  [Card] [Accordion]  │
│  [Form] [Tree]       │
│  [Table] [List]      │
└──────────────────────┘
```

**Add Widget Process**:
1. User drags widget from palette OR right-click parent → "Add Child"
2. User selects parent container (VBox, HBox, etc.)
3. User chooses widget type (Label, Button, Entry, etc.)
4. Editor generates widget code:
   ```typescript
   // Generate this code:
   a.label('New Label');
   ```
5. Insert into parent container's callback in source code
6. Re-execute to update preview

**Experimental: Real Tsyne (Fyne) Widgets**
There's a theoretical approach to use real Tsyne (Fyne) widgets and containers directly in the designer, though this may not work due to:
- Fyne's event loop requirements
- Canvas rendering differences between design and runtime modes
- Cross-platform UI threading constraints

**Fallback**: Use simpler HTML/Canvas preview with Fyne-like styling instead of embedding actual Fyne widgets

#### Remove Widget
**Process**:
1. User selects widget
2. Editor finds AST node in metadata
3. Remove AST node from parent
4. Re-execute to update preview

#### Reorder Widgets
**UI**: Drag widget up/down in hierarchy tree
**Process**:
1. User drags widget in tree
2. Editor reorders AST nodes in parent container's callback
3. Re-execute to update preview

#### Change Widget Properties
**Process**:
1. User edits property in inspector (e.g., text: "Add" → "Submit")
2. Editor finds AST node for this widget
3. Update argument in CallExpression:
   ```typescript
   // Before:
   a.button('Add', async () => { ... })

   // After:
   a.button('Submit', async () => { ... })
   ```
4. Re-execute to update preview

### 3.4 Design-Time State Preview (ngShow / Conditional Visibility)

**Inspired by**: [Paul Hammant's AngularJS Design Mode (2012)](https://paulhammant.com/2012/03/12/the-importance-of-design-mode-for-client-side-mvc/)

**Challenge**: UI has conditional states (ngShow directives, editing modes, filters). Designer needs to preview different states without running app logic.

**AngularJS Design Mode Approach (2012)**:
- Showcase displayed **all states simultaneously** (passed AND failed icons, all sort states)
- Good for documentation, but impractical for design tools

**Tsyne WYSIWYG Approach**: Toggle between states in ribbon/palette

#### State Toggle UI
```
┌─────────────────────────────────────────────────────────┐
│ Tsyne WYSIWYG Editor                 [Design Mode]      │
├─────────────────────────────────────────────────────────┤
│ State Preview Controls:                                 │
│   isEditing: [○ false] [● true]    ← Toggle buttons    │
│   filter: [● all] [○ active] [○ completed]              │
│   todos.length: [○ 0 (empty)] [● 3 (sample data)]       │
├─────────────────────────────────────────────────────────┤
│  Widget Tree       │  Live Preview                      │
│  ...               │  ...                               │
└─────────────────────────────────────────────────────────┘
```

**How It Works**:
1. **Detect state variables** from ngShow predicates:
   ```typescript
   checkbox.ngShow(() => !isEditing);  // Detects: isEditing (boolean)
   textEntry.ngShow(() => isEditing);
   todoHBox.ngShow(shouldShowTodo);    // Detects: filter state
   ```

2. **Extract state variables** from designer library execution:
   ```typescript
   // Designer runtime tracks ngShow predicates
   class DesignerWidget {
     ngShow(predicate: () => boolean) {
       // Parse predicate source to extract variables
       const source = predicate.toString();
       // "() => !isEditing" → extract "isEditing"
       const variables = parsePredicateVariables(source);

       this.metadata.stateVariables = variables;
     }
   }
   ```

3. **Provide state toggle controls** in designer UI:
   - Auto-detect boolean state variables (isEditing, isLoading, etc.)
   - Auto-detect filter enums (filter: 'all' | 'active' | 'completed')
   - Let user toggle state to preview different UI configurations

4. **Override state at design time**:
   ```typescript
   // Designer mode: override runtime state variables
   const designerState = {
     isEditing: false,  // User toggles this in ribbon
     filter: 'all',     // User toggles this in ribbon
   };

   // When evaluating ngShow predicate:
   const shouldShow = predicate.call({ ...runtimeContext, ...designerState });
   ```

#### Designer State Comments (Inline Approach)
**Alternative**: Use inline comments to set default design-time states

```typescript
// In todomvc-ngshow.ts:

// @designer-state: isEditing = false
let isEditing = false;

// @designer-state: filter = "active"
const filter = store.getFilter();

// Designer parses comments and shows toggles in UI
```

**Benefits**:
- State defaults persisted in source code
- Designer auto-configures preview to useful state
- Developer controls what states to expose in designer

#### Example: TodoMVC Edit Mode Toggle

**Runtime Code**:
```typescript
let isEditing = false;

checkbox.ngShow(() => !isEditing);   // Visible when NOT editing
textEntry.ngShow(() => isEditing);   // Visible when editing
```

**Designer UI**:
```
┌────────────────────────────────┐
│ isEditing: [● false] [○ true] │  ← Click to toggle
└────────────────────────────────┘
```

**User clicks `true`**:
- Designer re-evaluates ngShow predicates with `isEditing = true`
- Checkbox hides, Entry shows
- User can now edit Entry properties visually

**User clicks `false`**:
- Checkbox shows, Entry hides
- User can edit Checkbox properties visually

#### Implementation Strategy

**Phase 1: Auto-detection**
- Parse ngShow predicate source code
- Extract variable names (isEditing, filter, etc.)
- Infer types (boolean, enum, number)

**Phase 2: Toggle UI**
- Generate ribbon controls automatically
- Boolean: radio buttons [false] [true]
- Enum: radio buttons for each value
- Number: slider or input

**Phase 3: State Override**
- When evaluating ngShow, inject designer state
- Re-render preview when state toggled
- Highlight widgets affected by state change

**Phase 4: State Persistence**
- Save designer state to `.tsyne-meta.json`
- Remember user's preferred preview state per file
- Restore state when reopening file in designer

### 3.5 Code Region Preservation
**Critical**: Preserve imperative code that isn't UI construction.

**Preserve These Regions** (don't allow visual editing):
1. **Imports**
   ```typescript
   import { app, vbox, label } from 'tsyne';
   ```

2. **Class Definitions**
   ```typescript
   class TodoStore {
     private todos: TodoItem[] = [];
     addTodo(text: string): TodoItem { ... }
   }
   ```

3. **State Initialization**
   ```typescript
   const store = new TodoStore(storePath);
   let newTodoEntry: any;
   let todoContainer: any;
   ```

4. **Event Handler Logic**
   ```typescript
   async () => {
     const text = await newTodoEntry.getText();
     if (text && text.trim()) {
       store.addTodo(text);              // ← Preserve this logic!
       await newTodoEntry.setText('');
     }
   }
   ```

5. **Subscriptions & Bindings**
   ```typescript
   store.subscribe((changeType) => {
     // Auto-update view logic
   });
   ```

6. **Utility Functions**
   ```typescript
   async function updateStatusLabel() {
     const activeCount = store.getActiveCount();
     await statusLabel.setText(`${activeCount} items left`);
   }
   ```

**How to Preserve**:
- Mark these AST nodes as "read-only" in design mode
- Show them in a separate "Code View" tab
- Allow manual editing in code editor (Monaco)
- Warn if visual edits would conflict with imperative code

---

## Phase 4: Source Code Editing (Text-based, Not AST!)

### 4.1 Code Update Strategy - Two Approaches

**Goal**: Modify only UI construction code, preserve everything else.

#### Option A: Object Tree → TypeScript Generation (Primary)
**Approach**: Visit the object tree and create TypeScript source from that structure

**Process**:
1. User makes visual edits (change text, reorder widgets, add/remove)
2. Designer builds complete widget object tree in memory
3. Generate fresh TypeScript source from object tree
4. Use LLM to ensure formatting/whitespace preservation from original source

**Why LLM Assistance?**
- Preserve original formatting style (tabs vs spaces, line breaks)
- Preserve comments that aren't tied to specific widgets
- Ensure imperative code sections are untouched
- Handle edge cases gracefully (complex event handlers, etc.)

**LLM Prompt Example**:
```
Given:
- Original source: [todomvc-ngshow.ts contents]
- New widget tree: [JSON representation]
- Changes: [Button text 'Add' → 'Submit' at line 347]

Generate updated TypeScript that:
1. Applies the widget tree changes
2. Preserves all imperative code (classes, functions, state)
3. Preserves formatting style (indentation, line breaks)
4. Preserves comments
5. Minimizes diff to original (don't reformat unrelated code)
```

**Benefits**:
- More robust for large structural changes (reordering, adding/removing)
- Preserves semantics even if source locations shift
- Can handle complex transformations
- Better formatting preservation with LLM guidance

**Drawbacks**:
- Requires LLM API (cost, latency)
- Non-deterministic (LLM may vary output)
- Needs fallback for offline usage

#### Option B: Direct Text Replacement (Fallback)
**Approach**: Direct text replacement using source locations from metadata
```typescript
class SourceCodeEditor {
  private sourceCode: string;  // Full .ts file contents as text
  private lines: string[];     // Split by newlines for line-based editing

  constructor(filePath: string) {
    this.sourceCode = fs.readFileSync(filePath, 'utf8');
    this.lines = this.sourceCode.split('\n');
  }

  /**
   * Update widget property by direct text replacement
   */
  updateWidgetProperty(metadata: WidgetMetadata, property: string, newValue: any): void {
    const { file, line, column } = metadata.sourceLocation;

    // Get the line containing the widget creation
    const lineContent = this.lines[line - 1];  // 0-indexed array, 1-indexed line numbers

    // Example line:
    // "          a.button('Add', async () => {"
    //            ^column

    if (property === 'text' && metadata.widgetType === 'button') {
      // Find the first string literal after column position
      const match = lineContent.substring(column).match(/['"](.*?)['"]/);
      if (match) {
        const oldText = match[1];  // 'Add'
        const updatedLine = lineContent.replace(`'${oldText}'`, `'${newValue}'`);
        this.lines[line - 1] = updatedLine;
      }
    }

    if (property === 'text' && metadata.widgetType === 'label') {
      // Similar: find and replace string literal
      const match = lineContent.substring(column).match(/['"](.*?)['"]/);
      if (match) {
        const oldText = match[1];
        const updatedLine = lineContent.replace(`'${oldText}'`, `'${newValue}'`);
        this.lines[line - 1] = updatedLine;
      }
    }

    // Rebuild source code
    this.sourceCode = this.lines.join('\n');
  }

  /**
   * Add widget to parent container
   */
  addWidget(parentMetadata: WidgetMetadata, widgetType: string, properties: any): void {
    // Find the parent container's closing brace
    // Parent is at line 336: "a.vbox(() => {"
    // We need to insert BEFORE the closing "})" of the callback

    const parentLine = parentMetadata.sourceLocation.line - 1;
    const indentation = this.getIndentation(parentLine);

    // Find closing brace for this vbox
    let closingBraceLine = this.findClosingBrace(parentLine);

    // Generate widget code
    const widgetCode = this.generateWidgetCode(widgetType, properties, indentation + '  ');

    // Insert before closing brace
    this.lines.splice(closingBraceLine, 0, widgetCode);

    // Rebuild source code
    this.sourceCode = this.lines.join('\n');
  }

  /**
   * Remove widget from source
   */
  removeWidget(metadata: WidgetMetadata): void {
    const { line } = metadata.sourceLocation;

    // Simple approach: remove the line
    // More sophisticated: remove the entire widget call including multiline
    this.lines.splice(line - 1, 1);

    // Rebuild source code
    this.sourceCode = this.lines.join('\n');
  }

  /**
   * Save updated source code back to file
   */
  save(filePath: string): void {
    // Run prettier to clean up formatting
    const formatted = prettier.format(this.sourceCode, {
      parser: 'typescript',
      singleQuote: true,
      semi: true
    });

    fs.writeFileSync(filePath, formatted, 'utf8');
  }

  /**
   * Helper: Get indentation of a line
   */
  private getIndentation(lineIndex: number): string {
    const line = this.lines[lineIndex];
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  /**
   * Helper: Find closing brace for a block starting at lineIndex
   */
  private findClosingBrace(startLine: number): number {
    let braceCount = 0;
    for (let i = startLine; i < this.lines.length; i++) {
      const line = this.lines[i];
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (braceCount === 0 && line.includes('}')) {
        return i;
      }
    }
    return this.lines.length;  // Fallback: end of file
  }

  /**
   * Helper: Generate widget code
   */
  private generateWidgetCode(widgetType: string, properties: any, indentation: string): string {
    switch (widgetType) {
      case 'label':
        return `${indentation}a.label('${properties.text || 'New Label'}');`;

      case 'button':
        return `${indentation}a.button('${properties.text || 'New Button'}', async () => {\n` +
               `${indentation}  console.log('Button clicked');\n` +
               `${indentation}});`;

      case 'entry':
        return `${indentation}a.entry('${properties.placeholder || ''}');`;

      case 'vbox':
        return `${indentation}a.vbox(() => {\n` +
               `${indentation}  // Add widgets here\n` +
               `${indentation}});`;

      default:
        return `${indentation}a.${widgetType}();`;
    }
  }
}
```

**Key Advantages**:
1. **No AST complexity** - just text manipulation
2. **Preserves formatting** - prettier cleans up after
3. **Simple to understand** - find line, replace text
4. **Fast** - no AST tree traversal

### 4.2 Code Formatting
**Goal**: Preserve human-readable formatting, not minified output.

**Approach**: Use TypeScript Printer with formatting options
```typescript
const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false,  // Keep comments!
  omitTrailingSemicolon: false
});

const updatedCode = printer.printFile(updatedSourceFile);
```

**Formatting Preservation**:
- Use `prettier` or `eslint --fix` after code generation
- Preserve user's indentation style (detect tabs vs spaces)
- Preserve line breaks in logical places (after widgets)
- Preserve comments (especially TODO, FIXME, etc.)

### 4.3 Round-Trip Validation
**Test**: Load → Edit → Save → Load → Verify identical UI
```typescript
test('Round-trip editing preserves semantics', async () => {
  // 1. Load original file
  const originalCode = fs.readFileSync('todomvc-ngshow.ts', 'utf8');

  // 2. Execute in design mode
  const designApp = new DesignModeApp();
  await executeInDesignMode(originalCode, designApp);

  // 3. Make a visual edit (e.g., change button text)
  const buttonWidget = designApp.findWidget({ type: 'button', text: 'Add' });
  await designApp.updateProperty(buttonWidget.id, 'text', 'Submit');

  // 4. Generate updated code
  const updatedCode = designApp.generateCode();

  // 5. Execute updated code in design mode
  const verifyApp = new DesignModeApp();
  await executeInDesignMode(updatedCode, verifyApp);

  // 6. Verify button text changed
  const updatedButton = verifyApp.findWidget({ type: 'button', text: 'Submit' });
  expect(updatedButton).toBeDefined();

  // 7. Verify imperative code preserved
  expect(updatedCode).toContain('class TodoStore');
  expect(updatedCode).toContain('store.addTodo(text)');
  expect(updatedCode).toContain('store.subscribe((changeType) =>');
});
```

---

## Phase 5: Live Preview & Testing

### 5.1 Live Preview Modes
**Design Mode** (default):
- Widgets are selectable (click to select)
- Event handlers are stubbed (log instead of execute)
- State changes are simulated
- No file I/O (don't save todos.json)

**Preview Mode** (toggle):
- Widgets behave normally (click executes real handler)
- Event handlers execute fully
- State changes are real
- File I/O works (save todos.json)
- Can test the actual application behavior

**Toggle Button**: "Design Mode" ↔ "Preview Mode"

### 5.2 Hot Reload (Stretch Goal)
**Goal**: See changes instantly without full reload.

**Note**: Hot reload is a stretch goal for MVP. Initial versions may use full reload on save, which is acceptable for prototyping.

**Approach**: Incremental Re-execution
```typescript
class HotReloadManager {
  async applyChange(metadata: WidgetMetadata, newProperties: any) {
    // 1. Update AST
    const updatedAST = this.astUpdater.updateWidget(metadata, newProperties);

    // 2. Generate updated code
    const updatedCode = this.printer.printFile(updatedAST);

    // 3. Re-execute ONLY affected widget (not full app)
    const widget = this.widgetMap.get(metadata.widgetId);
    if (widget && newProperties.text !== undefined) {
      await widget.setText(newProperties.text);
    }

    // 4. Queue full re-execution (debounced)
    this.queueFullReload();
  }

  private queueFullReload() {
    // Debounce: wait 500ms after last edit before full reload
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => {
      this.fullReload();
    }, 500);
  }
}
```

### 5.3 Testing Integration
**Goal**: Run TsyneTest suite from within WYSIWYG editor.

**UI**: "Run Tests" button
**Process**:
1. Save current edits to temp file
2. Run `npm test todomvc-ngshow.test.ts`
3. Show test results in editor panel
4. Highlight failing widgets in preview

---

## Phase 6: Advanced Features

### 6.1 Event Handler Visual Editing
**Challenge**: Event handlers are imperative TypeScript code.

**Approach 1**: Code Editor (Monaco)
- Double-click event handler in property inspector
- Opens Monaco editor with TypeScript intellisense
- Edit handler code directly
- Validate on blur (TypeScript compilation check)

**Approach 2**: Visual Logic Builder (future)
- Drag-and-drop logic nodes (like Unreal Blueprints)
- Generate TypeScript from visual graph
- Limited to common patterns (update state, call method, navigate)

### 6.2 State Management Visualization
**Goal**: Show how state flows through the application.

**UI**: "State Graph" tab
```
TodoStore
  ├─ todos: TodoItem[]
  │   └─ subscriptions: [updateUI, updateStatus]
  ├─ currentFilter: 'all' | 'active' | 'completed'
  │   └─ subscriptions: [refreshVisibility, updateFilterButtons]
  └─ filePath: string

Observables
  └─ store.subscribe() → triggers UI updates
```

### 6.3 Component Extraction
**Goal**: Extract repeated UI patterns into reusable components.

**Example**: Extract todo item into component
```typescript
// Before (inline):
a.hbox(() => {
  checkbox = a.checkbox(todo.text, async (checked: boolean) => {
    store.toggleTodo(todo.id);
  });
  a.button('Edit', ifNotEditingStartEdit);
  a.button('Delete', async () => {
    store.deleteTodo(todo.id);
  });
});

// After (component):
function TodoItem(a: any, todo: TodoItem, store: TodoStore) {
  a.hbox(() => {
    const checkbox = a.checkbox(todo.text, async (checked: boolean) => {
      store.toggleTodo(todo.id);
    });
    a.button('Edit', ifNotEditingStartEdit);
    a.button('Delete', async () => {
      store.deleteTodo(todo.id);
    });
  });
}

// Usage:
TodoItem(a, todo, store);
```

**Process**:
1. User selects widget subtree in hierarchy
2. Right-click → "Extract Component"
3. Editor generates function with parameters
4. Replaces inline code with function call
5. Adds function definition to file

### 6.4 Template/Snippet Library
**Goal**: Drag-and-drop common UI patterns.

**Library**:
- Form with label + entry + button
- Filter buttons (All/Active/Completed)
- List with add/delete
- Dialog with OK/Cancel
- Toolbar with actions

**Storage**: JSON files in `.tsyne/templates/`
**Format**:
```json
{
  "name": "Filter Buttons",
  "description": "Three-state filter (All/Active/Completed)",
  "code": "a.hbox(() => {\n  a.button('All', () => setFilter('all'));\n  a.button('Active', () => setFilter('active'));\n  a.button('Completed', () => setFilter('completed'));\n});",
  "parameters": {
    "setFilter": "function"
  }
}
```

### 6.5 Diff View (Git Integration)
**Goal**: Show visual diff of UI changes.

**UI**: Side-by-side comparison
```
┌───────────────────────────┬───────────────────────────┐
│ Before (main branch)      │ After (current changes)   │
├───────────────────────────┼───────────────────────────┤
│ ┌─────────────────────┐   │ ┌─────────────────────┐   │
│ │ TodoMVC             │   │ │ TodoMVC             │   │
│ │                     │   │ │                     │   │
│ │ Add New Todo:       │   │ │ Add New Todo:       │   │
│ │ [What...] [Add]     │   │ │ [What...] [Submit]  │ ← Changed
│ │                     │   │ │                     │   │
│ │ Filter:             │   │ │ Filter:             │   │
│ │ All Active Complete │   │ │ All Active Complete │   │
│ └─────────────────────┘   │ └─────────────────────┘   │
└───────────────────────────┴───────────────────────────┘
```

**Process**:
1. Load two versions of .ts file (git main vs working copy)
2. Execute both in design mode
3. Compare widget trees (diff algorithm)
4. Highlight changed/added/removed widgets

---

## Phase 7: File Format & Source Control

### 7.1 Source Control Compatibility
**Goal**: Clean diffs, no binary blobs.

**Approach**: Pure TypeScript (like Action! used pure Lisp)
- Save format: `.ts` (not `.nib`, not `.xib`)
- Human-readable code
- Meaningful diffs (changed text, not binary)

**Example Diff**:
```diff
diff --git a/examples/todomvc-ngshow.ts b/examples/todomvc-ngshow.ts
index 1234567..89abcdef 100644
--- a/examples/todomvc-ngshow.ts
+++ b/examples/todomvc-ngshow.ts
@@ -346,7 +346,7 @@
         a.hbox(() => {
           newTodoEntry = a.entry('What needs to be done?', undefined, 400);
-          a.button('Add', async () => {
+          a.button('Submit', async () => {
             const text = await newTodoEntry.getText();
             if (text && text.trim()) {
               store.addTodo(text);
```

**Clean!** Just like editing in a text editor.

### 7.2 Comments & Documentation
**Goal**: Preserve and encourage code comments.

**Features**:
- Add comment to widget in property inspector
- Generates JSDoc-style comment above widget:
  ```typescript
  /**
   * Submit button - adds new todo to store
   */
  a.button('Submit', async () => {
    // ...
  });
  ```
- Preserve existing comments when editing

### 7.3 Metadata Storage (Optional)
**Challenge**: Some design-time metadata doesn't belong in .ts file.

**Examples**:
- Widget selection state (which widget is selected)
- Collapsed/expanded state in hierarchy tree
- Window position/size of WYSIWYG editor

**Solution**: Separate `.tsyne-meta.json` file (gitignored)
```json
{
  "todomvc-ngshow.ts": {
    "selectedWidget": "button-add-347:27",
    "expandedNodes": ["vbox-336", "hbox-345"],
    "editorLayout": {
      "treeWidth": 300,
      "previewWidth": 600
    }
  }
}
```

---

## Implementation Roadmap

### Milestone 1: Proof of Concept (4-6 weeks)
**Goal**: Execute simple Tsyne app in design mode, show in visual editor, edit one property, save back.

**Deliverables**:
- [ ] Designer library swap (Module.require or sed-based)
- [ ] DesignModeApp (intercept widget creation, capture stack traces)
- [ ] Simple widget tree UI (read-only)
- [ ] Property inspector (read-only)
- [ ] Edit one property (button text)
- [ ] Save back to .ts file (text replacement)
- [ ] Round-trip test (load → edit → save → load)

**Test Cases**:
- `examples/hello.ts` (simplest possible Tsyne app)
- `examples/calculator.ts` (good example with grid layout and event handlers)

### Milestone 2: Full Widget Support (6-8 weeks)
**Goal**: Support all Tsyne widgets, layouts, properties.

**Deliverables**:
- [ ] Support all widget types (vbox, hbox, label, button, entry, checkbox, etc.)
- [ ] Support all layouts (grid, scroll, split, tabs, etc.)
- [ ] Property editing for all properties (text, width, height, etc.)
- [ ] Add/remove widgets
- [ ] Reorder widgets (drag-and-drop)

**Test Case**: `examples/advanced-widgets.ts` (card, accordion, form, etc.)

### Milestone 3: Imperative Code Preservation (8-10 weeks)
**Goal**: Preserve event handlers, state management, business logic.

**Deliverables**:
- [ ] Event handler preservation (source code capture)
- [ ] Event handler editing (Monaco code editor)
- [ ] State management preservation (class definitions, variables)
- [ ] Function preservation (utility functions)
- [ ] Import preservation
- [ ] Mock data provision for simple loops

**Test Cases**:
- `test-apps/calculator-advanced/calculator-ui.ts` (clean MVC separation with CalculatorLogic class)
- Simple apps with basic event handlers and state

### Milestone 4: Live Preview & Testing (10-12 weeks)
**Goal**: Live preview mode, test integration. Hot reload is stretch goal.

**Deliverables**:
- [ ] Design mode (stubbed handlers)
- [ ] Preview mode (real handlers)
- [ ] Test integration (run TsyneTest from editor)
- [ ] Hot reload (stretch goal - incremental updates)

**Test Cases**:
- `examples/calculator.ts` with test harness
- `test-apps/calculator-advanced/calculator.test.ts` (TsyneTest integration tests)

### Milestone 5: Ultimate Validation (12-16 weeks)
**Goal**: Handle the most complex Tsyne application - TodoMVC with full ng-repeat, ngShow, observables, and state management. Plus advanced features.

**Deliverables**:
- [ ] Advanced mock data provision (Observable system, TodoStore)
- [ ] ng-repeat style binding support (`.model().trackBy().each()`)
- [ ] ngShow directive handling (visibility predicates)
- [ ] **Design-time state preview** - toggle isEditing, filter, etc. in ribbon/palette
- [ ] Auto-detect state variables from ngShow predicates
- [ ] State toggle UI (boolean radio buttons, enum selectors)
- [ ] Component extraction
- [ ] Template/snippet library
- [ ] Diff view (Git integration)
- [ ] State graph visualization

**Test Case**: `examples/todomvc-ngshow.ts` - The ultimate test!
- Observable system with change listeners
- TodoStore class with file I/O (needs mocking)
- ng-repeat style loops: `.model(allTodos).trackBy().each()`
- ngShow visibility directives
- Complex event handlers with closures
- Edit mode toggle state (isEditing)
- Filter state management
- Round-trip editing must preserve ALL imperative logic

**Success Criteria**: Load todomvc-ngshow.ts → Edit UI visually → Save → App runs identically

---

## Technical Stack

### Frontend (WYSIWYG Editor UI)
- **Framework**: Electron or Tauri (desktop app)
- **UI**: React or Vue (editor panels, property inspector)
- **Code Editor**: Monaco Editor (for event handler editing)
- **Preview**: Embedded Tsyne app (via bridge)

### Backend (Code Analysis & Generation)
- **TypeScript Parser**: TypeScript Compiler API (`ts.createSourceFile`)
- **AST Manipulation**: TypeScript Factory API (`ts.factory`)
- **Code Formatting**: Prettier or `ts.createPrinter`
- **Execution**: `ts-node` or `esbuild` (compile & run on-the-fly)

### Testing
- **Unit Tests**: Jest (AST manipulation, code generation)
- **Integration Tests**: TsyneTest (round-trip editing)
- **E2E Tests**: Playwright (WYSIWYG editor UI)

---

## Risks & Mitigations

### Risk 1: TypeScript Complexity
**Problem**: TypeScript is a full programming language with complex syntax (loops, conditionals, generics, etc.).

**Mitigation**:
- Start with simple apps (no loops/conditionals)
- Identify and preserve "complex" code regions (don't try to visualize them)
- Show complex code in "Code View" tab (Monaco editor)
- Warn user if editing could break complex logic

### Risk 2: AST Manipulation Bugs
**Problem**: AST updates could corrupt code or break TypeScript compilation.

**Mitigation**:
- Comprehensive test suite (round-trip tests)
- TypeScript compilation check before saving
- Backup original file before saving
- Undo/redo stack (track AST versions)

### Risk 3: Performance (Large Apps)
**Problem**: Re-executing large apps on every edit could be slow.

**Mitigation**:
- Incremental updates (only re-execute changed widgets)
- Debounced full reload (500ms after last edit)
- Virtual scrolling in widget tree (large hierarchies)
- Lazy loading (don't execute non-visible windows)

### Risk 4: User Expectations
**Problem**: Users expect full WYSIWYG (like Interface Builder), but Tsyne's pseudo-declarative nature has limits.

**Mitigation**:
- Clear documentation of limitations
- "Code View" tab always available (escape hatch)
- Warn when visual editing could break imperative code
- Focus on 80% use case (simple UI layout editing)

---

## Success Criteria

### Must Have (MVP)
1. ✅ Load any Tsyne `.ts` file
2. ✅ Display UI in visual editor (widget tree + live preview)
3. ✅ Edit widget properties (text, dimensions)
4. ✅ Add/remove/reorder widgets
5. ✅ Save back to `.ts` file
6. ✅ Preserve imperative code (event handlers, state, logic)
7. ✅ Source-control compatible (readable diffs)

### Should Have (v1.0)
1. ✅ Event handler editing (Monaco code editor)
2. ✅ Live preview mode (real handlers)
3. ✅ Hot reload (incremental updates)
4. ✅ Test integration (run TsyneTest)
5. ✅ Component extraction
6. ✅ Template library

### Could Have (v2.0)
1. ✅ Visual logic builder (drag-and-drop event handlers)
2. ✅ State graph visualization
3. ✅ Diff view (Git integration)
4. ✅ AI-assisted layout suggestions
5. ✅ Collaborative editing (multiple users)

---

## Comparison to Historical Interface Builders

### Action! (1988) - Lisp
- ✅ Saved in Lisp (source-control compatible)
- ✅ Executed into live, modifiable context
- ✅ Round-trip editing (Vi/Emacs ↔ WYSIWYG)
- ✅ Fully dynamic (modify while running)
- ❌ Binary formats? No!

### AngularJS Design Mode (2012) - Paul Hammant
- ✅ Show all UI states for documentation
- ✅ All conditional branches visible simultaneously
- ✅ Template syntax visible (Mustache/Handlebars)
- ✅ No JavaScript execution needed
- ⚠️  All states shown at once (not toggleable)
- 📝 Blog: [The Importance of Design Mode for Client-Side MVC](https://paulhammant.com/2012/03/12/the-importance-of-design-mode-for-client-side-mvc/)
- 📝 Showcase: [Story Navigator](https://paul-hammant-fork.github.io/StoryNavigator/navigator.html)

### NeXT Interface Builder (1988) - .nib
- ❌ Saved in binary resource forks (.nib)
- ❌ Not source-control compatible (binary)
- ❌ Not round-trip editable (IB only)
- ✅ Visual editing (WYSIWYG)

### Apple Interface Builder (2000s) - .xib
- ✅ Saved in XML (.xib)
- ✅ Source-control compatible (readable XML)
- ⚠️  Round-trip editing (IB only, XML is painful)
- ✅ Visual editing (WYSIWYG)

### **Tsyne WYSIWYG (2025) - .ts**
- ✅ Saved in TypeScript (.ts) - **like Action! used Lisp!**
- ✅ Source-control compatible (readable code)
- ✅ Round-trip editing (WYSIWYG ↔ any editor)
- ✅ Visual editing (WYSIWYG)
- ✅ Preserves imperative code (pseudo-declarative nature)
- ✅ Execute into design context (like Action!)
- ✅ **State preview toggles** (like AngularJS design mode, but toggleable!)
- ✅ Toggle between UI states: isEditing, filter, etc.
- ✅ Designer comments for state defaults (`@designer-state`)

**Tsyne WYSIWYG combines**:
- **Action!'s execution-based editing** (execute into design context)
- **AngularJS design mode's state preview** (but with toggles, not simultaneous display)
- **Modern TypeScript tooling** (Monaco editor, hot reload, LLM assistance)

---

## Conclusion

The Tsyne WYSIWYG Interface Builder will bring the elegance of Action!'s Lisp-based approach to modern TypeScript desktop development. By **executing code into a design context** (not just parsing), we can provide true WYSIWYG editing while preserving the imperative, pseudo-declarative nature of Tsyne applications.

Key innovations:
1. **TypeScript as markup** (like Action! used Lisp)
2. **Execution-based editing** (not parsing-based)
3. **Imperative code preservation** (event handlers, state, logic)
4. **Source-control friendly** (readable .ts files, clean diffs)
5. **Round-trip editing** (WYSIWYG ↔ any text editor)

This plan provides a clear roadmap from proof-of-concept to production-ready WYSIWYG editor, with milestones, technical stack, and risk mitigations. The result will be a tool that honors both the visual design workflow (like Interface Builder) and the code-centric workflow (like Action!'s round-trip editing).

**Next Steps**:
1. Validate approach with simple prototype (Milestone 1)
2. Gather feedback from Tsyne users
3. Iterate on design based on real-world usage
4. Build toward Milestone 5 (production release)

---

*Inspired by Denny Bollay's Action! (1988) - "The most sophisticated and interactive interface tool ever built, 25 years ahead of its time."*
