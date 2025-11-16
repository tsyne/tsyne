# Resource Registration & gRPC Upgrade Plan

## Overview

This document outlines a phased approach to optimize Jyne's bridge architecture by introducing:
1. **Resource Registration** - Reusable image assets to eliminate redundant data transfer
2. **Incremental Updates** - Update widgets in-place without rebuilding widget trees
3. **Atomic Operations** - Race-condition-free widget tree replacement
4. **gRPC Protocol** - High-performance binary protocol replacing JSON-RPC over stdin/stdout

## Current Problems

### Problem 1: Massive Data Redundancy
Chess example: `rebuildUI()` sends **960KB** of image data (64 squares × 15KB each) every time "New Game" is clicked. The same light/dark square images are sent 32 times each.

### Problem 2: Race Conditions in Widget Replacement
When `setContent()` replaces a widget tree:
1. Old widgets deleted → `customIds["square-e2"]` removed
2. **Gap of 20-50ms where map entry doesn't exist**
3. New widgets created → `customIds["square-e2"]` re-added
4. Tests querying during the gap get `null`

### Problem 3: JSON-RPC Performance Overhead
- Text-based serialization (stringify/parse)
- No compression
- No streaming
- ~15KB per createImage message vs ~30 bytes with binary protocol

---

## Phase 1: Resource Registration (Quick Win)

**Timeline:** 1-2 days
**Impact:** 96% reduction in data transfer for chess (960KB → 3.2KB)

### 1.1 Bridge Changes

**New File:** `bridge/resources.go`

```go
package main

import (
	"encoding/base64"
	"fmt"
	"log"
	"sync"
)

// Add to Bridge struct in bridge.go:
type Bridge struct {
	// ... existing fields ...
	resources map[string][]byte // resourceName → decoded image data
	mu        sync.RWMutex
}

func (b *Bridge) handleRegisterResource(msg Message) {
	resourceName, ok := msg.Payload["name"].(string)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing or invalid 'name' parameter",
		})
		return
	}

	resourceData, ok := msg.Payload["data"].(string)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing or invalid 'data' parameter",
		})
		return
	}

	log.Printf("[DEBUG] handleRegisterResource: name=%s, dataLen=%d", resourceName, len(resourceData))

	// Decode base64
	imgData, err := base64.StdEncoding.DecodeString(resourceData)
	if err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Invalid base64 data: %v", err),
		})
		return
	}

	// Store resource
	b.mu.Lock()
	if b.resources == nil {
		b.resources = make(map[string][]byte)
	}
	b.resources[resourceName] = imgData
	b.mu.Unlock()

	log.Printf("[DEBUG] Resource registered: %s (%d bytes)", resourceName, len(imgData))

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUnregisterResource(msg Message) {
	resourceName, ok := msg.Payload["name"].(string)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing or invalid 'name' parameter",
		})
		return
	}

	b.mu.Lock()
	delete(b.resources, resourceName)
	b.mu.Unlock()

	log.Printf("[DEBUG] Resource unregistered: %s", resourceName)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) getResource(name string) ([]byte, bool) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	data, exists := b.resources[name]
	return data, exists
}
```

**Modify:** `bridge/widget_creators.go`

```go
func (b *Bridge) handleCreateImage(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	var imgData []byte
	var err error

	// Check if using resource reference or inline data
	if resourceName, ok := msg.Payload["resource"].(string); ok {
		// Load from registered resource
		log.Printf("[DEBUG] Creating image from resource: %s", resourceName)
		var exists bool
		imgData, exists = b.getResource(resourceName)
		if !exists {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Resource not found: %s", resourceName),
			})
			return
		}
	} else if source, ok := msg.Payload["source"].(string); ok {
		// Existing inline base64 data path
		log.Printf("[DEBUG] Creating image from inline data")
		imgData, err = decodeImageSource(source)
		if err != nil {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode image: %v", err),
			})
			return
		}
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Must provide either 'resource' or 'source' parameter",
		})
		return
	}

	// Create Fyne image from data
	img := canvas.NewImageFromReader(bytes.NewReader(imgData), widgetID)

	// ... rest of existing createImage logic ...
}
```

**Register handlers in:** `bridge/bridge.go`

```go
func (b *Bridge) handleMessage(msg Message) {
	switch msg.Method {
	// ... existing handlers ...
	case "registerResource":
		b.handleRegisterResource(msg)
	case "unregisterResource":
		b.handleUnregisterResource(msg)
	// ... rest ...
	}
}
```

### 1.2 TypeScript API Changes

**New File:** `src/resources.ts`

