package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

// grpcBridgeService implements the BridgeService gRPC interface
type grpcBridgeService struct {
	pb.UnimplementedBridgeServiceServer
	bridge *Bridge
}

// CreateWindow creates a new window
func (s *grpcBridgeService) CreateWindow(ctx context.Context, req *pb.CreateWindowRequest) (*pb.Response, error) {
	log.Printf("[gRPC] CreateWindow: %s", req.WindowId)

	msg := Message{
		ID:   req.WindowId,
		Type: "createWindow",
		Payload: map[string]interface{}{
			"id":        req.WindowId,
			"title":     req.Title,
			"width":     float64(req.Width),
			"height":    float64(req.Height),
			"fixedSize": req.FixedSize,
		},
	}

	s.bridge.handleCreateWindow(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// ShowWindow shows a window
func (s *grpcBridgeService) ShowWindow(ctx context.Context, req *pb.ShowWindowRequest) (*pb.Response, error) {
	log.Printf("[gRPC] ShowWindow: %s", req.WindowId)

	msg := Message{
		ID:   req.WindowId,
		Type: "showWindow",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	s.bridge.handleShowWindow(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// SetContent sets window content
func (s *grpcBridgeService) SetContent(ctx context.Context, req *pb.SetContentRequest) (*pb.Response, error) {
	log.Printf("[gRPC] SetContent: window=%s, widget=%s", req.WindowId, req.WidgetId)

	msg := Message{
		ID:   req.WindowId,
		Type: "setContent",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"widgetId": req.WidgetId,
		},
	}

	s.bridge.handleSetContent(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// ResizeWindow resizes a window
func (s *grpcBridgeService) ResizeWindow(ctx context.Context, req *pb.ResizeWindowRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "resizeWindow",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"width":    req.Width,
			"height":   req.Height,
		},
	}

	s.bridge.handleResizeWindow(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// SetWindowTitle sets window title
func (s *grpcBridgeService) SetWindowTitle(ctx context.Context, req *pb.SetWindowTitleRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "setWindowTitle",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"title":    req.Title,
		},
	}

	s.bridge.handleSetWindowTitle(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// CenterWindow centers a window
func (s *grpcBridgeService) CenterWindow(ctx context.Context, req *pb.CenterWindowRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "centerWindow",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	s.bridge.handleCenterWindow(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// SetWindowFullScreen sets window fullscreen
func (s *grpcBridgeService) SetWindowFullScreen(ctx context.Context, req *pb.SetWindowFullScreenRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "setWindowFullScreen",
		Payload: map[string]interface{}{
			"windowId":   req.WindowId,
			"fullScreen": req.Fullscreen,
		},
	}

	s.bridge.handleSetWindowFullScreen(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// CreateImage creates an image widget
func (s *grpcBridgeService) CreateImage(ctx context.Context, req *pb.CreateImageRequest) (*pb.Response, error) {
	log.Printf("[gRPC] CreateImage: %s", req.WidgetId)

	payload := map[string]interface{}{
		"id":     req.WidgetId,
		"width":  float64(req.Width),
		"height": float64(req.Height),
	}

	// Handle source (inline data or resource reference)
	switch src := req.Source.(type) {
	case *pb.CreateImageRequest_InlineData:
		// Convert bytes to base64
		payload["source"] = fmt.Sprintf("data:image/png;base64,%s", src.InlineData)
	case *pb.CreateImageRequest_ResourceName:
		payload["resource"] = src.ResourceName
	}

	// Add callbacks if present
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}
	if req.DragCallbackId != "" {
		payload["dragCallbackId"] = req.DragCallbackId
	}
	if req.DoubleTapCallbackId != "" {
		payload["doubleTapCallbackId"] = req.DoubleTapCallbackId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createImage",
		Payload: payload,
	}

	s.bridge.handleCreateImage(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// CreateLabel creates a label widget
func (s *grpcBridgeService) CreateLabel(ctx context.Context, req *pb.CreateLabelRequest) (*pb.Response, error) {
	log.Printf("[gRPC] CreateLabel: %s", req.WidgetId)

	payload := map[string]interface{}{
		"id":   req.WidgetId,
		"text": req.Text,
	}

	if req.Bold {
		payload["bold"] = true
	}
	if req.Alignment != 0 {
		payload["alignment"] = float64(req.Alignment)
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createLabel",
		Payload: payload,
	}

	s.bridge.handleCreateLabel(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// CreateButton creates a button widget
func (s *grpcBridgeService) CreateButton(ctx context.Context, req *pb.CreateButtonRequest) (*pb.Response, error) {
	log.Printf("[gRPC] CreateButton: %s", req.WidgetId)

	payload := map[string]interface{}{
		"id":   req.WidgetId,
		"text": req.Text,
	}

	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}
	if req.Important {
		payload["important"] = true
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createButton",
		Payload: payload,
	}

	s.bridge.handleCreateButton(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// CreateEntry creates an entry widget
func (s *grpcBridgeService) CreateEntry(ctx context.Context, req *pb.CreateEntryRequest) (*pb.Response, error) {
	log.Printf("[gRPC] CreateEntry: %s", req.WidgetId)

	payload := map[string]interface{}{
		"id": req.WidgetId,
	}

	if req.Placeholder != "" {
		payload["placeholder"] = req.Placeholder
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}
	if req.Width != 0 {
		payload["width"] = float64(req.Width)
	}

	msgType := "createEntry"
	if req.Multiline {
		msgType = "createMultiLineEntry"
	} else if req.Password {
		msgType = "createPasswordEntry"
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    msgType,
		Payload: payload,
	}

	switch msgType {
	case "createMultiLineEntry":
		s.bridge.handleCreateMultiLineEntry(msg)
	case "createPasswordEntry":
		s.bridge.handleCreatePasswordEntry(msg)
	default:
		s.bridge.handleCreateEntry(msg)
	}

	return &pb.Response{
		Success: true,
	}, nil
}

// CreateVBox creates a vertical box container
func (s *grpcBridgeService) CreateVBox(ctx context.Context, req *pb.CreateVBoxRequest) (*pb.Response, error) {
	log.Printf("[gRPC] CreateVBox: %s", req.WidgetId)

	msg := Message{
		ID:   req.WidgetId,
		Type: "createVBox",
		Payload: map[string]interface{}{
			"id": req.WidgetId,
		},
	}

	s.bridge.handleCreateVBox(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// CreateHBox creates a horizontal box container
func (s *grpcBridgeService) CreateHBox(ctx context.Context, req *pb.CreateHBoxRequest) (*pb.Response, error) {
	log.Printf("[gRPC] CreateHBox: %s", req.WidgetId)

	msg := Message{
		ID:   req.WidgetId,
		Type: "createHBox",
		Payload: map[string]interface{}{
			"id": req.WidgetId,
		},
	}

	s.bridge.handleCreateHBox(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// CreateCheckbox creates a checkbox widget
func (s *grpcBridgeService) CreateCheckbox(ctx context.Context, req *pb.CreateCheckboxRequest) (*pb.Response, error) {
	log.Printf("[gRPC] CreateCheckbox: %s", req.WidgetId)

	payload := map[string]interface{}{
		"id":      req.WidgetId,
		"text":    req.Text,
		"checked": req.Checked,
	}

	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createCheckbox",
		Payload: payload,
	}

	s.bridge.handleCreateCheckbox(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// CreateSelect creates a select widget
func (s *grpcBridgeService) CreateSelect(ctx context.Context, req *pb.CreateSelectRequest) (*pb.Response, error) {
	log.Printf("[gRPC] CreateSelect: %s", req.WidgetId)

	payload := map[string]interface{}{
		"id":       req.WidgetId,
		"options":  req.Options,
		"selected": float64(req.Selected),
	}

	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createSelect",
		Payload: payload,
	}

	s.bridge.handleCreateSelect(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// RegisterResource registers a reusable resource
func (s *grpcBridgeService) RegisterResource(ctx context.Context, req *pb.RegisterResourceRequest) (*pb.Response, error) {
	log.Printf("[gRPC] RegisterResource: %s (%d bytes)", req.Name, len(req.Data))

	// Convert raw bytes to base64 for the existing handler
	base64Data := base64.StdEncoding.EncodeToString(req.Data)

	msg := Message{
		ID:   req.Name,
		Type: "registerResource",
		Payload: map[string]interface{}{
			"name": req.Name,
			"data": base64Data,
		},
	}

	s.bridge.handleRegisterResource(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// UnregisterResource unregisters a resource
func (s *grpcBridgeService) UnregisterResource(ctx context.Context, req *pb.UnregisterResourceRequest) (*pb.Response, error) {
	log.Printf("[gRPC] UnregisterResource: %s", req.Name)

	msg := Message{
		ID:   req.Name,
		Type: "unregisterResource",
		Payload: map[string]interface{}{
			"name": req.Name,
		},
	}

	s.bridge.handleUnregisterResource(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// UpdateImage updates an image widget
func (s *grpcBridgeService) UpdateImage(ctx context.Context, req *pb.UpdateImageRequest) (*pb.Response, error) {
	log.Printf("[gRPC] UpdateImage: %s", req.WidgetId)

	payload := map[string]interface{}{
		"widgetId": req.WidgetId,
	}

	// Handle source (inline data or resource reference)
	switch src := req.Source.(type) {
	case *pb.UpdateImageRequest_InlineData:
		payload["source"] = fmt.Sprintf("data:image/png;base64,%s", base64.StdEncoding.EncodeToString(src.InlineData))
	case *pb.UpdateImageRequest_ResourceName:
		payload["resource"] = src.ResourceName
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "updateImage",
		Payload: payload,
	}

	s.bridge.handleUpdateImage(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// SetText sets widget text
func (s *grpcBridgeService) SetText(ctx context.Context, req *pb.SetTextRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setText",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"text":     req.Text,
		},
	}

	s.bridge.handleSetText(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// GetText gets widget text
func (s *grpcBridgeService) GetText(ctx context.Context, req *pb.GetTextRequest) (*pb.GetTextResponse, error) {
	// This would need to be implemented with a synchronous response mechanism
	// For now, return placeholder
	return &pb.GetTextResponse{
		Success: true,
		Text:    "",
	}, nil
}

// SetProgress sets progress value
func (s *grpcBridgeService) SetProgress(ctx context.Context, req *pb.SetProgressRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setProgress",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"value":    req.Value,
		},
	}

	s.bridge.handleSetProgress(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// GetProgress gets progress value
func (s *grpcBridgeService) GetProgress(ctx context.Context, req *pb.GetProgressRequest) (*pb.GetProgressResponse, error) {
	return &pb.GetProgressResponse{
		Success: true,
		Value:   0.0,
	}, nil
}

// SetChecked sets checkbox checked state
func (s *grpcBridgeService) SetChecked(ctx context.Context, req *pb.SetCheckedRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setChecked",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"checked":  req.Checked,
		},
	}

	s.bridge.handleSetChecked(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// GetChecked gets checkbox checked state
func (s *grpcBridgeService) GetChecked(ctx context.Context, req *pb.GetCheckedRequest) (*pb.GetCheckedResponse, error) {
	return &pb.GetCheckedResponse{
		Success: true,
		Checked: false,
	}, nil
}

// ClickWidget simulates clicking a widget
func (s *grpcBridgeService) ClickWidget(ctx context.Context, req *pb.ClickWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "clickWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	s.bridge.handleClickWidget(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// TypeText simulates typing text
func (s *grpcBridgeService) TypeText(ctx context.Context, req *pb.TypeTextRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "typeText",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"text":     req.Text,
		},
	}

	s.bridge.handleTypeText(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// DoubleTapWidget simulates double-tapping a widget
func (s *grpcBridgeService) DoubleTapWidget(ctx context.Context, req *pb.DoubleTapWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "doubleTapWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	s.bridge.handleDoubleTapWidget(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// RightClickWidget simulates right-clicking a widget
func (s *grpcBridgeService) RightClickWidget(ctx context.Context, req *pb.RightClickWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "rightClickWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	s.bridge.handleRightClickWidget(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// DragWidget simulates dragging a widget
func (s *grpcBridgeService) DragWidget(ctx context.Context, req *pb.DragWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "dragWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"deltaX":   req.DeltaX,
			"deltaY":   req.DeltaY,
		},
	}

	s.bridge.handleDragWidget(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// RegisterCustomId registers a custom ID for a widget
func (s *grpcBridgeService) RegisterCustomId(ctx context.Context, req *pb.RegisterCustomIdRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.CustomId,
		Type: "registerCustomId",
		Payload: map[string]interface{}{
			"customId": req.CustomId,
			"widgetId": req.WidgetId,
		},
	}

	s.bridge.handleRegisterCustomId(msg)

	return &pb.Response{
		Success: true,
	}, nil
}

// FindWidget finds widgets by selector
func (s *grpcBridgeService) FindWidget(ctx context.Context, req *pb.FindWidgetRequest) (*pb.FindWidgetResponse, error) {
	msg := Message{
		ID:   "findWidget",
		Type: "findWidget",
		Payload: map[string]interface{}{
			"selector": req.Selector,
			"type":     req.Type,
		},
	}

	// This needs a synchronous response mechanism
	// For now, return placeholder
	s.bridge.handleFindWidget(msg)

	return &pb.FindWidgetResponse{
		Success:   true,
		WidgetIds: []string{},
	}, nil
}

// GetWidgetInfo gets widget information
func (s *grpcBridgeService) GetWidgetInfo(ctx context.Context, req *pb.GetWidgetInfoRequest) (*pb.WidgetInfoResponse, error) {
	// This needs a synchronous response mechanism
	// For now, return placeholder
	return &pb.WidgetInfoResponse{
		Success: true,
		Id:      req.WidgetId,
		Type:    "unknown",
	}, nil
}

// GetAllWidgets gets all widgets
func (s *grpcBridgeService) GetAllWidgets(ctx context.Context, req *pb.GetAllWidgetsRequest) (*pb.GetAllWidgetsResponse, error) {
	// This needs a synchronous response mechanism
	// For now, return placeholder
	return &pb.GetAllWidgetsResponse{
		Success: true,
		Widgets: []*pb.WidgetInfo{},
	}, nil
}

// SubscribeEvents subscribes to events (streaming)
func (s *grpcBridgeService) SubscribeEvents(req *pb.EventSubscription, stream pb.BridgeService_SubscribeEventsServer) error {
	log.Printf("[gRPC] SubscribeEvents: %v", req.EventTypes)

	// This would require an event channel implementation
	// For now, just keep the stream open
	<-stream.Context().Done()

	return nil
}

// Quit quits the application
func (s *grpcBridgeService) Quit(ctx context.Context, req *pb.QuitRequest) (*pb.Response, error) {
	log.Printf("[gRPC] Quit")

	msg := Message{
		ID:      "quit",
		Type:    "quit",
		Payload: map[string]interface{}{},
	}

	s.bridge.handleQuit(msg)

	return &pb.Response{
		Success: true,
	}, nil
}
