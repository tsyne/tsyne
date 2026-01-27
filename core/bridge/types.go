package main

import (
	"encoding/json"
	"image"
	"image/color"
	"image/draw"
	"log"
	"os"
	"sync"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/driver/embedded"
	"fyne.io/fyne/v2/test"
	"fyne.io/fyne/v2/theme"
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

// ============================================================================
// Helper functions for type conversion (JSON uses float64, msgpack uses int8/16/32/64)
// ============================================================================

// toInt converts interface{} to int, handling both JSON (float64) and msgpack (various int types)
func toInt(v interface{}) int {
	switch val := v.(type) {
	case float64:
		return int(val)
	case int:
		return val
	case int8:
		return int(val)
	case int16:
		return int(val)
	case int32:
		return int(val)
	case int64:
		return int(val)
	case uint:
		return int(val)
	case uint8:
		return int(val)
	case uint16:
		return int(val)
	case uint32:
		return int(val)
	case uint64:
		return int(val)
	default:
		return 0
	}
}

// toFloat32 converts interface{} to float32, handling both JSON (float64) and msgpack (various numeric types)
func toFloat32(v interface{}) float32 {
	switch val := v.(type) {
	case float64:
		return float32(val)
	case float32:
		return val
	case int:
		return float32(val)
	case int8:
		return float32(val)
	case int16:
		return float32(val)
	case int32:
		return float32(val)
	case int64:
		return float32(val)
	case uint:
		return float32(val)
	case uint8:
		return float32(val)
	case uint16:
		return float32(val)
	case uint32:
		return float32(val)
	case uint64:
		return float32(val)
	default:
		return 0
	}
}

// toFloat64 converts interface{} to float64, handling both JSON (float64) and msgpack (various numeric types)
func toFloat64(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int8:
		return float64(val)
	case int16:
		return float64(val)
	case int32:
		return float64(val)
	case int64:
		return float64(val)
	case uint:
		return float64(val)
	case uint8:
		return float64(val)
	case uint16:
		return float64(val)
	case uint32:
		return float64(val)
	case uint64:
		return float64(val)
	default:
		return 0
	}
}

// getFloat64 returns (value, true) if v is a numeric type, (0, false) if nil or non-numeric
func getFloat64(v interface{}) (float64, bool) {
	if v == nil {
		return 0, false
	}
	switch val := v.(type) {
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case int:
		return float64(val), true
	case int8:
		return float64(val), true
	case int16:
		return float64(val), true
	case int32:
		return float64(val), true
	case int64:
		return float64(val), true
	case uint:
		return float64(val), true
	case uint8:
		return float64(val), true
	case uint16:
		return float64(val), true
	case uint32:
		return float64(val), true
	case uint64:
		return float64(val), true
	default:
		return 0, false
	}
}

// Bridge manages the Fyne app and communication
type Bridge struct {
	app             fyne.App
	windows         map[string]fyne.Window
	widgets         map[string]fyne.CanvasObject
	callbacks       map[string]string     // widget ID -> callback ID
	contextMenus    map[string]*fyne.Menu // widget ID -> context menu
	testMode        bool                  // true for headless testing
	transport       string                // "stdio" (default), "grpc", "msgpack", or "ffi"
	grpcEventChan   chan Event            // channel for gRPC event streaming
	mu              sync.RWMutex
	writer          *json.Encoder
	widgetMeta      map[string]WidgetMetadata        // metadata for testing
	tableData       map[string][][]string            // table ID -> data
	listData        map[string][]string              // list ID -> data
	toolbarItems    map[string]*ToolbarItemsMetadata // toolbar ID -> items metadata
	toolbarActions  map[string]*widget.ToolbarAction // custom ID -> toolbar action
	windowContent   map[string]string                // window ID -> current content widget ID
	customIds         map[string]string                // custom ID -> widget ID (for test framework)
	widgetToCustomId  map[string]string                // reverse: widget ID -> custom ID (for O(1) cleanup)
	childToParent   map[string]string                // child ID -> parent ID
	quitChan        chan bool                        // signal quit in test mode
	resources       map[string][]byte                // resource name -> decoded image data
	scalableTheme   *ScalableTheme                   // custom theme for font scaling
	rasterData      map[string][][]color.Color       // raster widget ID -> pixel buffer
	closeIntercepts map[string]string                // window ID -> callback ID for close intercept
	closeResponses  map[string]chan bool             // window ID -> channel for close intercept response
	progressDialogs map[string]*ProgressDialogInfo   // dialog ID -> progress dialog info
	arcData              map[string]*ArcData              // arc widget ID -> arc data
	polygonData          map[string]*PolygonData          // polygon widget ID -> polygon data
	sphericalPatchData   map[string]*SphericalPatchData   // spherical patch ID -> patch data
	checkeredSphereData  map[string]*CheckeredSphereData  // checkered sphere ID -> sphere data
	sphereData           map[string]*SphereData           // sphere ID -> sphere data (generalized)
	sphereCustomBuffers  map[string]*image.RGBA           // sphere ID -> custom pattern buffer (Phase 9)
	ellipseData          map[string]*EllipseData          // ellipse ID -> ellipse data
	customDialogs   map[string]interface{}           // dialog ID -> custom dialog instance
	rasterSprites   map[string]*RasterSpriteSystem   // raster ID -> sprite system
	msgpackServer   *MsgpackServer                   // MessagePack UDS server (when in msgpack-uds mode)
	ffiEventCallback func(Event)                     // FFI event callback (when in FFI mode)
}