```typescript
import { Context } from './context';

export class ResourceManager {
  private ctx: Context;
  private registeredResources: Set<string> = new Set();

  constructor(ctx: Context) {
    this.ctx = ctx;
  }

  /**
   * Register a reusable image resource
   * @param name - Unique resource name (e.g., "chess-light-square")
   * @param data - Base64 encoded image data
   */
  async registerResource(name: string, data: string): Promise<void> {
    if (this.registeredResources.has(name)) {
      throw new Error(`Resource already registered: ${name}`);
    }

    await this.ctx.bridge.send('registerResource', {
      name,
      data
    });

    this.registeredResources.add(name);
  }

  /**
   * Unregister a resource to free memory
   */
  async unregisterResource(name: string): Promise<void> {
    if (!this.registeredResources.has(name)) {
      return; // Already unregistered or never registered
    }

    await this.ctx.bridge.send('unregisterResource', {
      name
    });

    this.registeredResources.delete(name);
  }

  /**
   * Check if a resource is registered
   */
  isRegistered(name: string): boolean {
    return this.registeredResources.has(name);
  }

  /**
   * Get all registered resource names
   */
  getRegisteredResources(): string[] {
    return Array.from(this.registeredResources);
  }
}
```

**Modify:** `src/app.ts`

```typescript
import { ResourceManager } from './resources';

export class App {
  private ctx: Context;
  public resources: ResourceManager;

  constructor() {
    this.ctx = new Context();
    this.resources = new ResourceManager(this.ctx);
  }

  // ... existing methods ...
}
```

**Modify:** `src/widgets.ts` - Add resource parameter to Image

```typescript
export interface ImageOptions {
  id?: string;
  src?: string;          // Inline base64 (existing)
  resource?: string;     // Resource name (new)
  width?: number;
  height?: number;
  onClick?: () => void;
  onDrag?: (x: number, y: number) => void;
}

export function createImage(ctx: Context, options: ImageOptions): string {
  const widgetId = ctx.generateId('image');

  if (!options.src && !options.resource) {
    throw new Error('Image must have either src or resource');
  }

  if (options.src && options.resource) {
    throw new Error('Image cannot have both src and resource');
  }

  const payload: any = {
    widgetId
  };

  if (options.resource) {
    payload.resource = options.resource;
  } else {
    payload.source = options.src;
  }

  // ... rest of existing logic ...
}
```

### 1.3 Chess Implementation

**Modify:** `examples/chess/chess.ts`

```typescript
export class ChessUI {
  private app!: App;
  private window!: Window;
  private resourcesRegistered = false;

  /**
   * Pre-register all chess piece and square images as reusable resources
   */
  private async registerChessResources(): Promise<void> {
    if (this.resourcesRegistered) {
      return; // Already registered
    }

    console.log('Registering chess resources...');

    // Register empty light and dark squares
    const lightSquare = await this.renderSquare(0, 0, null); // Light square, no piece
    const darkSquare = await this.renderSquare(1, 0, null);  // Dark square, no piece

    await this.app.resources.registerResource('chess-square-light', lightSquare);
    await this.app.resources.registerResource('chess-square-dark', darkSquare);

    // Register all 12 piece types on transparent background (80x80px)
    const pieceTypes: Array<{ color: 'w' | 'b', type: PieceSymbol }> = [
      { color: 'w', type: 'k' }, { color: 'w', type: 'q' }, { color: 'w', type: 'r' },
      { color: 'w', type: 'b' }, { color: 'w', type: 'n' }, { color: 'w', type: 'p' },
      { color: 'b', type: 'k' }, { color: 'b', type: 'q' }, { color: 'b', type: 'r' },
      { color: 'b', type: 'b' }, { color: 'b', type: 'n' }, { color: 'b', type: 'p' },
    ];

    for (const { color, type } of pieceTypes) {
      const pieceName = this.getPieceName({ color, type });
      const pieceImage = await this.renderPieceImage(pieceName);
      await this.app.resources.registerResource(`chess-piece-${pieceName}`, pieceImage);
    }

    this.resourcesRegistered = true;
    console.log('Chess resources registered (14 total)');
  }

  /**
   * Render a single piece on transparent background (80x80px)
   */
  private async renderPieceImage(pieceName: string): Promise<string> {
    const svgPath = path.join(__dirname, 'pieces', `${pieceName}.svg`);
    const svgBuffer = await fs.promises.readFile(svgPath);

    const pngBuffer = await renderAsync(svgBuffer, {
      fitTo: {
        mode: 'width',
        value: 80,
      },
    });

    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  }

  /**
   * Render a complete square (100x100px with piece if present)
   */
  private async renderSquare(file: number, rank: number, piece: Piece | null): Promise<string> {
    const isLight = (file + rank) % 2 === 0;
    const squareColor = isLight ? this.lightSquareColor : this.darkSquareColor;

    // Create 100x100 canvas with square color
    // If piece exists, composite piece image on top
    // Return base64 PNG

    // ... existing rendering logic ...
  }

  /**
   * Build UI using resource references instead of inline images
   */
  private buildUI(window: Window): void {
    window.setContent(() => {
      app.createVBox(() => {
        // New Game button
        app.createHBox(() => {
          app.createButton({
            text: 'New Game',
            onClick: () => this.newGame()
          });
        });

        // Status label
        app.createLabel({
          text: this.getStatusText(),
          id: 'status-label'
        });

        // Chess board - 8 rows (ranks 8 down to 1)
        for (let rank = 0; rank < 8; rank++) {
          app.createHBox(() => {
            for (let file = 0; file < 8; file++) {
              const isLight = (file + rank) % 2 === 0;
              const piece = this.game.get(this.coordsToSquare(file, rank));

              // Reference registered resource instead of inline data
              const resourceName = isLight
                ? 'chess-square-light'
                : 'chess-square-dark';

              app.createImage({
                id: `square-${this.coordsToSquare(file, rank)}`,
                resource: resourceName,  // ← CHANGED: Use resource reference
                width: 100,
                height: 100,
                onClick: () => this.handleSquareClick(file, rank),
                onDrag: (x, y) => this.handleSquareDrag(file, rank, x, y)
              });

              this.squares[rank][file] = /* store reference */;
            }
          });
        }
      });
    });
  }

  async run(app: App): Promise<void> {
    this.app = app;

    // Register resources BEFORE building UI
    await this.registerChessResources();

    this.window = app.createWindow({
      title: 'Chess',
      width: 800,
      height: 880,
      fixedSize: true
    });

    this.buildUI(this.window);
    await this.window.show();
  }
}
```

