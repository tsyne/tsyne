package main

import (
	"context"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

// ============================================================================
// Dialogs
// ============================================================================

// ShowInfo shows an info dialog
func (s *grpcBridgeService) ShowInfo(ctx context.Context, req *pb.ShowInfoRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"windowId": req.WindowId,
		"title":    req.Title,
		"message":  req.Message,
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showInfo",
		Payload: payload,
	}

	resp := s.bridge.handleShowInfo(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowError shows an error dialog
func (s *grpcBridgeService) ShowError(ctx context.Context, req *pb.ShowErrorRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"windowId": req.WindowId,
		"title":    req.Title,
		"message":  req.Message,
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showError",
		Payload: payload,
	}

	resp := s.bridge.handleShowError(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowConfirm shows a confirm dialog
func (s *grpcBridgeService) ShowConfirm(ctx context.Context, req *pb.ShowConfirmRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"windowId": req.WindowId,
		"title":    req.Title,
		"message":  req.Message,
	}
	if req.ConfirmCallbackId != "" {
		payload["confirmCallbackId"] = req.ConfirmCallbackId
	}
	if req.CancelCallbackId != "" {
		payload["cancelCallbackId"] = req.CancelCallbackId
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showConfirm",
		Payload: payload,
	}

	resp := s.bridge.handleShowConfirm(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowFileOpen shows a file open dialog
func (s *grpcBridgeService) ShowFileOpen(ctx context.Context, req *pb.ShowFileOpenRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"windowId": req.WindowId,
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}
	if len(req.Extensions) > 0 {
		payload["extensions"] = req.Extensions
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showFileOpen",
		Payload: payload,
	}

	resp := s.bridge.handleShowFileOpen(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowFileSave shows a file save dialog
func (s *grpcBridgeService) ShowFileSave(ctx context.Context, req *pb.ShowFileSaveRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"windowId": req.WindowId,
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}
	if req.Filename != "" {
		payload["filename"] = req.Filename
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showFileSave",
		Payload: payload,
	}

	resp := s.bridge.handleShowFileSave(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowFolderOpen shows a folder open dialog
func (s *grpcBridgeService) ShowFolderOpen(ctx context.Context, req *pb.ShowFolderOpenRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"windowId": req.WindowId,
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showFolderOpen",
		Payload: payload,
	}

	resp := s.bridge.handleShowFolderOpen(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowForm shows a form dialog
func (s *grpcBridgeService) ShowForm(ctx context.Context, req *pb.ShowFormRequest) (*pb.Response, error) {
	items := make([]interface{}, len(req.Items))
	for i, item := range req.Items {
		items[i] = map[string]interface{}{
			"label":    item.Label,
			"widgetId": item.WidgetId,
		}
	}

	payload := map[string]interface{}{
		"windowId":    req.WindowId,
		"title":       req.Title,
		"confirmText": req.ConfirmText,
		"cancelText":  req.CancelText,
		"items":       items,
	}
	if req.SubmitCallbackId != "" {
		payload["submitCallbackId"] = req.SubmitCallbackId
	}
	if req.CancelCallbackId != "" {
		payload["cancelCallbackId"] = req.CancelCallbackId
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showForm",
		Payload: payload,
	}

	resp := s.bridge.handleShowForm(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowCustom shows a custom dialog
func (s *grpcBridgeService) ShowCustom(ctx context.Context, req *pb.ShowCustomRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"windowId":    req.WindowId,
		"title":       req.Title,
		"contentId":   req.ContentId,
		"confirmText": req.ConfirmText,
	}
	if req.ConfirmCallbackId != "" {
		payload["confirmCallbackId"] = req.ConfirmCallbackId
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showCustom",
		Payload: payload,
	}

	resp := s.bridge.handleShowCustom(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowCustomConfirm shows a custom confirm dialog
func (s *grpcBridgeService) ShowCustomConfirm(ctx context.Context, req *pb.ShowCustomConfirmRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"windowId":    req.WindowId,
		"title":       req.Title,
		"contentId":   req.ContentId,
		"confirmText": req.ConfirmText,
		"dismissText": req.DismissText,
	}
	if req.ConfirmCallbackId != "" {
		payload["confirmCallbackId"] = req.ConfirmCallbackId
	}
	if req.DismissCallbackId != "" {
		payload["dismissCallbackId"] = req.DismissCallbackId
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showCustomConfirm",
		Payload: payload,
	}

	resp := s.bridge.handleShowCustomConfirm(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowCustomWithoutButtons shows a custom dialog without buttons
func (s *grpcBridgeService) ShowCustomWithoutButtons(ctx context.Context, req *pb.ShowCustomWithoutButtonsRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "showCustomWithoutButtons",
		Payload: map[string]interface{}{
			"windowId":  req.WindowId,
			"title":     req.Title,
			"contentId": req.ContentId,
		},
	}

	resp := s.bridge.handleShowCustomWithoutButtons(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// HideCustomDialog hides a custom dialog
func (s *grpcBridgeService) HideCustomDialog(ctx context.Context, req *pb.HideCustomDialogRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "hideCustomDialog",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	resp := s.bridge.handleHideCustomDialog(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetActiveDialogs gets active dialogs
func (s *grpcBridgeService) GetActiveDialogs(ctx context.Context, req *pb.GetActiveDialogsRequest) (*pb.GetActiveDialogsResponse, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "getActiveDialogs",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	resp := s.bridge.handleGetActiveDialogs(msg)

	var dialogIds []string
	if resp.Result != nil {
		if v, ok := resp.Result["dialogIds"].([]interface{}); ok {
			for _, item := range v {
				if s, ok := item.(string); ok {
					dialogIds = append(dialogIds, s)
				}
			}
		}
	}

	return &pb.GetActiveDialogsResponse{
		Success:   resp.Success,
		Error:     resp.Error,
		DialogIds: dialogIds,
	}, nil
}

// DismissActiveDialog dismisses the active dialog
func (s *grpcBridgeService) DismissActiveDialog(ctx context.Context, req *pb.DismissActiveDialogRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "dismissActiveDialog",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	resp := s.bridge.handleDismissActiveDialog(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowProgressDialog shows a progress dialog
func (s *grpcBridgeService) ShowProgressDialog(ctx context.Context, req *pb.ShowProgressDialogRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "showProgressDialog",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"title":    req.Title,
			"message":  req.Message,
		},
	}

	resp := s.bridge.handleShowProgressDialog(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateProgressDialog updates a progress dialog
func (s *grpcBridgeService) UpdateProgressDialog(ctx context.Context, req *pb.UpdateProgressDialogRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "updateProgressDialog",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"progress": req.Progress,
			"message":  req.Message,
		},
	}

	resp := s.bridge.handleUpdateProgressDialog(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// HideProgressDialog hides a progress dialog
func (s *grpcBridgeService) HideProgressDialog(ctx context.Context, req *pb.HideProgressDialogRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "hideProgressDialog",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	resp := s.bridge.handleHideProgressDialog(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowColorPicker shows a color picker dialog
func (s *grpcBridgeService) ShowColorPicker(ctx context.Context, req *pb.ShowColorPickerRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"windowId": req.WindowId,
		"title":    req.Title,
	}
	if req.InitialColor != "" {
		payload["initialColor"] = req.InitialColor
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showColorPicker",
		Payload: payload,
	}

	resp := s.bridge.handleShowColorPicker(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ShowEntryDialog shows an entry dialog
func (s *grpcBridgeService) ShowEntryDialog(ctx context.Context, req *pb.ShowEntryDialogRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"windowId": req.WindowId,
		"title":    req.Title,
		"message":  req.Message,
	}
	if req.Placeholder != "" {
		payload["placeholder"] = req.Placeholder
	}
	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}

	msg := Message{
		ID:      req.WindowId,
		Type:    "showEntryDialog",
		Payload: payload,
	}

	resp := s.bridge.handleShowEntryDialog(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}
