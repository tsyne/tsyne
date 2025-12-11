package main

import (
	"context"
	"encoding/base64"
	"fmt"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

// ============================================================================
// Basic widget creation
// ============================================================================

// CreateImage creates an image widget
func (s *grpcBridgeService) CreateImage(ctx context.Context, req *pb.CreateImageRequest) (*pb.Response, error) {

	payload := map[string]interface{}{
		"id":     req.WidgetId,
		"width":  float64(req.Width),
		"height": float64(req.Height),
	}

	// Handle source (inline data, resource reference, or file path)
	// Go handler expects "path" for data URLs/file paths and "resource" for resource names
	switch src := req.Source.(type) {
	case *pb.CreateImageRequest_InlineData:
		// Convert bytes to base64 data URL - Go handler expects this in "path" field
		payload["path"] = fmt.Sprintf("data:image/png;base64,%s", base64.StdEncoding.EncodeToString(src.InlineData))
	case *pb.CreateImageRequest_ResourceName:
		payload["resource"] = src.ResourceName
	case *pb.CreateImageRequest_Path:
		payload["path"] = src.Path
	}

	// Convert fill mode enum to string format expected by handler
	switch req.FillMode {
	case pb.ImageFillMode_IMAGE_FILL_CONTAIN:
		payload["fillMode"] = "contain"
	case pb.ImageFillMode_IMAGE_FILL_STRETCH:
		payload["fillMode"] = "stretch"
	// IMAGE_FILL_ORIGINAL is the default, no need to set
	}

	// Add callbacks if present
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}
	if req.DragCallbackId != "" {
		payload["onDragCallbackId"] = req.DragCallbackId
	}
	if req.DoubleTapCallbackId != "" {
		payload["doubleTapCallbackId"] = req.DoubleTapCallbackId
	}
	if req.DragEndCallbackId != "" {
		payload["onDragEndCallbackId"] = req.DragEndCallbackId
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

	// Convert alignment enum to string format expected by handler
	switch req.Alignment {
	case pb.TextAlignment_TEXT_ALIGN_CENTER:
		payload["alignment"] = "center"
	case pb.TextAlignment_TEXT_ALIGN_TRAILING:
		payload["alignment"] = "trailing"
	// TEXT_ALIGN_LEADING is the default, no need to set
	}

	// Convert wrapping enum to string format expected by handler
	switch req.Wrapping {
	case pb.TextWrapping_TEXT_WRAP_TRUNCATE:
		payload["wrapping"] = "break"
	case pb.TextWrapping_TEXT_WRAP_WORD:
		payload["wrapping"] = "word"
	// TEXT_WRAP_OFF is the default, no need to set
	}

	// Build textStyle map if any text style options are set
	if req.Bold || req.Italic || req.Monospace {
		textStyle := map[string]interface{}{}
		if req.Bold {
			textStyle["bold"] = true
		}
		if req.Italic {
			textStyle["italic"] = true
		}
		if req.Monospace {
			textStyle["monospace"] = true
		}
		payload["textStyle"] = textStyle
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

	// Convert importance enum to string format expected by handler
	switch req.Importance {
	case pb.ButtonImportance_BUTTON_IMPORTANCE_LOW:
		payload["importance"] = "low"
	case pb.ButtonImportance_BUTTON_IMPORTANCE_HIGH:
		payload["importance"] = "high"
	case pb.ButtonImportance_BUTTON_IMPORTANCE_WARNING:
		payload["importance"] = "warning"
	case pb.ButtonImportance_BUTTON_IMPORTANCE_SUCCESS:
		payload["importance"] = "success"
	// BUTTON_IMPORTANCE_MEDIUM is the default, no need to set
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
	if req.OnChangeCallbackId != "" {
		payload["onChangeCallbackId"] = req.OnChangeCallbackId
	}
	if req.OnCursorChangedCallbackId != "" {
		payload["onCursorChangedCallbackId"] = req.OnCursorChangedCallbackId
	}
	if req.MinWidth != 0 {
		payload["minWidth"] = float64(req.MinWidth)
	}
	if req.DoubleClickCallbackId != "" {
		payload["doubleClickCallbackId"] = req.DoubleClickCallbackId
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

// CreateVBox creates a vertical box container
func (s *grpcBridgeService) CreateVBox(ctx context.Context, req *pb.CreateVBoxRequest) (*pb.Response, error) {

	payload := map[string]interface{}{
		"id": req.WidgetId,
	}

	// Convert children slice to interface slice
	if len(req.Children) > 0 {
		children := make([]interface{}, len(req.Children))
		for i, c := range req.Children {
			children[i] = c
		}
		payload["children"] = children
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createVBox",
		Payload: payload,
	}

	resp := s.bridge.handleCreateVBox(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateHBox creates a horizontal box container
func (s *grpcBridgeService) CreateHBox(ctx context.Context, req *pb.CreateHBoxRequest) (*pb.Response, error) {

	payload := map[string]interface{}{
		"id": req.WidgetId,
	}

	// Convert children slice to interface slice
	if len(req.Children) > 0 {
		children := make([]interface{}, len(req.Children))
		for i, c := range req.Children {
			children[i] = c
		}
		payload["children"] = children
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createHBox",
		Payload: payload,
	}

	resp := s.bridge.handleCreateHBox(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}
