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

// HoverableButton is a custom button that implements desktop.Hoverable
type HoverableButton struct {
	widget.Button
	bridge   *Bridge
	widgetID string
}

// NewHoverableButton creates a new hoverable button
func NewHoverableButton(text string, tapped func(), bridge *Bridge, widgetID string) *HoverableButton {
	btn := &HoverableButton{
		bridge:   bridge,
		widgetID: widgetID,
	}
	btn.Text = text
	btn.OnTapped = tapped
	btn.ExtendBaseWidget(btn)
	return btn
}

// MouseIn is called when the mouse pointer enters the button
func (h *HoverableButton) MouseIn(e *desktop.MouseEvent) {
	log.Printf("[HoverableButton] MouseIn for widget %s at position (%.2f, %.2f)", h.widgetID, e.Position.X, e.Position.Y)

	// Send custom mouseIn event for app callbacks
	h.bridge.sendEvent(Event{
		Type:     "mouseIn:" + h.widgetID,
		WidgetID: h.widgetID,
		Data: map[string]interface{}{
			"position": map[string]interface{}{
				"x": e.Position.X,
				"y": e.Position.Y,
			},
		},
	})

	// Also send pointerEnter for accessibility announcements
	h.bridge.sendEvent(Event{
		Type:     "pointerEnter",
		WidgetID: h.widgetID,
	})
}

// MouseMoved is called when the mouse pointer moves over the button
func (h *HoverableButton) MouseMoved(e *desktop.MouseEvent) {
	// Send custom mouseMoved event for app callbacks
	h.bridge.sendEvent(Event{
		Type:     "mouseMoved:" + h.widgetID,
		WidgetID: h.widgetID,
		Data: map[string]interface{}{
			"position": map[string]interface{}{
				"x": e.Position.X,
				"y": e.Position.Y,
			},
		},
	})
}

// MouseOut is called when the mouse pointer leaves the button
func (h *HoverableButton) MouseOut() {
	log.Printf("[HoverableButton] MouseOut for widget %s", h.widgetID)

	// Send custom mouseOut event for app callbacks
	h.bridge.sendEvent(Event{
		Type:     "mouseOut:" + h.widgetID,
		WidgetID: h.widgetID,
	})

	// Also send pointerExit for accessibility
	h.bridge.sendEvent(Event{
		Type:     "pointerExit",
		WidgetID: h.widgetID,
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
