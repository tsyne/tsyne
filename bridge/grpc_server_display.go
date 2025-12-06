package main

import (
	"context"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

// ============================================================================
// Display widget creation
// ============================================================================

// CreateSeparator creates a separator widget
func (s *grpcBridgeService) CreateSeparator(ctx context.Context, req *pb.CreateSeparatorRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createSeparator",
		Payload: map[string]interface{}{
			"id": req.WidgetId,
		},
	}

	resp := s.bridge.handleCreateSeparator(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateSpacer creates a spacer widget
func (s *grpcBridgeService) CreateSpacer(ctx context.Context, req *pb.CreateSpacerRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createSpacer",
		Payload: map[string]interface{}{
			"id": req.WidgetId,
		},
	}

	resp := s.bridge.handleCreateSpacer(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateHyperlink creates a hyperlink widget
func (s *grpcBridgeService) CreateHyperlink(ctx context.Context, req *pb.CreateHyperlinkRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createHyperlink",
		Payload: map[string]interface{}{
			"id":   req.WidgetId,
			"text": req.Text,
			"url":  req.Url,
		},
	}

	resp := s.bridge.handleCreateHyperlink(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateProgressBar creates a progress bar widget
func (s *grpcBridgeService) CreateProgressBar(ctx context.Context, req *pb.CreateProgressBarRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":    req.WidgetId,
		"value": req.Value,
	}
	if req.Infinite {
		payload["infinite"] = true
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createProgressBar",
		Payload: payload,
	}

	resp := s.bridge.handleCreateProgressBar(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateActivity creates an activity indicator widget
func (s *grpcBridgeService) CreateActivity(ctx context.Context, req *pb.CreateActivityRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createActivity",
		Payload: map[string]interface{}{
			"id": req.WidgetId,
		},
	}

	resp := s.bridge.handleCreateActivity(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateRichText creates a rich text widget
func (s *grpcBridgeService) CreateRichText(ctx context.Context, req *pb.CreateRichTextRequest) (*pb.Response, error) {
	segments := make([]interface{}, len(req.Segments))
	for i, seg := range req.Segments {
		segMap := map[string]interface{}{
			"text": seg.Text,
		}
		if seg.Bold {
			segMap["bold"] = true
		}
		if seg.Italic {
			segMap["italic"] = true
		}
		if seg.Monospace {
			segMap["monospace"] = true
		}
		if seg.Color != "" {
			segMap["color"] = seg.Color
		}
		segments[i] = segMap
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "createRichText",
		Payload: map[string]interface{}{
			"id":       req.WidgetId,
			"segments": segments,
		},
	}

	resp := s.bridge.handleCreateRichText(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateIcon creates an icon widget
func (s *grpcBridgeService) CreateIcon(ctx context.Context, req *pb.CreateIconRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createIcon",
		Payload: map[string]interface{}{
			"id":       req.WidgetId,
			"iconName": req.IconName,
		},
	}

	resp := s.bridge.handleCreateIcon(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateFileIcon creates a file icon widget
func (s *grpcBridgeService) CreateFileIcon(ctx context.Context, req *pb.CreateFileIconRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createFileIcon",
		Payload: map[string]interface{}{
			"id":   req.WidgetId,
			"path": req.Path,
		},
	}

	resp := s.bridge.handleCreateFileIcon(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCalendar creates a calendar widget
func (s *grpcBridgeService) CreateCalendar(ctx context.Context, req *pb.CreateCalendarRequest) (*pb.Response, error) {
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
		Type:    "createCalendar",
		Payload: payload,
	}

	resp := s.bridge.handleCreateCalendar(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}
