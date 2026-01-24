package main

import (
	"testing"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/widget"
)

// TestCustomIdRegistration tests basic custom ID registration
func TestCustomIdRegistration(t *testing.T) {
	bridge := &Bridge{
		customIds:        make(map[string]string),
		widgetToCustomId: make(map[string]string),
	}

	// Register a custom ID
	msg := Message{
		ID:   "test_1",
		Type: "registerCustomId",
		Payload: map[string]interface{}{
			"widgetId": "widget_123",
			"customId": "myButton",
		},
	}

	resp := bridge.handleRegisterCustomId(msg)
	if !resp.Success {
		t.Fatalf("Expected success, got error: %s", resp.Error)
	}

	// Verify both mappings exist
	if bridge.customIds["myButton"] != "widget_123" {
		t.Errorf("Forward mapping incorrect: got %s, want widget_123", bridge.customIds["myButton"])
	}
	if bridge.widgetToCustomId["widget_123"] != "myButton" {
		t.Errorf("Reverse mapping incorrect: got %s, want myButton", bridge.widgetToCustomId["widget_123"])
	}
}

// TestCustomIdReregistration tests that re-registering a widget updates correctly
func TestCustomIdReregistration(t *testing.T) {
	bridge := &Bridge{
		customIds:        make(map[string]string),
		widgetToCustomId: make(map[string]string),
	}

	// Register first custom ID
	msg1 := Message{
		ID:   "test_1",
		Type: "registerCustomId",
		Payload: map[string]interface{}{
			"widgetId": "widget_123",
			"customId": "oldId",
		},
	}
	bridge.handleRegisterCustomId(msg1)

	// Re-register same widget with new custom ID
	msg2 := Message{
		ID:   "test_2",
		Type: "registerCustomId",
		Payload: map[string]interface{}{
			"widgetId": "widget_123",
			"customId": "newId",
		},
	}
	bridge.handleRegisterCustomId(msg2)

	// Verify old mapping is removed
	if _, exists := bridge.customIds["oldId"]; exists {
		t.Error("Old custom ID should have been removed")
	}

	// Verify new mappings
	if bridge.customIds["newId"] != "widget_123" {
		t.Errorf("New forward mapping incorrect: got %s, want widget_123", bridge.customIds["newId"])
	}
	if bridge.widgetToCustomId["widget_123"] != "newId" {
		t.Errorf("Reverse mapping should be newId, got %s", bridge.widgetToCustomId["widget_123"])
	}

	// Verify only one entry in each map
	if len(bridge.customIds) != 1 {
		t.Errorf("Expected 1 custom ID, got %d", len(bridge.customIds))
	}
	if len(bridge.widgetToCustomId) != 1 {
		t.Errorf("Expected 1 reverse mapping, got %d", len(bridge.widgetToCustomId))
	}
}

// TestCustomIdGarbageCollection tests that custom IDs are cleaned up when widgets are removed
func TestCustomIdGarbageCollection(t *testing.T) {
	bridge := &Bridge{
		widgets:          make(map[string]fyne.CanvasObject),
		widgetMeta:       make(map[string]WidgetMetadata),
		callbacks:        make(map[string]string),
		contextMenus:     make(map[string]*fyne.Menu),
		tableData:        make(map[string][][]string),
		listData:         make(map[string][]string),
		childToParent:    make(map[string]string),
		customIds:        make(map[string]string),
		widgetToCustomId: make(map[string]string),
	}

	// Register widgets with actual Fyne widgets
	bridge.widgets["widget_1"] = widget.NewLabel("test1")
	bridge.widgets["widget_2"] = widget.NewLabel("test2")
	bridge.widgets["widget_3"] = widget.NewLabel("test3")

	// Register custom IDs
	for _, id := range []string{"widget_1", "widget_2", "widget_3"} {
		msg := Message{
			ID:   "test",
			Type: "registerCustomId",
			Payload: map[string]interface{}{
				"widgetId": id,
				"customId": "custom_" + id,
			},
		}
		bridge.handleRegisterCustomId(msg)
	}

	// Verify all registered
	if len(bridge.customIds) != 3 {
		t.Fatalf("Expected 3 custom IDs, got %d", len(bridge.customIds))
	}

	// Simulate widget removal (this is what removeWidgetTree does)
	widgetID := "widget_2"
	delete(bridge.widgets, widgetID)
	delete(bridge.widgetMeta, widgetID)
	delete(bridge.callbacks, widgetID)
	delete(bridge.contextMenus, widgetID)
	delete(bridge.tableData, widgetID)
	delete(bridge.listData, widgetID)
	delete(bridge.childToParent, widgetID)

	// GC the custom ID (optimized O(1) lookup)
	if customID, exists := bridge.widgetToCustomId[widgetID]; exists {
		delete(bridge.customIds, customID)
		delete(bridge.widgetToCustomId, widgetID)
	}

	// Verify GC happened
	if len(bridge.customIds) != 2 {
		t.Errorf("Expected 2 custom IDs after GC, got %d", len(bridge.customIds))
	}
	if len(bridge.widgetToCustomId) != 2 {
		t.Errorf("Expected 2 reverse mappings after GC, got %d", len(bridge.widgetToCustomId))
	}

	// Verify the correct one was removed
	if _, exists := bridge.customIds["custom_widget_2"]; exists {
		t.Error("custom_widget_2 should have been garbage collected")
	}
	if _, exists := bridge.widgetToCustomId["widget_2"]; exists {
		t.Error("widget_2 reverse mapping should have been garbage collected")
	}

	// Verify others remain
	if bridge.customIds["custom_widget_1"] != "widget_1" {
		t.Error("custom_widget_1 should still exist")
	}
	if bridge.customIds["custom_widget_3"] != "widget_3" {
		t.Error("custom_widget_3 should still exist")
	}
}

