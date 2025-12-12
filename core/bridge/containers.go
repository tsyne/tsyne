package main

import (
	"fyne.io/fyne/v2"
)

// ResizableLayout wraps a fyne.Layout and fires events when layout occurs
type ResizableLayout struct {
	wrapped    fyne.Layout
	widgetID   string
	callbackID string
	lastSize   fyne.Size
	bridge     *Bridge
}

// NewResizableLayout creates a layout that notifies TypeScript on resize
func NewResizableLayout(wrapped fyne.Layout, widgetID, callbackID string, bridge *Bridge) *ResizableLayout {
	return &ResizableLayout{
		wrapped:    wrapped,
		widgetID:   widgetID,
		callbackID: callbackID,
		bridge:     bridge,
	}
}

// Layout implements fyne.Layout
func (r *ResizableLayout) Layout(objects []fyne.CanvasObject, size fyne.Size) {
	// Check if size changed
	if size.Width != r.lastSize.Width || size.Height != r.lastSize.Height {
		r.lastSize = size
		// Send resize event to TypeScript asynchronously
		// This avoids blocking the Fyne layout thread and prevents EPIPE crashes
		if r.callbackID != "" && r.bridge != nil {
			go func(w, h float32) {
				r.bridge.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": r.callbackID,
						"widgetId":   r.widgetID,
						"width":      w,
						"height":     h,
					},
				})
			}(size.Width, size.Height)
		}
	}
	// Delegate to wrapped layout
	r.wrapped.Layout(objects, size)
}

// MinSize implements fyne.Layout
func (r *ResizableLayout) MinSize(objects []fyne.CanvasObject) fyne.Size {
	return r.wrapped.MinSize(objects)
}

func (b *Bridge) handleSetContent(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	widgetID := msg.Payload["widgetId"].(string)

	// First, check if window and widget exist (read lock)
	b.mu.RLock()
	win, winExists := b.windows[windowID]
	widget, widgetExists := b.widgets[widgetID]
	oldContentID, hasOldContent := b.windowContent[windowID]
	b.mu.RUnlock()

	if !winExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	if !widgetExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
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

	return Response{
		ID:      msg.ID,
		Success: true,
	}
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
	delete(b.childToParent, widgetID)

	// Also remove from customIDs map if it exists
	for customID, id := range b.customIds {
		if id == widgetID {
			delete(b.customIds, customID)
			break // Assuming one custom ID per widget ID
		}
	}
}

func (b *Bridge) handleContainerAdd(msg Message) Response {
	containerID := msg.Payload["containerId"].(string)
	childID := msg.Payload["childId"].(string)

	b.mu.RLock()
	containerObj, containerExists := b.widgets[containerID]
	childObj, childExists := b.widgets[childID]
	b.mu.RUnlock()

	if !containerExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Container not found",
		}
	}

	if !childExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Child widget not found",
		}
	}

	// Cast to container and add the child
	if cont, ok := containerObj.(*fyne.Container); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			cont.Add(childObj)
		})

		b.mu.Lock()
		b.childToParent[childID] = containerID
		b.mu.Unlock()

		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a container",
		}
	}
}

func (b *Bridge) handleContainerRemoveAll(msg Message) Response {
	containerID := msg.Payload["containerId"].(string)

	b.mu.RLock()
	containerObj, exists := b.widgets[containerID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Container not found",
		}
	}

	// Cast to container and remove all children
	if cont, ok := containerObj.(*fyne.Container); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			cont.Objects = nil
		})

		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a container",
		}
	}
}

func (b *Bridge) handleContainerRefresh(msg Message) Response {
	containerID := msg.Payload["containerId"].(string)

	b.mu.RLock()
	containerObj, exists := b.widgets[containerID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Container not found",
		}
	}

	// Cast to container and refresh
	if cont, ok := containerObj.(*fyne.Container); ok {
		// UI updates must happen on the main thread
		fyne.DoAndWait(func() {
			cont.Refresh()
		})

		return Response{
			ID:      msg.ID,
			Success: true,
		}
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a container",
		}
	}
}

func (b *Bridge) handleClearWidgets(msg Message) Response {
	// Clear all widgets from the maps
	// This should be called before building new window content
	b.mu.Lock()
	b.widgets = make(map[string]fyne.CanvasObject)
	b.widgetMeta = make(map[string]WidgetMetadata)
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetWidgetOnResize wraps a container's layout to fire resize events
func (b *Bridge) handleSetWidgetOnResize(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	callbackID := msg.Payload["callbackId"].(string)

	b.mu.RLock()
	containerObj, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		}
	}

	// Cast to container and wrap its layout
	if cont, ok := containerObj.(*fyne.Container); ok {
		// Wrap the layout with ResizableLayout
		if cont.Layout != nil {
			cont.Layout = NewResizableLayout(cont.Layout, widgetID, callbackID, b)
		}

		return Response{
			ID:      msg.ID,
			Success: true,
		}
	}

	return Response{
		ID:      msg.ID,
		Success: false,
		Error:   "Widget is not a container",
	}
}

// handleSetWindowOnResize sets up a resize callback for a window
func (b *Bridge) handleSetWindowOnResize(msg Message) Response {
	windowID := msg.Payload["windowId"].(string)
	callbackID := msg.Payload["callbackId"].(string)

	b.mu.RLock()
	winObj, exists := b.windows[windowID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Window not found",
		}
	}

	// Get the window's content container and wrap its layout
	content := winObj.Content()
	if cont, ok := content.(*fyne.Container); ok && cont.Layout != nil {
		cont.Layout = NewResizableLayout(cont.Layout, windowID, callbackID, b)
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