### 1.4 Testing

**New test:** `examples/chess/chess-resources.test.ts`

```typescript
import { TsyneTest, TestContext } from '../../src/index-test';
import { App } from '../../src/app';

describe('Chess Resource Registration', () => {
  let tsyneTest: TsyneTest;
  let app: App;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    app = tsyneTest.app;
  }, 10000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('registers chess resources at startup', async () => {
    // Register a test resource
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await app.resources.registerResource('test-square', testImage);

    expect(app.resources.isRegistered('test-square')).toBe(true);
  });

  test('creates images from registered resources', async () => {
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await app.resources.registerResource('test-resource', testImage);

    const testApp = await tsyneTest.createApp((app) => {
      const win = app.createWindow({ title: 'Test' });
      win.setContent(() => {
        app.createImage({
          id: 'test-img',
          resource: 'test-resource'
        });
      });
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify image exists
    await ctx.expect(ctx.getByID('test-img')).toBeVisible();
  });

  test('throws error for unregistered resource', async () => {
    // Attempt to create image with non-existent resource
    // Should fail gracefully
    // ... test error handling ...
  });
});
```

### 1.5 Deliverables

- [ ] `bridge/resources.go` - Resource management
- [ ] Modified `bridge/widget_creators.go` - Support resource references
- [ ] `src/resources.ts` - Resource manager API
- [ ] Modified `src/widgets.ts` - Image widget supports `resource` param
- [ ] Modified `examples/chess/chess.ts` - Use resource registration
- [ ] `examples/chess/chess-resources.test.ts` - Resource tests
- [ ] Documentation in `README.md`

### 1.6 Success Metrics

- Chess "New Game" sends **<5KB** data (down from 960KB)
- Resource registration takes **<200ms** at startup
- All existing tests pass
- New resource tests pass

---

## Phase 2: Incremental Updates (Better Performance)

**Timeline:** 2-3 days
**Impact:** Eliminates need for `rebuildUI()` during gameplay

### 2.1 Widget Update API

**New File:** `bridge/widget_updates.go`

```go
func (b *Bridge) handleUpdateImageSource(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	img, ok := obj.(*canvas.Image)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an image",
		})
		return
	}

	// Get new image data (from resource or inline)
	var imgData []byte
	if resourceName, ok := msg.Payload["resource"].(string); ok {
		var resourceExists bool
		imgData, resourceExists = b.getResource(resourceName)
		if !resourceExists {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Resource not found: %s", resourceName),
			})
			return
		}
	} else if source, ok := msg.Payload["source"].(string); ok {
		var err error
		imgData, err = decodeImageSource(source)
		if err != nil {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode image: %v", err),
			})
			return
		}
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Must provide either 'resource' or 'source'",
		})
		return
	}

	// Update image on main thread
	fyne.DoAndWait(func() {
		newImg := canvas.NewImageFromReader(bytes.NewReader(imgData), widgetID)
		img.Resource = newImg.Resource
		img.Refresh()
	})

	log.Printf("[DEBUG] Updated image source for widget: %s", widgetID)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}
```

### 2.2 TypeScript Update API

**Modify:** `src/widgets.ts`

```typescript
export class ImageWidget {
  private widgetId: string;
  private ctx: Context;

  constructor(ctx: Context, widgetId: string) {
    this.ctx = ctx;
    this.widgetId = widgetId;
  }

  /**
   * Update the image source without recreating the widget
   */
  async updateSource(options: { resource?: string; src?: string }): Promise<void> {
    if (!options.resource && !options.src) {
      throw new Error('Must provide either resource or src');
    }

    if (options.resource && options.src) {
      throw new Error('Cannot provide both resource and src');
    }

    const payload: any = {
      widgetId: this.widgetId
    };

    if (options.resource) {
      payload.resource = options.resource;
    } else {
      payload.source = options.src;
    }

    await this.ctx.bridge.send('updateImageSource', payload);
  }
}

// Modify createImage to return ImageWidget instance
export function createImage(ctx: Context, options: ImageOptions): ImageWidget {
  const widgetId = ctx.generateId('image');

  // ... existing creation logic ...

  // Return widget instance for updates
  return new ImageWidget(ctx, widgetId);
}
```

