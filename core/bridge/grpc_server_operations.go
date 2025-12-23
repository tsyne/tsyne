package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

// ============================================================================
// Resource management
// ============================================================================

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

// ============================================================================
// Widget operations
// ============================================================================

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

// SetWidgetCallback sets a callback ID for a widget
func (s *grpcBridgeService) SetWidgetCallback(ctx context.Context, req *pb.SetWidgetCallbackRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setWidgetCallback",
		Payload: map[string]interface{}{
			"widgetId":   req.WidgetId,
			"callbackId": req.CallbackId,
		},
	}

	resp := s.bridge.handleSetWidgetCallback(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
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

// ============================================================================
// Widget values
// ============================================================================

// SetValue sets a widget value (e.g., slider)
func (s *grpcBridgeService) SetValue(ctx context.Context, req *pb.SetValueRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setValue",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"value":    req.Value,
		},
	}

	resp := s.bridge.handleSetValue(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetValue gets a widget value
func (s *grpcBridgeService) GetValue(ctx context.Context, req *pb.GetValueRequest) (*pb.GetValueResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getValue",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetValue(msg)

	value := 0.0
	if resp.Result != nil {
		if v, ok := getFloat64(resp.Result["value"]); ok {
			value = v
		}
	}

	return &pb.GetValueResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Value:   value,
	}, nil
}

// SetSelected sets a widget selection
func (s *grpcBridgeService) SetSelected(ctx context.Context, req *pb.SetSelectedRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setSelected",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"selected": req.Selected,
		},
	}

	resp := s.bridge.handleSetSelected(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetSelected gets a widget selection
func (s *grpcBridgeService) GetSelected(ctx context.Context, req *pb.GetSelectedRequest) (*pb.GetSelectedResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getSelected",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetSelected(msg)

	selected := ""
	if resp.Result != nil {
		if v, ok := resp.Result["selected"].(string); ok {
			selected = v
		}
	}

	return &pb.GetSelectedResponse{
		Success:  resp.Success,
		Error:    resp.Error,
		Selected: selected,
	}, nil
}

// SetSelectOptions sets options for a select widget
func (s *grpcBridgeService) SetSelectOptions(ctx context.Context, req *pb.SetSelectOptionsRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setSelectOptions",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"options":  req.Options,
		},
	}

	resp := s.bridge.handleSetSelectOptions(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetSelectEntryOptions sets options for a select entry widget
func (s *grpcBridgeService) SetSelectEntryOptions(ctx context.Context, req *pb.SetSelectEntryOptionsRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setSelectEntryOptions",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"options":  req.Options,
		},
	}

	resp := s.bridge.handleSetSelectEntryOptions(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetDate sets a date value
func (s *grpcBridgeService) SetDate(ctx context.Context, req *pb.SetDateRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setDate",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"year":     float64(req.Year),
			"month":    float64(req.Month),
			"day":      float64(req.Day),
		},
	}

	resp := s.bridge.handleSetDate(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetDate gets a date value
func (s *grpcBridgeService) GetDate(ctx context.Context, req *pb.GetDateRequest) (*pb.GetDateResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getDate",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetDate(msg)

	year, month, day := int32(0), int32(0), int32(0)
	if resp.Result != nil {
		if v, ok := getFloat64(resp.Result["year"]); ok {
			year = int32(v)
		}
		if v, ok := getFloat64(resp.Result["month"]); ok {
			month = int32(v)
		}
		if v, ok := getFloat64(resp.Result["day"]); ok {
			day = int32(v)
		}
	}

	return &pb.GetDateResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Year:    year,
		Month:   month,
		Day:     day,
	}, nil
}

// SetIconResource sets an icon resource
func (s *grpcBridgeService) SetIconResource(ctx context.Context, req *pb.SetIconResourceRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setIconResource",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"resource": req.ResourceName,
		},
	}

	resp := s.bridge.handleSetIconResource(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetFileIconURI sets a file icon URI
func (s *grpcBridgeService) SetFileIconURI(ctx context.Context, req *pb.SetFileIconURIRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setFileIconURI",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"uri":      req.Uri,
		},
	}

	resp := s.bridge.handleSetFileIconURI(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetFileIconSelected sets file icon selection
func (s *grpcBridgeService) SetFileIconSelected(ctx context.Context, req *pb.SetFileIconSelectedRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setFileIconSelected",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"selected": req.Selected,
		},
	}

	resp := s.bridge.handleSetFileIconSelected(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetRadioSelected sets radio group selection
func (s *grpcBridgeService) SetRadioSelected(ctx context.Context, req *pb.SetRadioSelectedRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setRadioSelected",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"selected": req.Selected,
		},
	}

	resp := s.bridge.handleSetRadioSelected(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetRadioSelected gets radio group selection
func (s *grpcBridgeService) GetRadioSelected(ctx context.Context, req *pb.GetRadioSelectedRequest) (*pb.GetRadioSelectedResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getRadioSelected",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetRadioSelected(msg)

	selected := ""
	if resp.Result != nil {
		if v, ok := resp.Result["selected"].(string); ok {
			selected = v
		}
	}

	return &pb.GetRadioSelectedResponse{
		Success:  resp.Success,
		Error:    resp.Error,
		Selected: selected,
	}, nil
}

// SetRadioOptions sets radio group options
func (s *grpcBridgeService) SetRadioOptions(ctx context.Context, req *pb.SetRadioOptionsRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setRadioOptions",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"options":  req.Options,
		},
	}

	resp := s.bridge.handleSetRadioOptions(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetCheckGroupSelected gets check group selections
func (s *grpcBridgeService) GetCheckGroupSelected(ctx context.Context, req *pb.GetCheckGroupSelectedRequest) (*pb.GetCheckGroupSelectedResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getCheckGroupSelected",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetCheckGroupSelected(msg)

	var selected []string
	if resp.Result != nil {
		if v, ok := resp.Result["selected"].([]interface{}); ok {
			for _, item := range v {
				if s, ok := item.(string); ok {
					selected = append(selected, s)
				}
			}
		}
	}

	return &pb.GetCheckGroupSelectedResponse{
		Success:  resp.Success,
		Error:    resp.Error,
		Selected: selected,
	}, nil
}

// SetCheckGroupSelected sets check group selections
func (s *grpcBridgeService) SetCheckGroupSelected(ctx context.Context, req *pb.SetCheckGroupSelectedRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setCheckGroupSelected",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"selected": req.Selected,
		},
	}

	resp := s.bridge.handleSetCheckGroupSelected(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}
