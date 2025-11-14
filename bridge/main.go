package main

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"hash/crc32"
	"image"
	"image/color"
	"image/png"
	"io"
	"log"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/storage"
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

// =============================================================================
// IPC Safeguards #3 & #4: Framing Protocol with CRC32 Validation
// =============================================================================
// Frame format: [length: 4 bytes][crc32: 4 bytes][json: N bytes]
// - Length prefix allows detection of message boundaries
// - CRC32 checksum validates message integrity
// - Prevents corruption from accidental stdout writes

// writeFramedMessage writes a JSON message with length-prefix and CRC32 checksum
// Format: [uint32 length][uint32 crc32][json bytes]
func writeFramedMessage(w io.Writer, data []byte) error {
	// Calculate CRC32 checksum
	checksum := crc32.ChecksumIEEE(data)

	// Write length prefix (4 bytes, big-endian)
	length := uint32(len(data))
	if err := binary.Write(w, binary.BigEndian, length); err != nil {
		return fmt.Errorf("failed to write length: %w", err)
	}

	// Write CRC32 checksum (4 bytes, big-endian)
	if err := binary.Write(w, binary.BigEndian, checksum); err != nil {
		return fmt.Errorf("failed to write checksum: %w", err)
	}

	// Write JSON payload
	if _, err := w.Write(data); err != nil {
		return fmt.Errorf("failed to write payload: %w", err)
	}

	return nil
}

// readFramedMessage reads a length-prefixed, CRC32-validated JSON message
// Returns the JSON bytes or an error if the message is corrupted
func readFramedMessage(r io.Reader) ([]byte, error) {
	// Read length prefix (4 bytes)
	var length uint32
	if err := binary.Read(r, binary.BigEndian, &length); err != nil {
		return nil, fmt.Errorf("failed to read length: %w", err)
	}

	// Sanity check: reject unreasonably large messages (> 10MB)
	if length > 10*1024*1024 {
		return nil, fmt.Errorf("message too large: %d bytes", length)
	}

	// Read CRC32 checksum (4 bytes)
	var expectedChecksum uint32
	if err := binary.Read(r, binary.BigEndian, &expectedChecksum); err != nil {
		return nil, fmt.Errorf("failed to read checksum: %w", err)
	}

	// Read JSON payload
	payload := make([]byte, length)
	if _, err := io.ReadFull(r, payload); err != nil {
		return nil, fmt.Errorf("failed to read payload: %w", err)
	}

	// Validate CRC32 checksum
	actualChecksum := crc32.ChecksumIEEE(payload)
	if actualChecksum != expectedChecksum {
		return nil, fmt.Errorf("checksum mismatch: expected %d, got %d", expectedChecksum, actualChecksum)
	}

	return payload, nil
}

// Bridge manages the Fyne app and communication
type Bridge struct {
	app          fyne.App
	windows      map[string]fyne.Window
	widgets      map[string]fyne.CanvasObject
	callbacks    map[string]string // widget ID -> callback ID
	contextMenus map[string]*fyne.Menu // widget ID -> context menu
	testMode     bool              // true for headless testing
	mu           sync.RWMutex
	writer       *json.Encoder
	widgetMeta    map[string]WidgetMetadata      // metadata for testing
	tableData     map[string][][]string          // table ID -> data
	listData      map[string][]string            // list ID -> data
	windowContent map[string]string              // window ID -> current content widget ID
	customIds     map[string]string              // custom ID -> widget ID (for test framework)
	quitChan      chan bool                      // signal quit in test mode
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

func NewBridge(testMode bool) *Bridge {
	var fyneApp fyne.App
	if testMode {
		fyneApp = test.NewApp()
	} else {
		fyneApp = app.New()
	}

	return &Bridge{
		app:          fyneApp,
		windows:      make(map[string]fyne.Window),
		widgets:      make(map[string]fyne.CanvasObject),
		callbacks:    make(map[string]string),
		contextMenus: make(map[string]*fyne.Menu),
		testMode:     testMode,
		writer:       json.NewEncoder(os.Stdout),
		widgetMeta:    make(map[string]WidgetMetadata),
		tableData:     make(map[string][][]string),
		listData:      make(map[string][]string),
		windowContent: make(map[string]string),
		customIds:     make(map[string]string),
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

func (b *Bridge) handleMessage(msg Message) {
	switch msg.Type {
	case "createWindow":
		b.handleCreateWindow(msg)
	case "setContent":
		b.handleSetContent(msg)
	case "clearWidgets":
		b.handleClearWidgets(msg)
	case "showWindow":
		b.handleShowWindow(msg)
	case "createButton":
		b.handleCreateButton(msg)
	case "createLabel":
		b.handleCreateLabel(msg)
	case "createEntry":
		b.handleCreateEntry(msg)
	case "createMultiLineEntry":
		b.handleCreateMultiLineEntry(msg)
	case "createPasswordEntry":
		b.handleCreatePasswordEntry(msg)
	case "createSeparator":
		b.handleCreateSeparator(msg)
	case "createHyperlink":
		b.handleCreateHyperlink(msg)
	case "createVBox":
		b.handleCreateVBox(msg)
	case "createHBox":
		b.handleCreateHBox(msg)
	case "createCheckbox":
		b.handleCreateCheckbox(msg)
	case "createSelect":
		b.handleCreateSelect(msg)
	case "createSlider":
		b.handleCreateSlider(msg)
	case "createProgressBar":
		b.handleCreateProgressBar(msg)
	case "createScroll":
		b.handleCreateScroll(msg)
	case "createGrid":
		b.handleCreateGrid(msg)
	case "createCenter":
		b.handleCreateCenter(msg)
	case "createCard":
		b.handleCreateCard(msg)
	case "createAccordion":
		b.handleCreateAccordion(msg)
	case "createForm":
		b.handleCreateForm(msg)
	case "createTree":
		b.handleCreateTree(msg)
	case "createRichText":
		b.handleCreateRichText(msg)
	case "createImage":
		b.handleCreateImage(msg)
	case "createBorder":
		b.handleCreateBorder(msg)
	case "createGridWrap":
		b.handleCreateGridWrap(msg)
	case "createRadioGroup":
		b.handleCreateRadioGroup(msg)
	case "createSplit":
		b.handleCreateSplit(msg)
	case "createTabs":
		b.handleCreateTabs(msg)
	case "setText":
		b.handleSetText(msg)
	case "getText":
		b.handleGetText(msg)
	case "setProgress":
		b.handleSetProgress(msg)
	case "getProgress":
		b.handleGetProgress(msg)
	case "setChecked":
		b.handleSetChecked(msg)
	case "getChecked":
		b.handleGetChecked(msg)
	case "setSelected":
		b.handleSetSelected(msg)
	case "getSelected":
		b.handleGetSelected(msg)
	case "setValue":
		b.handleSetValue(msg)
	case "getValue":
		b.handleGetValue(msg)
	case "setRadioSelected":
		b.handleSetRadioSelected(msg)
	case "getRadioSelected":
		b.handleGetRadioSelected(msg)
	case "showInfo":
		b.handleShowInfo(msg)
	case "showError":
		b.handleShowError(msg)
	case "showConfirm":
		b.handleShowConfirm(msg)
	case "showFileOpen":
		b.handleShowFileOpen(msg)
	case "showFileSave":
		b.handleShowFileSave(msg)
	case "resizeWindow":
		b.handleResizeWindow(msg)
	case "setWindowTitle":
		b.handleSetWindowTitle(msg)
	case "centerWindow":
		b.handleCenterWindow(msg)
	case "setWindowFullScreen":
		b.handleSetWindowFullScreen(msg)
	case "setMainMenu":
		b.handleSetMainMenu(msg)
	case "createToolbar":
		b.handleCreateToolbar(msg)
	case "createTable":
		b.handleCreateTable(msg)
	case "createList":
		b.handleCreateList(msg)
	case "updateTableData":
		b.handleUpdateTableData(msg)
	case "updateListData":
		b.handleUpdateListData(msg)
	case "getTableData":
		b.handleGetTableData(msg)
	case "getListData":
		b.handleGetListData(msg)
	case "setTheme":
		b.handleSetTheme(msg)
	case "getTheme":
		b.handleGetTheme(msg)
	case "setWidgetStyle":
		b.handleSetWidgetStyle(msg)
	case "setWidgetContextMenu":
		b.handleSetWidgetContextMenu(msg)
	case "quit":
		b.handleQuit(msg)
	// Testing methods
	case "findWidget":
		b.handleFindWidget(msg)
	case "clickWidget":
		b.handleClickWidget(msg)
	case "typeText":
		b.handleTypeText(msg)
	case "getWidgetInfo":
		b.handleGetWidgetInfo(msg)
	case "getAllWidgets":
		b.handleGetAllWidgets(msg)
	case "captureWindow":
		b.handleCaptureWindow(msg)
	case "doubleTapWidget":
		b.handleDoubleTapWidget(msg)
	case "rightClickWidget":
		b.handleRightClickWidget(msg)
	case "hoverWidget":
		b.handleHoverWidget(msg)
	case "scrollCanvas":
		b.handleScrollCanvas(msg)
	case "dragCanvas":
		b.handleDragCanvas(msg)
	case "focusNext":
		b.handleFocusNext(msg)
	case "focusPrevious":
		b.handleFocusPrevious(msg)
	case "containerAdd":
		b.handleContainerAdd(msg)
	case "containerRemoveAll":
		b.handleContainerRemoveAll(msg)
	case "containerRefresh":
		b.handleContainerRefresh(msg)
	case "disableWidget":
		b.handleDisableWidget(msg)
	case "enableWidget":
		b.handleEnableWidget(msg)
	case "isEnabled":
		b.handleIsEnabled(msg)
	case "focusWidget":
		b.handleFocusWidget(msg)
	case "submitEntry":
		b.handleSubmitEntry(msg)
	case "hideWidget":
		b.handleHideWidget(msg)
	case "showWidget":
		b.handleShowWidget(msg)
	case "registerCustomId":
		b.handleRegisterCustomId(msg)
	default:
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Unknown message type: %s", msg.Type),
		})
	}
}

func (b *Bridge) handleCreateWindow(msg Message) {
	title := msg.Payload["title"].(string)
	windowID := msg.Payload["id"].(string)

	var win fyne.Window

	// Window creation must happen on the main thread
	fyne.DoAndWait(func() {
		win = b.app.NewWindow(title)

		// Set window size if provided
		if width, ok := msg.Payload["width"].(float64); ok {
			if height, ok := msg.Payload["height"].(float64); ok {
				win.Resize(fyne.NewSize(float32(width), float32(height)))
			}
		}

		// Set fixed size if provided
		if fixedSize, ok := msg.Payload["fixedSize"].(bool); ok && fixedSize {
			win.SetFixedSize(true)
		}
	})

	b.mu.Lock()
	b.windows[windowID] = win
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"windowId": windowID},
	})
}

