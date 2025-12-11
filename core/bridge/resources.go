package main

import (
	"encoding/base64"
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

	resourceData, ok := msg.Payload["data"].(string)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing or invalid 'data' parameter",
		}
	}

	// Decode base64 image data
	// Expected format: "data:image/png;base64,..." or just base64 data
	var base64Data string
	if len(resourceData) > 0 && resourceData[0:5] == "data:" {
		// Parse data URI format
		for i := 0; i < len(resourceData); i++ {
			if resourceData[i] == ',' {
				base64Data = resourceData[i+1:]
				break
			}
		}
	} else {
		base64Data = resourceData
	}

	imgData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Invalid base64 data: %v", err),
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