// SetEventCallback sets the callback for FFI event delivery
func (b *Bridge) SetEventCallback(callback func(Event)) {
	b.ffiEventCallback = callback
}

// ProgressDialogInfo stores information about a progress dialog
type ProgressDialogInfo struct {
	Dialog      interface{}         // *dialog.CustomDialog
	ProgressBar *widget.ProgressBar // nil for infinite progress bars
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

// SphericalPatchData stores data for spherical patch primitives (for Amiga Boing ball)
// A spherical patch is a curved quadrilateral on a sphere bounded by lat/lon lines
type SphericalPatchData struct {
	CenterX   float32     // Center X of the sphere in canvas coordinates
	CenterY   float32     // Center Y of the sphere in canvas coordinates
	Radius    float32     // Radius of the sphere
	LatStart  float64     // Starting latitude in radians (-π/2 to π/2)
	LatEnd    float64     // Ending latitude in radians
	LonStart  float64     // Starting longitude in radians (0 to 2π)
	LonEnd    float64     // Ending longitude in radians
	Rotation  float64     // Y-axis rotation in radians (for spinning)
	FillColor color.RGBA  // Fill color for the patch
}

// CheckeredSphereData stores data for a checkered sphere (Amiga Boing ball)
// Renders ALL patches in a single raster to avoid z-order compositing issues
type CheckeredSphereData struct {
	CenterX     float32    // Center X of the sphere in canvas coordinates
	CenterY     float32    // Center Y of the sphere in canvas coordinates
	Radius      float32    // Radius of the sphere
	LatBands    int        // Number of latitude bands
	LonSegments int        // Number of longitude segments (front hemisphere only)
	Rotation    float64    // Y-axis rotation in radians (for spinning)
	Color1      color.RGBA // First checkerboard color (e.g., red)
	Color2      color.RGBA // Second checkerboard color (e.g., white)
}

// SphereData stores data for a generalized sphere (Phase 1: patterns)
// Supports checkered, solid, stripes, and gradient patterns
// Renders ALL patches in a single raster to avoid z-order compositing issues
type SphereData struct {
	CenterX        float32     // Center X of the sphere in canvas coordinates
	CenterY        float32     // Center Y of the sphere in canvas coordinates
	Radius         float32     // Radius of the sphere
	LatBands       int         // Number of latitude bands
	LonSegments    int         // Number of longitude segments (full sphere)
	RotationX      float64     // X-axis rotation in radians (tilt forward/back)
	RotationY      float64     // Y-axis rotation in radians (spin left/right)
	RotationZ      float64     // Z-axis rotation in radians (roll)
	Pattern        string      // Pattern type: solid, checkered, stripes, gradient, custom
	SolidColor     color.RGBA  // For solid pattern
	CheckeredCol1  color.RGBA  // For checkered pattern
	CheckeredCol2  color.RGBA  // For checkered pattern
	StripeColors   []color.RGBA // For stripes pattern
	StripeDir      string      // horizontal or vertical
	GradientStart  color.RGBA  // For gradient pattern
	GradientEnd    color.RGBA  // For gradient pattern
	// Phase 4: Texture mapping
	TextureResourceName string   // Name of registered texture resource
	TextureMapping      string   // Mapping type: equirectangular or cubemap
	// Phase 5: Interactivity
	HasTapHandler bool   // Whether tap events should be sent
	WidgetID      string // Widget ID for event routing
	// Phase 7: Configurable lighting
	LightingEnabled bool    // Whether lighting is enabled (default: true)
	LightDirX       float64 // Light direction X component
	LightDirY       float64 // Light direction Y component
	LightDirZ       float64 // Light direction Z component
	Ambient         float64 // Ambient light intensity (0-1)
	Diffuse         float64 // Diffuse light intensity (0-1)
	// Phase 8: Cubemap textures
	CubemapPosX string // Resource name for +X face
	CubemapNegX string // Resource name for -X face
	CubemapPosY string // Resource name for +Y face
	CubemapNegY string // Resource name for -Y face
	CubemapPosZ string // Resource name for +Z face
	CubemapNegZ string // Resource name for -Z face
	// Phase 9: Custom pattern
	HasCustomPattern bool   // Whether using custom pattern (rendered via buffer)
}

// WidgetMetadata stores metadata about widgets for testing
type WidgetMetadata struct {
	Type        string
	Text        string
	URL         string                 // For hyperlinks
	Placeholder string                 // For entry widgets
	TestId      string                 // For test framework getByTestId
	CustomData  map[string]interface{} // For storing additional metadata like accessibility info
	// Padding values (0 means not set/default)
	PaddingTop    float32
	PaddingRight  float32
	PaddingBottom float32
	PaddingLeft   float32
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

// MinSize returns the minimum size of the tappable container (delegates to content)
func (t *TappableContainer) MinSize() fyne.Size {
	return t.content.MinSize()
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

// MinSize returns the minimum size of the clickable container (delegates to content)
func (c *ClickableContainer) MinSize() fyne.Size {
	return c.content.MinSize()
}

// ImageButton is a button widget that displays an image above text.
// It uses Fyne's native button tap handling for reliable touch support.
type ImageButton struct {
	widget.BaseWidget
	Image    *canvas.Image
	Text     string
	TextSize float32
	OnTapped func()

	// Internal state
	hovered bool
	pressed bool
}

// NewImageButton creates a new image button with the given image and text
func NewImageButton(img *canvas.Image, text string, tapped func()) *ImageButton {
	b := &ImageButton{
		Image:    img,
		Text:     text,
		OnTapped: tapped,
	}
	b.ExtendBaseWidget(b)
	return b
}

// Tapped handles tap events - this is what makes it work like a button
func (b *ImageButton) Tapped(e *fyne.PointEvent) {
	if b.OnTapped != nil {
		b.OnTapped()
	}
}

// TappedSecondary handles secondary tap (right-click/long-press)
func (b *ImageButton) TappedSecondary(e *fyne.PointEvent) {
	// Could be extended for context menu support
}

// CreateRenderer creates the renderer for the image button
func (b *ImageButton) CreateRenderer() fyne.WidgetRenderer {
	return &imageButtonRenderer{button: b}
}

// imageButtonRenderer renders the ImageButton
type imageButtonRenderer struct {
	button    *ImageButton
	container *fyne.Container
	label     *canvas.Text
}

func (r *imageButtonRenderer) Layout(size fyne.Size) {
	if r.container == nil {
		r.buildUI()
	}
	r.container.Resize(size)
}

func (r *imageButtonRenderer) MinSize() fyne.Size {
	if r.container == nil {
		r.buildUI()
	}
	return r.container.MinSize()
}

func (r *imageButtonRenderer) Refresh() {
	if r.container == nil {
		r.buildUI()
	}
	if r.label != nil {
		r.label.Text = r.button.Text
		if r.button.TextSize > 0 {
			r.label.TextSize = r.button.TextSize
		}
		r.label.Refresh()
	}
	r.container.Refresh()
}

func (r *imageButtonRenderer) Objects() []fyne.CanvasObject {
	if r.container == nil {
		r.buildUI()
	}
	return []fyne.CanvasObject{r.container}
}

func (r *imageButtonRenderer) Destroy() {}

func (r *imageButtonRenderer) buildUI() {
	// Create label for text
	r.label = canvas.NewText(r.button.Text, theme.ForegroundColor())
	r.label.Alignment = fyne.TextAlignCenter
	if r.button.TextSize > 0 {
		r.label.TextSize = r.button.TextSize
	}

	// Build vertical layout: image on top, text below
	var objects []fyne.CanvasObject
	if r.button.Image != nil {
		objects = append(objects, r.button.Image)
	}
	objects = append(objects, r.label)

	r.container = container.NewVBox(objects...)
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

// ============================================================================
// TsyneEntry - Entry with focus callbacks for virtual keyboard support
// ============================================================================

// TsyneEntry wraps widget.Entry to add focus change callbacks
// Needed for PhoneTop to show/hide virtual keyboard when text fields are focused
type TsyneEntry struct {
	widget.Entry
	bridge            *Bridge
	widgetID          string
	onFocusCallbackId string
}

// NewTsyneEntry creates a new entry with focus callback support
func NewTsyneEntry(bridge *Bridge, widgetID string) *TsyneEntry {
	e := &TsyneEntry{
		bridge:   bridge,
		widgetID: widgetID,
	}
	e.ExtendBaseWidget(e)
	return e
}

// SetOnFocusCallbackId sets the callback ID for focus change events
func (e *TsyneEntry) SetOnFocusCallbackId(callbackId string) {
	e.onFocusCallbackId = callbackId
}

// FocusGained is called when the entry gains focus
func (e *TsyneEntry) FocusGained() {
	e.Entry.FocusGained()

	// Always send global textInputFocus event (for PhoneTop keyboard show/hide)
	e.bridge.sendEvent(Event{
		Type:     "textInputFocus",
		WidgetID: e.widgetID,
		Data: map[string]interface{}{
			"focused": true,
		},
	})

	// Also call widget-specific callback if registered
	if e.onFocusCallbackId != "" {
		e.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": e.onFocusCallbackId,
				"focused":    true,
			},
		})
	}
}

// FocusLost is called when the entry loses focus
func (e *TsyneEntry) FocusLost() {
	e.Entry.FocusLost()

	// Always send global textInputFocus event (for PhoneTop keyboard show/hide)
	e.bridge.sendEvent(Event{
		Type:     "textInputFocus",
		WidgetID: e.widgetID,
		Data: map[string]interface{}{
			"focused": false,
		},
	})

	// Also call widget-specific callback if registered
	if e.onFocusCallbackId != "" {
		e.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": e.onFocusCallbackId,
				"focused":    false,
			},
		})
	}
}