func (b *Bridge) handleSetContent(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	widgetID := msg.Payload["widgetId"].(string)

	// First, check if window and widget exist (read lock)
	b.mu.RLock()
	win, winExists := b.windows[windowID]
	widget, widgetExists := b.widgets[widgetID]
	oldContentID, hasOldContent := b.windowContent[windowID]
	b.mu.RUnlock()

	if !winExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	if !widgetExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// Remove old content widget tree if it exists (write lock)
	if hasOldContent && oldContentID != "" && oldContentID != widgetID {
		b.mu.Lock()
		b.removeWidgetTree(oldContentID)
		b.mu.Unlock()
	}

	// Setting window content must happen on the main thread
	fyne.DoAndWait(func() {
		win.SetContent(widget)
	})

	// Update the window content tracking
	b.mu.Lock()
	b.windowContent[windowID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

// removeWidgetTree recursively removes a widget and all its descendants
// from the widgets and widgetMeta maps
// NOTE: Caller must hold b.mu.Lock() before calling this function
func (b *Bridge) removeWidgetTree(widgetID string) {
	// Get the widget object
	obj, exists := b.widgets[widgetID]
	if !exists {
		return // Already removed or never existed
	}

	// If it's a container, recursively remove all children
	if container, ok := obj.(*fyne.Container); ok {
		// Collect child IDs first (don't modify map while iterating)
		var childIDs []string
		for _, childObj := range container.Objects {
			// Find the widget ID for this object (reverse lookup)
			for childID, widgetObj := range b.widgets {
				if widgetObj == childObj {
					childIDs = append(childIDs, childID)
					break
				}
			}
		}

		// Now recursively remove all children
		for _, childID := range childIDs {
			b.removeWidgetTree(childID)
		}
	}

	// Remove this widget from the maps
	delete(b.widgets, widgetID)
	delete(b.widgetMeta, widgetID)
	delete(b.callbacks, widgetID)
	delete(b.contextMenus, widgetID)
	delete(b.tableData, widgetID)
	delete(b.listData, widgetID)
}

func (b *Bridge) handleClearWidgets(msg Message) {
	// Clear all widgets from the maps
	// This should be called before building new window content
	b.mu.Lock()
	b.widgets = make(map[string]fyne.CanvasObject)
	b.widgetMeta = make(map[string]WidgetMetadata)
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowWindow(msg Message) {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	// Showing window must happen on the main thread
	fyne.DoAndWait(func() {
		win.Show()
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateButton(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	btn := widget.NewButton(text, func() {
		if hasCallback {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": callbackID},
			})
		}
	})

	// Set button importance if provided
	if importance, ok := msg.Payload["importance"].(string); ok {
		switch importance {
		case "low":
			btn.Importance = widget.LowImportance
		case "medium":
			btn.Importance = widget.MediumImportance
		case "high":
			btn.Importance = widget.HighImportance
		case "warning":
			btn.Importance = widget.WarningImportance
		case "success":
			btn.Importance = widget.SuccessImportance
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = btn
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "button", Text: text}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateLabel(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)

	lbl := widget.NewLabel(text)

	b.mu.Lock()
	b.widgets[widgetID] = lbl
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "label", Text: text}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateEntry(msg Message) {
	widgetID := msg.Payload["id"].(string)
	placeholder, _ := msg.Payload["placeholder"].(string)

	entry := widget.NewEntry()
	entry.SetPlaceHolder(placeholder)

	// Set onSubmit callback if provided (triggered on Enter key)
	if callbackID, ok := msg.Payload["callbackId"].(string); ok {
		entry.OnSubmitted = func(text string) {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"text":       text,
				},
			})
		}
	}

	// Set minimum width if provided
	var widgetToStore fyne.CanvasObject = entry
	var needsEntryRef bool = false

	if minWidth, ok := msg.Payload["minWidth"].(float64); ok && minWidth > 0 {
		// Create a sized container with the entry
		sizedEntry := canvas.NewRectangle(color.Transparent)
		sizedEntry.SetMinSize(fyne.NewSize(float32(minWidth), entry.MinSize().Height))
		widgetToStore = container.NewMax(sizedEntry, entry)
		needsEntryRef = true // Entry is now wrapped, so we need a separate reference
	}

	// If double-click callback is provided, wrap in a tappable container
	if doubleClickCallbackID, ok := msg.Payload["doubleClickCallbackId"].(string); ok {
		callback := func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": doubleClickCallbackID,
				},
			})
		}

		// Wrap whatever we have so far (entry or sized container) in tappable container
		widgetToStore = NewTappableContainer(widgetToStore, callback)
		needsEntryRef = true // We need entry reference for operations
	}

	// Store the actual entry widget separately if it's wrapped
	if needsEntryRef {
		b.mu.Lock()
		b.widgets[widgetID+"_entry"] = entry
		b.mu.Unlock()
	}

	b.mu.Lock()
	b.widgets[widgetID] = widgetToStore
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "entry", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateMultiLineEntry(msg Message) {
	widgetID := msg.Payload["id"].(string)
	placeholder, _ := msg.Payload["placeholder"].(string)

	entry := widget.NewMultiLineEntry()
	entry.SetPlaceHolder(placeholder)

	// Set wrapping mode (default to word wrap)
	if wrapping, ok := msg.Payload["wrapping"].(string); ok {
		switch wrapping {
		case "off":
			entry.Wrapping = fyne.TextWrapOff
		case "word":
			entry.Wrapping = fyne.TextWrapWord
		case "break":
			entry.Wrapping = fyne.TextWrapBreak
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = entry
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "multilineentry", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreatePasswordEntry(msg Message) {
	widgetID := msg.Payload["id"].(string)
	placeholder, _ := msg.Payload["placeholder"].(string)

	entry := widget.NewPasswordEntry()
	entry.SetPlaceHolder(placeholder)

	b.mu.Lock()
	b.widgets[widgetID] = entry
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "passwordentry", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateSeparator(msg Message) {
	widgetID := msg.Payload["id"].(string)

	separator := widget.NewSeparator()

	b.mu.Lock()
	b.widgets[widgetID] = separator
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "separator", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateHyperlink(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)
	urlStr := msg.Payload["url"].(string)

	// Parse URL
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Invalid URL: %v", err),
		})
		return
	}

	hyperlink := widget.NewHyperlink(text, parsedURL)

	b.mu.Lock()
	b.widgets[widgetID] = hyperlink
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "hyperlink", Text: text, URL: urlStr}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateVBox(msg Message) {
	widgetID := msg.Payload["id"].(string)
	childIDs, _ := msg.Payload["children"].([]interface{})

	var children []fyne.CanvasObject
	b.mu.RLock()
	for _, childID := range childIDs {
		if child, exists := b.widgets[childID.(string)]; exists {
			children = append(children, child)
		}
	}
	b.mu.RUnlock()

	vbox := container.NewVBox(children...)

	b.mu.Lock()
	b.widgets[widgetID] = vbox
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateHBox(msg Message) {
	widgetID := msg.Payload["id"].(string)
	childIDs, _ := msg.Payload["children"].([]interface{})

	var children []fyne.CanvasObject
	b.mu.RLock()
	for _, childID := range childIDs {
		if child, exists := b.widgets[childID.(string)]; exists {
			children = append(children, child)
		}
	}
	b.mu.RUnlock()

	hbox := container.NewHBox(children...)

	b.mu.Lock()
	b.widgets[widgetID] = hbox
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCheckbox(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	check := widget.NewCheck(text, func(checked bool) {
		if hasCallback {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": callbackID, "checked": checked},
			})
		}
	})

	b.mu.Lock()
	b.widgets[widgetID] = check
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "checkbox", Text: text}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateSelect(msg Message) {
	widgetID := msg.Payload["id"].(string)
	optionsInterface, _ := msg.Payload["options"].([]interface{})
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	// Convert []interface{} to []string
	options := make([]string, len(optionsInterface))
	for i, opt := range optionsInterface {
		options[i] = opt.(string)
	}

	sel := widget.NewSelect(options, func(selected string) {
		if hasCallback {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": callbackID, "selected": selected},
			})
		}
	})

	b.mu.Lock()
	b.widgets[widgetID] = sel
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "select", Text: ""}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateSlider(msg Message) {
	widgetID := msg.Payload["id"].(string)
	min := msg.Payload["min"].(float64)
	max := msg.Payload["max"].(float64)
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	slider := widget.NewSlider(min, max)

	// Set initial value if provided
	if initialValue, ok := msg.Payload["value"].(float64); ok {
		slider.Value = initialValue
	}

	if hasCallback {
		slider.OnChanged = func(value float64) {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"callbackId": callbackID, "value": value},
			})
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = slider
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "slider", Text: ""}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateProgressBar(msg Message) {
	widgetID := msg.Payload["id"].(string)
	infinite, _ := msg.Payload["infinite"].(bool)

	var progressBar fyne.CanvasObject

	if infinite {
		progressBar = widget.NewProgressBarInfinite()
	} else {
		pb := widget.NewProgressBar()
		// Set initial value if provided
		if initialValue, ok := msg.Payload["value"].(float64); ok {
			pb.Value = initialValue
		}
		progressBar = pb
	}

	b.mu.Lock()
	b.widgets[widgetID] = progressBar
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "progressbar", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateScroll(msg Message) {
	widgetID := msg.Payload["id"].(string)
	contentID := msg.Payload["contentId"].(string)

	b.mu.RLock()
	content, exists := b.widgets[contentID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Content widget not found",
		})
		return
	}

	scroll := container.NewScroll(content)

	b.mu.Lock()
	b.widgets[widgetID] = scroll
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "scroll", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateGrid(msg Message) {
	widgetID := msg.Payload["id"].(string)
	columns := int(msg.Payload["columns"].(float64))
	childIDs, _ := msg.Payload["children"].([]interface{})

	var children []fyne.CanvasObject
	b.mu.RLock()
	for _, childID := range childIDs {
		if child, exists := b.widgets[childID.(string)]; exists {
			children = append(children, child)
		}
	}
	b.mu.RUnlock()

	grid := container.NewGridWithColumns(columns, children...)

	b.mu.Lock()
	b.widgets[widgetID] = grid
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "grid", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCenter(msg Message) {
	widgetID := msg.Payload["id"].(string)
	childID := msg.Payload["childId"].(string)

	b.mu.RLock()
	child, exists := b.widgets[childID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Child widget not found",
		})
		return
	}

	centered := container.NewCenter(child)

	b.mu.Lock()
	b.widgets[widgetID] = centered
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "center", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateCard(msg Message) {
	widgetID := msg.Payload["id"].(string)
	title := msg.Payload["title"].(string)
	subtitle, _ := msg.Payload["subtitle"].(string)
	contentID := msg.Payload["contentId"].(string)

	b.mu.RLock()
	content, exists := b.widgets[contentID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Content widget not found",
		})
		return
	}

	card := widget.NewCard(title, subtitle, content)

	b.mu.Lock()
	b.widgets[widgetID] = card
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "card", Text: title}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateAccordion(msg Message) {
	widgetID := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	var accordionItems []*widget.AccordionItem

	for _, itemInterface := range itemsInterface {
		itemData := itemInterface.(map[string]interface{})
		title := itemData["title"].(string)
		contentID := itemData["contentId"].(string)

		b.mu.RLock()
		content, exists := b.widgets[contentID]
		b.mu.RUnlock()

		if exists {
			accordionItem := widget.NewAccordionItem(title, content)
			accordionItems = append(accordionItems, accordionItem)
		}
	}

	accordion := widget.NewAccordion(accordionItems...)

	b.mu.Lock()
	b.widgets[widgetID] = accordion
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "accordion", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateForm(msg Message) {
	widgetID := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	var formItems []*widget.FormItem

	for _, itemInterface := range itemsInterface {
		itemData := itemInterface.(map[string]interface{})
		label := itemData["label"].(string)
		widgetIDStr := itemData["widgetId"].(string)

		b.mu.RLock()
		w, exists := b.widgets[widgetIDStr]
		b.mu.RUnlock()

		if exists {
			formItem := widget.NewFormItem(label, w)
			formItems = append(formItems, formItem)
		}
	}

	// Create form with optional submit/cancel handlers
	var onSubmit func()
	var onCancel func()

	if submitCallbackID, ok := msg.Payload["submitCallbackId"].(string); ok {
		onSubmit = func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{"callbackId": submitCallbackID},
			})
		}
	}

	if cancelCallbackID, ok := msg.Payload["cancelCallbackId"].(string); ok {
		onCancel = func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{"callbackId": cancelCallbackID},
			})
		}
	}

	var form *widget.Form
	if onSubmit != nil || onCancel != nil {
		form = &widget.Form{
			Items:    formItems,
			OnSubmit: onSubmit,
			OnCancel: onCancel,
		}
	} else {
		form = &widget.Form{
			Items: formItems,
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = form
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "form", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateTree(msg Message) {
	widgetID := msg.Payload["id"].(string)
	rootLabel := msg.Payload["rootLabel"].(string)

	// Create tree with simple structure
	// Tree nodes are built recursively from the data structure
	tree := widget.NewTree(
		func(uid string) []string {
			// This is a simple tree - TypeScript will manage the structure
			// For now, return empty children (tree can be enhanced later)
			return []string{}
		},
		func(uid string) bool {
			// All nodes can have children
			return true
		},
		func(branch bool) fyne.CanvasObject {
			return widget.NewLabel("Node")
		},
		func(uid string, branch bool, obj fyne.CanvasObject) {
			label := obj.(*widget.Label)
			label.SetText(uid)
		},
	)

	// Open root node
	tree.OpenBranch(rootLabel)

	b.mu.Lock()
	b.widgets[widgetID] = tree
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "tree", Text: rootLabel}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateRichText(msg Message) {
	widgetID := msg.Payload["id"].(string)
	segmentsInterface := msg.Payload["segments"].([]interface{})

	var richTextSegments []widget.RichTextSegment

	for _, segInterface := range segmentsInterface {
		segData := segInterface.(map[string]interface{})
		text := segData["text"].(string)

		style := widget.RichTextStyle{}

		if bold, ok := segData["bold"].(bool); ok && bold {
			style.TextStyle.Bold = true
		}
		if italic, ok := segData["italic"].(bool); ok && italic {
			style.TextStyle.Italic = true
		}
		if monospace, ok := segData["monospace"].(bool); ok && monospace {
			style.TextStyle.Monospace = true
		}

		segment := &widget.TextSegment{
			Text:  text,
			Style: style,
		}
		richTextSegments = append(richTextSegments, segment)
	}

	richText := widget.NewRichText(richTextSegments...)

	b.mu.Lock()
	b.widgets[widgetID] = richText
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "richtext", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateImage(msg Message) {
	widgetID := msg.Payload["id"].(string)
	path := msg.Payload["path"].(string)

	// Load image from file
	uri := storage.NewFileURI(path)
	img := canvas.NewImageFromURI(uri)

	// Set fill mode if provided
	if fillMode, ok := msg.Payload["fillMode"].(string); ok {
		switch fillMode {
		case "contain":
			img.FillMode = canvas.ImageFillContain
		case "stretch":
			img.FillMode = canvas.ImageFillStretch
		case "original":
			img.FillMode = canvas.ImageFillOriginal
		}
	} else {
		img.FillMode = canvas.ImageFillContain // Default
	}

	b.mu.Lock()
	b.widgets[widgetID] = img
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "image", Text: path}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateBorder(msg Message) {
	widgetID := msg.Payload["id"].(string)

	// Get optional border widgets
	var top, bottom, left, right, center fyne.CanvasObject

	b.mu.RLock()
	if topID, ok := msg.Payload["topId"].(string); ok {
		top = b.widgets[topID]
	}
	if bottomID, ok := msg.Payload["bottomId"].(string); ok {
		bottom = b.widgets[bottomID]
	}
	if leftID, ok := msg.Payload["leftId"].(string); ok {
		left = b.widgets[leftID]
	}
	if rightID, ok := msg.Payload["rightId"].(string); ok {
		right = b.widgets[rightID]
	}
	if centerID, ok := msg.Payload["centerId"].(string); ok {
		center = b.widgets[centerID]
	}
	b.mu.RUnlock()

	border := container.NewBorder(top, bottom, left, right, center)

	b.mu.Lock()
	b.widgets[widgetID] = border
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "border", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateGridWrap(msg Message) {
	widgetID := msg.Payload["id"].(string)
	itemWidth := float32(msg.Payload["itemWidth"].(float64))
	itemHeight := float32(msg.Payload["itemHeight"].(float64))
	childIDs, _ := msg.Payload["children"].([]interface{})

	var children []fyne.CanvasObject
	b.mu.RLock()
	for _, childID := range childIDs {
		if child, exists := b.widgets[childID.(string)]; exists {
			children = append(children, child)
		}
	}
	b.mu.RUnlock()

	gridWrap := container.NewGridWrap(
		fyne.NewSize(itemWidth, itemHeight),
		children...,
	)

	b.mu.Lock()
	b.widgets[widgetID] = gridWrap
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "gridwrap", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleSetText(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	text := msg.Payload["text"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference, use that
	actualWidget := obj
	if hasEntry {
		actualWidget = entryObj
	}

	// UI updates must happen on the main thread
	fyne.DoAndWait(func() {
		switch w := actualWidget.(type) {
		case *widget.Label:
			w.SetText(text)
		case *widget.Entry:
			w.SetText(text)
		case *widget.Button:
			w.SetText(text)
		case *widget.Check:
			w.SetText(text)
		}
	})

	// Check if widget type is supported
	supported := false
	switch actualWidget.(type) {
	case *widget.Label, *widget.Entry, *widget.Button, *widget.Check:
		supported = true
	}

	if !supported {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support setText",
		})
		return
	}

	// Update metadata
	b.mu.Lock()
	if meta, exists := b.widgetMeta[widgetID]; exists {
		meta.Text = text
		b.widgetMeta[widgetID] = meta
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleGetText(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference, use that
	actualWidget := obj
	if hasEntry {
		actualWidget = entryObj
	}

	var text string
	switch w := actualWidget.(type) {
	case *widget.Label:
		text = w.Text
	case *widget.Entry:
		text = w.Text
	case *widget.Button:
		text = w.Text
	case *widget.Check:
		text = w.Text
	default:
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support getText",
		})
		return
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"text": text},
	})
}

func (b *Bridge) handleSetChecked(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	checked := msg.Payload["checked"].(bool)

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

	if check, ok := obj.(*widget.Check); ok {
		// UI updates must happen on the main thread
		// Temporarily disable OnChanged to prevent infinite loops when setting initial state
		fyne.DoAndWait(func() {
			originalCallback := check.OnChanged
			check.OnChanged = nil
			check.SetChecked(checked)
			check.OnChanged = originalCallback
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a checkbox",
		})
	}
}

func (b *Bridge) handleGetChecked(msg Message) {
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

	if check, ok := obj.(*widget.Check); ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"checked": check.Checked},
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a checkbox",
		})
	}
}

