package main

import (
	"fmt"
	"log"
	"sort"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// inspectorNode represents a node in the inspector tree
type inspectorNode struct {
	id         string
	customID   string
	widgetType string
	fyneType   string
	text       string
	obj        fyne.CanvasObject
	children   []*inspectorNode
}

// Inspector handles the visual widget tree inspector
type Inspector struct {
	bridge         *Bridge
	window         fyne.Window
	targetWindowID string
	tree           *widget.Tree
	propsLabel     *widget.Label
	rootNode       *inspectorNode
	nodeMap        map[string]*inspectorNode // uid -> node
	highlightRect  *canvas.Rectangle
}

// NewInspector creates a new inspector for a window
func NewInspector(bridge *Bridge, targetWindowID string) *Inspector {
	return &Inspector{
		bridge:         bridge,
		targetWindowID: targetWindowID,
		nodeMap:        make(map[string]*inspectorNode),
	}
}

// Show displays the inspector window
func (insp *Inspector) Show() {
	insp.window = insp.bridge.app.NewWindow("Widget Inspector - " + insp.targetWindowID)
	insp.window.Resize(fyne.NewSize(500, 600))

	// Build initial tree
	insp.refreshTree()

	// Create tree widget
	insp.tree = widget.NewTree(
		func(uid widget.TreeNodeID) []widget.TreeNodeID {
			if uid == "" {
				// Root level - return top-level node
				if insp.rootNode != nil {
					return []widget.TreeNodeID{insp.rootNode.id}
				}
				return []widget.TreeNodeID{}
			}
			node := insp.nodeMap[uid]
			if node == nil {
				return []widget.TreeNodeID{}
			}
			childIDs := make([]widget.TreeNodeID, len(node.children))
			for i, child := range node.children {
				childIDs[i] = child.id
			}
			return childIDs
		},
		func(uid widget.TreeNodeID) bool {
			if uid == "" {
				return true
			}
			node := insp.nodeMap[uid]
			return node != nil && len(node.children) > 0
		},
		func(branch bool) fyne.CanvasObject {
			return widget.NewLabel("Widget")
		},
		func(uid widget.TreeNodeID, branch bool, obj fyne.CanvasObject) {
			label := obj.(*widget.Label)
			node := insp.nodeMap[uid]
			if node == nil {
				label.SetText("unknown")
				return
			}
			// Show type and optional custom ID
			displayText := node.widgetType
			if displayText == "" {
				displayText = node.fyneType
			}
			if node.customID != "" {
				displayText = fmt.Sprintf("%s [%s]", displayText, node.customID)
			}
			if node.text != "" && len(node.text) < 20 {
				displayText = fmt.Sprintf("%s \"%s\"", displayText, node.text)
			}
			label.SetText(displayText)
		},
	)

	// Handle selection
	insp.tree.OnSelected = func(uid widget.TreeNodeID) {
		node := insp.nodeMap[uid]
		if node != nil {
			insp.selectWidget(node)
		}
	}

	// Properties panel
	insp.propsLabel = widget.NewLabel("Select a widget to see properties")
	insp.propsLabel.Wrapping = fyne.TextWrapWord

	propsScroll := container.NewScroll(insp.propsLabel)
	propsScroll.SetMinSize(fyne.NewSize(0, 150))

	// Refresh button
	refreshBtn := widget.NewButtonWithIcon("Refresh", theme.ViewRefreshIcon(), func() {
		insp.refreshTree()
		insp.tree.Refresh()
	})

	// Layout
	content := container.NewBorder(
		refreshBtn,
		propsScroll,
		nil,
		nil,
		insp.tree,
	)

	insp.window.SetContent(content)
	insp.window.Show()

	// Open root node
	if insp.rootNode != nil {
		insp.tree.OpenBranch(insp.rootNode.id)
	}

	// Clean up highlight when inspector closes
	insp.window.SetOnClosed(func() {
		insp.removeHighlight()
	})
}

// refreshTree rebuilds the inspector tree from the current widget state
// Note: This is always called from the main goroutine (via shortcut handler or fyne.DoAndWait)
func (insp *Inspector) refreshTree() {
	insp.nodeMap = make(map[string]*inspectorNode)

	insp.bridge.mu.RLock()
	targetWin, exists := insp.bridge.windows[insp.targetWindowID]
	insp.bridge.mu.RUnlock()

	if !exists {
		return
	}

	content := targetWin.Content()
	if content != nil {
		insp.rootNode = insp.buildNode(content, "root")
	}
}

// buildNode recursively builds inspector nodes from canvas objects
func (insp *Inspector) buildNode(obj fyne.CanvasObject, pathPrefix string) *inspectorNode {
	// Get type name
	typeName := fmt.Sprintf("%T", obj)
	if idx := strings.LastIndex(typeName, "."); idx >= 0 {
		typeName = typeName[idx+1:]
	}

	// Try to find widget ID and metadata
	widgetID := ""
	customID := ""
	widgetType := ""
	text := ""

	insp.bridge.mu.RLock()
	for id, widget := range insp.bridge.widgets {
		if widget == obj {
			widgetID = id
			if meta, ok := insp.bridge.widgetMeta[id]; ok {
				widgetType = meta.Type
				text = meta.Text
			}
			// Look up custom ID
			for cid, wid := range insp.bridge.customIds {
				if wid == id {
					customID = cid
					break
				}
			}
			break
		}
	}
	insp.bridge.mu.RUnlock()

	nodeID := pathPrefix
	if widgetID != "" {
		nodeID = widgetID
	}

	// Get text from specific widget types
	switch w := obj.(type) {
	case *widget.Label:
		text = w.Text
	case *widget.Button:
		text = w.Text
	case *widget.Entry:
		if text == "" {
			text = w.PlaceHolder
		}
	}

	node := &inspectorNode{
		id:         nodeID,
		customID:   customID,
		widgetType: widgetType,
		fyneType:   typeName,
		text:       text,
		obj:        obj,
	}

	insp.nodeMap[nodeID] = node

	// Recursively process children
	if container, ok := obj.(*fyne.Container); ok {
		for i, child := range container.Objects {
			childPath := fmt.Sprintf("%s.%d", pathPrefix, i)
			childNode := insp.buildNode(child, childPath)
			node.children = append(node.children, childNode)
		}
	}

	return node
}

// selectWidget shows properties and highlights the widget
func (insp *Inspector) selectWidget(node *inspectorNode) {
	// Show properties
	var props strings.Builder
	props.WriteString(fmt.Sprintf("Type: %s\n", node.fyneType))
	if node.widgetType != "" {
		props.WriteString(fmt.Sprintf("Widget Type: %s\n", node.widgetType))
	}
	props.WriteString(fmt.Sprintf("ID: %s\n", node.id))
	if node.customID != "" {
		props.WriteString(fmt.Sprintf("Custom ID: %s\n", node.customID))
	}
	if node.text != "" {
		props.WriteString(fmt.Sprintf("Text: %s\n", node.text))
	}

	// Get size/position
	if node.obj != nil {
		pos := node.obj.Position()
		size := node.obj.Size()
		minSize := node.obj.MinSize()
		absPos := insp.bridge.app.Driver().AbsolutePositionForObject(node.obj)

		props.WriteString(fmt.Sprintf("\nPosition: (%.0f, %.0f)\n", pos.X, pos.Y))
		props.WriteString(fmt.Sprintf("Absolute: (%.0f, %.0f)\n", absPos.X, absPos.Y))
		props.WriteString(fmt.Sprintf("Size: %.0f x %.0f\n", size.Width, size.Height))
		props.WriteString(fmt.Sprintf("MinSize: %.0f x %.0f\n", minSize.Width, minSize.Height))
		props.WriteString(fmt.Sprintf("Visible: %t\n", node.obj.Visible()))
	}

	// Check for padding metadata
	insp.bridge.mu.RLock()
	if meta, ok := insp.bridge.widgetMeta[node.id]; ok {
		if meta.PaddingTop != 0 || meta.PaddingRight != 0 ||
			meta.PaddingBottom != 0 || meta.PaddingLeft != 0 {
			props.WriteString(fmt.Sprintf("\nPadding: T=%.0f R=%.0f B=%.0f L=%.0f\n",
				meta.PaddingTop, meta.PaddingRight, meta.PaddingBottom, meta.PaddingLeft))
		}
	}
	insp.bridge.mu.RUnlock()

	// Show children count
	if len(node.children) > 0 {
		props.WriteString(fmt.Sprintf("\nChildren: %d\n", len(node.children)))
	}

	insp.propsLabel.SetText(props.String())

	// Highlight widget in target window
	insp.highlightWidget(node)
}

// highlightWidget draws a highlight rectangle around the widget
func (insp *Inspector) highlightWidget(node *inspectorNode) {
	insp.removeHighlight()

	if node.obj == nil {
		return
	}

	insp.bridge.mu.RLock()
	targetWin, exists := insp.bridge.windows[insp.targetWindowID]
	insp.bridge.mu.RUnlock()

	if !exists {
		return
	}

	// Get widget position and size
	// Note: Already on main goroutine from tree callback
	absPos := insp.bridge.app.Driver().AbsolutePositionForObject(node.obj)
	size := node.obj.Size()

	// Create highlight rectangle
	insp.highlightRect = canvas.NewRectangle(nil)
	insp.highlightRect.StrokeColor = theme.PrimaryColor()
	insp.highlightRect.StrokeWidth = 2
	insp.highlightRect.Move(absPos)
	insp.highlightRect.Resize(size)

	// Add to window's overlay
	// Note: This is a simplified approach - adding to content
	content := targetWin.Content()
	if container, ok := content.(*fyne.Container); ok {
		container.Add(insp.highlightRect)
		container.Refresh()
	}
}

// removeHighlight removes the highlight rectangle
func (insp *Inspector) removeHighlight() {
	if insp.highlightRect == nil {
		return
	}

	insp.bridge.mu.RLock()
	targetWin, exists := insp.bridge.windows[insp.targetWindowID]
	insp.bridge.mu.RUnlock()

	if !exists {
		return
	}

	rect := insp.highlightRect
	insp.highlightRect = nil

	// Note: Already on main goroutine from tree callback
	content := targetWin.Content()
	if container, ok := content.(*fyne.Container); ok {
		container.Remove(rect)
		container.Refresh()
	}
}

// handleOpenInspector opens an inspector window for the specified window
func (b *Bridge) handleOpenInspector(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	log.Printf("[Inspector] Opening inspector for window: %s", windowID)

	b.mu.RLock()
	_, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		log.Printf("[Inspector] Window not found: %s", windowID)
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	log.Printf("[Inspector] Creating inspector window...")
	fyne.DoAndWait(func() {
		inspector := NewInspector(b, windowID)
		inspector.Show()
		log.Printf("[Inspector] Inspector window shown")
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleGetInspectorTree returns the widget tree for inspection
func (b *Bridge) handleGetInspectorTree(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)

	b.mu.RLock()
	win, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	var tree map[string]interface{}

	fyne.DoAndWait(func() {
		content := win.Content()
		if content != nil {
			tree = b.buildInspectorTree(content, "root")
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"tree": tree},
	}
}

// buildInspectorTree recursively builds a tree for the inspector
// parentAbsX/Y track absolute position from window origin
func (b *Bridge) buildInspectorTree(obj fyne.CanvasObject, pathPrefix string) map[string]interface{} {
	return b.buildInspectorTreeWithAbsPos(obj, pathPrefix, 0, 0)
}

func (b *Bridge) buildInspectorTreeWithAbsPos(obj fyne.CanvasObject, pathPrefix string, parentAbsX, parentAbsY float32) map[string]interface{} {
	// Get type name
	typeName := fmt.Sprintf("%T", obj)
	if idx := strings.LastIndex(typeName, "."); idx >= 0 {
		typeName = typeName[idx+1:]
	}

	// Get widget ID and metadata
	widgetID := ""
	customID := ""
	widgetType := ""
	text := ""

	b.mu.RLock()
	for id, widget := range b.widgets {
		if widget == obj {
			widgetID = id
			if meta, ok := b.widgetMeta[id]; ok {
				widgetType = meta.Type
				text = meta.Text
			}
			for cid, wid := range b.customIds {
				if wid == id {
					customID = cid
					break
				}
			}
			break
		}
	}
	b.mu.RUnlock()

	nodeID := pathPrefix
	if widgetID != "" {
		nodeID = widgetID
	}

	// Get text from widgets
	switch w := obj.(type) {
	case *widget.Label:
		text = w.Text
	case *widget.Button:
		text = w.Text
	}

	pos := obj.Position()
	size := obj.Size()
	minSize := obj.MinSize()

	// Calculate absolute position from window origin
	absX := parentAbsX + pos.X
	absY := parentAbsY + pos.Y

	node := map[string]interface{}{
		"id":      nodeID,
		"type":    typeName,
		"x":       pos.X,
		"y":       pos.Y,
		"absX":    absX,
		"absY":    absY,
		"w":       size.Width,
		"h":       size.Height,
		"minW":    minSize.Width,
		"minH":    minSize.Height,
		"visible": obj.Visible(),
	}

	if widgetType != "" {
		node["widgetType"] = widgetType
	}
	if customID != "" {
		node["customId"] = customID
	}
	if text != "" {
		node["text"] = text
	}

	// Add children - handle various container types
	var childObjects []fyne.CanvasObject

	switch c := obj.(type) {
	case *fyne.Container:
		childObjects = c.Objects
	case *TsyneDesktopMDI:
		// Include icons and inner windows
		for _, icon := range c.icons {
			childObjects = append(childObjects, icon)
		}
		for _, win := range c.windows {
			childObjects = append(childObjects, win)
		}
	default:
		// For widgets (Scroll, VBox, InnerWindow, etc.), get children from renderer
		if w, ok := obj.(fyne.Widget); ok {
			if renderer := w.CreateRenderer(); renderer != nil {
				childObjects = renderer.Objects()
			}
		}
	}

	if len(childObjects) > 0 {
		children := make([]map[string]interface{}, 0, len(childObjects))
		for i, child := range childObjects {
			childPath := fmt.Sprintf("%s.%d", pathPrefix, i)
			children = append(children, b.buildInspectorTreeWithAbsPos(child, childPath, absX, absY))
		}
		if len(children) > 0 {
			node["children"] = children
		}
	}

	return node
}

// handleListWindows returns a list of all window IDs
func (b *Bridge) handleListWindows(msg Message) Response {
	b.mu.RLock()
	windowIDs := make([]string, 0, len(b.windows))
	for id := range b.windows {
		windowIDs = append(windowIDs, id)
	}
	b.mu.RUnlock()

	sort.Strings(windowIDs)

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"windows": windowIDs},
	}
}
