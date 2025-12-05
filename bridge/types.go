package main

import (
	"encoding/json"
	"image/color"
	"log"
	"os"
	"sync"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/test"
	"fyne.io/fyne/v2/widget"
)

// Message types for communication
type Message struct {
	ID      string                 `json:"id"`
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload"`
}

type Response struct {
	ID      string                 `json:"id"`
	Success bool                   `json:"success"`
	Result  map[string]interface{} `json:"result,omitempty"`
	Error   string                 `json:"error,omitempty"`
}

type Event struct {
	Type     string                 `json:"type"`
	WidgetID string                 `json:"widgetId"`
	Data     map[string]interface{} `json:"data,omitempty"`
}

// Bridge manages the Fyne app and communication
type Bridge struct {
	app            fyne.App
	windows        map[string]fyne.Window
	widgets        map[string]fyne.CanvasObject
	callbacks      map[string]string              // widget ID -> callback ID
	contextMenus   map[string]*fyne.Menu          // widget ID -> context menu
	testMode       bool                           // true for headless testing
	grpcMode       bool                           // true when running in gRPC mode (skip stdout writes)
	grpcEventChan  chan Event                     // channel for gRPC event streaming
	mu             sync.RWMutex
	writer         *json.Encoder
	widgetMeta     map[string]WidgetMetadata      // metadata for testing
	tableData      map[string][][]string          // table ID -> data
	listData       map[string][]string            // list ID -> data
	toolbarItems   map[string]*ToolbarItemsMetadata // toolbar ID -> items metadata
	toolbarActions map[string]*widget.ToolbarAction // custom ID -> toolbar action
	windowContent  map[string]string                // window ID -> current content widget ID
	customIds      map[string]string                // custom ID -> widget ID (for test framework)
	childToParent  map[string]string              // child ID -> parent ID
	quitChan       chan bool                      // signal quit in test mode
	resources      map[string][]byte              // resource name -> decoded image data
	scalableTheme  *ScalableTheme                 // custom theme for font scaling
	rasterData     map[string][][]color.Color    // raster widget ID -> pixel buffer
	closeIntercepts map[string]string             // window ID -> callback ID for close intercept
	closeResponses  map[string]chan bool          // window ID -> channel for close intercept response
	progressDialogs map[string]*ProgressDialogInfo // dialog ID -> progress dialog info
	arcData         map[string]*ArcData           // arc widget ID -> arc data
	polygonData     map[string]*PolygonData       // polygon widget ID -> polygon data
	customDialogs   map[string]interface{}        // dialog ID -> custom dialog instance
	msgpackServer   *MsgpackServer                // MessagePack UDS server (when in msgpack-uds mode)
}

// ProgressDialogInfo stores information about a progress dialog
type ProgressDialogInfo struct {
	Dialog      interface{}          // *dialog.CustomDialog
	ProgressBar *widget.ProgressBar  // nil for infinite progress bars
	IsInfinite  bool
}

// ArcData stores data for canvas arc primitives
type ArcData struct {
	StartAngle  float64
	EndAngle    float64
	FillColor   color.RGBA
	StrokeColor color.Color
	StrokeWidth float32
	X1, Y1      float32
	X2, Y2      float32
}

// PolygonData stores data for canvas polygon primitives
type PolygonData struct {
	Points      []fyne.Position
	FillColor   color.RGBA
	StrokeColor color.Color
	StrokeWidth float32
}

// WidgetMetadata stores metadata about widgets for testing
type WidgetMetadata struct {
	Type        string
	Text        string
	URL         string                 // For hyperlinks
	Placeholder string                 // For entry widgets
	TestId      string                 // For test framework getByTestId
	CustomData  map[string]interface{} // For storing additional metadata like accessibility info
}

// ToolbarItemsMetadata stores metadata about toolbar items for traversal
type ToolbarItemsMetadata struct {
	Labels []string
	Items  []widget.ToolbarItem
}

// TappableContainer wraps a widget to add double-click support
type TappableContainer struct {
	widget.BaseWidget
	content             fyne.CanvasObject
	DoubleClickCallback func()
	lastTapTime         int64
}

// NewTappableContainer creates a new tappable container
func NewTappableContainer(content fyne.CanvasObject, callback func()) *TappableContainer {
	t := &TappableContainer{
		content:             content,
		DoubleClickCallback: callback,
	}
	t.ExtendBaseWidget(t)
	return t
}

// Tapped handles tap events for double-click detection
func (t *TappableContainer) Tapped(e *fyne.PointEvent) {
	now := time.Now().UnixMilli()
	if now-t.lastTapTime < 500 { // 500ms for double-click
		if t.DoubleClickCallback != nil {
			t.DoubleClickCallback()
		}
	}
	t.lastTapTime = now

	// Also tap the content if it's tappable
	if tappable, ok := t.content.(fyne.Tappable); ok {
		tappable.Tapped(e)
	}
}

// CreateRenderer for the tappable container
func (t *TappableContainer) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(t.content)
}

