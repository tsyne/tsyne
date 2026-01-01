package main

import (
	"context"
	"encoding/base64"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

// ============================================================================
// Canvas primitives
// ============================================================================

// CreateCanvasLine creates a canvas line
func (s *grpcBridgeService) CreateCanvasLine(ctx context.Context, req *pb.CreateCanvasLineRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createCanvasLine",
		Payload: map[string]interface{}{
			"id":          req.WidgetId,
			"x1":          float64(req.X1),
			"y1":          float64(req.Y1),
			"x2":          float64(req.X2),
			"y2":          float64(req.Y2),
			"strokeColor": req.StrokeColor,
			"strokeWidth": float64(req.StrokeWidth),
		},
	}

	resp := s.bridge.handleCreateCanvasLine(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCanvasCircle creates a canvas circle
func (s *grpcBridgeService) CreateCanvasCircle(ctx context.Context, req *pb.CreateCanvasCircleRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createCanvasCircle",
		Payload: map[string]interface{}{
			"id":          req.WidgetId,
			"x":           float64(req.X),
			"y":           float64(req.Y),
			"x2":          float64(req.X2),
			"y2":          float64(req.Y2),
			"fillColor":   req.FillColor,
			"strokeColor": req.StrokeColor,
			"strokeWidth": float64(req.StrokeWidth),
		},
	}

	resp := s.bridge.handleCreateCanvasCircle(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCanvasRectangle creates a canvas rectangle
func (s *grpcBridgeService) CreateCanvasRectangle(ctx context.Context, req *pb.CreateCanvasRectangleRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":          req.WidgetId,
		"width":       float64(req.Width),
		"height":      float64(req.Height),
		"fillColor":   req.FillColor,
		"strokeColor": req.StrokeColor,
		"strokeWidth": float64(req.StrokeWidth),
	}
	if req.CornerRadius != 0 {
		payload["cornerRadius"] = float64(req.CornerRadius)
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createCanvasRectangle",
		Payload: payload,
	}

	resp := s.bridge.handleCreateCanvasRectangle(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCanvasText creates canvas text
func (s *grpcBridgeService) CreateCanvasText(ctx context.Context, req *pb.CreateCanvasTextRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":    req.WidgetId,
		"text":  req.Text,
		"color": req.Color,
	}
	if req.TextSize != 0 {
		payload["textSize"] = float64(req.TextSize)
	}
	if req.Bold {
		payload["bold"] = true
	}
	if req.Italic {
		payload["italic"] = true
	}
	if req.Monospace {
		payload["monospace"] = true
	}
	if req.Alignment != pb.TextAlignment_TEXT_ALIGN_LEADING {
		switch req.Alignment {
		case pb.TextAlignment_TEXT_ALIGN_CENTER:
			payload["alignment"] = "center"
		case pb.TextAlignment_TEXT_ALIGN_TRAILING:
			payload["alignment"] = "trailing"
		}
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createCanvasText",
		Payload: payload,
	}

	resp := s.bridge.handleCreateCanvasText(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCanvasRaster creates a canvas raster
func (s *grpcBridgeService) CreateCanvasRaster(ctx context.Context, req *pb.CreateCanvasRasterRequest) (*pb.Response, error) {
	// Convert pixels to base64
	pixelData := base64.StdEncoding.EncodeToString(req.Pixels)

	msg := Message{
		ID:   req.WidgetId,
		Type: "createCanvasRaster",
		Payload: map[string]interface{}{
			"id":     req.WidgetId,
			"width":  float64(req.Width),
			"height": float64(req.Height),
			"pixels": pixelData,
		},
	}

	resp := s.bridge.handleCreateCanvasRaster(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCanvasLinearGradient creates a linear gradient
func (s *grpcBridgeService) CreateCanvasLinearGradient(ctx context.Context, req *pb.CreateCanvasLinearGradientRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createCanvasLinearGradient",
		Payload: map[string]interface{}{
			"id":         req.WidgetId,
			"startColor": req.StartColor,
			"endColor":   req.EndColor,
			"angle":      req.Angle,
			"width":      float64(req.Width),
			"height":     float64(req.Height),
		},
	}

	resp := s.bridge.handleCreateCanvasLinearGradient(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCanvasRadialGradient creates a radial gradient
func (s *grpcBridgeService) CreateCanvasRadialGradient(ctx context.Context, req *pb.CreateCanvasRadialGradientRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createCanvasRadialGradient",
		Payload: map[string]interface{}{
			"id":            req.WidgetId,
			"startColor":    req.StartColor,
			"endColor":      req.EndColor,
			"centerOffsetX": req.CenterOffsetX,
			"centerOffsetY": req.CenterOffsetY,
			"width":         float64(req.Width),
			"height":        float64(req.Height),
		},
	}

	resp := s.bridge.handleCreateCanvasRadialGradient(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCanvasArc creates a canvas arc
func (s *grpcBridgeService) CreateCanvasArc(ctx context.Context, req *pb.CreateCanvasArcRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createCanvasArc",
		Payload: map[string]interface{}{
			"id":          req.WidgetId,
			"x":           float64(req.X),
			"y":           float64(req.Y),
			"x2":          float64(req.X2),
			"y2":          float64(req.Y2),
			"startAngle":  req.StartAngle,
			"endAngle":    req.EndAngle,
			"fillColor":   req.FillColor,
			"strokeColor": req.StrokeColor,
			"strokeWidth": float64(req.StrokeWidth),
		},
	}

	resp := s.bridge.handleCreateCanvasArc(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCanvasPolygon creates a canvas polygon
func (s *grpcBridgeService) CreateCanvasPolygon(ctx context.Context, req *pb.CreateCanvasPolygonRequest) (*pb.Response, error) {
	points := make([]interface{}, len(req.Points))
	for i, pt := range req.Points {
		points[i] = map[string]interface{}{
			"x": float64(pt.X),
			"y": float64(pt.Y),
		}
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "createCanvasPolygon",
		Payload: map[string]interface{}{
			"id":          req.WidgetId,
			"points":      points,
			"fillColor":   req.FillColor,
			"strokeColor": req.StrokeColor,
			"strokeWidth": float64(req.StrokeWidth),
		},
	}

	resp := s.bridge.handleCreateCanvasPolygon(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateTappableCanvasRaster creates a tappable canvas raster
func (s *grpcBridgeService) CreateTappableCanvasRaster(ctx context.Context, req *pb.CreateTappableCanvasRasterRequest) (*pb.Response, error) {
	pixelData := base64.StdEncoding.EncodeToString(req.Pixels)

	msg := Message{
		ID:   req.WidgetId,
		Type: "createTappableCanvasRaster",
		Payload: map[string]interface{}{
			"id":                     req.WidgetId,
			"width":                  float64(req.Width),
			"height":                 float64(req.Height),
			"pixels":                 pixelData,
			"onKeyDownCallbackId":    req.OnKeyDownCallbackId,
			"onKeyUpCallbackId":      req.OnKeyUpCallbackId,
			"onScrollCallbackId":     req.OnScrollCallbackId,
			"onMouseMoveCallbackId":  req.OnMouseMoveCallbackId,
			"onDragCallbackId":       req.DragCallbackId,
			"onDragEndCallbackId":    req.DragEndCallbackId,
		},
	}

	resp := s.bridge.handleCreateTappableCanvasRaster(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Canvas updates
// ============================================================================

// UpdateCanvasLine updates a canvas line
func (s *grpcBridgeService) UpdateCanvasLine(ctx context.Context, req *pb.UpdateCanvasLineRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "updateCanvasLine",
		Payload: map[string]interface{}{
			"widgetId":    req.WidgetId,
			"x1":          float64(req.X1),
			"y1":          float64(req.Y1),
			"x2":          float64(req.X2),
			"y2":          float64(req.Y2),
			"strokeColor": req.StrokeColor,
			"strokeWidth": float64(req.StrokeWidth),
		},
	}

	resp := s.bridge.handleUpdateCanvasLine(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateCanvasCircle updates a canvas circle
func (s *grpcBridgeService) UpdateCanvasCircle(ctx context.Context, req *pb.UpdateCanvasCircleRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "updateCanvasCircle",
		Payload: map[string]interface{}{
			"widgetId":    req.WidgetId,
			"x":           float64(req.X),
			"y":           float64(req.Y),
			"x2":          float64(req.X2),
			"y2":          float64(req.Y2),
			"fillColor":   req.FillColor,
			"strokeColor": req.StrokeColor,
			"strokeWidth": float64(req.StrokeWidth),
		},
	}

	resp := s.bridge.handleUpdateCanvasCircle(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateCanvasRectangle updates a canvas rectangle
func (s *grpcBridgeService) UpdateCanvasRectangle(ctx context.Context, req *pb.UpdateCanvasRectangleRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"widgetId":    req.WidgetId,
		"width":       float64(req.Width),
		"height":      float64(req.Height),
		"fillColor":   req.FillColor,
		"strokeColor": req.StrokeColor,
		"strokeWidth": float64(req.StrokeWidth),
	}
	if req.CornerRadius != 0 {
		payload["cornerRadius"] = float64(req.CornerRadius)
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "updateCanvasRectangle",
		Payload: payload,
	}

	resp := s.bridge.handleUpdateCanvasRectangle(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateCanvasText updates canvas text
func (s *grpcBridgeService) UpdateCanvasText(ctx context.Context, req *pb.UpdateCanvasTextRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"widgetId": req.WidgetId,
		"text":     req.Text,
		"color":    req.Color,
	}
	if req.TextSize != 0 {
		payload["textSize"] = float64(req.TextSize)
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "updateCanvasText",
		Payload: payload,
	}

	resp := s.bridge.handleUpdateCanvasText(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateCanvasRaster updates a canvas raster
func (s *grpcBridgeService) UpdateCanvasRaster(ctx context.Context, req *pb.UpdateCanvasRasterRequest) (*pb.Response, error) {
	updates := make([]interface{}, len(req.Updates))
	for i, u := range req.Updates {
		updates[i] = map[string]interface{}{
			"x": float64(u.X),
			"y": float64(u.Y),
			"r": float64(u.R),
			"g": float64(u.G),
			"b": float64(u.B),
			"a": float64(u.A),
		}
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "updateCanvasRaster",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"updates":  updates,
		},
	}

	resp := s.bridge.handleUpdateCanvasRaster(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// FillCanvasRasterRect fills a rectangular region with a solid color
func (s *grpcBridgeService) FillCanvasRasterRect(ctx context.Context, req *pb.FillCanvasRasterRectRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "fillCanvasRasterRect",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"x":        float64(req.X),
			"y":        float64(req.Y),
			"width":    float64(req.Width),
			"height":   float64(req.Height),
			"r":        float64(req.R),
			"g":        float64(req.G),
			"b":        float64(req.B),
			"a":        float64(req.A),
		},
	}

	resp := s.bridge.handleFillCanvasRasterRect(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// BlitToCanvasRaster copies a registered image resource onto the raster
func (s *grpcBridgeService) BlitToCanvasRaster(ctx context.Context, req *pb.BlitToCanvasRasterRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "blitToCanvasRaster",
		Payload: map[string]interface{}{
			"widgetId":     req.WidgetId,
			"resourceName": req.ResourceName,
			"x":            float64(req.X),
			"y":            float64(req.Y),
			"alpha":        float64(req.Alpha),
		},
	}

	resp := s.bridge.handleBlitToCanvasRaster(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateCanvasLinearGradient updates a linear gradient
func (s *grpcBridgeService) UpdateCanvasLinearGradient(ctx context.Context, req *pb.UpdateCanvasLinearGradientRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "updateCanvasLinearGradient",
		Payload: map[string]interface{}{
			"widgetId":   req.WidgetId,
			"startColor": req.StartColor,
			"endColor":   req.EndColor,
			"angle":      req.Angle,
		},
	}

	resp := s.bridge.handleUpdateCanvasLinearGradient(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateCanvasRadialGradient updates a radial gradient
func (s *grpcBridgeService) UpdateCanvasRadialGradient(ctx context.Context, req *pb.UpdateCanvasRadialGradientRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "updateCanvasRadialGradient",
		Payload: map[string]interface{}{
			"widgetId":      req.WidgetId,
			"startColor":    req.StartColor,
			"endColor":      req.EndColor,
			"centerOffsetX": req.CenterOffsetX,
			"centerOffsetY": req.CenterOffsetY,
		},
	}

	resp := s.bridge.handleUpdateCanvasRadialGradient(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateCanvasArc updates a canvas arc
func (s *grpcBridgeService) UpdateCanvasArc(ctx context.Context, req *pb.UpdateCanvasArcRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "updateCanvasArc",
		Payload: map[string]interface{}{
			"widgetId":    req.WidgetId,
			"startAngle":  req.StartAngle,
			"endAngle":    req.EndAngle,
			"fillColor":   req.FillColor,
			"strokeColor": req.StrokeColor,
			"strokeWidth": float64(req.StrokeWidth),
		},
	}

	resp := s.bridge.handleUpdateCanvasArc(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateCanvasPolygon updates a canvas polygon
func (s *grpcBridgeService) UpdateCanvasPolygon(ctx context.Context, req *pb.UpdateCanvasPolygonRequest) (*pb.Response, error) {
	points := make([]interface{}, len(req.Points))
	for i, pt := range req.Points {
		points[i] = map[string]interface{}{
			"x": float64(pt.X),
			"y": float64(pt.Y),
		}
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "updateCanvasPolygon",
		Payload: map[string]interface{}{
			"widgetId":    req.WidgetId,
			"points":      points,
			"fillColor":   req.FillColor,
			"strokeColor": req.StrokeColor,
			"strokeWidth": float64(req.StrokeWidth),
		},
	}

	resp := s.bridge.handleUpdateCanvasPolygon(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateTappableCanvasRaster updates a tappable canvas raster
func (s *grpcBridgeService) UpdateTappableCanvasRaster(ctx context.Context, req *pb.UpdateTappableCanvasRasterRequest) (*pb.Response, error) {
	updates := make([]interface{}, len(req.Updates))
	for i, u := range req.Updates {
		updates[i] = map[string]interface{}{
			"x": float64(u.X),
			"y": float64(u.Y),
			"r": float64(u.R),
			"g": float64(u.G),
			"b": float64(u.B),
			"a": float64(u.A),
		}
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "updateTappableCanvasRaster",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"updates":  updates,
		},
	}

	resp := s.bridge.handleUpdateTappableCanvasRaster(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetTappableCanvasImage sets canvas from PNG image bytes
func (s *grpcBridgeService) SetTappableCanvasImage(ctx context.Context, req *pb.SetTappableCanvasImageRequest) (*pb.Response, error) {
	// Encode raw image bytes to base64 for message handler
	imageB64 := base64.StdEncoding.EncodeToString(req.Image)

	msg := Message{
		ID:   req.WidgetId,
		Type: "setTappableCanvasImage",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"image":    imageB64,
		},
	}

	resp := s.bridge.handleSetTappableCanvasImage(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetTappableCanvasRect sets a rectangular region of pixels
func (s *grpcBridgeService) SetTappableCanvasRect(ctx context.Context, req *pb.SetTappableCanvasRectRequest) (*pb.Response, error) {
	// Encode raw pixel bytes to base64 for message handler
	bufferB64 := base64.StdEncoding.EncodeToString(req.Buffer)

	msg := Message{
		ID:   req.WidgetId,
		Type: "setTappableCanvasRect",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"x":        int(req.X),
			"y":        int(req.Y),
			"width":    int(req.Width),
			"height":   int(req.Height),
			"buffer":   bufferB64,
		},
	}

	resp := s.bridge.handleSetTappableCanvasRect(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Desktop widgets
// ============================================================================

// CreateDesktopCanvas creates a desktop canvas widget
func (s *grpcBridgeService) CreateDesktopCanvas(ctx context.Context, req *pb.CreateDesktopCanvasRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createDesktopCanvas",
		Payload: map[string]interface{}{
			"id":      req.WidgetId,
			"bgColor": req.BgColor,
		},
	}

	resp := s.bridge.handleCreateDesktopCanvas(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateDesktopIcon creates a desktop icon
func (s *grpcBridgeService) CreateDesktopIcon(ctx context.Context, req *pb.CreateDesktopIconRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createDesktopIcon",
		Payload: map[string]interface{}{
			"id":                       req.WidgetId,
			"desktopId":                req.DesktopId,
			"label":                    req.Label,
			"x":                        float64(req.X),
			"y":                        float64(req.Y),
			"color":                    req.Color,
			"resource":                 req.ResourceName,
			"onClickCallbackId":        req.OnClickCallbackId,
			"onDblClickCallbackId":     req.OnDblClickCallbackId,
			"onDragCallbackId":         req.DragCallbackId,
			"onDragEndCallbackId":      req.DragEndCallbackId,
			"onRightClickCallbackId":   req.OnRightClickCallbackId,
			"onDropReceivedCallbackId": req.OnDropReceivedCallbackId,
		},
	}

	resp := s.bridge.handleCreateDesktopIcon(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// MoveDesktopIcon moves a desktop icon
func (s *grpcBridgeService) MoveDesktopIcon(ctx context.Context, req *pb.MoveDesktopIconRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.IconId,
		Type: "moveDesktopIcon",
		Payload: map[string]interface{}{
			"iconId": req.IconId,
			"x":      float64(req.X),
			"y":      float64(req.Y),
		},
	}

	resp := s.bridge.handleMoveDesktopIcon(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateDesktopIconLabel updates a desktop icon's label
func (s *grpcBridgeService) UpdateDesktopIconLabel(ctx context.Context, req *pb.UpdateDesktopIconLabelRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.IconId,
		Type: "updateDesktopIconLabel",
		Payload: map[string]interface{}{
			"iconId": req.IconId,
			"label":  req.Label,
		},
	}

	resp := s.bridge.handleUpdateDesktopIconLabel(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UpdateDesktopIconColor updates a desktop icon's color
func (s *grpcBridgeService) UpdateDesktopIconColor(ctx context.Context, req *pb.UpdateDesktopIconColorRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.IconId,
		Type: "updateDesktopIconColor",
		Payload: map[string]interface{}{
			"iconId": req.IconId,
			"color":  req.Color,
		},
	}

	resp := s.bridge.handleUpdateDesktopIconColor(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Sprite System - Efficient dirty-rectangle based animation
// ============================================================================

// SaveRasterBackground saves the current raster contents as static background
func (s *grpcBridgeService) SaveRasterBackground(ctx context.Context, req *pb.SaveRasterBackgroundRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "saveRasterBackground",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleSaveRasterBackground(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateRasterSprite creates a new sprite on a CanvasRaster
func (s *grpcBridgeService) CreateRasterSprite(ctx context.Context, req *pb.CreateRasterSpriteRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createRasterSprite",
		Payload: map[string]interface{}{
			"widgetId":     req.WidgetId,
			"name":         req.Name,
			"resourceName": req.ResourceName,
			"x":            float64(req.X),
			"y":            float64(req.Y),
			"zIndex":       float64(req.ZIndex),
			"visible":      req.Visible,
		},
	}

	resp := s.bridge.handleCreateRasterSprite(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// MoveRasterSprite moves a sprite to a new position
func (s *grpcBridgeService) MoveRasterSprite(ctx context.Context, req *pb.MoveRasterSpriteRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "moveRasterSprite",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"name":     req.Name,
			"x":        float64(req.X),
			"y":        float64(req.Y),
		},
	}

	resp := s.bridge.handleMoveRasterSprite(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetRasterSpriteResource changes a sprite's image
func (s *grpcBridgeService) SetRasterSpriteResource(ctx context.Context, req *pb.SetRasterSpriteResourceRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setRasterSpriteResource",
		Payload: map[string]interface{}{
			"widgetId":     req.WidgetId,
			"name":         req.Name,
			"resourceName": req.ResourceName,
		},
	}

	resp := s.bridge.handleSetRasterSpriteResource(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetRasterSpriteVisible shows or hides a sprite
func (s *grpcBridgeService) SetRasterSpriteVisible(ctx context.Context, req *pb.SetRasterSpriteVisibleRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setRasterSpriteVisible",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"name":     req.Name,
			"visible":  req.Visible,
		},
	}

	resp := s.bridge.handleSetRasterSpriteVisible(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetRasterSpriteZIndex changes a sprite's z-index
func (s *grpcBridgeService) SetRasterSpriteZIndex(ctx context.Context, req *pb.SetRasterSpriteZIndexRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setRasterSpriteZIndex",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"name":     req.Name,
			"zIndex":   float64(req.ZIndex),
		},
	}

	resp := s.bridge.handleSetRasterSpriteZIndex(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// RemoveRasterSprite removes a sprite
func (s *grpcBridgeService) RemoveRasterSprite(ctx context.Context, req *pb.RemoveRasterSpriteRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "removeRasterSprite",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"name":     req.Name,
		},
	}

	resp := s.bridge.handleRemoveRasterSprite(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// FlushRasterSprites redraws only dirty regions
func (s *grpcBridgeService) FlushRasterSprites(ctx context.Context, req *pb.FlushRasterSpritesRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "flushRasterSprites",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleFlushRasterSprites(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}