// Ensure TsyneEntry implements fyne.Focusable
var _ fyne.Focusable = (*TsyneEntry)(nil)

// TsyneTextGrid wraps widget.TextGrid and implements fyne.Focusable, desktop.Keyable,
// and desktop.Mouseable for keyboard and mouse input support (needed for terminal emulator)
type TsyneTextGrid struct {
	widget.BaseWidget
	TextGrid        *widget.TextGrid
	ShortcutHandler fyne.ShortcutHandler
	bridge          *Bridge
	widgetID        string

	// Callback IDs for event dispatching to TypeScript
	onKeyDownCallbackId   string
	onKeyUpCallbackId     string
	onTypedCallbackId     string // For TypedRune - character input
	onFocusCallbackId     string
	onMouseDownCallbackId string
	onMouseMoveCallbackId string
	onMouseUpCallbackId   string

	// Track focus state
	focused bool

	// Track mouse button state for drag detection
	mouseButtonDown bool
}

// NewTsyneTextGrid creates a new focusable TextGrid wrapper
func NewTsyneTextGrid(textGrid *widget.TextGrid, bridge *Bridge, widgetID string) *TsyneTextGrid {
	tg := &TsyneTextGrid{
		TextGrid: textGrid,
		bridge:   bridge,
		widgetID: widgetID,
	}
	tg.ExtendBaseWidget(tg)

	// Register Ctrl+Shift+C for copy (since Ctrl+C is SIGINT in terminal)
	copyShortcut := &desktop.CustomShortcut{KeyName: fyne.KeyC, Modifier: fyne.KeyModifierShift | fyne.KeyModifierControl}
	tg.ShortcutHandler.AddShortcut(copyShortcut, func(shortcut fyne.Shortcut) {
		tg.sendShortcutEvent("C", true, true, false)
	})

	// Register Ctrl+Shift+V for paste
	pasteShortcut := &desktop.CustomShortcut{KeyName: fyne.KeyV, Modifier: fyne.KeyModifierShift | fyne.KeyModifierControl}
	tg.ShortcutHandler.AddShortcut(pasteShortcut, func(shortcut fyne.Shortcut) {
		tg.sendShortcutEvent("V", true, true, false)
	})

	return tg
}

