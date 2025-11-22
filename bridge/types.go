package main

import (
	"encoding/json"
	"log"
	"os"
	"sync"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
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
	closeIntercepts map[string]string             // window ID -> callback ID for close intercept
	closeResponses  map[string]chan bool          // window ID -> channel for close intercept response
}

// WidgetMetadata stores metadata about widgets for testing
type WidgetMetadata struct {
	Type        string
	Text        string
	URL         string                 // For hyperlinks
	Placeholder string                 // For entry widgets
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
	log.Printf("DEBUG: TappableContainer tapped, lastTapTime=%d, now=%d, diff=%d", t.lastTapTime, now, now-t.lastTapTime)
	if now-t.lastTapTime < 500 { // 500ms for double-click
		log.Printf("DEBUG: Double-click detected! Firing callback")
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
	log.Printf("[ClickableContainer] Tapped, firing callback")
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
	log.Printf("[TsyneButton] MouseIn for widget %s at position (%.2f, %.2f)", t.widgetID, e.Position.X, e.Position.Y)

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
	log.Printf("[TsyneButton] MouseOut for widget %s", t.widgetID)

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
	log.Printf("[TsyneButton] MouseDown for widget %s button %d", t.widgetID, e.Button)

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
	log.Printf("[TsyneButton] MouseUp for widget %s button %d", t.widgetID, e.Button)

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
	log.Printf("[TsyneButton] FocusGained for widget %s", t.widgetID)

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
	log.Printf("[TsyneButton] FocusLost for widget %s", t.widgetID)

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
	log.Printf("[TsyneButton] TypedKey for widget %s key %s", t.widgetID, e.Name)
	// Handle Space and Enter to activate the button
	if e.Name == fyne.KeySpace || e.Name == fyne.KeyReturn || e.Name == fyne.KeyEnter {
		log.Printf("[TsyneButton] Activating button %s via keyboard", t.widgetID)
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
	log.Printf("[TsyneButton] KeyDown for widget %s key %s", t.widgetID, e.Name)

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
	log.Printf("[TsyneButton] KeyUp for widget %s key %s", t.widgetID, e.Name)

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
	log.Printf("[HoverableWrapper] MouseIn for widget %s", h.widgetID)
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
	log.Printf("[HoverableWrapper] MouseOut for widget %s", h.widgetID)
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

	// Create and apply scalable theme with default font size
	scalableTheme := NewScalableTheme(1.0)
	fyneApp.Settings().SetTheme(scalableTheme)

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
		childToParent:  make(map[string]string),
		quitChan:       make(chan bool, 1),
		resources:      make(map[string][]byte),
		scalableTheme:  scalableTheme,
		closeIntercepts: make(map[string]string),
		closeResponses:  make(map[string]chan bool),
	}
}

func (b *Bridge) sendEvent(event Event) {
	// IPC Safeguard #2: Mutex protection for stdout writes
	b.mu.Lock()
	defer b.mu.Unlock()

	// Marshal to JSON
	jsonData, err := json.Marshal(event)
	if err != nil {
		log.Printf("Error marshaling event: %v", err)
		return
	}

	// IPC Safeguard #3 & #4: Write with length-prefix framing and CRC32 validation
	if err := writeFramedMessage(os.Stdout, jsonData); err != nil {
		log.Printf("Error sending event: %v", err)
	}
}

func (b *Bridge) sendResponse(resp Response) {
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