// ClickableContainer wraps a canvas object to add single-click support
type ClickableContainer struct {
	widget.BaseWidget
	content       fyne.CanvasObject
	ClickCallback func()
}

// NewClickableContainer creates a new clickable container
func NewClickableContainer(content fyne.CanvasObject, callback func()) *ClickableContainer {
	c := &ClickableContainer{
		content:       content,
		ClickCallback: callback,
	}
	c.ExtendBaseWidget(c)
	return c
}

// Tapped handles single-click events
func (c *ClickableContainer) Tapped(e *fyne.PointEvent) {
	if c.ClickCallback != nil {
		c.ClickCallback()
	}

	// Also tap the content if it's tappable
	if tappable, ok := c.content.(fyne.Tappable); ok {
		tappable.Tapped(e)
	}
}

// CreateRenderer for the clickable container
func (c *ClickableContainer) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(c.content)
}


// TappableWrapper wraps a widget and adds context menu support via right-click
type TappableWrapper struct {
	widget.BaseWidget
	content fyne.CanvasObject
	menu    *fyne.Menu
	canvas  fyne.Canvas
}

func NewTappableWrapper(content fyne.CanvasObject) *TappableWrapper {
	w := &TappableWrapper{
		content: content,
	}
	w.ExtendBaseWidget(w)
	return w
}

func (t *TappableWrapper) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(t.content)
}

func (t *TappableWrapper) TappedSecondary(pe *fyne.PointEvent) {
	if t.menu != nil && t.canvas != nil {
		// Show popup menu at click position
		widget.ShowPopUpMenuAtPosition(t.menu, t.canvas, pe.AbsolutePosition)
	}
}

func (t *TappableWrapper) SetMenu(menu *fyne.Menu) {
	t.menu = menu
}

func (t *TappableWrapper) SetCanvas(canvas fyne.Canvas) {
	t.canvas = canvas
}

// TsyneButton is a custom button that implements desktop.Hoverable, desktop.Mouseable,
// desktop.Cursorable, and desktop.Keyable interfaces.
// Events are only sent to TypeScript if the corresponding callback ID is set.
type TsyneButton struct {
	widget.Button
	bridge   *Bridge
	widgetID string

	// Callback IDs for event dispatching to TypeScript
	onMouseInCallbackId    string
	onMouseOutCallbackId   string
	onMouseMovedCallbackId string
	onMouseDownCallbackId  string
	onMouseUpCallbackId    string
	onKeyDownCallbackId    string
	onKeyUpCallbackId      string
	onFocusCallbackId      string

	// Cursor to display when hovering
	cursor desktop.Cursor

	// Track focus state
	focused bool
}

// NewTsyneButton creates a new TsyneButton
func NewTsyneButton(text string, tapped func(), bridge *Bridge, widgetID string) *TsyneButton {
	btn := &TsyneButton{
		bridge:   bridge,
		widgetID: widgetID,
		cursor:   desktop.DefaultCursor,
	}
	btn.Text = text
	btn.OnTapped = tapped
	btn.ExtendBaseWidget(btn)
	return btn
}

// SetCallbackIds configures callback IDs for event dispatching to TypeScript
func (t *TsyneButton) SetCallbackIds(mouseIn, mouseOut, mouseMoved, mouseDown, mouseUp, keyDown, keyUp, focus string) {
	t.onMouseInCallbackId = mouseIn
	t.onMouseOutCallbackId = mouseOut
	t.onMouseMovedCallbackId = mouseMoved
	t.onMouseDownCallbackId = mouseDown
	t.onMouseUpCallbackId = mouseUp
	t.onKeyDownCallbackId = keyDown
	t.onKeyUpCallbackId = keyUp
	t.onFocusCallbackId = focus
}

// SetCursor sets the cursor to display when hovering over this button
func (t *TsyneButton) SetCursor(cursor desktop.Cursor) {
	t.cursor = cursor
}

// --- desktop.Hoverable interface ---

// MouseIn is called when the mouse pointer enters the button
func (t *TsyneButton) MouseIn(e *desktop.MouseEvent) {

	// Send callback event if registered
	if t.onMouseInCallbackId != "" {
		t.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": t.onMouseInCallbackId,
				"position": map[string]interface{}{
					"x": e.Position.X,
					"y": e.Position.Y,
				},
			},
		})
	}

	// Also send pointerEnter for accessibility announcements
	t.bridge.sendEvent(Event{
		Type:     "pointerEnter",
		WidgetID: t.widgetID,
	})
}

// MouseMoved is called when the mouse pointer moves over the button
func (t *TsyneButton) MouseMoved(e *desktop.MouseEvent) {
	if t.onMouseMovedCallbackId == "" {
		return
	}
	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onMouseMovedCallbackId,
			"position": map[string]interface{}{
				"x": e.Position.X,
				"y": e.Position.Y,
			},
		},
	})
}