func (b *Bridge) handleDisableWidget(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference (from TappableEntry), use that
	if hasEntry {
		if entry, ok := entryObj.(*widget.Entry); ok {
			fyne.DoAndWait(func() {
				entry.Disable()
			})
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
			return
		}
	}

	// Try to disable the widget directly
	if disableable, ok := obj.(fyne.Disableable); ok {
		fyne.DoAndWait(func() {
			disableable.Disable()
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support disabling",
		})
	}
}

func (b *Bridge) handleEnableWidget(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference (from TappableEntry), use that
	if hasEntry {
		if entry, ok := entryObj.(*widget.Entry); ok {
			fyne.DoAndWait(func() {
				entry.Enable()
			})
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
			return
		}
	}

	// Try to enable the widget directly
	if disableable, ok := obj.(fyne.Disableable); ok {
		fyne.DoAndWait(func() {
			disableable.Enable()
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget does not support enabling",
		})
	}
}

func (b *Bridge) handleIsEnabled(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference (from TappableEntry), use that
	if hasEntry {
		if entry, ok := entryObj.(*widget.Entry); ok {
			enabled := !entry.Disabled()
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
				Result: map[string]interface{}{
					"enabled": enabled,
				},
			})
			return
		}
	}

	// Try to check if the widget is enabled
	if disableable, ok := obj.(fyne.Disableable); ok {
		enabled := !disableable.Disabled()
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result: map[string]interface{}{
				"enabled": enabled,
			},
		})
	} else {
		// Widget doesn't implement Disableable, so it's always "enabled"
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result: map[string]interface{}{
				"enabled": true,
			},
		})
	}
}