### 2.3 Chess Incremental Updates

**Modify:** `examples/chess/chess.ts`

```typescript
export class ChessUI {
  private squares: ImageWidget[][] = [];

  /**
   * Update a single square's appearance (incremental update)
   */
  private async updateSquare(file: number, rank: number): Promise<void> {
    const isLight = (file + rank) % 2 === 0;
    const piece = this.game.get(this.coordsToSquare(file, rank));

    const squareWidget = this.squares[rank][file];

    if (piece) {
      // Show piece on square
      const pieceName = this.getPieceName(piece);
      await squareWidget.updateSource({
        resource: `chess-piece-${pieceName}`
      });
    } else {
      // Show empty square
      const resourceName = isLight
        ? 'chess-square-light'
        : 'chess-square-dark';
      await squareWidget.updateSource({
        resource: resourceName
      });
    }
  }

  /**
   * Handle piece movement with incremental updates
   */
  private async handleMove(from: Square, to: Square): Promise<void> {
    // Make move in game engine
    const move = this.game.move({ from, to });
    if (!move) {
      return; // Invalid move
    }

    // Update only the affected squares (incremental!)
    const fromCoords = this.squareToCoords(from);
    const toCoords = this.squareToCoords(to);

    await this.updateSquare(fromCoords.file, fromCoords.rank);
    await this.updateSquare(toCoords.file, toCoords.rank);

    // Update status
    await this.updateStatus();

    // Computer's turn
    if (!this.game.isGameOver()) {
      await this.makeComputerMove();
    }
  }

  /**
   * Computer move with incremental updates
   */
  private async makeComputerMove(): Promise<void> {
    this.isComputerThinking = true;
    await this.updateStatus('Computer is thinking...');

    const isTestMode = process.env.JEST_WORKER_ID !== undefined;
    const delay = isTestMode ? 10 : 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    const moves = this.game.moves({ verbose: true });
    if (moves.length === 0) {
      return;
    }

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    this.game.move({ from: randomMove.from, to: randomMove.to });

    // Update only the two squares that changed
    const fromCoords = this.squareToCoords(randomMove.from as Square);
    const toCoords = this.squareToCoords(randomMove.to as Square);

    await this.updateSquare(fromCoords.file, fromCoords.rank);
    await this.updateSquare(toCoords.file, toCoords.rank);

    this.isComputerThinking = false;
    await this.updateStatus();
  }

  /**
   * New game - NOW uses incremental updates instead of rebuildUI()
   */
  private async newGame(): Promise<void> {
    this.game.reset();
    this.selectedSquare = null;

    // Update ALL 64 squares incrementally (still faster than rebuildUI!)
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        await this.updateSquare(file, rank);
      }
    }

    await this.updateStatus('New game started');
  }
}
```

### 2.4 Deliverables

- [ ] `bridge/widget_updates.go` - Widget update handlers
- [ ] Modified `src/widgets.ts` - Widget update methods
- [ ] Modified `examples/chess/chess.ts` - Incremental updates
- [ ] Updated tests to verify incremental updates
- [ ] Performance benchmarks

### 2.5 Success Metrics

- Piece moves update **2 squares** only (not 64)
- "New Game" updates **64 squares** incrementally (no widget destruction)
- No `rebuildUI()` called during gameplay
- E2E tests pass reliably (no race conditions)

---

## Phase 3: Atomic Operations (Race-Free Rebuilds)

**Timeline:** 3-4 days
**Impact:** Eliminates race conditions for scenarios requiring full tree replacement

### 3.1 Atomic SetContent Protocol

**New File:** `bridge/atomic_operations.go`