// sendShortcutEvent sends a keyboard shortcut event to TypeScript
func (t *TsyneTextGrid) sendShortcutEvent(key string, shift, ctrl, alt bool) {
	if t.onKeyDownCallbackId == "" {
		return
	}
	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onKeyDownCallbackId,
			"key":        key,
			"shift":      shift,
			"ctrl":       ctrl,
			"alt":        alt,
		},
	})
}

// CreateRenderer renders the embedded TextGrid
func (t *TsyneTextGrid) CreateRenderer() fyne.WidgetRenderer {
	return widget.NewSimpleRenderer(t.TextGrid)
}

// SetCallbackIds configures callback IDs for event dispatching (keyboard and focus)
func (t *TsyneTextGrid) SetCallbackIds(keyDown, keyUp, typed, focus string) {
	t.onKeyDownCallbackId = keyDown
	t.onKeyUpCallbackId = keyUp
	t.onTypedCallbackId = typed
	t.onFocusCallbackId = focus
}

// SetMouseCallbackIds configures callback IDs for mouse event dispatching
func (t *TsyneTextGrid) SetMouseCallbackIds(mouseDown, mouseMove, mouseUp string) {
	t.onMouseDownCallbackId = mouseDown
	t.onMouseMoveCallbackId = mouseMove
	t.onMouseUpCallbackId = mouseUp
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
// Note: We implement desktop.Keyable which provides KeyDown/KeyUp with modifier support.
// Fyne calls both TypedKey and KeyDown, so we handle events in KeyDown only to avoid duplicates.
func (t *TsyneTextGrid) TypedKey(e *fyne.KeyEvent) {
	// No-op: KeyDown handles all key events with proper modifier support
}

// --- desktop.Keyable interface ---

func (t *TsyneTextGrid) KeyDown(e *fyne.KeyEvent) {
	if t.onKeyDownCallbackId == "" {
		return
	}

	// Get current modifiers from Fyne driver
	shift := false
	ctrl := false
	alt := false
	if d, ok := fyne.CurrentApp().Driver().(desktop.Driver); ok {
		mods := d.CurrentKeyModifiers()
		shift = mods&fyne.KeyModifierShift != 0
		ctrl = mods&fyne.KeyModifierControl != 0
		alt = mods&fyne.KeyModifierAlt != 0
	}

	// Skip if this is a registered shortcut (will be handled by TypedShortcut)
	// Ctrl+Shift+C and Ctrl+Shift+V are registered shortcuts
	if ctrl && shift && (e.Name == fyne.KeyC || e.Name == fyne.KeyV) {
		return
	}

	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onKeyDownCallbackId,
			"key":        string(e.Name),
			"shift":      shift,
			"ctrl":       ctrl,
			"alt":        alt,
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

// TypedShortcut handles keyboard shortcuts with modifiers (Ctrl+C, Ctrl+Shift+C, etc.)
func (t *TsyneTextGrid) TypedShortcut(shortcut fyne.Shortcut) {
	// Delegate to our registered shortcuts (Ctrl+Shift+C, Ctrl+Shift+V)
	t.ShortcutHandler.TypedShortcut(shortcut)
}

// --- desktop.Mouseable interface (for selection/drag) ---

// MouseDown implements desktop.Mouseable for mouse button press
func (t *TsyneTextGrid) MouseDown(e *desktop.MouseEvent) {
	t.mouseButtonDown = true

	// Request focus when clicked
	if c := fyne.CurrentApp().Driver().CanvasForObject(t); c != nil {
		c.Focus(t)
	}

	if t.onMouseDownCallbackId == "" {
		return
	}

	// Convert button to int (1=left, 2=middle, 3=right)
	button := 1
	if e.Button == desktop.MouseButtonSecondary {
		button = 3
	} else if e.Button == desktop.MouseButtonTertiary {
		button = 2
	}

	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onMouseDownCallbackId,
			"x":          float64(e.Position.X),
			"y":          float64(e.Position.Y),
			"button":     button,
			"shift":      e.Modifier&fyne.KeyModifierShift != 0,
			"ctrl":       e.Modifier&fyne.KeyModifierControl != 0,
			"alt":        e.Modifier&fyne.KeyModifierAlt != 0,
		},
	})
}

// MouseUp implements desktop.Mouseable for mouse button release
func (t *TsyneTextGrid) MouseUp(e *desktop.MouseEvent) {
	t.mouseButtonDown = false

	if t.onMouseUpCallbackId == "" {
		return
	}

	button := 1
	if e.Button == desktop.MouseButtonSecondary {
		button = 3
	} else if e.Button == desktop.MouseButtonTertiary {
		button = 2
	}

	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onMouseUpCallbackId,
			"x":          float64(e.Position.X),
			"y":          float64(e.Position.Y),
			"button":     button,
			"shift":      e.Modifier&fyne.KeyModifierShift != 0,
			"ctrl":       e.Modifier&fyne.KeyModifierControl != 0,
			"alt":        e.Modifier&fyne.KeyModifierAlt != 0,
		},
	})
}