func (b *Bridge) handleFocusWidget(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference (from TappableEntry), use that
	if hasEntry {
		if entry, ok := entryObj.(*widget.Entry); ok {
			// Find the canvas for this widget
			for _, win := range b.windows {
				canvas := win.Canvas()
				if canvas != nil {
					fyne.DoAndWait(func() {
						canvas.Focus(entry)
					})
					b.sendResponse(Response{
						ID:      msg.ID,
						Success: true,
					})
					return
				}
			}
		}
	}

	// Try to focus the widget directly
	if focusable, ok := obj.(fyne.Focusable); ok {
		// Find the canvas for this widget
		for _, win := range b.windows {
			canvas := win.Canvas()
			if canvas != nil {
				fyne.DoAndWait(func() {
					canvas.Focus(focusable)
				})
				b.sendResponse(Response{
					ID:      msg.ID,
					Success: true,
				})
				return
			}
		}
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Could not find canvas for widget",
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not focusable",
		})
	}
}

func (b *Bridge) handleSubmitEntry(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is an Entry wrapped in a container (from minWidth)
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference (from minWidth wrapping), use that
	if hasEntry {
		if entry, ok := entryObj.(*widget.Entry); ok {
			if entry.OnSubmitted != nil {
				// Trigger the OnSubmitted callback
				fyne.DoAndWait(func() {
					entry.OnSubmitted(entry.Text)
				})
				b.sendResponse(Response{
					ID:      msg.ID,
					Success: true,
				})
				return
			}
		}
	}

	// Check if it's an Entry widget with OnSubmitted callback
	if entry, ok := obj.(*widget.Entry); ok {
		if entry.OnSubmitted != nil {
			// Trigger the OnSubmitted callback
			fyne.DoAndWait(func() {
				entry.OnSubmitted(entry.Text)
			})
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
			return
		}
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: false,
		Error:   "Widget is not an Entry or has no OnSubmitted callback",
	})
}

func (b *Bridge) handleHideWidget(msg Message) {
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

	fyne.DoAndWait(func() {
		obj.Hide()
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowWidget(msg Message) {
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

	fyne.DoAndWait(func() {
		obj.Show()
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleRegisterCustomId(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	customID := msg.Payload["customId"].(string)

	b.mu.Lock()
	b.customIds[customID] = widgetID
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetSelected(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	selected := msg.Payload["selected"].(string)

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

	if sel, ok := obj.(*widget.Select); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			sel.SetSelected(selected)
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a select",
		})
	}
}

func (b *Bridge) handleGetSelected(msg Message) {
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

	if sel, ok := obj.(*widget.Select); ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"selected": sel.Selected},
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a select",
		})
	}
}

func (b *Bridge) handleSetValue(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	value := msg.Payload["value"].(float64)

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

	if slider, ok := obj.(*widget.Slider); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			slider.SetValue(value)
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a slider",
		})
	}
}

func (b *Bridge) handleGetValue(msg Message) {
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

	if slider, ok := obj.(*widget.Slider); ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"value": slider.Value},
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a slider",
		})
	}
}

func (b *Bridge) handleSetProgress(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	value := msg.Payload["value"].(float64)

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

	if pb, ok := obj.(*widget.ProgressBar); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			pb.SetValue(value)
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a progressbar",
		})
	}
}

func (b *Bridge) handleGetProgress(msg Message) {
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

	if pb, ok := obj.(*widget.ProgressBar); ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"value": pb.Value},
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a progressbar",
		})
	}
}

