package main

import (
	"context"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

// ============================================================================
// Theme and styling
// ============================================================================

// SetTheme sets the theme
func (s *grpcBridgeService) SetTheme(ctx context.Context, req *pb.SetThemeRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "setTheme",
		Type: "setTheme",
		Payload: map[string]interface{}{
			"theme": req.Theme,
		},
	}

	resp := s.bridge.handleSetTheme(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetTheme gets the current theme
func (s *grpcBridgeService) GetTheme(ctx context.Context, req *pb.GetThemeRequest) (*pb.GetThemeResponse, error) {
	msg := Message{
		ID:      "getTheme",
		Type:    "getTheme",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleGetTheme(msg)

	theme := ""
	if resp.Result != nil {
		if v, ok := resp.Result["theme"].(string); ok {
			theme = v
		}
	}

	return &pb.GetThemeResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Theme:   theme,
	}, nil
}

// SetFontScale sets the font scale
func (s *grpcBridgeService) SetFontScale(ctx context.Context, req *pb.SetFontScaleRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "setFontScale",
		Type: "setFontScale",
		Payload: map[string]interface{}{
			"scale": req.Scale,
		},
	}

	resp := s.bridge.handleSetFontScale(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetCustomTheme sets a custom theme
func (s *grpcBridgeService) SetCustomTheme(ctx context.Context, req *pb.SetCustomThemeRequest) (*pb.Response, error) {
	colors := map[string]interface{}{}
	for k, v := range req.Colors {
		colors[k] = v
	}

	msg := Message{
		ID:   "setCustomTheme",
		Type: "setCustomTheme",
		Payload: map[string]interface{}{
			"colors": colors,
		},
	}

	resp := s.bridge.handleSetCustomTheme(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ClearCustomTheme clears custom theme
func (s *grpcBridgeService) ClearCustomTheme(ctx context.Context, req *pb.ClearCustomThemeRequest) (*pb.Response, error) {
	msg := Message{
		ID:      "clearCustomTheme",
		Type:    "clearCustomTheme",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleClearCustomTheme(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetCustomFont sets a custom font
func (s *grpcBridgeService) SetCustomFont(ctx context.Context, req *pb.SetCustomFontRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "setCustomFont",
		Type: "setCustomFont",
		Payload: map[string]interface{}{
			"path":  req.Path,
			"style": req.Style,
		},
	}

	resp := s.bridge.handleSetCustomFont(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ClearCustomFont clears custom font
func (s *grpcBridgeService) ClearCustomFont(ctx context.Context, req *pb.ClearCustomFontRequest) (*pb.Response, error) {
	msg := Message{
		ID:      "clearCustomFont",
		Type:    "clearCustomFont",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleClearCustomFont(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetAvailableFonts gets available fonts
func (s *grpcBridgeService) GetAvailableFonts(ctx context.Context, req *pb.GetAvailableFontsRequest) (*pb.GetAvailableFontsResponse, error) {
	msg := Message{
		ID:      "getAvailableFonts",
		Type:    "getAvailableFonts",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleGetAvailableFonts(msg)

	var extensions []string
	var styles []string
	if resp.Result != nil {
		if v, ok := resp.Result["extensions"].([]interface{}); ok {
			for _, item := range v {
				if s, ok := item.(string); ok {
					extensions = append(extensions, s)
				}
			}
		}
		if v, ok := resp.Result["styles"].([]interface{}); ok {
			for _, item := range v {
				if s, ok := item.(string); ok {
					styles = append(styles, s)
				}
			}
		}
	}

	return &pb.GetAvailableFontsResponse{
		Success:    resp.Success,
		Error:      resp.Error,
		Extensions: extensions,
		Styles:     styles,
	}, nil
}

// SetWidgetStyle sets widget style
func (s *grpcBridgeService) SetWidgetStyle(ctx context.Context, req *pb.SetWidgetStyleRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"widgetId": req.WidgetId,
	}
	if req.FontStyle != "" {
		payload["fontStyle"] = req.FontStyle
	}
	if req.FontFamily != "" {
		payload["fontFamily"] = req.FontFamily
	}
	if req.TextAlign != "" {
		payload["textAlign"] = req.TextAlign
	}
	if req.FontSize != 0 {
		payload["fontSize"] = float64(req.FontSize)
	}
	if req.BackgroundColor != "" {
		payload["backgroundColor"] = req.BackgroundColor
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "setWidgetStyle",
		Payload: payload,
	}

	resp := s.bridge.handleSetWidgetStyle(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetMainMenu sets the main menu
func (s *grpcBridgeService) SetMainMenu(ctx context.Context, req *pb.SetMainMenuRequest) (*pb.Response, error) {
	items := convertMainMenuItems(req.MenuItems)

	msg := Message{
		ID:   req.WindowId,
		Type: "setMainMenu",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"items":    items,
		},
	}

	resp := s.bridge.handleSetMainMenu(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetWidgetContextMenu sets widget context menu
func (s *grpcBridgeService) SetWidgetContextMenu(ctx context.Context, req *pb.SetWidgetContextMenuRequest) (*pb.Response, error) {
	items := convertMenuItems(req.Items)

	msg := Message{
		ID:   req.WidgetId,
		Type: "setWidgetContextMenu",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"items":    items,
		},
	}

	resp := s.bridge.handleSetWidgetContextMenu(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Platform integration
// ============================================================================

// SetSystemTray sets system tray
func (s *grpcBridgeService) SetSystemTray(ctx context.Context, req *pb.SetSystemTrayRequest) (*pb.Response, error) {
	menuItems := convertMenuItems(req.MenuItems)

	msg := Message{
		ID:   "setSystemTray",
		Type: "setSystemTray",
		Payload: map[string]interface{}{
			"iconPath":  req.IconPath,
			"menuItems": menuItems,
		},
	}

	resp := s.bridge.handleSetSystemTray(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SendNotification sends a notification
func (s *grpcBridgeService) SendNotification(ctx context.Context, req *pb.SendNotificationRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "sendNotification",
		Type: "sendNotification",
		Payload: map[string]interface{}{
			"title":   req.Title,
			"content": req.Content,
		},
	}

	resp := s.bridge.handleSendNotification(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ClipboardGet gets clipboard content
func (s *grpcBridgeService) ClipboardGet(ctx context.Context, req *pb.ClipboardGetRequest) (*pb.ClipboardGetResponse, error) {
	msg := Message{
		ID:      "clipboardGet",
		Type:    "clipboardGet",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleClipboardGet(msg)

	content := ""
	if resp.Result != nil {
		if v, ok := resp.Result["content"].(string); ok {
			content = v
		}
	}

	return &pb.ClipboardGetResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Content: content,
	}, nil
}

// ClipboardSet sets clipboard content
func (s *grpcBridgeService) ClipboardSet(ctx context.Context, req *pb.ClipboardSetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "clipboardSet",
		Type: "clipboardSet",
		Payload: map[string]interface{}{
			"content": req.Content,
		},
	}

	resp := s.bridge.handleClipboardSet(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// PreferencesGet gets a preference
func (s *grpcBridgeService) PreferencesGet(ctx context.Context, req *pb.PreferencesGetRequest) (*pb.PreferencesGetResponse, error) {
	msg := Message{
		ID:   "preferencesGet",
		Type: "preferencesGet",
		Payload: map[string]interface{}{
			"key": req.Key,
		},
	}

	resp := s.bridge.handlePreferencesGet(msg)

	value := ""
	if resp.Result != nil {
		if v, ok := resp.Result["value"].(string); ok {
			value = v
		}
	}

	return &pb.PreferencesGetResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Value:   value,
	}, nil
}

// PreferencesSet sets a preference
func (s *grpcBridgeService) PreferencesSet(ctx context.Context, req *pb.PreferencesSetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "preferencesSet",
		Type: "preferencesSet",
		Payload: map[string]interface{}{
			"key":   req.Key,
			"value": req.Value,
		},
	}

	resp := s.bridge.handlePreferencesSet(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// PreferencesRemove removes a preference
func (s *grpcBridgeService) PreferencesRemove(ctx context.Context, req *pb.PreferencesRemoveRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "preferencesRemove",
		Type: "preferencesRemove",
		Payload: map[string]interface{}{
			"key": req.Key,
		},
	}

	resp := s.bridge.handlePreferencesRemove(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetDraggable sets widget draggable
func (s *grpcBridgeService) SetDraggable(ctx context.Context, req *pb.SetDraggableRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setDraggable",
		Payload: map[string]interface{}{
			"widgetId":              req.WidgetId,
			"dragData":              req.DragData,
			"onDragStartCallbackId": req.OnDragStartCallbackId,
			"onDragEndCallbackId":   req.OnDragEndCallbackId,
		},
	}

	resp := s.bridge.handleSetDraggable(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetDroppable sets widget droppable
func (s *grpcBridgeService) SetDroppable(ctx context.Context, req *pb.SetDroppableRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setDroppable",
		Payload: map[string]interface{}{
			"widgetId":              req.WidgetId,
			"onDropCallbackId":      req.OnDropCallbackId,
			"onDragEnterCallbackId": req.OnDragEnterCallbackId,
			"onDragLeaveCallbackId": req.OnDragLeaveCallbackId,
		},
	}

	resp := s.bridge.handleSetDroppable(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Accessibility
// ============================================================================

// SetAccessibility sets accessibility properties
func (s *grpcBridgeService) SetAccessibility(ctx context.Context, req *pb.SetAccessibilityRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"widgetId": req.WidgetId,
	}
	if req.Label != "" {
		payload["label"] = req.Label
	}
	if req.Hint != "" {
		payload["hint"] = req.Hint
	}
	if req.Role != "" {
		payload["role"] = req.Role
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "setAccessibility",
		Payload: payload,
	}

	resp := s.bridge.handleSetAccessibility(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// EnableAccessibility enables accessibility
func (s *grpcBridgeService) EnableAccessibility(ctx context.Context, req *pb.EnableAccessibilityRequest) (*pb.Response, error) {
	msg := Message{
		ID:      "enableAccessibility",
		Type:    "enableAccessibility",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleEnableAccessibility(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// DisableAccessibility disables accessibility
func (s *grpcBridgeService) DisableAccessibility(ctx context.Context, req *pb.DisableAccessibilityRequest) (*pb.Response, error) {
	msg := Message{
		ID:      "disableAccessibility",
		Type:    "disableAccessibility",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleDisableAccessibility(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// Announce announces text for accessibility
func (s *grpcBridgeService) Announce(ctx context.Context, req *pb.AnnounceRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "announce",
		Type: "announce",
		Payload: map[string]interface{}{
			"message": req.Message,
		},
	}

	resp := s.bridge.handleAnnounce(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// StopSpeech stops speech
func (s *grpcBridgeService) StopSpeech(ctx context.Context, req *pb.StopSpeechRequest) (*pb.Response, error) {
	msg := Message{
		ID:      "stopSpeech",
		Type:    "stopSpeech",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleStopSpeech(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetWidgetHoverable sets widget hoverable
func (s *grpcBridgeService) SetWidgetHoverable(ctx context.Context, req *pb.SetWidgetHoverableRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setWidgetHoverable",
		Payload: map[string]interface{}{
			"widgetId":   req.WidgetId,
			"callbackId": req.CallbackId,
		},
	}

	resp := s.bridge.handleSetWidgetHoverable(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}
