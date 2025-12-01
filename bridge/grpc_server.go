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

	resp := s.bridge.handleCreateWindow(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowWindow shows a window
func (s *grpcBridgeService) ShowWindow(ctx context.Context, req *pb.ShowWindowRequest) (*pb.Response, error) {

	msg := Message{
		ID:   req.WindowId,
		Type: "showWindow",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	resp := s.bridge.handleShowWindow(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetContent sets window content
func (s *grpcBridgeService) SetContent(ctx context.Context, req *pb.SetContentRequest) (*pb.Response, error) {

	msg := Message{
		ID:   req.WindowId,
		Type: "setContent",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleSetContent(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

	resp := s.bridge.handleResizeWindow(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

	resp := s.bridge.handleSetWindowTitle(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

	resp := s.bridge.handleCenterWindow(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

	resp := s.bridge.handleSetWindowFullScreen(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateImage creates an image widget
func (s *grpcBridgeService) CreateImage(ctx context.Context, req *pb.CreateImageRequest) (*pb.Response, error) {

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

	resp := s.bridge.handleCreateImage(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateLabel creates a label widget
func (s *grpcBridgeService) CreateLabel(ctx context.Context, req *pb.CreateLabelRequest) (*pb.Response, error) {

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

	resp := s.bridge.handleCreateLabel(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateButton creates a button widget
func (s *grpcBridgeService) CreateButton(ctx context.Context, req *pb.CreateButtonRequest) (*pb.Response, error) {

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

	resp := s.bridge.handleCreateButton(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateEntry creates an entry widget
func (s *grpcBridgeService) CreateEntry(ctx context.Context, req *pb.CreateEntryRequest) (*pb.Response, error) {

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

	var resp Response
	switch msgType {
	case "createMultiLineEntry":
		resp = s.bridge.handleCreateMultiLineEntry(msg)
	case "createPasswordEntry":
		resp = s.bridge.handleCreatePasswordEntry(msg)
	default:
		resp = s.bridge.handleCreateEntry(msg)
	}

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateVBox creates a vertical box container
func (s *grpcBridgeService) CreateVBox(ctx context.Context, req *pb.CreateVBoxRequest) (*pb.Response, error) {

	msg := Message{
		ID:   req.WidgetId,
		Type: "createVBox",
		Payload: map[string]interface{}{
			"id": req.WidgetId,
		},
	}

	resp := s.bridge.handleCreateVBox(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateHBox creates a horizontal box container
func (s *grpcBridgeService) CreateHBox(ctx context.Context, req *pb.CreateHBoxRequest) (*pb.Response, error) {

	msg := Message{
		ID:   req.WidgetId,
		Type: "createHBox",
		Payload: map[string]interface{}{
			"id": req.WidgetId,
		},
	}

	resp := s.bridge.handleCreateHBox(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCheckbox creates a checkbox widget
func (s *grpcBridgeService) CreateCheckbox(ctx context.Context, req *pb.CreateCheckboxRequest) (*pb.Response, error) {

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

	resp := s.bridge.handleCreateCheckbox(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateSelect creates a select widget
func (s *grpcBridgeService) CreateSelect(ctx context.Context, req *pb.CreateSelectRequest) (*pb.Response, error) {

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

	resp := s.bridge.handleCreateSelect(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// RegisterResource registers a reusable resource
func (s *grpcBridgeService) RegisterResource(ctx context.Context, req *pb.RegisterResourceRequest) (*pb.Response, error) {

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

	resp := s.bridge.handleRegisterResource(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UnregisterResource unregisters a resource
func (s *grpcBridgeService) UnregisterResource(ctx context.Context, req *pb.UnregisterResourceRequest) (*pb.Response, error) {

	msg := Message{
		ID:   req.Name,
		Type: "unregisterResource",
		Payload: map[string]interface{}{
			"name": req.Name,
		},
	}

	resp := s.bridge.handleUnregisterResource(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateImage updates an image widget
func (s *grpcBridgeService) UpdateImage(ctx context.Context, req *pb.UpdateImageRequest) (*pb.Response, error) {

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

	resp := s.bridge.handleUpdateImage(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

	resp := s.bridge.handleSetText(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetText gets widget text
func (s *grpcBridgeService) GetText(ctx context.Context, req *pb.GetTextRequest) (*pb.GetTextResponse, error) {
	result := s.bridge.GetTextSync(req.WidgetId)

	return &pb.GetTextResponse{
		Success: result.Success,
		Text:    result.Text,
		Error:   result.Error,
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

	resp := s.bridge.handleSetProgress(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetProgress gets progress value
func (s *grpcBridgeService) GetProgress(ctx context.Context, req *pb.GetProgressRequest) (*pb.GetProgressResponse, error) {
	result := s.bridge.GetProgressSync(req.WidgetId)

	return &pb.GetProgressResponse{
		Success: result.Success,
		Value:   result.Value,
		Error:   result.Error,
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

	resp := s.bridge.handleSetChecked(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetChecked gets checkbox checked state
func (s *grpcBridgeService) GetChecked(ctx context.Context, req *pb.GetCheckedRequest) (*pb.GetCheckedResponse, error) {
	result := s.bridge.GetCheckedSync(req.WidgetId)

	return &pb.GetCheckedResponse{
		Success: result.Success,
		Checked: result.Checked,
		Error:   result.Error,
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

	resp := s.bridge.handleClickWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

	resp := s.bridge.handleTypeText(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

	resp := s.bridge.handleDoubleTapWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

	resp := s.bridge.handleRightClickWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

	resp := s.bridge.handleDragWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

	resp := s.bridge.handleRegisterCustomId(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// FindWidget finds widgets by selector
func (s *grpcBridgeService) FindWidget(ctx context.Context, req *pb.FindWidgetRequest) (*pb.FindWidgetResponse, error) {
	result := s.bridge.FindWidgetSync(req.Selector, req.Type)

	return &pb.FindWidgetResponse{
		Success:   result.Success,
		WidgetIds: result.WidgetIds,
		Error:     result.Error,
	}, nil
}

// GetWidgetInfo gets widget information
func (s *grpcBridgeService) GetWidgetInfo(ctx context.Context, req *pb.GetWidgetInfoRequest) (*pb.WidgetInfoResponse, error) {
	result := s.bridge.GetWidgetInfoSync(req.WidgetId)

	return &pb.WidgetInfoResponse{
		Success: result.Success,
		Id:      result.ID,
		Type:    result.Type,
		Text:    result.Text,
		X:       result.X,
		Y:       result.Y,
		Width:   result.Width,
		Height:  result.Height,
		Error:   result.Error,
	}, nil
}

// GetAllWidgets gets all widgets
func (s *grpcBridgeService) GetAllWidgets(ctx context.Context, req *pb.GetAllWidgetsRequest) (*pb.GetAllWidgetsResponse, error) {
	result := s.bridge.GetAllWidgetsSync()

	widgets := make([]*pb.WidgetInfo, 0, len(result.Widgets))
	for _, w := range result.Widgets {
		widgets = append(widgets, &pb.WidgetInfo{
			Id:   w["id"].(string),
			Type: w["type"].(string),
			Text: w["text"].(string),
		})
	}

	return &pb.GetAllWidgetsResponse{
		Success: result.Success,
		Widgets: widgets,
		Error:   result.Error,
	}, nil
}

// SubscribeEvents subscribes to events (streaming)
func (s *grpcBridgeService) SubscribeEvents(req *pb.EventSubscription, stream pb.BridgeService_SubscribeEventsServer) error {

	// Read from event channel and send to stream
	eventChan := s.bridge.grpcEventChan
	if eventChan == nil {
		log.Printf("[gRPC] Warning: event channel is nil")
		<-stream.Context().Done()
		return nil
	}

	for {
		select {
		case event, ok := <-eventChan:
			if !ok {
				// Channel closed
				return nil
			}

			// Convert event.Data (map[string]interface{}) to map[string]string
			dataMap := make(map[string]string)
			for k, v := range event.Data {
				if str, ok := v.(string); ok {
					dataMap[k] = str
				} else {
					dataMap[k] = fmt.Sprintf("%v", v)
				}
			}

			pbEvent := &pb.Event{
				Type:     event.Type,
				WidgetId: event.WidgetID,
				Data:     dataMap,
			}

			if err := stream.Send(pbEvent); err != nil {
				log.Printf("[gRPC] Error sending event: %v", err)
				return err
			}

		case <-stream.Context().Done():
			return nil
		}
	}
}

// Quit quits the application
func (s *grpcBridgeService) Quit(ctx context.Context, req *pb.QuitRequest) (*pb.Response, error) {

	msg := Message{
		ID:      "quit",
		Type:    "quit",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleQuit(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}