func (b *Bridge) handleShowInfo(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	message := msg.Payload["message"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	dialog.ShowInformation(title, message, win)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowError(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	_ = msg.Payload["title"].(string) // title is not used by ShowError, but keep for API compatibility
	message := msg.Payload["message"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	dialog.ShowError(fmt.Errorf("%s", message), win)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowConfirm(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)
	message := msg.Payload["message"].(string)
	callbackID := msg.Payload["callbackId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	dialog.ShowConfirm(title, message, func(confirmed bool) {
		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{"callbackId": callbackID, "confirmed": confirmed},
		})
	}, win)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowFileOpen(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	callbackID := msg.Payload["callbackId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	dialog.ShowFileOpen(func(reader fyne.URIReadCloser, err error) {
		var filePath string
		if reader != nil {
			filePath = reader.URI().Path()
			reader.Close()
		}

		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": callbackID,
				"filePath":   filePath,
				"error":      err != nil,
			},
		})
	}, win)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleShowFileSave(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	callbackID := msg.Payload["callbackId"].(string)
	fileName, _ := msg.Payload["fileName"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	dialog.ShowFileSave(func(writer fyne.URIWriteCloser, err error) {
		var filePath string
		if writer != nil {
			filePath = writer.URI().Path()
			writer.Close()
		}

		b.sendEvent(Event{
			Type: "callback",
			Data: map[string]interface{}{
				"callbackId": callbackID,
				"filePath":   filePath,
				"error":      err != nil,
			},
		})
	}, win)

	// Set default filename if provided
	if fileName != "" {
		// Note: Fyne doesn't have a direct API to set default filename in ShowFileSave
		// This would need to be enhanced with NewFileSave and SetFileName
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateRadioGroup(msg Message) {
	id := msg.Payload["id"].(string)
	optionsInterface := msg.Payload["options"].([]interface{})

	// Convert []interface{} to []string
	options := make([]string, len(optionsInterface))
	for i, v := range optionsInterface {
		options[i] = v.(string)
	}

	var callbackID string
	hasCallback := false
	if cid, ok := msg.Payload["callbackId"].(string); ok {
		callbackID = cid
		hasCallback = true
	}

	// Create radio group with change callback
	radio := widget.NewRadioGroup(options, func(selected string) {
		if hasCallback {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"selected":   selected,
				},
			})
		}
	})

	// Set initial selection if provided
	if initialSelected, ok := msg.Payload["selected"].(string); ok {
		radio.Selected = initialSelected
	}

	b.mu.Lock()
	b.widgets[id] = radio
	b.widgetMeta[id] = WidgetMetadata{
		Type: "radiogroup",
		Text: "", // Radio groups don't have a single text value
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetRadioSelected(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	selected := msg.Payload["selected"].(string)

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

	if radio, ok := obj.(*widget.RadioGroup); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			radio.SetSelected(selected)
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a radio group",
		})
	}
}

func (b *Bridge) handleGetRadioSelected(msg Message) {
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

	if radio, ok := obj.(*widget.RadioGroup); ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
			Result:  map[string]interface{}{"selected": radio.Selected},
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a radio group",
		})
	}
}

func (b *Bridge) handleCreateSplit(msg Message) {
	id := msg.Payload["id"].(string)
	orientation := msg.Payload["orientation"].(string)
	leadingID := msg.Payload["leadingId"].(string)
	trailingID := msg.Payload["trailingId"].(string)

	b.mu.RLock()
	leading, leadingExists := b.widgets[leadingID]
	trailing, trailingExists := b.widgets[trailingID]
	b.mu.RUnlock()

	if !leadingExists || !trailingExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Leading or trailing widget not found",
		})
		return
	}

	var split *container.Split
	if orientation == "horizontal" {
		split = container.NewHSplit(leading, trailing)
	} else {
		split = container.NewVSplit(leading, trailing)
	}

	// Set offset if provided (0.0 to 1.0)
	if offset, ok := msg.Payload["offset"].(float64); ok {
		split.SetOffset(offset)
	}

	b.mu.Lock()
	b.widgets[id] = split
	b.widgetMeta[id] = WidgetMetadata{
		Type: "split",
		Text: "",
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateTabs(msg Message) {
	id := msg.Payload["id"].(string)
	tabsInterface := msg.Payload["tabs"].([]interface{})

	var tabItems []*container.TabItem

	for _, tabInterface := range tabsInterface {
		tabData := tabInterface.(map[string]interface{})
		title := tabData["title"].(string)
		contentID := tabData["contentId"].(string)

		b.mu.RLock()
		content, exists := b.widgets[contentID]
		b.mu.RUnlock()

		if !exists {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Tab content widget not found: %s", contentID),
			})
			return
		}

		tabItems = append(tabItems, container.NewTabItem(title, content))
	}

	tabs := container.NewAppTabs(tabItems...)

	// Set location if provided (top, bottom, leading, trailing)
	if location, ok := msg.Payload["location"].(string); ok {
		switch location {
		case "top":
			tabs.SetTabLocation(container.TabLocationTop)
		case "bottom":
			tabs.SetTabLocation(container.TabLocationBottom)
		case "leading":
			tabs.SetTabLocation(container.TabLocationLeading)
		case "trailing":
			tabs.SetTabLocation(container.TabLocationTrailing)
		}
	}

	b.mu.Lock()
	b.widgets[id] = tabs
	b.widgetMeta[id] = WidgetMetadata{
		Type: "tabs",
		Text: "",
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleResizeWindow(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	width := msg.Payload["width"].(float64)
	height := msg.Payload["height"].(float64)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	win.Resize(fyne.NewSize(float32(width), float32(height)))

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetWindowTitle(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	title := msg.Payload["title"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	// Setting window title must happen on the main thread
	fyne.DoAndWait(func() {
		win.SetTitle(title)
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCenterWindow(msg Message) {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	win.CenterOnScreen()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetWindowFullScreen(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	fullscreen := msg.Payload["fullscreen"].(bool)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	win.SetFullScreen(fullscreen)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetMainMenu(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	menuItemsInterface := msg.Payload["menuItems"].([]interface{})

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	// Build menu structure
	var menus []*fyne.Menu
	for _, menuInterface := range menuItemsInterface {
		menuData := menuInterface.(map[string]interface{})
		label := menuData["label"].(string)
		itemsInterface := menuData["items"].([]interface{})

		var items []*fyne.MenuItem
		for _, itemInterface := range itemsInterface {
			itemData := itemInterface.(map[string]interface{})
			itemLabel := itemData["label"].(string)

			// Check if this is a separator
			if isSeparator, ok := itemData["isSeparator"].(bool); ok && isSeparator {
				items = append(items, fyne.NewMenuItemSeparator())
				continue
			}

			// Regular menu item with callback
			if callbackID, ok := itemData["callbackId"].(string); ok {
				menuItem := fyne.NewMenuItem(itemLabel, func() {
					b.sendEvent(Event{
						Type: "callback",
						Data: map[string]interface{}{
							"callbackId": callbackID,
						},
					})
				})

				// Set disabled state if provided
				if disabled, ok := itemData["disabled"].(bool); ok {
					menuItem.Disabled = disabled
				}

				// Set checked state if provided
				if checked, ok := itemData["checked"].(bool); ok {
					menuItem.Checked = checked
				}

				items = append(items, menuItem)
			}
		}

		menus = append(menus, fyne.NewMenu(label, items...))
	}

	mainMenu := fyne.NewMainMenu(menus...)
	// Setting window menu must happen on the main thread
	fyne.DoAndWait(func() {
		win.SetMainMenu(mainMenu)
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateToolbar(msg Message) {
	id := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	var toolbarItems []widget.ToolbarItem

	for _, itemInterface := range itemsInterface {
		itemData := itemInterface.(map[string]interface{})
		itemType := itemData["type"].(string)

		switch itemType {
		case "action":
			label := itemData["label"].(string)
			callbackID := itemData["callbackId"].(string)

			action := widget.NewToolbarAction(
				nil, // Icon (we'll keep it simple for now)
				func() {
					b.sendEvent(Event{
						Type: "callback",
						Data: map[string]interface{}{
							"callbackId": callbackID,
						},
					})
				},
			)
			// Store label for reference (Fyne toolbar actions don't show text by default)
			_ = label
			toolbarItems = append(toolbarItems, action)

		case "separator":
			toolbarItems = append(toolbarItems, widget.NewToolbarSeparator())

		case "spacer":
			toolbarItems = append(toolbarItems, widget.NewToolbarSpacer())
		}
	}

	toolbar := widget.NewToolbar(toolbarItems...)

	b.mu.Lock()
	b.widgets[id] = toolbar
	b.widgetMeta[id] = WidgetMetadata{
		Type: "toolbar",
		Text: "",
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateTable(msg Message) {
	id := msg.Payload["id"].(string)
	headersInterface := msg.Payload["headers"].([]interface{})
	dataInterface := msg.Payload["data"].([]interface{})

	// Convert headers
	headers := make([]string, len(headersInterface))
	for i, h := range headersInterface {
		headers[i] = h.(string)
	}

	// Convert data
	var data [][]string
	for _, rowInterface := range dataInterface {
		rowData := rowInterface.([]interface{})
		row := make([]string, len(rowData))
		for j, cell := range rowData {
			row[j] = cell.(string)
		}
		data = append(data, row)
	}

	// Store data
	b.mu.Lock()
	b.tableData[id] = data
	b.mu.Unlock()

	// Create table widget
	table := widget.NewTable(
		func() (int, int) {
			b.mu.RLock()
			defer b.mu.RUnlock()
			tableData := b.tableData[id]
			if len(tableData) == 0 {
				return 1, len(headers) // Just header row
			}
			return len(tableData) + 1, len(headers) // +1 for header
		},
		func() fyne.CanvasObject {
			return widget.NewLabel("")
		},
		func(cell widget.TableCellID, obj fyne.CanvasObject) {
			label := obj.(*widget.Label)
			b.mu.RLock()
			tableData := b.tableData[id]
			b.mu.RUnlock()

			if cell.Row == 0 {
				// Header row
				if cell.Col < len(headers) {
					label.SetText(headers[cell.Col])
					label.TextStyle = fyne.TextStyle{Bold: true}
				}
			} else {
				// Data row
				rowIdx := cell.Row - 1
				if rowIdx < len(tableData) && cell.Col < len(tableData[rowIdx]) {
					label.SetText(tableData[rowIdx][cell.Col])
					label.TextStyle = fyne.TextStyle{}
				}
			}
		},
	)

	b.mu.Lock()
	b.widgets[id] = table
	b.widgetMeta[id] = WidgetMetadata{
		Type: "table",
		Text: "",
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateTableData(msg Message) {
	id := msg.Payload["id"].(string)
	dataInterface := msg.Payload["data"].([]interface{})

	// Convert data
	var data [][]string
	for _, rowInterface := range dataInterface {
		rowData := rowInterface.([]interface{})
		row := make([]string, len(rowData))
		for j, cell := range rowData {
			row[j] = cell.(string)
		}
		data = append(data, row)
	}

	b.mu.Lock()
	b.tableData[id] = data
	obj, exists := b.widgets[id]
	b.mu.Unlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Table not found",
		})
		return
	}

	if table, ok := obj.(*widget.Table); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			table.Refresh()
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a table",
		})
	}
}

func (b *Bridge) handleCreateList(msg Message) {
	id := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	// Convert items
	items := make([]string, len(itemsInterface))
	for i, item := range itemsInterface {
		items[i] = item.(string)
	}

	// Store data
	b.mu.Lock()
	b.listData[id] = items
	b.mu.Unlock()

	// Create list widget
	list := widget.NewList(
		func() int {
			b.mu.RLock()
			defer b.mu.RUnlock()
			return len(b.listData[id])
		},
		func() fyne.CanvasObject {
			return widget.NewLabel("")
		},
		func(itemID widget.ListItemID, obj fyne.CanvasObject) {
			label := obj.(*widget.Label)
			b.mu.RLock()
			listData := b.listData[id]
			b.mu.RUnlock()

			if itemID < len(listData) {
				label.SetText(listData[itemID])
			}
		},
	)

	// Handle selection callback if provided
	if callbackID, ok := msg.Payload["callbackId"].(string); ok {
		list.OnSelected = func(itemID widget.ListItemID) {
			b.mu.RLock()
			listData := b.listData[id]
			b.mu.RUnlock()

			var selectedItem string
			if itemID < len(listData) {
				selectedItem = listData[itemID]
			}

			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"index":      itemID,
					"item":       selectedItem,
				},
			})
		}
	}

	b.mu.Lock()
	b.widgets[id] = list
	b.widgetMeta[id] = WidgetMetadata{
		Type: "list",
		Text: "",
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleUpdateListData(msg Message) {
	id := msg.Payload["id"].(string)
	itemsInterface := msg.Payload["items"].([]interface{})

	// Convert items
	items := make([]string, len(itemsInterface))
	for i, item := range itemsInterface {
		items[i] = item.(string)
	}

	b.mu.Lock()
	b.listData[id] = items
	obj, exists := b.widgets[id]
	b.mu.Unlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "List not found",
		})
		return
	}

	if list, ok := obj.(*widget.List); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			list.Refresh()
		})
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a list",
		})
	}
}