```go
type WidgetTreeNode struct {
	Type       string                 `json:"type"`       // "VBox", "Image", etc.
	WidgetID   string                 `json:"widgetId"`
	CustomID   string                 `json:"customId"`   // Optional custom ID
	Properties map[string]interface{} `json:"properties"` // Widget-specific props
	Callbacks  map[string]string      `json:"callbacks"`  // event → callbackId
	Children   []WidgetTreeNode       `json:"children"`   // Child widgets
}

func (b *Bridge) handleSetContentAtomic(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	treeData := msg.Payload["tree"].(map[string]interface{})

	log.Printf("[DEBUG] handleSetContentAtomic for window: %s", windowID)

	// Parse tree structure
	var tree WidgetTreeNode
	if err := mapToStruct(treeData, &tree); err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Invalid tree structure: %v", err),
		})
		return
	}

	// CRITICAL: Hold lock for entire operation
	b.mu.Lock()
	defer b.mu.Unlock()

	// 1. Get window
	win, winExists := b.windows[windowID]
	if !winExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	// 2. Remove old widget tree
	if oldContentID, exists := b.windowContent[windowID]; exists && oldContentID != "" {
		b.removeWidgetTree(oldContentID) // Already holding lock
	}

	// 3. Build new widget tree (collects customId mappings)
	rootWidget, customIdMappings, err := b.buildWidgetTreeFromNode(&tree)
	if err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to build widget tree: %v", err),
		})
		return
	}

	// 4. Register ALL custom IDs atomically (still holding lock!)
	for customId, widgetId := range customIdMappings {
		b.customIds[customId] = widgetId
		log.Printf("[DEBUG] Registered customId: %s → %s", customId, widgetId)
	}

	// 5. Set window content (on main thread, but we still hold lock)
	fyne.DoAndWait(func() {
		win.SetContent(rootWidget)
	})

	// 6. Update tracking
	b.windowContent[windowID] = tree.WidgetID

	log.Printf("[DEBUG] Atomic setContent complete: %d widgets, %d customIds",
		len(customIdMappings), len(customIdMappings))

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) buildWidgetTreeFromNode(node *WidgetTreeNode) (
	fyne.CanvasObject,
	map[string]string,
	error,
) {
	customIds := make(map[string]string)

	// Track custom ID if present
	if node.CustomID != "" {
		customIds[node.CustomID] = node.WidgetID
	}

	var widget fyne.CanvasObject

	switch node.Type {
	case "VBox":
		container := container.NewVBox()
		b.widgets[node.WidgetID] = container

		for _, childNode := range node.Children {
			childWidget, childCustomIds, err := b.buildWidgetTreeFromNode(&childNode)
			if err != nil {
				return nil, nil, err
			}
			container.Add(childWidget)

			// Merge custom IDs
			for k, v := range childCustomIds {
				customIds[k] = v
			}
		}
		widget = container

	case "HBox":
		container := container.NewHBox()
		b.widgets[node.WidgetID] = container

		for _, childNode := range node.Children {
			childWidget, childCustomIds, err := b.buildWidgetTreeFromNode(&childNode)
			if err != nil {
				return nil, nil, err
			}
			container.Add(childWidget)

			for k, v := range childCustomIds {
				customIds[k] = v
			}
		}
		widget = container

	case "Image":
		// Get image data from resource or inline
		var imgData []byte
		if resourceName, ok := node.Properties["resource"].(string); ok {
			var exists bool
			imgData, exists = b.getResource(resourceName)
			if !exists {
				return nil, nil, fmt.Errorf("resource not found: %s", resourceName)
			}
		} else if source, ok := node.Properties["source"].(string); ok {
			var err error
			imgData, err = decodeImageSource(source)
			if err != nil {
				return nil, nil, err
			}
		} else {
			return nil, nil, fmt.Errorf("image must have resource or source")
		}

		img := canvas.NewImageFromReader(bytes.NewReader(imgData), node.WidgetID)
		b.widgets[node.WidgetID] = img

		// Register callbacks
		if node.Callbacks != nil {
			if clickCallbackId, ok := node.Callbacks["click"]; ok {
				// Create clickable wrapper
				// ... callback registration logic ...
			}
		}

		widget = img

	case "Label":
		text := node.Properties["text"].(string)
		label := widget.NewLabel(text)
		b.widgets[node.WidgetID] = label
		widget = label

	case "Button":
		text := node.Properties["text"].(string)
		btn := widget.NewButton(text, nil)

		if clickCallbackId, ok := node.Callbacks["click"]; ok {
			btn.OnTapped = func() {
				b.sendEvent(Event{
					Type:     "callback",
					WidgetID: clickCallbackId,
				})
			}
		}

		b.widgets[node.WidgetID] = btn
		widget = btn

	default:
		return nil, nil, fmt.Errorf("unknown widget type: %s", node.Type)
	}

	// Store metadata
	b.widgetMeta[node.WidgetID] = WidgetMetadata{
		Type: node.Type,
		// ... other metadata ...
	}

	return widget, customIds, nil
}
```

### 3.2 TypeScript Atomic API

**New File:** `src/atomic.ts`

```typescript
import { Context } from './context';

export interface WidgetTreeNode {
  type: string;
  widgetId: string;
  customId?: string;
  properties?: Record<string, any>;
  callbacks?: Record<string, string>;
  children?: WidgetTreeNode[];
}

export class AtomicOperations {
  private ctx: Context;

  constructor(ctx: Context) {
    this.ctx = ctx;
  }

  /**
   * Atomically replace window content with a complete widget tree
   * No race conditions - all customIds registered in single atomic operation
   */
  async setContentAtomic(windowId: string, tree: WidgetTreeNode): Promise<void> {
    await this.ctx.bridge.send('setContentAtomic', {
      windowId,
      tree
    });
  }

  /**
   * Build a widget tree structure from declarative builder
   * Returns tree node ready for atomic replacement
   */
  buildTree(builder: () => void): WidgetTreeNode {
    // Capture widget creation calls and build tree structure
    // This is complex - needs to intercept widget creation

    const originalGenerateId = this.ctx.generateId.bind(this.ctx);
    const capturedNodes: WidgetTreeNode[] = [];
    let currentNode: WidgetTreeNode | null = null;

    // Temporarily override widget creators to capture structure
    // ... implementation details ...

    builder();

    return capturedNodes[0]; // Root node
  }
}
```