// MouseOut is called when the mouse pointer leaves the button
func (t *TsyneButton) MouseOut() {

	// Send callback event if registered
	if t.onMouseOutCallbackId != "" {
		t.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": t.onMouseOutCallbackId,
			},
		})
	}

	// Also send pointerExit for accessibility
	t.bridge.sendEvent(Event{
		Type:     "pointerExit",
		WidgetID: t.widgetID,
	})
}

// --- desktop.Mouseable interface ---

// MouseDown is called when a mouse button is pressed over the button
func (t *TsyneButton) MouseDown(e *desktop.MouseEvent) {
	if t.onMouseDownCallbackId == "" {
		return
	}

	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onMouseDownCallbackId,
			"button":     int(e.Button),
			"position": map[string]interface{}{
				"x": e.Position.X,
				"y": e.Position.Y,
			},
		},
	})
}

// MouseUp is called when a mouse button is released over the button
func (t *TsyneButton) MouseUp(e *desktop.MouseEvent) {
	if t.onMouseUpCallbackId == "" {
		return
	}

	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onMouseUpCallbackId,
			"button":     int(e.Button),
			"position": map[string]interface{}{
				"x": e.Position.X,
				"y": e.Position.Y,
			},
		},
	})
}

// --- desktop.Cursorable interface ---

// Cursor returns the cursor to display when hovering over this button
func (t *TsyneButton) Cursor() desktop.Cursor {
	return t.cursor
}

// --- desktop.Keyable interface (requires fyne.Focusable) ---

// FocusGained is called when this button gains focus
func (t *TsyneButton) FocusGained() {
	t.focused = true

	if t.onFocusCallbackId != "" {
		t.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": t.onFocusCallbackId,
				"focused":    true,
			},
		})
	}
}

// FocusLost is called when this button loses focus
func (t *TsyneButton) FocusLost() {
	t.focused = false

	if t.onFocusCallbackId != "" {
		t.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": t.onFocusCallbackId,
				"focused":    false,
			},
		})
	}
}

// TypedRune is called when a character is typed while focused
func (t *TsyneButton) TypedRune(r rune) {
	// Buttons don't typically handle typed runes, but required by Focusable
}

// TypedKey is called when a key is pressed while focused (Focusable interface)
func (t *TsyneButton) TypedKey(e *fyne.KeyEvent) {
	// Handle Space and Enter to activate the button
	if e.Name == fyne.KeySpace || e.Name == fyne.KeyReturn || e.Name == fyne.KeyEnter {
		if t.OnTapped != nil {
			t.OnTapped()
		}
	}
}

// KeyDown is called when a key is pressed while focused (Keyable interface)
func (t *TsyneButton) KeyDown(e *fyne.KeyEvent) {
	if t.onKeyDownCallbackId == "" {
		return
	}

	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onKeyDownCallbackId,
			"key":        string(e.Name),
		},
	})
}

// KeyUp is called when a key is released while focused (Keyable interface)
func (t *TsyneButton) KeyUp(e *fyne.KeyEvent) {
	if t.onKeyUpCallbackId == "" {
		return
	}

	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onKeyUpCallbackId,
			"key":        string(e.Name),
		},
	})
}

// Backward compatibility alias
type HoverableButton = TsyneButton

// NewHoverableButton creates a new TsyneButton (backward compatibility)
func NewHoverableButton(text string, tapped func(), bridge *Bridge, widgetID string) *TsyneButton {
	return NewTsyneButton(text, tapped, bridge, widgetID)
}

// TsyneTextGrid wraps widget.TextGrid and implements fyne.Focusable and desktop.Keyable
// for keyboard input support (needed for terminal emulator)
type TsyneTextGrid struct {
	widget.BaseWidget
	TextGrid *widget.TextGrid
	bridge   *Bridge
	widgetID string

	// Callback IDs for event dispatching to TypeScript
	onKeyDownCallbackId string
	onKeyUpCallbackId   string
	onTypedCallbackId   string // For TypedRune - character input
	onFocusCallbackId   string

	// Track focus state
	focused bool
}

// NewTsyneTextGrid creates a new focusable TextGrid wrapper
func NewTsyneTextGrid(textGrid *widget.TextGrid, bridge *Bridge, widgetID string) *TsyneTextGrid {
	tg := &TsyneTextGrid{
		TextGrid: textGrid,
		bridge:   bridge,
		widgetID: widgetID,
	}
	tg.ExtendBaseWidget(tg)
	return tg
}

// CreateRenderer renders the embedded TextGrid
func (t *TsyneTextGrid) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(t.TextGrid)
}

// SetCallbackIds configures callback IDs for event dispatching
func (t *TsyneTextGrid) SetCallbackIds(keyDown, keyUp, typed, focus string) {
	t.onKeyDownCallbackId = keyDown
	t.onKeyUpCallbackId = keyUp
	t.onTypedCallbackId = typed
	t.onFocusCallbackId = focus
}

// --- fyne.Tappable interface (click to focus) ---

func (t *TsyneTextGrid) Tapped(_ *fyne.PointEvent) {
	// Request focus when tapped
	if c := fyne.CurrentApp().Driver().CanvasForObject(t); c != nil {
		c.Focus(t)
	}
}