func (b *Bridge) handleGetTableData(msg Message) {
	id := msg.Payload["id"].(string)

	b.mu.RLock()
	data, exists := b.tableData[id]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Table not found",
		})
		return
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"data": data,
		},
	})
}

func (b *Bridge) handleGetListData(msg Message) {
	id := msg.Payload["id"].(string)

	b.mu.RLock()
	data, exists := b.listData[id]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "List not found",
		})
		return
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"data": data,
		},
	})
}

func (b *Bridge) handleSetTheme(msg Message) {
	theme := msg.Payload["theme"].(string)

	// Note: Fyne v2 doesn't have NewDarkTheme/NewLightTheme
	// Theme switching is handled automatically by the system
	// We'll just store the preference for future use
	switch theme {
	case "dark", "light":
		// Theme switching in Fyne v2 is handled by the system
		// Apps automatically follow system theme preferences
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	default:
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Unknown theme: %s. Use 'dark' or 'light'", theme),
		})
	}
}

func (b *Bridge) handleGetTheme(msg Message) {
	// Fyne v2 follows system theme preferences
	// We can check the current variant (0 = light, 1 = dark)
	variant := b.app.Settings().ThemeVariant()

	theme := "light"
	if variant == 1 {  // Dark variant
		theme = "dark"
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"theme": theme,
		},
	})
}

func (b *Bridge) handleSetWidgetStyle(msg Message) {
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

	// UI updates must happen on the main thread
	fyne.DoAndWait(func() {
		// Apply font style if specified
		if fontStyle, ok := msg.Payload["fontStyle"].(string); ok {
			switch w := obj.(type) {
			case *widget.Label:
				switch fontStyle {
				case "bold":
					w.TextStyle = fyne.TextStyle{Bold: true}
				case "italic":
					w.TextStyle = fyne.TextStyle{Italic: true}
				case "bold-italic":
					w.TextStyle = fyne.TextStyle{Bold: true, Italic: true}
				case "normal":
					w.TextStyle = fyne.TextStyle{}
				}
				w.Refresh()
			case *widget.Button:
				switch fontStyle {
				case "bold":
					w.Importance = widget.HighImportance
				}
				w.Refresh()
			}
		}

		// Apply font family if specified
		if fontFamily, ok := msg.Payload["fontFamily"].(string); ok {
			switch w := obj.(type) {
			case *widget.Label:
				if fontFamily == "monospace" {
					w.TextStyle.Monospace = true
					w.Refresh()
				}
			case *widget.Entry:
				if fontFamily == "monospace" {
					// Entry doesn't directly support monospace, but we can note it
				}
			}
		}

		// Apply text alignment if specified
		if textAlign, ok := msg.Payload["textAlign"].(string); ok {
			switch w := obj.(type) {
			case *widget.Label:
				switch textAlign {
				case "left":
					w.Alignment = fyne.TextAlignLeading
				case "center":
					w.Alignment = fyne.TextAlignCenter
				case "right":
					w.Alignment = fyne.TextAlignTrailing
				}
				w.Refresh()
			}
		}

		// Apply background color if specified (map to importance for buttons)
		if backgroundColor, ok := msg.Payload["backgroundColor"].(string); ok {
			if btn, ok := obj.(*widget.Button); ok {
				// Map color to importance level as a workaround for Fyne's limitation
				// This provides 5 color "buckets" until Fyne adds per-widget color support
				importance := mapColorToImportance(backgroundColor)
				if importance != "" {
					btn.Importance = importanceFromString(importance)
					btn.Refresh()
				}
			}
		}
	})

	// Note: Color and text color styling in Fyne requires custom themes
	// or custom widgets. For now, buttons use importance levels (5 colors max).
	// Text color for labels is not yet supported.

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

// mapColorToImportance maps a CSS color string to a Fyne importance level
// This is a workaround for Fyne's limitation of not supporting per-widget colors
func mapColorToImportance(colorStr string) string {
	// Parse hex color (format: #RRGGBB)
	if len(colorStr) != 7 || colorStr[0] != '#' {
		return ""
	}

	// Extract RGB components
	var r, g, b int
	fmt.Sscanf(colorStr[1:], "%02x%02x%02x", &r, &g, &b)

	// Calculate hue to determine color family
	// Convert RGB to HSV to get hue
	rNorm := float64(r) / 255.0
	gNorm := float64(g) / 255.0
	bNorm := float64(b) / 255.0

	max := rNorm
	if gNorm > max {
		max = gNorm
	}
	if bNorm > max {
		max = bNorm
	}

	min := rNorm
	if gNorm < min {
		min = gNorm
	}
	if bNorm < min {
		min = bNorm
	}

	delta := max - min

	// If grayscale or very low saturation, use medium (neutral)
	if delta < 0.1 {
		return "medium"
	}

	// Calculate hue (0-360)
	var hue float64
	if max == rNorm {
		hue = 60 * (((gNorm - bNorm) / delta) + 0)
		if hue < 0 {
			hue += 360
		}
	} else if max == gNorm {
		hue = 60 * (((bNorm - rNorm) / delta) + 2)
	} else {
		hue = 60 * (((rNorm - gNorm) / delta) + 4)
	}

	// Map hue ranges to importance levels
	// Red/Orange (0-60): warning
	// Yellow/Green (60-150): success
	// Cyan/Blue (150-270): high
	// Purple/Magenta (270-330): low
	// Red (330-360): warning

	if hue >= 0 && hue < 60 {
		return "warning" // Red/Orange
	} else if hue >= 60 && hue < 150 {
		return "success" // Yellow/Green
	} else if hue >= 150 && hue < 270 {
		return "high" // Cyan/Blue
	} else if hue >= 270 && hue < 330 {
		return "low" // Purple/Magenta
	} else {
		return "warning" // Red
	}
}

// importanceFromString converts string to Fyne importance level
func importanceFromString(importance string) widget.Importance {
	switch importance {
	case "low":
		return widget.LowImportance
	case "medium":
		return widget.MediumImportance
	case "high":
		return widget.HighImportance
	case "warning":
		return widget.WarningImportance
	case "success":
		return widget.SuccessImportance
	default:
		return widget.MediumImportance
	}
}

func (b *Bridge) handleQuit(msg Message) {
	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})

	// Signal quit channel for test mode
	if b.testMode {
		select {
		case b.quitChan <- true:
		default:
		}
	}

	// UI operations must be called on the main thread
	fyne.Do(func() {
		b.app.Quit()
	})
}