// --- desktop.Hoverable interface (for mouse move during drag) ---

// MouseIn implements desktop.Hoverable
func (t *TsyneTextGrid) MouseIn(*desktop.MouseEvent) {}

// MouseOut implements desktop.Hoverable
func (t *TsyneTextGrid) MouseOut() {}

// MouseMoved implements desktop.Hoverable for mouse movement (used during drag)
func (t *TsyneTextGrid) MouseMoved(e *desktop.MouseEvent) {
	// Only send move events if we have a callback and button is down (dragging)
	if t.onMouseMoveCallbackId == "" || !t.mouseButtonDown {
		return
	}

	t.bridge.sendEvent(Event{
		Type: "callback",
		Data: map[string]interface{}{
			"callbackId": t.onMouseMoveCallbackId,
			"x":          float64(e.Position.X),
			"y":          float64(e.Position.Y),
			"shift":      e.Modifier&fyne.KeyModifierShift != 0,
			"ctrl":       e.Modifier&fyne.KeyModifierControl != 0,
			"alt":        e.Modifier&fyne.KeyModifierAlt != 0,
		},
	})
}

// HoverableWrapper wraps a widget and implements desktop.Hoverable for mouse enter/exit events
type HoverableWrapper struct {
	widget.BaseWidget
	content         fyne.CanvasObject
	bridge          *Bridge
	widgetID        string
	mouseInHandler  func(*desktop.MouseEvent)
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

	ID        string
	Label     string
	IconRect  *canvas.Rectangle
	IconImage *canvas.Image
	TextObj   *canvas.Text

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
	bridge                     *Bridge
	onDragCallbackId           string
	onDragEndCallbackId        string
	onClickCallbackId          string
	onDblClickCallbackId       string
	onRightClickCallbackId     string
	onDropReceivedCallbackId   string
}

// trimTransparentPadding crops transparent edges to reduce visual padding differences across icons
func trimTransparentPadding(img image.Image) image.Image {
	b := img.Bounds()
	nrgba, ok := img.(*image.NRGBA)
	if !ok {
		nrgba = image.NewNRGBA(b)
		draw.Draw(nrgba, b, img, b.Min, draw.Src)
	}

	minX, minY := b.Max.X, b.Max.Y
	maxX, maxY := b.Min.X, b.Min.Y
	found := false

	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			a := nrgba.NRGBAAt(x, y).A
			if a > 8 { // small threshold to ignore tiny antialiasing specks
				if x < minX {
					minX = x
				}
				if y < minY {
					minY = y
				}
				if x >= maxX {
					maxX = x + 1
				}
				if y >= maxY {
					maxY = y + 1
				}
				found = true
			}
		}
	}

	if !found {
		return img
	}

	// Add a small padding to avoid touching edges
	const pad = 2
	minX -= pad
	minY -= pad
	maxX += pad
	maxY += pad
	if minX < b.Min.X {
		minX = b.Min.X
	}
	if minY < b.Min.Y {
		minY = b.Min.Y
	}
	if maxX > b.Max.X {
		maxX = b.Max.X
	}
	if maxY > b.Max.Y {
		maxY = b.Max.Y
	}

	crop := image.Rect(minX, minY, maxX, maxY)
	cropped := image.NewNRGBA(image.Rect(0, 0, crop.Dx(), crop.Dy()))
	draw.Draw(cropped, cropped.Bounds(), nrgba, crop.Min, draw.Src)
	return cropped
}

// NewTsyneDraggableIcon creates a new draggable icon
func NewTsyneDraggableIcon(id, label string, iconColor color.Color, x, y float32, desktop *TsyneDesktopCanvas, bridge *Bridge, iconImage image.Image) *TsyneDraggableIcon {
	icon := &TsyneDraggableIcon{
		ID:      id,
		Label:   label,
		PosX:    x,
		PosY:    y,
		desktop: desktop,
		bridge:  bridge,
	}

	// Create the icon rectangle (larger to reduce padding)
	const iconBoxSize float32 = 80
	icon.IconRect = canvas.NewRectangle(iconColor)
	icon.IconRect.SetMinSize(fyne.NewSize(iconBoxSize, iconBoxSize))
	icon.IconRect.CornerRadius = 8

	if iconImage != nil {
		icon.IconImage = canvas.NewImageFromImage(iconImage)
		icon.IconImage.FillMode = canvas.ImageFillContain
		icon.IconImage.SetMinSize(fyne.NewSize(iconBoxSize, iconBoxSize))
	}

	// Create the text label
	icon.TextObj = canvas.NewText(label, color.White)
	icon.TextObj.Alignment = fyne.TextAlignCenter
	icon.TextObj.TextSize = 12

	icon.ExtendBaseWidget(icon)
	return icon
}