// --- fyne.Focusable interface ---

func (t *TsyneTextGrid) FocusGained() {
	t.focused = true
	if t.onFocusCallbackId != "" {
		t.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": t.onFocusCallbackId,
				"focused":    true,
			},
		})
	}
}

func (t *TsyneTextGrid) FocusLost() {
	t.focused = false
	if t.onFocusCallbackId != "" {
		t.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": t.onFocusCallbackId,
				"focused":    false,
			},
		})
	}
}

// TypedRune handles character input - essential for terminal
func (t *TsyneTextGrid) TypedRune(r rune) {
	if t.onTypedCallbackId != "" {
		t.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": t.onTypedCallbackId,
				"char":       string(r),
			},
		})
	}
}

// TypedKey handles special key input (arrows, function keys, etc.)
func (t *TsyneTextGrid) TypedKey(e *fyne.KeyEvent) {
	// Forward to KeyDown for unified handling
	t.KeyDown(e)
}

// --- desktop.Keyable interface ---

func (t *TsyneTextGrid) KeyDown(e *fyne.KeyEvent) {
	if t.onKeyDownCallbackId == "" {
		return
	}

	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onKeyDownCallbackId,
			"key":        string(e.Name),
			"shift":      false,
			"ctrl":       false,
			"alt":        false,
		},
	})
}

func (t *TsyneTextGrid) KeyUp(e *fyne.KeyEvent) {
	if t.onKeyUpCallbackId == "" {
		return
	}
	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onKeyUpCallbackId,
			"key":        string(e.Name),
		},
	})
}

// HoverableWrapper wraps a widget and implements desktop.Hoverable for mouse enter/exit events
type HoverableWrapper struct {
	widget.BaseWidget
	content        fyne.CanvasObject
	bridge         *Bridge
	widgetID       string
	mouseInHandler func(*desktop.MouseEvent)
	mouseOutHandler func()
}

// NewHoverableWrapper creates a new hoverable wrapper
func NewHoverableWrapper(content fyne.CanvasObject, bridge *Bridge, widgetID string) *HoverableWrapper {
	h := &HoverableWrapper{
		content:  content,
		bridge:   bridge,
		widgetID: widgetID,
	}
	h.ExtendBaseWidget(h)
	return h
}

// CreateRenderer for the hoverable wrapper
func (h *HoverableWrapper) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(h.content)
}

// MouseIn implements desktop.Hoverable - called when mouse enters the widget
func (h *HoverableWrapper) MouseIn(ev *desktop.MouseEvent) {
	if h.mouseInHandler != nil {
		h.mouseInHandler(ev)
	}
	// Send pointerEnter event to TypeScript
	h.bridge.sendEvent(Event{
		Type:     "pointerEnter",
		WidgetID: h.widgetID,
	})
}

// MouseOut implements desktop.Hoverable - called when mouse exits the widget
func (h *HoverableWrapper) MouseOut() {
	if h.mouseOutHandler != nil {
		h.mouseOutHandler()
	}
	// Send pointerExit event to TypeScript
	h.bridge.sendEvent(Event{
		Type:     "pointerExit",
		WidgetID: h.widgetID,
	})
}

// MouseMoved implements desktop.Hoverable - called when mouse moves within the widget
func (h *HoverableWrapper) MouseMoved(ev *desktop.MouseEvent) {
	// We don't need to handle mouse moved for basic hover support
}

// SetMouseInHandler allows setting a custom mouse in handler
func (h *HoverableWrapper) SetMouseInHandler(handler func(*desktop.MouseEvent)) {
	h.mouseInHandler = handler
}

// SetMouseOutHandler allows setting a custom mouse out handler
func (h *HoverableWrapper) SetMouseOutHandler(handler func()) {
	h.mouseOutHandler = handler
}

// =============================================================================
// TsyneDesktopCanvas - Container with absolute positioning for draggable icons
// Based on bridge/cmd/draggable-icons demo - solves Fyne Stack click limitation
// =============================================================================

// DesktopIconContainer is an interface for containers that hold draggable icons
// Both TsyneDesktopCanvas and TsyneDesktopMDI implement this
type DesktopIconContainer interface {
	fyne.CanvasObject
	MoveIcon(icon *TsyneDraggableIcon)
	Refresh()
}

// TsyneDraggableIcon is a desktop icon that can be dragged freely
type TsyneDraggableIcon struct {
	widget.BaseWidget

	ID       string
	Label    string
	IconRect *canvas.Rectangle
	TextObj  *canvas.Text

	// Position tracking
	PosX, PosY float32

	// Drag state
	dragging   bool
	dragStartX float32
	dragStartY float32

	// Double-click detection
	lastTapTime time.Time

	// Reference to parent container for repositioning (supports both canvas types)
	desktop          *TsyneDesktopCanvas
	desktopContainer DesktopIconContainer

	// Bridge for callbacks
	bridge              *Bridge
	onDragCallbackId    string
	onDragEndCallbackId string
	onClickCallbackId   string
	onDblClickCallbackId string
}

