package main

import (
	"context"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

// ============================================================================
// Input widget creation
// ============================================================================

// CreateSlider creates a slider widget
func (s *grpcBridgeService) CreateSlider(ctx context.Context, req *pb.CreateSliderRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":    req.WidgetId,
		"min":   req.Min,
		"max":   req.Max,
		"value": req.Value,
	}

	if req.Step != 0 {
		payload["step"] = req.Step
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createSlider",
		Payload: payload,
	}

	resp := s.bridge.handleCreateSlider(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateRadioGroup creates a radio group widget
func (s *grpcBridgeService) CreateRadioGroup(ctx context.Context, req *pb.CreateRadioGroupRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":      req.WidgetId,
		"options": req.Options,
	}

	if req.Selected != "" {
		payload["selected"] = req.Selected
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}
	if req.Horizontal {
		payload["horizontal"] = true
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createRadioGroup",
		Payload: payload,
	}

	resp := s.bridge.handleCreateRadioGroup(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCheckGroup creates a check group widget
func (s *grpcBridgeService) CreateCheckGroup(ctx context.Context, req *pb.CreateCheckGroupRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":      req.WidgetId,
		"options": req.Options,
	}

	if len(req.Selected) > 0 {
		payload["selected"] = req.Selected
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}
	if req.Horizontal {
		payload["horizontal"] = true
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createCheckGroup",
		Payload: payload,
	}

	resp := s.bridge.handleCreateCheckGroup(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateSelectEntry creates a select entry widget
func (s *grpcBridgeService) CreateSelectEntry(ctx context.Context, req *pb.CreateSelectEntryRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":      req.WidgetId,
		"options": req.Options,
	}

	if req.Placeholder != "" {
		payload["placeholder"] = req.Placeholder
	}
	if req.OnChangedCallbackId != "" {
		payload["onChangedCallbackId"] = req.OnChangedCallbackId
	}
	if req.OnSubmittedCallbackId != "" {
		payload["onSubmittedCallbackId"] = req.OnSubmittedCallbackId
	}
	if req.OnSelectedCallbackId != "" {
		payload["onSelectedCallbackId"] = req.OnSelectedCallbackId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createSelectEntry",
		Payload: payload,
	}

	resp := s.bridge.handleCreateSelectEntry(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCompletionEntry creates a completion entry widget (autocomplete)
func (s *grpcBridgeService) CreateCompletionEntry(ctx context.Context, req *pb.CreateCompletionEntryRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":      req.WidgetId,
		"options": req.Options,
	}

	if req.Placeholder != "" {
		payload["placeholder"] = req.Placeholder
	}
	if req.OnChangedCallbackId != "" {
		payload["onChangedCallbackId"] = req.OnChangedCallbackId
	}
	if req.OnSubmittedCallbackId != "" {
		payload["onSubmittedCallbackId"] = req.OnSubmittedCallbackId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createCompletionEntry",
		Payload: payload,
	}

	resp := s.bridge.handleCreateCompletionEntry(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetCompletionEntryOptions updates the options for a completion entry
func (s *grpcBridgeService) SetCompletionEntryOptions(ctx context.Context, req *pb.SetCompletionEntryOptionsRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"widgetId": req.WidgetId,
		"options":  req.Options,
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "setCompletionEntryOptions",
		Payload: payload,
	}

	resp := s.bridge.handleSetCompletionEntryOptions(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowCompletion shows the completion popup
func (s *grpcBridgeService) ShowCompletion(ctx context.Context, req *pb.ShowCompletionRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"widgetId": req.WidgetId,
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "showCompletion",
		Payload: payload,
	}

	resp := s.bridge.handleShowCompletion(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// HideCompletion hides the completion popup
func (s *grpcBridgeService) HideCompletion(ctx context.Context, req *pb.HideCompletionRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"widgetId": req.WidgetId,
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "hideCompletion",
		Payload: payload,
	}

	resp := s.bridge.handleHideCompletion(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateDateEntry creates a date entry widget
func (s *grpcBridgeService) CreateDateEntry(ctx context.Context, req *pb.CreateDateEntryRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id": req.WidgetId,
	}

	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}
	if req.Date != "" {
		payload["date"] = req.Date
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createDateEntry",
		Payload: payload,
	}

	resp := s.bridge.handleCreateDateEntry(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}