// NewTsyneDraggableIconForMDI creates a new draggable icon for a DesktopMDI container
func NewTsyneDraggableIconForMDI(id, label string, iconColor color.Color, x, y float32, container DesktopIconContainer, bridge *Bridge, iconImage image.Image) *TsyneDraggableIcon {
	icon := &TsyneDraggableIcon{
		ID:               id,
		Label:            label,
		PosX:             x,
		PosY:             y,
		desktopContainer: container,
		bridge:           bridge,
	}

	// Create the icon rectangle (larger to reduce padding)
	const iconBoxSize float32 = 80
	icon.IconRect = canvas.NewRectangle(iconColor)
	icon.IconRect.SetMinSize(fyne.NewSize(iconBoxSize, iconBoxSize))
	icon.IconRect.CornerRadius = 8

	if iconImage != nil {
		icon.IconImage = canvas.NewImageFromImage(iconImage)
		icon.IconImage.FillMode = canvas.ImageFillContain
		icon.IconImage.SetMinSize(fyne.NewSize(iconBoxSize, iconBoxSize))
	}

	// Create the text label
	icon.TextObj = canvas.NewText(label, color.White)
	icon.TextObj.Alignment = fyne.TextAlignCenter
	icon.TextObj.TextSize = 12

	icon.ExtendBaseWidget(icon)
	return icon
}

// SetCallbackIds configures callback IDs for event dispatching
func (d *TsyneDraggableIcon) SetCallbackIds(drag, dragEnd, click, dblClick, rightClick, dropReceived string) {
	d.onDragCallbackId = drag
	d.onDragEndCallbackId = dragEnd
	d.onClickCallbackId = click
	d.onDblClickCallbackId = dblClick
	d.onRightClickCallbackId = rightClick
	d.onDropReceivedCallbackId = dropReceived
}

// CreateRenderer returns the widget renderer
func (d *TsyneDraggableIcon) CreateRenderer() fyne.WidgetRenderer {
	// Stack icon and text vertically
	content := container.NewVBox(
		func() fyne.CanvasObject {
			if d.IconImage != nil {
				return container.NewMax(d.IconRect, container.NewCenter(d.IconImage))
			}
			return container.NewCenter(d.IconRect)
		}(),
		container.NewCenter(d.TextObj),
	)
	return widget.NewSimpleRenderer(content)
}

// MinSize returns the minimum size of the icon
func (d *TsyneDraggableIcon) MinSize() fyne.Size {
	return fyne.NewSize(90, 105)
}

// Tapped handles single tap/click - used for double-click detection
func (d *TsyneDraggableIcon) Tapped(e *fyne.PointEvent) {
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

// TappedSecondary handles right-click events
func (d *TsyneDraggableIcon) TappedSecondary(e *fyne.PointEvent) {
	if d.onRightClickCallbackId != "" && d.bridge != nil {
		d.bridge.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": d.onRightClickCallbackId,
				"iconId":     d.ID,
				"x":          d.PosX,
				"y":          d.PosY,
			},
		})
	}
}

// Dragged handles drag events
func (d *TsyneDraggableIcon) Dragged(e *fyne.DragEvent) {
	if !d.dragging {
		d.dragging = true
		d.dragStartX = d.PosX
		d.dragStartY = d.PosY
		// Refresh parent container so dragged icon renders on top
		if d.desktopContainer != nil {
			d.desktopContainer.Refresh()
		}
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
		// Check if we dropped on another icon (icon-on-icon drop)
		droppedOnIcon := d.checkDropOnIcon()

		if droppedOnIcon {
			// Return to original position - don't move the file icon permanently
			d.PosX = d.dragStartX
			d.PosY = d.dragStartY
			d.Move(fyne.NewPos(d.PosX, d.PosY))
			// Don't notify TypeScript of position change
		} else {
			// Notify TypeScript of drag end (normal move)
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
		}
		d.dragging = false

		// Refresh parent to restore normal z-order
		if d.desktopContainer != nil {
			d.desktopContainer.Refresh()
		}
	}
}

// checkDropOnIcon checks if this icon was dropped on another icon or window
// and fires the target icon's onDropReceived callback if so.
// Returns true if a drop was handled (icon should return to original position).
func (d *TsyneDraggableIcon) checkDropOnIcon() bool {
	// Get the list of icons and windows from the container
	var icons []*TsyneDraggableIcon
	var windows []*container.InnerWindow
	if d.desktopContainer != nil {
		if mdi, ok := d.desktopContainer.(*TsyneDesktopMDI); ok {
			icons = mdi.icons
			windows = mdi.windows
		}
	} else if d.desktop != nil {
		icons = d.desktop.icons
	}

	if icons == nil {
		return false
	}

	// Check each icon to see if we dropped on it
	// Use the center of this icon for the hit test
	mySize := d.MinSize()
	centerX := d.PosX + mySize.Width/2
	centerY := d.PosY + mySize.Height/2

	for _, target := range icons {
		if target == d {
			continue // Skip self
		}

		// Check if our center is within the target icon's bounds
		targetSize := target.MinSize()
		if centerX >= target.PosX && centerX < target.PosX+targetSize.Width &&
			centerY >= target.PosY && centerY < target.PosY+targetSize.Height {
			// We dropped on this icon!
			if target.onDropReceivedCallbackId != "" && target.bridge != nil {
				target.bridge.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId":    target.onDropReceivedCallbackId,
						"droppedIconId": d.ID,
						"targetIconId":  target.ID,
					},
				})
				return true // Drop was handled
			}
			break // Only trigger on the first matching icon
		}
	}

	// Also check if we dropped on any open windows
	// If so, fire the window's drop callback (if registered) and return icon to original position
	if d.desktopContainer != nil {
		if mdi, ok := d.desktopContainer.(*TsyneDesktopMDI); ok {
			for _, win := range windows {
				winPos := win.Position()
				winSize := win.Size()
				if centerX >= winPos.X && centerX < winPos.X+winSize.Width &&
					centerY >= winPos.Y && centerY < winPos.Y+winSize.Height {
					// Dropped on an inner window - fire callback if registered
					if callbackId, exists := mdi.windowDropCallbacks[win]; exists && callbackId != "" && mdi.bridge != nil {
						// Pass absolute drop coordinates (for use with widget tree hit testing)
						mdi.bridge.sendEvent(Event{
							Type: "callback",
							Data: map[string]interface{}{
								"callbackId":    callbackId,
								"droppedIconId": d.ID,
								"x":             centerX,
								"y":             centerY,
							},
						})
					}
					return true
				}
			}
		}
	}

	return false
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

	icons                []*TsyneDraggableIcon
	windows              []*container.InnerWindow
	windowDropCallbacks  map[*container.InnerWindow]string // Maps windows to drop callback IDs
	bgColor              color.Color
	bridge               *Bridge
	id                   string
}