// Testing methods

func (b *Bridge) handleFindWidget(msg Message) {
	selector := msg.Payload["selector"].(string)
	selectorType := msg.Payload["type"].(string)

	b.mu.RLock()

	// Resolve custom ID to real widget ID if needed
	resolvedSelector := selector
	if selectorType == "id" {
		if realID, exists := b.customIds[selector]; exists {
			resolvedSelector = realID
		}
	}

	var visibleMatches []string
	var hiddenMatches []string

	for widgetID, meta := range b.widgetMeta {
		var isMatch bool
		switch selectorType {
		case "text":
			isMatch = strings.Contains(meta.Text, selector)
		case "exactText":
			isMatch = meta.Text == selector
		case "type":
			isMatch = meta.Type == selector
		case "id":
			isMatch = widgetID == resolvedSelector
		}

		if isMatch {
			// Check if widget is visible
			obj, exists := b.widgets[widgetID]
			if exists && obj.Visible() {
				visibleMatches = append(visibleMatches, widgetID)
			} else {
				hiddenMatches = append(hiddenMatches, widgetID)
			}
		}
	}

	b.mu.RUnlock() // Release read lock before sending response!

	// Prioritize visible widgets - return visible first, then hidden
	matches := append(visibleMatches, hiddenMatches...)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"widgetIds": matches,
		},
	})
}

func (b *Bridge) handleClickWidget(msg Message) {
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

	// Simulate click
	if btn, ok := obj.(*widget.Button); ok {
		if b.testMode {
			test.Tap(btn)
		} else {
			// In normal mode, just trigger the callback
			btn.OnTapped()
		}
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else if check, ok := obj.(*widget.Check); ok {
		// Handle checkbox clicks
		if b.testMode {
			test.Tap(check)
		} else {
			// Toggle the checkbox state and trigger the callback manually
			newState := !check.Checked
			var callback func(bool)

			// Update UI on main thread
			fyne.DoAndWait(func() {
				check.SetChecked(newState)
				// Capture callback reference (don't call it here - would block main thread)
				callback = check.OnChanged
			})

			// Call callback AFTER DoAndWait to avoid blocking main thread
			if callback != nil {
				callback(newState)
			}
		}
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else if hyperlink, ok := obj.(*widget.Hyperlink); ok {
		// Handle hyperlink clicks

		// Check if this is a browser navigation hyperlink (relative URL)
		b.mu.RLock()
		meta, hasMeta := b.widgetMeta[widgetID]
		b.mu.RUnlock()

		isRelativeURL := hasMeta && meta.URL != "" && !strings.Contains(meta.URL, "://") && strings.HasPrefix(meta.URL, "/")

		if isRelativeURL {
			// This is a relative URL - trigger browser navigation instead of opening externally
			b.sendEvent(Event{
				Type:     "hyperlinkNavigation",
				WidgetID: widgetID,
				Data:     map[string]interface{}{"url": meta.URL},
			})
		} else {
			// External URL - use normal hyperlink behavior
			if b.testMode {
				test.Tap(hyperlink)
			} else {
				// Trigger hyperlink tap on main thread
				fyne.DoAndWait(func() {
					hyperlink.Tapped(&fyne.PointEvent{})
				})
			}
		}

		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		// Get widget type for debugging
		widgetType := fmt.Sprintf("%T", obj)
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Widget is not clickable (type: %s, id: %s)", widgetType, widgetID),
		})
	}
}

func (b *Bridge) handleTypeText(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	text := msg.Payload["text"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	// Check if this is a TappableEntry with a separate entry reference
	entryObj, hasEntry := b.widgets[widgetID+"_entry"]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// If we have a separate entry reference (from TappableEntry), use that
	var entry *widget.Entry
	if hasEntry {
		if e, ok := entryObj.(*widget.Entry); ok {
			entry = e
		}
	} else if e, ok := obj.(*widget.Entry); ok {
		entry = e
	}

	if entry != nil {
		if b.testMode {
			test.Type(entry, text)
		} else {
			// UI operations must be called on the main thread
			fyne.DoAndWait(func() {
				entry.SetText(text)
			})
		}

		// Update metadata
		b.mu.Lock()
		if meta, exists := b.widgetMeta[widgetID]; exists {
			meta.Text = text
			b.widgetMeta[widgetID] = meta
		}
		b.mu.Unlock()

		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a text entry",
		})
	}
}

func (b *Bridge) handleDoubleTapWidget(msg Message) {
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

	// Use test.DoubleTap if in test mode
	if b.testMode {
		if tappable, ok := obj.(fyne.DoubleTappable); ok {
			test.DoubleTap(tappable)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget is not double-tappable",
			})
		}
	} else {
		// In normal mode, trigger OnDoubleTapped if available
		if dt, ok := obj.(fyne.DoubleTappable); ok {
			dt.DoubleTapped(nil)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget does not support double-tap",
			})
		}
	}
}

func (b *Bridge) handleRightClickWidget(msg Message) {
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

	// Use test.TapSecondary if in test mode
	if b.testMode {
		if tappable, ok := obj.(fyne.SecondaryTappable); ok {
			test.TapSecondary(tappable)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget does not support right-click",
			})
		}
	} else {
		// In normal mode, trigger OnTappedSecondary if available
		if st, ok := obj.(fyne.SecondaryTappable); ok {
			st.TappedSecondary(nil)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Widget does not support right-click",
			})
		}
	}
}

func (b *Bridge) handleHoverWidget(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, exists := b.widgets[widgetID]
	windowID := msg.Payload["windowId"].(string)
	win, winExists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	if !winExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	// Use test.MoveMouse to hover over the widget
	if b.testMode {
		canvas := win.Canvas()
		// Get widget position (simplified - assumes widget at center)
		pos := obj.Position()
		test.MoveMouse(canvas, pos)
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		// In normal mode, trigger MouseIn if available
		if hoverable, ok := obj.(interface{ MouseIn(*fyne.PointEvent) }); ok {
			hoverable.MouseIn(&fyne.PointEvent{})
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true,
			})
		} else {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: true, // Success even if not hoverable
			})
		}
	}
}

func (b *Bridge) handleScrollCanvas(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	deltaX := msg.Payload["deltaX"].(float64)
	deltaY := msg.Payload["deltaY"].(float64)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	if b.testMode {
		canvas := win.Canvas()
		// Scroll at center of canvas
		size := canvas.Size()
		pos := fyne.NewPos(size.Width/2, size.Height/2)
		test.Scroll(canvas, pos, float32(deltaX), float32(deltaY))
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Scroll is only supported in test mode",
		})
	}
}

func (b *Bridge) handleDragCanvas(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	fromX := msg.Payload["fromX"].(float64)
	fromY := msg.Payload["fromY"].(float64)
	deltaX := msg.Payload["deltaX"].(float64)
	deltaY := msg.Payload["deltaY"].(float64)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	if b.testMode {
		canvas := win.Canvas()
		pos := fyne.NewPos(float32(fromX), float32(fromY))
		test.Drag(canvas, pos, float32(deltaX), float32(deltaY))
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Drag is only supported in test mode",
		})
	}
}

func (b *Bridge) handleFocusNext(msg Message) {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	if b.testMode {
		canvas := win.Canvas()
		test.FocusNext(canvas)
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "FocusNext is only supported in test mode",
		})
	}
}