// NewTsyneDraggableIcon creates a new draggable icon
func NewTsyneDraggableIcon(id, label string, iconColor color.Color, x, y float32, desktop *TsyneDesktopCanvas, bridge *Bridge) *TsyneDraggableIcon {
	icon := &TsyneDraggableIcon{
		ID:      id,
		Label:   label,
		PosX:    x,
		PosY:    y,
		desktop: desktop,
		bridge:  bridge,
	}

	// Create the icon rectangle (64x64)
	icon.IconRect = canvas.NewRectangle(iconColor)
	icon.IconRect.SetMinSize(fyne.NewSize(64, 64))
	icon.IconRect.CornerRadius = 8

	// Create the text label
	icon.TextObj = canvas.NewText(label, color.White)
	icon.TextObj.Alignment = fyne.TextAlignCenter
	icon.TextObj.TextSize = 12

	icon.ExtendBaseWidget(icon)
	return icon
}

// NewTsyneDraggableIconForMDI creates a new draggable icon for a DesktopMDI container
func NewTsyneDraggableIconForMDI(id, label string, iconColor color.Color, x, y float32, container DesktopIconContainer, bridge *Bridge) *TsyneDraggableIcon {
	icon := &TsyneDraggableIcon{
		ID:               id,
		Label:            label,
		PosX:             x,
		PosY:             y,
		desktopContainer: container,
		bridge:           bridge,
	}

	// Create the icon rectangle (64x64)
	icon.IconRect = canvas.NewRectangle(iconColor)
	icon.IconRect.SetMinSize(fyne.NewSize(64, 64))
	icon.IconRect.CornerRadius = 8

	// Create the text label
	icon.TextObj = canvas.NewText(label, color.White)
	icon.TextObj.Alignment = fyne.TextAlignCenter
	icon.TextObj.TextSize = 12

	icon.ExtendBaseWidget(icon)
	return icon
}

// SetCallbackIds configures callback IDs for event dispatching
func (d *TsyneDraggableIcon) SetCallbackIds(drag, dragEnd, click, dblClick string) {
	d.onDragCallbackId = drag
	d.onDragEndCallbackId = dragEnd
	d.onClickCallbackId = click
	d.onDblClickCallbackId = dblClick
}

// CreateRenderer returns the widget renderer
func (d *TsyneDraggableIcon) CreateRenderer() fyne.WidgetRenderer {
	// Stack icon and text vertically
	content := container.NewVBox(
		container.NewCenter(d.IconRect),
		container.NewCenter(d.TextObj),
	)
	return widget.NewSimpleRenderer(content)
}

// MinSize returns the minimum size of the icon
func (d *TsyneDraggableIcon) MinSize() fyne.Size {
	return fyne.NewSize(80, 90)
}

// Tapped handles single tap/click - used for double-click detection
func (d *TsyneDraggableIcon) Tapped(e *fyne.PointEvent) {
	log.Printf("[TAP] Icon %s: Tapped() called", d.ID)
	now := time.Now()
	elapsed := now.Sub(d.lastTapTime)

	if elapsed < 400*time.Millisecond {
		// Double-click detected!
		if d.onDblClickCallbackId != "" && d.bridge != nil {
			d.bridge.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": d.onDblClickCallbackId,
					"iconId":     d.ID,
					"x":          d.PosX,
					"y":          d.PosY,
				},
			})
		}
	} else {
		// Single click
		if d.onClickCallbackId != "" && d.bridge != nil {
			d.bridge.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": d.onClickCallbackId,
					"iconId":     d.ID,
					"x":          d.PosX,
					"y":          d.PosY,
				},
			})
		}
	}

	d.lastTapTime = now
}

// DoubleTapped handles double-click events (Fyne's native double-tap interface)
func (d *TsyneDraggableIcon) DoubleTapped(e *fyne.PointEvent) {
	log.Printf("[DOUBLE-TAP] Icon %s: DoubleTapped() called", d.ID)
	if d.onDblClickCallbackId != "" && d.bridge != nil {
		d.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": d.onDblClickCallbackId,
				"iconId":     d.ID,
				"x":          d.PosX,
				"y":          d.PosY,
			},
		})
	}
}

