package main

import (
	"context"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

// ============================================================================
// Window operations
// ============================================================================

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

// CloseWindow closes a window
func (s *grpcBridgeService) CloseWindow(ctx context.Context, req *pb.CloseWindowRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "closeWindow",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	resp := s.bridge.handleCloseWindow(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetWindowIcon sets the window icon
func (s *grpcBridgeService) SetWindowIcon(ctx context.Context, req *pb.SetWindowIconRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "setWindowIcon",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"resource": req.ResourceName,
		},
	}

	resp := s.bridge.handleSetWindowIcon(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetWindowCloseIntercept sets a close intercept callback
func (s *grpcBridgeService) SetWindowCloseIntercept(ctx context.Context, req *pb.SetWindowCloseInterceptRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "setWindowCloseIntercept",
		Payload: map[string]interface{}{
			"windowId":   req.WindowId,
			"callbackId": req.CallbackId,
		},
	}

	resp := s.bridge.handleSetWindowCloseIntercept(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CloseInterceptResponse responds to a close intercept
func (s *grpcBridgeService) CloseInterceptResponse(ctx context.Context, req *pb.CloseInterceptResponseRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "closeInterceptResponse",
		Payload: map[string]interface{}{
			"windowId":   req.WindowId,
			"allowClose": req.AllowClose,
		},
	}

	resp := s.bridge.handleCloseInterceptResponse(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CaptureWindow captures a window screenshot
func (s *grpcBridgeService) CaptureWindow(ctx context.Context, req *pb.CaptureWindowRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "captureWindow",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"filePath": req.FilePath,
		},
	}

	resp := s.bridge.handleCaptureWindow(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}
