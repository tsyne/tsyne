package main

import (
	"context"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

// ============================================================================
// Widget state
// ============================================================================

// ShowWidget shows a widget
func (s *grpcBridgeService) ShowWidget(ctx context.Context, req *pb.ShowWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "showWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleShowWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// HideWidget hides a widget
func (s *grpcBridgeService) HideWidget(ctx context.Context, req *pb.HideWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "hideWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleHideWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// EnableWidget enables a widget
func (s *grpcBridgeService) EnableWidget(ctx context.Context, req *pb.EnableWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "enableWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleEnableWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// DisableWidget disables a widget
func (s *grpcBridgeService) DisableWidget(ctx context.Context, req *pb.DisableWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "disableWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleDisableWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// IsEnabled checks if widget is enabled
func (s *grpcBridgeService) IsEnabled(ctx context.Context, req *pb.IsEnabledRequest) (*pb.IsEnabledResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "isEnabled",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleIsEnabled(msg)

	enabled := false
	if resp.Result != nil {
		if v, ok := resp.Result["enabled"].(bool); ok {
			enabled = v
		}
	}

	return &pb.IsEnabledResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Enabled: enabled,
	}, nil
}

// ClearWidgets clears all widgets
func (s *grpcBridgeService) ClearWidgets(ctx context.Context, req *pb.ClearWidgetsRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "clearWidgets",
		Type: "clearWidgets",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleClearWidgets(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// StartActivity starts an activity indicator
func (s *grpcBridgeService) StartActivity(ctx context.Context, req *pb.StartActivityRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "startActivity",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleStartActivity(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// StopActivity stops an activity indicator
func (s *grpcBridgeService) StopActivity(ctx context.Context, req *pb.StopActivityRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "stopActivity",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleStopActivity(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// StartProgressInfinite starts infinite progress
func (s *grpcBridgeService) StartProgressInfinite(ctx context.Context, req *pb.StartProgressInfiniteRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "startProgressInfinite",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleStartProgressInfinite(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// StopProgressInfinite stops infinite progress
func (s *grpcBridgeService) StopProgressInfinite(ctx context.Context, req *pb.StopProgressInfiniteRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "stopProgressInfinite",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleStopProgressInfinite(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// IsProgressRunning checks if progress is running
func (s *grpcBridgeService) IsProgressRunning(ctx context.Context, req *pb.IsProgressRunningRequest) (*pb.IsProgressRunningResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "isProgressRunning",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleIsProgressRunning(msg)

	running := false
	if resp.Result != nil {
		if v, ok := resp.Result["running"].(bool); ok {
			running = v
		}
	}

	return &pb.IsProgressRunningResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Running: running,
	}, nil
}

// ============================================================================
// Additional Interactions
// ============================================================================

// HoverWidget hovers over a widget
func (s *grpcBridgeService) HoverWidget(ctx context.Context, req *pb.HoverWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "hoverWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleHoverWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// FocusWidget focuses a widget
func (s *grpcBridgeService) FocusWidget(ctx context.Context, req *pb.FocusWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "focusWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleFocusWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// FocusNext focuses the next widget
func (s *grpcBridgeService) FocusNext(ctx context.Context, req *pb.FocusNextRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "focusNext",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	resp := s.bridge.handleFocusNext(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// FocusPrevious focuses the previous widget
func (s *grpcBridgeService) FocusPrevious(ctx context.Context, req *pb.FocusPreviousRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "focusPrevious",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	resp := s.bridge.handleFocusPrevious(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SubmitEntry submits an entry
func (s *grpcBridgeService) SubmitEntry(ctx context.Context, req *pb.SubmitEntryRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "submitEntry",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleSubmitEntry(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// DragCanvas performs a drag on canvas
func (s *grpcBridgeService) DragCanvas(ctx context.Context, req *pb.DragCanvasRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "dragCanvas",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"fromX":    float64(req.FromX),
			"fromY":    float64(req.FromY),
			"deltaX":   float64(req.DeltaX),
			"deltaY":   float64(req.DeltaY),
		},
	}

	resp := s.bridge.handleDragCanvas(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ScrollCanvas performs a scroll on canvas
func (s *grpcBridgeService) ScrollCanvas(ctx context.Context, req *pb.ScrollCanvasRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "scrollCanvas",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"deltaX":   float64(req.DeltaX),
			"deltaY":   float64(req.DeltaY),
		},
	}

	resp := s.bridge.handleScrollCanvas(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Testing
// ============================================================================

// RegisterTestId registers a test ID for a widget
func (s *grpcBridgeService) RegisterTestId(ctx context.Context, req *pb.RegisterTestIdRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "registerTestId",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"testId":   req.TestId,
		},
	}

	resp := s.bridge.handleRegisterTestId(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetParent gets the parent widget ID
func (s *grpcBridgeService) GetParent(ctx context.Context, req *pb.GetParentRequest) (*pb.GetParentResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getParent",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetParent(msg)

	parentId := ""
	if resp.Result != nil {
		if v, ok := resp.Result["parentId"].(string); ok {
			parentId = v
		}
	}

	return &pb.GetParentResponse{
		Success:  resp.Success,
		Error:    resp.Error,
		ParentId: parentId,
	}, nil
}