// Dragged handles drag events
func (d *TsyneDraggableIcon) Dragged(e *fyne.DragEvent) {
	log.Printf("[DRAG] Icon %s: Dragged() called with dx=%.2f, dy=%.2f", d.ID, e.Dragged.DX, e.Dragged.DY)

	if !d.dragging {
		d.dragging = true
		d.dragStartX = d.PosX
		d.dragStartY = d.PosY
	}

	// Calculate new position based on drag delta
	dx := e.Dragged.DX
	dy := e.Dragged.DY

	d.PosX += dx
	d.PosY += dy

	// Ensure icon stays within bounds (minimum 0,0)
	if d.PosX < 0 {
		d.PosX = 0
	}
	if d.PosY < 0 {
		d.PosY = 0
	}

	log.Printf("[DRAG] Icon %s: Moving to (%.2f, %.2f)", d.ID, d.PosX, d.PosY)
	// Directly move this widget to visually update position
	// (Refresh alone doesn't trigger Layout)
	d.Move(fyne.NewPos(d.PosX, d.PosY))

	// Notify TypeScript of drag
	if d.onDragCallbackId != "" && d.bridge != nil {
		d.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": d.onDragCallbackId,
				"iconId":     d.ID,
				"x":          d.PosX,
				"y":          d.PosY,
				"dx":         dx,
				"dy":         dy,
			},
		})
	}

	// Update position in the desktop (for proper refresh)
	// Check both container types for backwards compatibility
	if d.desktopContainer != nil {
		d.desktopContainer.MoveIcon(d)
	} else if d.desktop != nil {
		d.desktop.MoveIcon(d)
	}
}

// DragEnd handles the end of a drag operation
func (d *TsyneDraggableIcon) DragEnd() {
	if d.dragging {
		// Notify TypeScript of drag end
		if d.onDragEndCallbackId != "" && d.bridge != nil {
			d.bridge.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": d.onDragEndCallbackId,
					"iconId":     d.ID,
					"x":          d.PosX,
					"y":          d.PosY,
				},
			})
		}
		d.dragging = false
	}
}

// TsyneDesktopCanvas is a container that allows free positioning of icons
type TsyneDesktopCanvas struct {
	widget.BaseWidget

	icons   []*TsyneDraggableIcon
	bgColor color.Color
	bridge  *Bridge
	id      string
}

// NewTsyneDesktopCanvas creates a new desktop canvas
func NewTsyneDesktopCanvas(id string, bgColor color.Color, bridge *Bridge) *TsyneDesktopCanvas {
	dc := &TsyneDesktopCanvas{
		icons:   make([]*TsyneDraggableIcon, 0),
		bgColor: bgColor,
		bridge:  bridge,
		id:      id,
	}
	dc.ExtendBaseWidget(dc)
	return dc
}

// AddIcon adds an icon to the desktop at the specified position
func (dc *TsyneDesktopCanvas) AddIcon(icon *TsyneDraggableIcon) {
	dc.icons = append(dc.icons, icon)
	dc.Refresh()
}

// MoveIcon updates the position of an icon
func (dc *TsyneDesktopCanvas) MoveIcon(icon *TsyneDraggableIcon) {
	dc.Refresh()
}

// GetIcon returns an icon by ID
func (dc *TsyneDesktopCanvas) GetIcon(id string) *TsyneDraggableIcon {
	for _, icon := range dc.icons {
		if icon.ID == id {
			return icon
		}
	}
	return nil
}

// CreateRenderer returns the widget renderer for the desktop
func (dc *TsyneDesktopCanvas) CreateRenderer() fyne.WidgetRenderer {
	var bg *canvas.Rectangle
	// Only create background if color is not transparent
	if dc.bgColor != nil {
		_, _, _, a := dc.bgColor.RGBA()
		if a > 0 {
			bg = canvas.NewRectangle(dc.bgColor)
		}
	}
	return &desktopCanvasRenderer{
		desktop: dc,
		bg:      bg,
	}
}

// desktopCanvasRenderer handles the rendering of the desktop
type desktopCanvasRenderer struct {
	desktop *TsyneDesktopCanvas
	bg      *canvas.Rectangle
}

func (r *desktopCanvasRenderer) Layout(size fyne.Size) {
	if r.bg != nil {
		r.bg.Resize(size)
		r.bg.Move(fyne.NewPos(0, 0))
	}

	// Position each icon at its stored position
	for _, icon := range r.desktop.icons {
		iconSize := icon.MinSize()
		icon.Resize(iconSize)
		icon.Move(fyne.NewPos(icon.PosX, icon.PosY))
	}
}

func (r *desktopCanvasRenderer) MinSize() fyne.Size {
	return fyne.NewSize(800, 600)
}

func (r *desktopCanvasRenderer) Refresh() {
	if r.bg != nil {
		r.bg.FillColor = r.desktop.bgColor
		r.bg.Refresh()
	}
	for _, icon := range r.desktop.icons {
		icon.Refresh()
	}
}

func (r *desktopCanvasRenderer) Objects() []fyne.CanvasObject {
	var objects []fyne.CanvasObject
	if r.bg != nil {
		objects = append(objects, r.bg)
	}
	for _, icon := range r.desktop.icons {
		objects = append(objects, icon)
	}
	return objects
}

func (r *desktopCanvasRenderer) Destroy() {}

// =============================================================================
// TsyneDesktopMDI - Combined desktop canvas + MDI container
// This solves the layering problem by combining both in a single widget
// that properly routes events to icons or inner windows based on position.
// =============================================================================

