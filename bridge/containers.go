package main

import (
	"log"

	"fyne.io/fyne/v2"
)

func (b *Bridge) handleSetContent(msg Message) {
	windowID := msg.Payload["windowId"].(string)
	widgetID := msg.Payload["widgetId"].(string)
	log.Printf("[DEBUG] handleSetContent called for windowId: %s, widgetId: %s", windowID, widgetID)

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
	log.Printf("[DEBUG] removeWidgetTree called for widgetID: %s", widgetID)
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

func (b *Bridge) handleContainerAdd(msg Message) {
	containerID := msg.Payload["containerId"].(string)
	childID := msg.Payload["childId"].(string)
	log.Printf("[DEBUG] handleContainerAdd called for containerId: %s, childId: %s", containerID, childID)

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

		b.mu.Lock()
		b.childToParent[childID] = containerID
		b.mu.Unlock()

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
	log.Printf("[DEBUG] handleContainerRemoveAll called for containerId: %s", containerID)

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
	log.Printf("[DEBUG] handleContainerRefresh called for containerId: %s", containerID)

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