### 3.3 Usage Example

```typescript
// Option A: Explicit tree building (verbose but clear)
const tree: WidgetTreeNode = {
  type: 'VBox',
  widgetId: 'vbox_1',
  children: [
    {
      type: 'Button',
      widgetId: 'button_1',
      properties: { text: 'New Game' },
      callbacks: { click: 'callback_1' }
    },
    {
      type: 'HBox',
      widgetId: 'hbox_1',
      children: [
        {
          type: 'Image',
          widgetId: 'image_1',
          customId: 'square-a8',
          properties: { resource: 'chess-square-light' },
          callbacks: { click: 'callback_2' }
        }
        // ... more squares ...
      ]
    }
  ]
};

await app.atomic.setContentAtomic(window.id, tree);

// Option B: Builder pattern (more ergonomic)
await window.setContentAtomic(() => {
  app.createVBox(() => {
    app.createButton({ text: 'New Game' });
    // ... rest of UI ...
  });
});
```

### 3.4 Deliverables

- [ ] `bridge/atomic_operations.go` - Atomic tree replacement
- [ ] `src/atomic.ts` - TypeScript atomic API
- [ ] Modified `src/window.ts` - Add `setContentAtomic()` method
- [ ] Example usage in chess for "New Game"
- [ ] Tests verifying no race conditions
- [ ] Performance benchmarks vs incremental

### 3.5 Success Metrics

- **Zero race conditions** in E2E tests (run 100 times)
- Atomic replacement completes in **<50ms** for 64-widget tree
- All customIds registered before lock released
- Tests can query widgets immediately after `setContentAtomic()`

---

## Phase 4: gRPC Protocol Upgrade (Future)

**Timeline:** 1-2 weeks
**Impact:** 10x performance improvement, streaming support

### 4.1 Protocol Definition

**New File:** `bridge/proto/bridge.proto`

```protobuf
syntax = "proto3";

package bridge;

option go_package = "github.com/yourusername/jyne/bridge/proto";

service BridgeService {
  // Window operations
  rpc CreateWindow(CreateWindowRequest) returns (Response);
  rpc ShowWindow(ShowWindowRequest) returns (Response);
  rpc SetContent(SetContentRequest) returns (Response);
  rpc SetContentAtomic(SetContentAtomicRequest) returns (Response);

  // Widget creation
  rpc CreateImage(CreateImageRequest) returns (Response);
  rpc CreateLabel(CreateLabelRequest) returns (Response);
  rpc CreateButton(CreateButtonRequest) returns (Response);
  rpc CreateVBox(CreateVBoxRequest) returns (Response);
  rpc CreateHBox(CreateHBoxRequest) returns (Response);

  // Resources
  rpc RegisterResource(RegisterResourceRequest) returns (Response);
  rpc UnregisterResource(UnregisterResourceRequest) returns (Response);

  // Widget updates
  rpc UpdateImageSource(UpdateImageSourceRequest) returns (Response);

  // Interactions
  rpc ClickWidget(ClickWidgetRequest) returns (Response);
  rpc TypeText(TypeTextRequest) returns (Response);

  // Custom IDs
  rpc RegisterCustomId(RegisterCustomIdRequest) returns (Response);

  // Queries
  rpc FindWidget(FindWidgetRequest) returns (FindWidgetResponse);
  rpc GetWidgetInfo(GetWidgetInfoRequest) returns (WidgetInfo);

  // Events (streaming)
  rpc SubscribeEvents(EventSubscription) returns (stream Event);
}

message Response {
  bool success = 1;
  string error = 2;
}

message CreateWindowRequest {
  string window_id = 1;
  string title = 2;
  int32 width = 3;
  int32 height = 4;
  bool fixed_size = 5;
}

message CreateImageRequest {
  string widget_id = 1;
  oneof source {
    bytes inline_data = 2;      // Raw PNG/JPEG bytes
    string resource_name = 3;   // Reference to registered resource
  }
  int32 width = 4;
  int32 height = 5;
}

message RegisterResourceRequest {
  string name = 1;
  bytes data = 2;  // Raw image bytes (not base64!)
}

message SetContentAtomicRequest {
  string window_id = 1;
  WidgetTreeNode tree = 2;
}

message WidgetTreeNode {
  string type = 1;
  string widget_id = 2;
  string custom_id = 3;

  // Type-specific data (only one should be set)
  oneof widget_data {
    ImageData image = 10;
    LabelData label = 11;
    ButtonData button = 12;
    ContainerData container = 13;
  }

  repeated WidgetTreeNode children = 20;
  map<string, string> callbacks = 21;  // event → callbackId
}

message ImageData {
  oneof source {
    bytes inline = 1;
    string resource = 2;
  }
  int32 width = 3;
  int32 height = 4;
}

message LabelData {
  string text = 1;
}

message ButtonData {
  string text = 1;
}

message ContainerData {
  // Container-specific properties
}

message Event {
  string type = 1;        // "callback", "windowClosed", etc.
  string widget_id = 2;
  map<string, string> data = 3;
}

message EventSubscription {
  repeated string event_types = 1;  // Which events to subscribe to
}

message FindWidgetRequest {
  string selector = 1;
  string type = 2;  // "text", "id", "type"
}

message FindWidgetResponse {
  repeated string widget_ids = 1;
}

message GetWidgetInfoRequest {
  string widget_id = 1;
}

message WidgetInfo {
  string id = 1;
  string type = 2;
  string text = 3;
  float x = 4;
  float y = 5;
  float width = 6;
  float height = 7;
}

// ... more message types ...
```