// TsyneDesktopMDI combines desktop icons with MDI window management
// Uses MultipleWindows for proper window drag support, with icons rendered on top
type TsyneDesktopMDI struct {
	widget.BaseWidget

	icons      []*TsyneDraggableIcon
	mdiWindows *container.MultipleWindows // Fyne's MDI handles window drag
	bgColor    color.Color
	bridge     *Bridge
	id         string
	iconsOnTop bool // When true, icons render on top of windows for interaction
}

// NewTsyneDesktopMDI creates a new desktop MDI container
func NewTsyneDesktopMDI(id string, bgColor color.Color, bridge *Bridge) *TsyneDesktopMDI {
	dm := &TsyneDesktopMDI{
		icons:      make([]*TsyneDraggableIcon, 0),
		mdiWindows: container.NewMultipleWindows(),
		bgColor:    bgColor,
		bridge:     bridge,
		id:         id,
		iconsOnTop: true, // Start with icons on top so they can be clicked
	}
	dm.ExtendBaseWidget(dm)
	return dm
}

// AddIcon adds an icon to the desktop at the specified position
func (dm *TsyneDesktopMDI) AddIcon(icon *TsyneDraggableIcon) {
	dm.icons = append(dm.icons, icon)
	dm.Refresh()
}

// AddWindow adds an inner window to the MDI
func (dm *TsyneDesktopMDI) AddWindow(win *container.InnerWindow) {
	fyne.Do(func() {
		dm.mdiWindows.Add(win)
		dm.iconsOnTop = false // Push icons behind windows when a new window opens
		dm.Refresh()
	})
}

// Tapped handles tap events on the desktop background
// When tapped on empty space (not on a window), bring icons to front
func (dm *TsyneDesktopMDI) Tapped(e *fyne.PointEvent) {
	// If we received this tap, it means it wasn't captured by a window
	// Bring icons to the front so they can be interacted with
	dm.iconsOnTop = true
	dm.Refresh()
}

// RemoveWindow removes an inner window from the MDI
func (dm *TsyneDesktopMDI) RemoveWindow(win *container.InnerWindow) {
	fyne.Do(func() {
		// MultipleWindows has no Remove method, so manipulate Windows slice
		for i, w := range dm.mdiWindows.Windows {
			if w == win {
				dm.mdiWindows.Windows = append(dm.mdiWindows.Windows[:i], dm.mdiWindows.Windows[i+1:]...)
				break
			}
		}
		dm.mdiWindows.Refresh()
		dm.Refresh()
	})
}

// RaiseWindow brings a window to the front
// Note: MultipleWindows handles z-order internally when windows are clicked
func (dm *TsyneDesktopMDI) RaiseWindow(win *container.InnerWindow) {
	// MultipleWindows handles z-order automatically
}

// GetIcon returns an icon by ID
func (dm *TsyneDesktopMDI) GetIcon(id string) *TsyneDraggableIcon {
	for _, icon := range dm.icons {
		if icon.ID == id {
			return icon
		}
	}
	return nil
}

// MoveIcon updates the position of an icon (implements DesktopIconContainer)
func (dm *TsyneDesktopMDI) MoveIcon(icon *TsyneDraggableIcon) {
	fyne.Do(func() {
		dm.Refresh()
	})
}

// CreateRenderer returns the widget renderer
func (dm *TsyneDesktopMDI) CreateRenderer() fyne.WidgetRenderer {
	bg := canvas.NewRectangle(dm.bgColor)
	return &desktopMDIRenderer{
		desktop: dm,
		bg:      bg,
	}
}

// desktopMDIRenderer handles rendering of the combined desktop
type desktopMDIRenderer struct {
	desktop *TsyneDesktopMDI
	bg      *canvas.Rectangle
}

func (r *desktopMDIRenderer) Layout(size fyne.Size) {
	r.bg.Resize(size)
	r.bg.Move(fyne.NewPos(0, 0))

	// MultipleWindows handles its own layout
	r.desktop.mdiWindows.Resize(size)
	r.desktop.mdiWindows.Move(fyne.NewPos(0, 0))

	// Position icons at their stored positions (icons on top of windows)
	for _, icon := range r.desktop.icons {
		iconSize := icon.MinSize()
		icon.Resize(iconSize)
		icon.Move(fyne.NewPos(icon.PosX, icon.PosY))
	}
}

func (r *desktopMDIRenderer) MinSize() fyne.Size {
	return fyne.NewSize(800, 600)
}

func (r *desktopMDIRenderer) Refresh() {
	r.bg.FillColor = r.desktop.bgColor
	r.bg.Refresh()
	r.desktop.mdiWindows.Refresh()
	for _, icon := range r.desktop.icons {
		icon.Refresh()
	}
}

func (r *desktopMDIRenderer) Objects() []fyne.CanvasObject {
	var objects []fyne.CanvasObject
	// Background first
	objects = append(objects, r.bg)

	if r.desktop.iconsOnTop {
		// Icons on top - they can be dragged/clicked, windows behind
		objects = append(objects, r.desktop.mdiWindows)
		for _, icon := range r.desktop.icons {
			objects = append(objects, icon)
		}
	} else {
		// Icons behind - windows on top, click desktop to bring icons front
		for _, icon := range r.desktop.icons {
			objects = append(objects, icon)
		}
		objects = append(objects, r.desktop.mdiWindows)
	}
	return objects
}