// NewTsyneDesktopMDI creates a new desktop MDI container
func NewTsyneDesktopMDI(id string, bgColor color.Color, bridge *Bridge) *TsyneDesktopMDI {
	dm := &TsyneDesktopMDI{
		icons:               make([]*TsyneDraggableIcon, 0),
		windows:             make([]*container.InnerWindow, 0),
		windowDropCallbacks: make(map[*container.InnerWindow]string),
		bgColor:             bgColor,
		bridge:              bridge,
		id:                  id,
	}
	dm.ExtendBaseWidget(dm)
	return dm
}

// AddIcon adds an icon to the desktop at the specified position
func (dm *TsyneDesktopMDI) AddIcon(icon *TsyneDraggableIcon) {
	dm.icons = append(dm.icons, icon)
	fyne.Do(func() {
		dm.Refresh()
	})
}

// AddWindow adds an inner window to the MDI
func (dm *TsyneDesktopMDI) AddWindow(win *container.InnerWindow) {
	dm.setupWindowCallbacks(win)
	dm.windows = append(dm.windows, win)
	fyne.Do(func() {
		dm.Refresh()
	})
}

// setupWindowCallbacks wires up drag/resize/raise handlers so InnerWindows behave like MultipleWindows
func (dm *TsyneDesktopMDI) setupWindowCallbacks(win *container.InnerWindow) {
	win.OnDragged = func(ev *fyne.DragEvent) {
		pos := win.Position()
		win.Move(fyne.NewPos(pos.X+ev.Dragged.DX, pos.Y+ev.Dragged.DY))
	}
	win.OnResized = func(ev *fyne.DragEvent) {
		size := win.Size()
		min := win.MinSize()
		newSize := fyne.NewSize(size.Width+ev.Dragged.DX, size.Height+ev.Dragged.DY)
		if newSize.Width < min.Width {
			newSize.Width = min.Width
		}
		if newSize.Height < min.Height {
			newSize.Height = min.Height
		}
		win.Resize(newSize)
	}
	win.OnTappedBar = func() {
		dm.RaiseWindow(win)
	}
}

// RemoveWindow removes an inner window from the MDI
func (dm *TsyneDesktopMDI) RemoveWindow(win *container.InnerWindow) {
	for i, w := range dm.windows {
		if w == win {
			dm.windows = append(dm.windows[:i], dm.windows[i+1:]...)
			break
		}
	}
	fyne.Do(func() {
		dm.Refresh()
	})
}

