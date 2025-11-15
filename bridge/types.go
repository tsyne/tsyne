package main

import (
	"encoding/json"
	"log"
	"os"
	"sync"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
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
	app           fyne.App
	windows       map[string]fyne.Window
	widgets       map[string]fyne.CanvasObject
	callbacks     map[string]string     // widget ID -> callback ID
	contextMenus  map[string]*fyne.Menu // widget ID -> context menu
	testMode      bool                  // true for headless testing
	mu            sync.RWMutex
	writer        *json.Encoder
	widgetMeta    map[string]WidgetMetadata // metadata for testing
	tableData     map[string][][]string     // table ID -> data
	listData      map[string][]string       // list ID -> data
	windowContent map[string]string         // window ID -> current content widget ID
	customIds     map[string]string         // custom ID -> widget ID (for test framework)
	childToParent map[string]string         // child ID -> parent ID
	quitChan      chan bool                 // signal quit in test mode
}

// WidgetMetadata stores metadata about widgets for testing
type WidgetMetadata struct {
	Type string
	Text string
	URL  string // For hyperlinks - store original URL to check if relative
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

// DraggableContainer wraps a canvas object to add drag support
type DraggableContainer struct {
	widget.BaseWidget
	content         fyne.CanvasObject
	DragCallback    func(x, y float32)
	DragEndCallback func(x, y float32)
	ClickCallback   func()
	lastPos         fyne.Position
	isDragging      bool
}

// NewDraggableContainer creates a new draggable container
func NewDraggableContainer(content fyne.CanvasObject, dragCallback func(x, y float32), dragEndCallback func(x, y float32), clickCallback func()) *DraggableContainer {
	d := &DraggableContainer{
		content:         content,
		DragCallback:    dragCallback,
		DragEndCallback: dragEndCallback,
		ClickCallback:   clickCallback,
	}
	d.ExtendBaseWidget(d)
	return d
}

// Dragged handles drag events
func (d *DraggableContainer) Dragged(e *fyne.DragEvent) {
	d.isDragging = true
	d.lastPos = e.Position
	log.Printf("[DraggableContainer] Dragged to position: (%f, %f)", e.Position.X, e.Position.Y)
	if d.DragCallback != nil {
		d.DragCallback(e.Position.X, e.Position.Y)
	}
}

// DragEnd handles drag end events
func (d *DraggableContainer) DragEnd() {
	if d.isDragging {
		log.Printf("[DraggableContainer] DragEnd at position: (%f, %f)", d.lastPos.X, d.lastPos.Y)
		if d.DragEndCallback != nil {
			d.DragEndCallback(d.lastPos.X, d.lastPos.Y)
		}
		d.isDragging = false
	}
}

// Tapped handles single-click events (for cards that can be clicked OR dragged)
func (d *DraggableContainer) Tapped(e *fyne.PointEvent) {
	if !d.isDragging {
		log.Printf("[DraggableContainer] Tapped (no drag detected)")
		if d.ClickCallback != nil {
			d.ClickCallback()
		}
	}
}

// CreateRenderer for the draggable container
func (d *DraggableContainer) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(d.content)
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

func NewBridge(testMode bool) *Bridge {
	var fyneApp fyne.App
	if testMode {
		fyneApp = test.NewApp()
	} else {
		fyneApp = app.New()
	}

	return &Bridge{
		app:           fyneApp,
		windows:       make(map[string]fyne.Window),
		widgets:       make(map[string]fyne.CanvasObject),
		callbacks:     make(map[string]string),
		contextMenus:  make(map[string]*fyne.Menu),
		testMode:      testMode,
		writer:        json.NewEncoder(os.Stdout),
		widgetMeta:    make(map[string]WidgetMetadata),
		tableData:     make(map[string][][]string),
		listData:      make(map[string][]string),
		windowContent: make(map[string]string),
		customIds:     make(map[string]string),
		childToParent: make(map[string]string),
		quitChan:      make(chan bool, 1),
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