func (r *desktopMDIRenderer) Destroy() {}

// =============================================================================

// stringToCursor converts a cursor type string to desktop.Cursor
// Supported cursor types: default, text, crosshair, pointer, hResize, vResize
func stringToCursor(cursorType string) desktop.Cursor {
	switch cursorType {
	case "text":
		return desktop.TextCursor
	case "crosshair":
		return desktop.CrosshairCursor
	case "pointer":
		return desktop.PointerCursor
	case "hResize":
		return desktop.HResizeCursor
	case "vResize":
		return desktop.VResizeCursor
	default:
		return desktop.DefaultCursor
	}
}

func NewBridge(testMode bool) *Bridge {
	var fyneApp fyne.App
	if testMode {
		fyneApp = test.NewApp()
	} else {
		fyneApp = app.New()
	}

	// Create scalable theme with default font size
	scalableTheme := NewScalableTheme(1.0)

	// Note: Theme will be applied when first window is created (when event loop is running)
	// Setting theme during initialization causes threading issues in test mode

	return &Bridge{
		app:            fyneApp,
		windows:        make(map[string]fyne.Window),
		widgets:        make(map[string]fyne.CanvasObject),
		callbacks:      make(map[string]string),
		contextMenus:   make(map[string]*fyne.Menu),
		testMode:       testMode,
		writer:         json.NewEncoder(os.Stdout),
		widgetMeta:     make(map[string]WidgetMetadata),
		tableData:      make(map[string][][]string),
		listData:       make(map[string][]string),
		toolbarItems:   make(map[string]*ToolbarItemsMetadata),
		toolbarActions: make(map[string]*widget.ToolbarAction),
		windowContent:  make(map[string]string),
		customIds:      make(map[string]string),
		childToParent:   make(map[string]string),
		quitChan:        make(chan bool, 1),
		resources:       make(map[string][]byte),
		scalableTheme:   scalableTheme,
		closeIntercepts: make(map[string]string),
		closeResponses:  make(map[string]chan bool),
		progressDialogs: make(map[string]*ProgressDialogInfo),
	}
}

func (b *Bridge) sendEvent(event Event) {
	log.Printf("[SEND-EVENT] Type: %s, WidgetID: %s, Data: %v", event.Type, event.WidgetID, event.Data)
	// In gRPC mode, events are sent via the gRPC stream channel
	if b.grpcMode {
		// Check for MessagePack server first (msgpack-uds mode)
		if b.msgpackServer != nil {
			log.Printf("[SEND-EVENT-MSGPACK] Sending via msgpack: %s", event.Type)
			b.msgpackServer.SendEvent(event)
			return
		}
		// Otherwise use gRPC channel
		if b.grpcEventChan != nil {
			log.Printf("[SEND-EVENT-GRPC] Sending via gRPC channel: %s", event.Type)
			select {
			case b.grpcEventChan <- event:
				log.Printf("[SEND-EVENT-GRPC-OK] Event sent successfully: %s", event.Type)
				// Event sent successfully
			default:
				// Channel full or closed, log and drop
				log.Printf("[SEND-EVENT-GRPC-ERROR] gRPC event channel full, dropping event: %s", event.Type)
			}
		}
		return
	}

	// IPC Safeguard #2: Mutex protection for stdout writes
	b.mu.Lock()
	defer b.mu.Unlock()

	// Marshal to JSON
	jsonData, err := json.Marshal(event)
	if err != nil {
		log.Printf("[SEND-EVENT-ERROR] Error marshaling event: %v", err)
		return
	}

	log.Printf("[SEND-EVENT-STDIO] Writing to stdout, event type: %s, payload size: %d", event.Type, len(jsonData))
	// IPC Safeguard #3 & #4: Write with length-prefix framing and CRC32 validation
	if err := writeFramedMessage(os.Stdout, jsonData); err != nil {
		log.Printf("[SEND-EVENT-ERROR-WRITE] Error sending event: %v", err)
	} else {
		log.Printf("[SEND-EVENT-SUCCESS] Event sent successfully: %s", event.Type)
	}
}

func (b *Bridge) sendResponse(resp Response) {
	// In gRPC mode, responses are returned via gRPC, not stdout
	if b.grpcMode {
		return
	}

	// IPC Safeguard #2: Mutex protection for stdout writes
	b.mu.Lock()
	defer b.mu.Unlock()

	// Marshal to JSON
	jsonData, err := json.Marshal(resp)
	if err != nil {
		log.Printf("Error marshaling response: %v", err)
		return
	}

	// IPC Safeguard #3 & #4: Write with length-prefix framing and CRC32 validation
	if err := writeFramedMessage(os.Stdout, jsonData); err != nil {
		log.Printf("Error sending response: %v", err)
	}
}