// RaiseWindow brings a window to the front
func (dm *TsyneDesktopMDI) RaiseWindow(win *container.InnerWindow) {
	index := -1
	for i, w := range dm.windows {
		if w == win {
			index = i
			break
		}
	}
	if index == -1 {
		return
	}

	// Move the window to the end of the slice so it renders last (top-most)
	dm.windows = append(dm.windows[:index], dm.windows[index+1:]...)
	dm.windows = append(dm.windows, win)
	fyne.Do(func() {
		dm.Refresh()
	})
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

func maxFloat(a, b float32) float32 {
	if a > b {
		return a
	}
	return b
}

func (r *desktopMDIRenderer) Layout(size fyne.Size) {
	r.bg.Resize(size)
	r.bg.Move(fyne.NewPos(0, 0))

	// Position icons at their stored positions (icons on top of windows)
	for _, icon := range r.desktop.icons {
		iconSize := icon.MinSize()
		icon.Resize(iconSize)
		icon.Move(fyne.NewPos(icon.PosX, icon.PosY))
	}

	// Ensure windows at least their minimum size
	for _, win := range r.desktop.windows {
		size := win.Size()
		min := win.MinSize()
		if size.Width < min.Width || size.Height < min.Height {
			win.Resize(fyne.NewSize(
				maxFloat(size.Width, min.Width),
				maxFloat(size.Height, min.Height),
			))
		}
	}
}

func (r *desktopMDIRenderer) MinSize() fyne.Size {
	return fyne.NewSize(800, 600)
}

func (r *desktopMDIRenderer) Refresh() {
	r.bg.FillColor = r.desktop.bgColor
	r.bg.Refresh()
	for _, icon := range r.desktop.icons {
		icon.Refresh()
	}
	for _, win := range r.desktop.windows {
		win.Refresh()
	}
}

func (r *desktopMDIRenderer) Objects() []fyne.CanvasObject {
	var objects []fyne.CanvasObject
	// Background first
	objects = append(objects, r.bg)

	// Find any icon being dragged - it needs to render on top
	var draggingIcon *TsyneDraggableIcon
	for _, icon := range r.desktop.icons {
		if icon.dragging {
			draggingIcon = icon
		} else {
			objects = append(objects, icon)
		}
	}

	// Windows render after non-dragged icons
	for _, win := range r.desktop.windows {
		objects = append(objects, win)
	}

	// Dragged icon renders last (on top of everything)
	if draggingIcon != nil {
		objects = append(objects, draggingIcon)
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
	return NewBridgeWithAppID(testMode, "com.tsyne.app")
}

func NewBridgeWithAppID(testMode bool, appID string) *Bridge {
	var fyneApp fyne.App
	if testMode {
		fyneApp = test.NewApp()
	} else {
		// Use NewWithID to enable Fyne preferences API
		// Each app should have a unique ID for separate preference storage
		fyneApp = app.NewWithID(appID)
	}

	// Create scalable theme with default font size
	scalableTheme := NewScalableTheme(1.0)

	// Note: Theme will be applied when first window is created (when event loop is running)
	// Setting theme during initialization causes threading issues in test mode

	return &Bridge{
		app:             fyneApp,
		windows:         make(map[string]fyne.Window),
		widgets:         make(map[string]fyne.CanvasObject),
		callbacks:       make(map[string]string),
		contextMenus:    make(map[string]*fyne.Menu),
		testMode:        testMode,
		writer:          json.NewEncoder(os.Stdout),
		widgetMeta:      make(map[string]WidgetMetadata),
		tableData:       make(map[string][][]string),
		listData:        make(map[string][]string),
		toolbarItems:    make(map[string]*ToolbarItemsMetadata),
		toolbarActions:  make(map[string]*widget.ToolbarAction),
		windowContent:   make(map[string]string),
		customIds:        make(map[string]string),
		widgetToCustomId: make(map[string]string),
		childToParent:    make(map[string]string),
		quitChan:        make(chan bool, 1),
		resources:       make(map[string][]byte),
		scalableTheme:   scalableTheme,
		closeIntercepts: make(map[string]string),
		closeResponses:  make(map[string]chan bool),
		progressDialogs: make(map[string]*ProgressDialogInfo),
	}
}

// NewBridgeWithEmbeddedDriver creates a Bridge using the embedded driver for custom rendering.
// This is only available on Android where Fyne renders to images that are displayed by the Android UI.
// On desktop/web, this would need a different approach and isn't currently used.
// Uses app.SetEmbeddedDriver() to configure the app with embedded driver, avoiding JNI issues.
// NOTE: Requires custom Fyne fork with embedded driver support.
func NewBridgeWithEmbeddedDriver(embeddedDriver embedded.Driver) *Bridge {
	// This function requires the custom Fyne fork with app.SetEmbeddedDriver()
	// For standard Fyne builds, we create a regular app instead
	fyneApp := app.NewWithID("com.tsyne.app")
	// app.SetEmbeddedDriver(fyneApp, embeddedDriver) // Requires custom Fyne fork
	_ = embeddedDriver // Suppress unused variable warning

	// Create scalable theme with default font size
	scalableTheme := NewScalableTheme(1.0)

	return &Bridge{
		app:             fyneApp,
		windows:         make(map[string]fyne.Window),
		widgets:         make(map[string]fyne.CanvasObject),
		callbacks:       make(map[string]string),
		contextMenus:    make(map[string]*fyne.Menu),
		testMode:        false,    // Embedded mode is not test mode
		transport:       "msgpack", // Use msgpack transport so events are sent via msgpackServer
		writer:          json.NewEncoder(os.Stdout),
		widgetMeta:      make(map[string]WidgetMetadata),
		tableData:       make(map[string][][]string),
		listData:        make(map[string][]string),
		toolbarItems:    make(map[string]*ToolbarItemsMetadata),
		toolbarActions:  make(map[string]*widget.ToolbarAction),
		windowContent:   make(map[string]string),
		customIds:        make(map[string]string),
		widgetToCustomId: make(map[string]string),
		childToParent:    make(map[string]string),
		quitChan:        make(chan bool, 1),
		resources:       make(map[string][]byte),
		scalableTheme:   scalableTheme,
		closeIntercepts: make(map[string]string),
		closeResponses:  make(map[string]chan bool),
		progressDialogs: make(map[string]*ProgressDialogInfo),
	}
}

func (b *Bridge) sendEvent(event Event) {
	// FFI direct call (highest priority)
	if b.ffiEventCallback != nil {
		b.ffiEventCallback(event)
		return
	}

	switch b.transport {
	case "msgpack":
		if b.msgpackServer != nil {
			b.msgpackServer.SendEvent(event)
		}
	case "grpc":
		if b.grpcEventChan != nil {
			select {
			case b.grpcEventChan <- event:
				// Event sent successfully
			default:
				log.Printf("[SEND-EVENT-ERROR] gRPC event channel full, dropping event: %s", event.Type)
			}
		}
	default: // "stdio" or empty
		b.mu.Lock()
		defer b.mu.Unlock()

		jsonData, err := json.Marshal(event)
		if err != nil {
			log.Printf("[SEND-EVENT-ERROR] Error marshaling event: %v", err)
			return
		}

		if err := writeFramedMessage(os.Stdout, jsonData); err != nil {
			log.Printf("[SEND-EVENT-ERROR] Error sending event: %v", err)
		}
	}
}

func (b *Bridge) sendResponse(resp Response) {
	// Only stdio transport uses this - grpc/msgpack return responses via their own mechanisms
	if b.transport != "" && b.transport != "stdio" {
		return
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	jsonData, err := json.Marshal(resp)
	if err != nil {
		log.Printf("Error marshaling response: %v", err)
		return
	}

	if err := writeFramedMessage(os.Stdout, jsonData); err != nil {
		log.Printf("Error sending response: %v", err)
	}
}