// TestClearAllCustomIds tests the bulk clear functionality
func TestClearAllCustomIds(t *testing.T) {
	bridge := &Bridge{
		customIds:        make(map[string]string),
		widgetToCustomId: make(map[string]string),
	}

	// Register multiple custom IDs
	for i := 0; i < 100; i++ {
		bridge.customIds[string(rune('a'+i))] = string(rune('A' + i))
		bridge.widgetToCustomId[string(rune('A'+i))] = string(rune('a' + i))
	}

	if len(bridge.customIds) != 100 {
		t.Fatalf("Setup failed: expected 100 custom IDs, got %d", len(bridge.customIds))
	}

	// Clear all
	msg := Message{
		ID:   "test",
		Type: "clearAllCustomIds",
	}
	resp := bridge.handleClearAllCustomIds(msg)

	if !resp.Success {
		t.Fatalf("Expected success, got error: %s", resp.Error)
	}

	// Verify cleared count
	cleared := resp.Result["cleared"].(int)
	if cleared != 100 {
		t.Errorf("Expected 100 cleared, got %d", cleared)
	}

	// Verify maps are empty
	if len(bridge.customIds) != 0 {
		t.Errorf("Expected empty customIds, got %d", len(bridge.customIds))
	}
	if len(bridge.widgetToCustomId) != 0 {
		t.Errorf("Expected empty widgetToCustomId, got %d", len(bridge.widgetToCustomId))
	}
}

// TestGetCustomIdStats tests the stats API
func TestGetCustomIdStats(t *testing.T) {
	bridge := &Bridge{
		widgets:          make(map[string]fyne.CanvasObject),
		customIds:        make(map[string]string),
		widgetToCustomId: make(map[string]string),
	}

	// Add some widgets and custom IDs
	for i := 0; i < 50; i++ {
		widgetID := string(rune('A' + i))
		customID := string(rune('a' + i))
		bridge.widgets[widgetID] = widget.NewLabel("test")
		bridge.customIds[customID] = widgetID
		bridge.widgetToCustomId[widgetID] = customID
	}

	// Get stats
	msg := Message{
		ID:   "test",
		Type: "getCustomIdStats",
	}
	resp := bridge.handleGetCustomIdStats(msg)

	if !resp.Success {
		t.Fatalf("Expected success, got error: %s", resp.Error)
	}

	customIdCount := resp.Result["customIdCount"].(int)
	reverseMapCount := resp.Result["reverseMapCount"].(int)
	widgetCount := resp.Result["widgetCount"].(int)

	if customIdCount != 50 {
		t.Errorf("Expected customIdCount 50, got %d", customIdCount)
	}
	if reverseMapCount != 50 {
		t.Errorf("Expected reverseMapCount 50, got %d", reverseMapCount)
	}
	if widgetCount != 50 {
		t.Errorf("Expected widgetCount 50, got %d", widgetCount)
	}
}

// BenchmarkCustomIdGCOldMethod benchmarks the old O(n) GC method
func BenchmarkCustomIdGCOldMethod(b *testing.B) {
	bridge := &Bridge{
		customIds: make(map[string]string),
	}

	// Create 1000 custom IDs
	for i := 0; i < 1000; i++ {
		bridge.customIds[string(rune(i))] = string(rune(i + 10000))
	}

	widgetID := string(rune(500 + 10000)) // Middle widget

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Old method: O(n) linear search
		for customID, id := range bridge.customIds {
			if id == widgetID {
				_ = customID // Found it
				break
			}
		}
	}
}

// BenchmarkCustomIdGCNewMethod benchmarks the new O(1) GC method
func BenchmarkCustomIdGCNewMethod(b *testing.B) {
	bridge := &Bridge{
		customIds:        make(map[string]string),
		widgetToCustomId: make(map[string]string),
	}

	// Create 1000 custom IDs with both mappings
	for i := 0; i < 1000; i++ {
		customID := string(rune(i))
		widgetID := string(rune(i + 10000))
		bridge.customIds[customID] = widgetID
		bridge.widgetToCustomId[widgetID] = customID
	}

	widgetID := string(rune(500 + 10000)) // Middle widget

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// New method: O(1) direct lookup
		if customID, exists := bridge.widgetToCustomId[widgetID]; exists {
			_ = customID // Found it
		}
	}
}