func (b *Bridge) handleFocusPrevious(msg Message) {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	if b.testMode {
		canvas := win.Canvas()
		test.FocusPrevious(canvas)
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "FocusPrevious is only supported in test mode",
		})
	}
}

func (b *Bridge) handleGetWidgetInfo(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	obj, widgetExists := b.widgets[widgetID]
	meta, metaExists := b.widgetMeta[widgetID]
	b.mu.RUnlock()

	if !widgetExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	info := map[string]interface{}{
		"id":   widgetID,
		"type": "unknown",
		"text": "",
	}

	if metaExists {
		info["type"] = meta.Type
		info["text"] = meta.Text
	}

	// Get current widget properties - must happen on main thread
	fyne.DoAndWait(func() {
		switch w := obj.(type) {
		case *widget.Label:
			info["text"] = w.Text
			info["type"] = "label"
		case *widget.Entry:
			info["text"] = w.Text
			info["type"] = "entry"
			info["placeholder"] = w.PlaceHolder
		case *widget.Button:
			info["text"] = w.Text
			info["type"] = "button"
		case *canvas.Image:
			info["type"] = "image"
			if metaExists {
				info["path"] = meta.Text // path is stored in meta.Text
			}
			size := w.MinSize()
			info["width"] = size.Width
			info["height"] = size.Height
			// Convert FillMode to string
			switch w.FillMode {
			case canvas.ImageFillContain:
				info["fillMode"] = "contain"
			case canvas.ImageFillStretch:
				info["fillMode"] = "stretch"
			case canvas.ImageFillOriginal:
				info["fillMode"] = "original"
			default:
				info["fillMode"] = "unknown"
			}
		}
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  info,
	})
}

func (b *Bridge) handleGetAllWidgets(msg Message) {
	// First, collect widget IDs and metadata while holding the lock
	b.mu.RLock()

	type widgetData struct {
		id   string
		obj  fyne.CanvasObject
		meta WidgetMetadata
	}

	widgetList := make([]widgetData, 0, len(b.widgetMeta))
	for widgetID, meta := range b.widgetMeta {
		if obj, exists := b.widgets[widgetID]; exists {
			widgetList = append(widgetList, widgetData{
				id:   widgetID,
				obj:  obj,
				meta: meta,
			})
		}
	}

	b.mu.RUnlock()

	// Now access widget properties on the main thread
	widgets := make([]map[string]interface{}, 0, len(widgetList))

	fyne.DoAndWait(func() {
		for _, wd := range widgetList {
			widgetInfo := map[string]interface{}{
				"id":   wd.id,
				"type": wd.meta.Type,
				"text": wd.meta.Text,
			}

			// Get current text value from widget
			switch w := wd.obj.(type) {
			case *widget.Label:
				widgetInfo["text"] = w.Text
			case *widget.Entry:
				widgetInfo["text"] = w.Text
			case *widget.Button:
				widgetInfo["text"] = w.Text
			}

			widgets = append(widgets, widgetInfo)
		}
	})

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"widgets": widgets,
		},
	})
}

func (b *Bridge) handleCaptureWindow(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	filePath := msg.Payload["filePath"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		})
		return
	}

	var img image.Image

	// Canvas capture must happen on main thread
	fyne.DoAndWait(func() {
		img = win.Canvas().Capture()
	})

	// Create file
	f, err := os.Create(filePath)
	if err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to create file: %v", err),
		})
		return
	}
	defer f.Close()

	// Encode as PNG
	if err := png.Encode(f, img); err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to encode PNG: %v", err),
		})
		return
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
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

func (b *Bridge) handleSetWidgetContextMenu(msg Message) {
	widgetID, ok := msg.Payload["widgetId"].(string)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "widgetId is required",
		})
		return
	}

	items, ok := msg.Payload["items"].([]interface{})
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "items array is required",
		})
		return
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	obj, exists := b.widgets[widgetID]
	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	// Build menu items
	var menuItems []*fyne.MenuItem
	for _, item := range items {
		itemMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		label, ok := itemMap["label"].(string)
		if !ok {
			continue
		}

		// Check if it's a separator
		if isSep, ok := itemMap["isSeparator"].(bool); ok && isSep {
			menuItems = append(menuItems, fyne.NewMenuItemSeparator())
			continue
		}

		// Get callback ID
		callbackID, _ := itemMap["callbackId"].(string)

		// Check if disabled
		disabled := false
		if d, ok := itemMap["disabled"].(bool); ok {
			disabled = d
		}

		// Check if checked
		checked := false
		if c, ok := itemMap["checked"].(bool); ok {
			checked = c
		}

		menuItem := fyne.NewMenuItem(label, func(cid string) func() {
			return func() {
				// Send callback event
				b.sendEvent(Event{
					Type:     "callback",
					WidgetID: cid,
				})
			}
		}(callbackID))

		menuItem.Disabled = disabled
		menuItem.Checked = checked

		menuItems = append(menuItems, menuItem)
	}

	// Create menu
	menu := fyne.NewMenu("", menuItems...)
	b.contextMenus[widgetID] = menu

	// Wrap the widget to add context menu support
	// We need to find which window this widget belongs to
	var targetWindow fyne.Window
	for _, win := range b.windows {
		targetWindow = win
		break // Use first window for now
	}

	if targetWindow != nil {
		wrapper := NewTappableWrapper(obj)
		wrapper.SetMenu(menu)
		wrapper.SetCanvas(targetWindow.Canvas())

		// Replace the widget with the wrapper
		b.widgets[widgetID] = wrapper
	}

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleContainerAdd(msg Message) {
	containerID := msg.Payload["containerId"].(string)
	childID := msg.Payload["childId"].(string)

	b.mu.RLock()
	containerObj, containerExists := b.widgets[containerID]
	childObj, childExists := b.widgets[childID]
	b.mu.RUnlock()

	if !containerExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Container not found",
		})
		return
	}

	if !childExists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Child widget not found",
		})
		return
	}

	// Cast to container and add the child
	if cont, ok := containerObj.(*fyne.Container); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			cont.Add(childObj)
		})

		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a container",
		})
	}
}

func (b *Bridge) handleContainerRemoveAll(msg Message) {
	containerID := msg.Payload["containerId"].(string)

	b.mu.RLock()
	containerObj, exists := b.widgets[containerID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Container not found",
		})
		return
	}

	// Cast to container and remove all children
	if cont, ok := containerObj.(*fyne.Container); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			cont.Objects = nil
		})

		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a container",
		})
	}
}

func (b *Bridge) handleContainerRefresh(msg Message) {
	containerID := msg.Payload["containerId"].(string)

	b.mu.RLock()
	containerObj, exists := b.widgets[containerID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Container not found",
		})
		return
	}

	// Cast to container and refresh
	if cont, ok := containerObj.(*fyne.Container); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			cont.Refresh()
		})

		b.sendResponse(Response{
			ID:      msg.ID,
			Success: true,
		})
	} else {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a container",
		})
	}
}

func main() {
	// =============================================================================
	// IPC Safeguard #1: Redirect all log output to stderr
	// =============================================================================
	// stdout is reserved exclusively for JSON-RPC protocol messages.
	// Any accidental stdout writes (debug prints, panics, third-party libraries)
	// would corrupt the JSON stream and crash the application.
	// All logging MUST go to stderr.
	log.SetOutput(os.Stderr)
	log.SetPrefix("[tsyne-bridge] ")
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	// Check for test mode flag
	testMode := false
	for _, arg := range os.Args[1:] {
		if arg == "--test" || arg == "--headless" {
			testMode = true
			break
		}
	}

	bridge := NewBridge(testMode)

	// Read messages from stdin in a goroutine
	go func() {
		// IPC Safeguard #3 & #4: Read framed messages with length-prefix and CRC32 validation
		for {
			// Read framed message from stdin
			jsonData, err := readFramedMessage(os.Stdin)
			if err != nil {
				if errors.Is(err, io.EOF) {
					// Stdin closed - normal termination
					break
				}
				log.Printf("Error reading framed message: %v", err)
				continue // Try to recover and read next message
			}

			// Parse JSON message
			var msg Message
			if err := json.Unmarshal(jsonData, &msg); err != nil {
				log.Printf("Error parsing message: %v", err)
				continue
			}

			// Handle the message
			bridge.handleMessage(msg)
		}

		// If stdin closes, signal quit
		if testMode {
			select {
			case bridge.quitChan <- true:
			default:
			}
		}
	}()

	// Send ready signal to indicate bridge is ready to receive commands
	bridge.sendResponse(Response{
		ID:      "ready",
		Success: true,
		Result:  map[string]interface{}{"status": "ready"},
	})

	// Run the Fyne app
	// In normal mode, this blocks until quit
	// In test mode, DON'T call app.Run() - test apps don't need the event loop
	if !testMode {
		bridge.app.Run()
	} else {
		// In test mode, just wait for quit signal
		<-bridge.quitChan
	}
}