### 4.2 Hybrid Bootstrap Architecture

**Modified:** `bridge/main.go`

```go
package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"os"

	"google.golang.org/grpc"
	pb "github.com/yourusername/jyne/bridge/proto"
)

func main() {
	mode := flag.String("mode", "stdio", "Communication mode: stdio or hybrid")
	flag.Parse()

	if *mode == "hybrid" {
		runHybridMode()
	} else {
		runStdioMode()
	}
}

func runHybridMode() {
	// 1. Find free port
	port := findFreePort()

	// 2. Generate secure token
	token := generateSecureToken(32)

	// 3. Start gRPC server in background
	grpcReady := make(chan bool)
	go func() {
		if err := startGrpcServer(port, token); err != nil {
			log.Fatalf("gRPC server failed: %v", err)
		}
		grpcReady <- true
	}()

	// Wait for server to be ready
	<-grpcReady

	// 4. Send connection info to TypeScript via stdout
	initMsg := map[string]interface{}{
		"grpcPort": port,
		"token":    token,
		"protocol": "grpc",
	}
	json.NewEncoder(os.Stdout).Encode(initMsg)

	// 5. Keep stdin open for shutdown signal
	// But don't process messages - gRPC handles all communication
	shutdownChan := make(chan bool)
	go func() {
		var input string
		fmt.Scanln(&input)
		if input == "shutdown" {
			shutdownChan <- true
		}
	}()

	<-shutdownChan
	log.Println("Bridge shutting down...")
}

func findFreePort() int {
	listener, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		log.Fatal(err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()
	return port
}

func generateSecureToken(length int) string {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func startGrpcServer(port int, token string) error {
	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%d", port))
	if err != nil {
		return err
	}

	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(tokenAuthInterceptor(token)),
		grpc.StreamInterceptor(tokenStreamInterceptor(token)),
	)

	bridge := NewBridge()
	pb.RegisterBridgeServiceServer(grpcServer, &grpcBridgeService{bridge: bridge})

	log.Printf("[gRPC] Server listening on port %d", port)
	return grpcServer.Serve(lis)
}

// Token authentication interceptor
func tokenAuthInterceptor(expectedToken string) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		// Extract token from metadata
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, fmt.Errorf("missing metadata")
		}

		tokens := md.Get("authorization")
		if len(tokens) == 0 || tokens[0] != expectedToken {
			return nil, fmt.Errorf("unauthorized")
		}

		return handler(ctx, req)
	}
}
```

### 4.3 TypeScript gRPC Client

**New File:** `src/grpc-bridge.ts`

```typescript
import { spawn, ChildProcess } from 'child_process';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { BridgeServiceClient } from './generated/bridge_grpc_pb';

export class GrpcBridge {
  private client?: BridgeServiceClient;
  private process: ChildProcess;
  private token?: string;

  async connect(): Promise<void> {
    // Start bridge process in hybrid mode
    this.process = spawn('./tsyne-bridge', ['--mode=hybrid']);

    // Wait for connection info on stdout
    const initPromise = new Promise<{ port: number; token: string }>((resolve, reject) => {
      this.process.stdout!.once('data', (data) => {
        try {
          const init = JSON.parse(data.toString());
          resolve({ port: init.grpcPort, token: init.token });
        } catch (err) {
          reject(err);
        }
      });

      this.process.stderr!.on('data', (data) => {
        console.error('[Bridge stderr]', data.toString());
      });

      setTimeout(() => reject(new Error('Timeout waiting for bridge')), 5000);
    });

    const { port, token } = await initPromise;
    this.token = token;

    // Create gRPC client
    const packageDefinition = await protoLoader.load(
      './bridge/proto/bridge.proto',
      {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      }
    );

    const proto = grpc.loadPackageDefinition(packageDefinition) as any;

    this.client = new proto.bridge.BridgeService(
      `localhost:${port}`,
      grpc.credentials.createInsecure(),
      {
        'grpc.max_receive_message_length': 100 * 1024 * 1024, // 100MB
      }
    );

    console.log(`[gRPC] Connected to bridge on port ${port}`);
  }

  async createWindow(request: CreateWindowRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const metadata = new grpc.Metadata();
      metadata.add('authorization', this.token!);

      this.client!.CreateWindow(request, metadata, (error, response) => {
        if (error) {
          reject(error);
        } else if (!response.success) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  async registerResource(name: string, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const metadata = new grpc.Metadata();
      metadata.add('authorization', this.token!);

      const request = {
        name,
        data  // Raw bytes, not base64!
      };

      this.client!.RegisterResource(request, metadata, (error, response) => {
        if (error) {
          reject(error);
        } else if (!response.success) {
          reject(new Error(response.error));
        } else {
          resolve();
        }
      });
    });
  }

  // ... other RPC methods ...

  shutdown(): void {
    if (this.process) {
      this.process.stdin!.write('shutdown\n');
      this.process.kill();
    }
  }
}
```

