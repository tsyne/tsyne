package main

import (
	"fmt"
)

// handleRegisterResource registers a reusable image resource
func (b *Bridge) handleRegisterResource(msg Message) Response {
	resourceName, ok := msg.Payload["name"].(string)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing or invalid 'name' parameter",
		}
	}

	imgData, err := extractBinary(msg.Payload["data"])
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Invalid image data: %v", err),
		}
	}

	// Store resource
	b.mu.Lock()
	b.resources[resourceName] = imgData
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleUnregisterResource removes a registered resource
func (b *Bridge) handleUnregisterResource(msg Message) Response {
	resourceName, ok := msg.Payload["name"].(string)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing or invalid 'name' parameter",
		}
	}

	b.mu.Lock()
	delete(b.resources, resourceName)
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// getResource retrieves a registered resource by name
func (b *Bridge) getResource(name string) ([]byte, bool) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	data, exists := b.resources[name]
	return data, exists
}