### 4.4 Migration Strategy

**Gradual migration:**
1. Keep stdio bridge working (default)
2. Add `--mode=hybrid` flag for opt-in gRPC
3. Migrate high-traffic operations first (createImage, registerResource)
4. Eventually make gRPC the default
5. Keep stdio as fallback for compatibility

**Feature flags:**
```typescript
const bridge = process.env.JYNE_BRIDGE_MODE === 'grpc'
  ? new GrpcBridge()
  : new StdioBridge();
```

### 4.5 Deliverables

- [ ] `bridge/proto/bridge.proto` - Protocol definition
- [ ] Generated Go code (`protoc-gen-go`)
- [ ] Generated TypeScript code (`protoc-gen-ts`)
- [ ] `bridge/grpc_server.go` - gRPC server implementation
- [ ] `src/grpc-bridge.ts` - TypeScript gRPC client
- [ ] Hybrid mode bootstrap in `bridge/main.go`
- [ ] Performance benchmarks (gRPC vs stdio)
- [ ] Migration guide
- [ ] Updated documentation

### 4.6 Success Metrics

- **10x throughput** improvement (messages/second)
- **5x latency** reduction (ms per operation)
- **50% bandwidth** reduction (binary vs JSON)
- Backward compatibility with stdio mode
- Zero downtime migration path

---

## Implementation Priority

### High Priority (Do First)
1. ✅ **Phase 1** - Resource Registration
   - Immediate 96% data reduction
   - Low risk, high reward
   - Foundation for other optimizations

2. ✅ **Phase 2** - Incremental Updates
   - Eliminates race conditions in normal gameplay
   - Better UX (faster updates)
   - Complements Phase 1

### Medium Priority (Do Soon)
3. ✅ **Phase 3** - Atomic Operations
   - Solves race conditions for edge cases
   - Needed for reliable E2E testing
   - Enables complex UI updates

### Low Priority (Future Enhancement)
4. ⚠️ **Phase 4** - gRPC Protocol
   - Significant engineering effort
   - Requires protobuf infrastructure
   - Breaking change (needs migration)
   - Consider after Phases 1-3 proven successful

---

## Testing Strategy

### Phase 1 Tests
- Resource registration/unregistration
- Image creation from resources
- Memory usage (resources shared vs duplicated)
- Error handling (missing resources)

### Phase 2 Tests
- Single widget updates
- Multiple widget updates
- Update performance vs rebuild
- State consistency during updates

### Phase 3 Tests
- Atomic replacement with 100+ widgets
- Race condition stress tests (100 iterations)
- Custom ID consistency
- Rollback on failure

### Phase 4 Tests
- gRPC bootstrap sequence
- Authentication token validation
- Message throughput benchmarks
- Fallback to stdio on gRPC failure
- Cross-protocol compatibility

---

## Documentation Needs

- [ ] Resource registration API docs
- [ ] Widget update patterns guide
- [ ] Atomic operations tutorial
- [ ] gRPC migration guide
- [ ] Performance optimization best practices
- [ ] Architecture decision records (ADRs)

---

## Success Criteria

**Phase 1:**
- [ ] Chess uses <5KB per rebuildUI()
- [ ] All existing tests pass
- [ ] Resource API documented

**Phase 2:**
- [ ] Chess gameplay uses incremental updates
- [ ] No rebuildUI() during normal play
- [ ] E2E tests 100% reliable

**Phase 3:**
- [ ] Zero race conditions in tests
- [ ] Atomic setContent documented
- [ ] Chess "New Game" uses atomic replacement

**Phase 4:**
- [ ] gRPC mode available
- [ ] 10x performance improvement measured
- [ ] Migration path documented
- [ ] Backward compatibility maintained

---

## Risk Assessment

### Phase 1 Risks
- **Low Risk** - Additive change, doesn't break existing code
- Mitigation: Feature flag for resource mode

### Phase 2 Risks
- **Medium Risk** - Changing update patterns could introduce bugs
- Mitigation: Comprehensive tests, gradual rollout

### Phase 3 Risks
- **Medium Risk** - Complex locking, potential deadlocks
- Mitigation: Thorough code review, stress testing

### Phase 4 Risks
- **High Risk** - Major architectural change
- Mitigation: Hybrid mode, gradual migration, extensive testing

---

## Timeline Estimate

| Phase | Duration | Effort | Risk |
|-------|----------|--------|------|
| Phase 1 | 2 days | Low | Low |
| Phase 2 | 3 days | Medium | Medium |
| Phase 3 | 4 days | High | Medium |
| Phase 4 | 10 days | Very High | High |
| **Total** | **19 days** | | |

**Recommended:** Complete Phases 1-3 first (9 days), evaluate benefits, then decide on Phase 4.
