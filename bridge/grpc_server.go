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

// ============================================================================
// Container creation methods
// ============================================================================

// CreateScroll creates a scroll container
func (s *grpcBridgeService) CreateScroll(ctx context.Context, req *pb.CreateScrollRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createScroll",
		Payload: map[string]interface{}{
			"id":        req.WidgetId,
			"contentId": req.ContentId,
		},
	}

	resp := s.bridge.handleCreateScroll(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateGrid creates a grid container
func (s *grpcBridgeService) CreateGrid(ctx context.Context, req *pb.CreateGridRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":      req.WidgetId,
		"columns": float64(req.Columns),
	}

	if len(req.Children) > 0 {
		children := make([]interface{}, len(req.Children))
		for i, c := range req.Children {
			children[i] = c
		}
		payload["children"] = children
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createGrid",
		Payload: payload,
	}

	resp := s.bridge.handleCreateGrid(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCenter creates a center container
func (s *grpcBridgeService) CreateCenter(ctx context.Context, req *pb.CreateCenterRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createCenter",
		Payload: map[string]interface{}{
			"id":      req.WidgetId,
			"childId": req.ChildId,
		},
	}

	resp := s.bridge.handleCreateCenter(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateClip creates a clip container
func (s *grpcBridgeService) CreateClip(ctx context.Context, req *pb.CreateClipRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createClip",
		Payload: map[string]interface{}{
			"id":      req.WidgetId,
			"childId": req.ChildId,
		},
	}

	resp := s.bridge.handleCreateClip(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateMax creates a max container
func (s *grpcBridgeService) CreateMax(ctx context.Context, req *pb.CreateMaxRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id": req.WidgetId,
	}

	if len(req.ChildIds) > 0 {
		childIds := make([]interface{}, len(req.ChildIds))
		for i, c := range req.ChildIds {
			childIds[i] = c
		}
		payload["childIds"] = childIds
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createMax",
		Payload: payload,
	}

	resp := s.bridge.handleCreateMax(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateStack creates a stack container
func (s *grpcBridgeService) CreateStack(ctx context.Context, req *pb.CreateStackRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id": req.WidgetId,
	}

	if len(req.ChildIds) > 0 {
		childIds := make([]interface{}, len(req.ChildIds))
		for i, c := range req.ChildIds {
			childIds[i] = c
		}
		payload["childIds"] = childIds
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createStack",
		Payload: payload,
	}

	resp := s.bridge.handleCreateStack(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateCard creates a card widget
func (s *grpcBridgeService) CreateCard(ctx context.Context, req *pb.CreateCardRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":        req.WidgetId,
		"title":     req.Title,
		"contentId": req.ContentId,
	}

	if req.Subtitle != "" {
		payload["subtitle"] = req.Subtitle
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createCard",
		Payload: payload,
	}

	resp := s.bridge.handleCreateCard(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateAccordion creates an accordion widget
func (s *grpcBridgeService) CreateAccordion(ctx context.Context, req *pb.CreateAccordionRequest) (*pb.Response, error) {
	items := make([]interface{}, len(req.Items))
	for i, item := range req.Items {
		items[i] = map[string]interface{}{
			"title":     item.Title,
			"contentId": item.ContentId,
		}
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "createAccordion",
		Payload: map[string]interface{}{
			"id":    req.WidgetId,
			"items": items,
		},
	}

	resp := s.bridge.handleCreateAccordion(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateForm creates a form widget
func (s *grpcBridgeService) CreateForm(ctx context.Context, req *pb.CreateFormRequest) (*pb.Response, error) {
	items := make([]interface{}, len(req.Items))
	for i, item := range req.Items {
		items[i] = map[string]interface{}{
			"label":    item.Label,
			"widgetId": item.WidgetId,
		}
	}

	payload := map[string]interface{}{
		"id":    req.WidgetId,
		"items": items,
	}

	if req.SubmitCallbackId != "" {
		payload["submitCallbackId"] = req.SubmitCallbackId
	}
	if req.CancelCallbackId != "" {
		payload["cancelCallbackId"] = req.CancelCallbackId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createForm",
		Payload: payload,
	}

	resp := s.bridge.handleCreateForm(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateBorder creates a border container
func (s *grpcBridgeService) CreateBorder(ctx context.Context, req *pb.CreateBorderRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id": req.WidgetId,
	}

	if req.TopId != "" {
		payload["topId"] = req.TopId
	}
	if req.BottomId != "" {
		payload["bottomId"] = req.BottomId
	}
	if req.LeftId != "" {
		payload["leftId"] = req.LeftId
	}
	if req.RightId != "" {
		payload["rightId"] = req.RightId
	}
	if req.CenterId != "" {
		payload["centerId"] = req.CenterId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createBorder",
		Payload: payload,
	}

	resp := s.bridge.handleCreateBorder(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateGridWrap creates a grid wrap container
func (s *grpcBridgeService) CreateGridWrap(ctx context.Context, req *pb.CreateGridWrapRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":         req.WidgetId,
		"itemWidth":  float64(req.ItemWidth),
		"itemHeight": float64(req.ItemHeight),
	}

	if len(req.Children) > 0 {
		children := make([]interface{}, len(req.Children))
		for i, c := range req.Children {
			children[i] = c
		}
		payload["children"] = children
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createGridWrap",
		Payload: payload,
	}

	resp := s.bridge.handleCreateGridWrap(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateAdaptiveGrid creates an adaptive grid container
func (s *grpcBridgeService) CreateAdaptiveGrid(ctx context.Context, req *pb.CreateAdaptiveGridRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":      req.WidgetId,
		"rowcols": float64(req.Rowcols),
	}

	if len(req.Children) > 0 {
		children := make([]interface{}, len(req.Children))
		for i, c := range req.Children {
			children[i] = c
		}
		payload["children"] = children
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createAdaptiveGrid",
		Payload: payload,
	}

	resp := s.bridge.handleCreateAdaptiveGrid(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreatePadded creates a padded container
func (s *grpcBridgeService) CreatePadded(ctx context.Context, req *pb.CreatePaddedRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createPadded",
		Payload: map[string]interface{}{
			"id":      req.WidgetId,
			"childId": req.ChildId,
		},
	}

	resp := s.bridge.handleCreatePadded(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateSplit creates a split container
func (s *grpcBridgeService) CreateSplit(ctx context.Context, req *pb.CreateSplitRequest) (*pb.Response, error) {
	orientation := "vertical"
	if req.Orientation == pb.SplitOrientation_SPLIT_HORIZONTAL {
		orientation = "horizontal"
	}

	payload := map[string]interface{}{
		"id":          req.WidgetId,
		"orientation": orientation,
		"leadingId":   req.LeadingId,
		"trailingId":  req.TrailingId,
	}

	if req.Offset != 0 {
		payload["offset"] = float64(req.Offset)
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createSplit",
		Payload: payload,
	}

	resp := s.bridge.handleCreateSplit(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateTabs creates a tabs container
func (s *grpcBridgeService) CreateTabs(ctx context.Context, req *pb.CreateTabsRequest) (*pb.Response, error) {
	tabs := make([]interface{}, len(req.Tabs))
	for i, tab := range req.Tabs {
		tabs[i] = map[string]interface{}{
			"title":     tab.Title,
			"contentId": tab.ContentId,
		}
	}

	payload := map[string]interface{}{
		"id":   req.WidgetId,
		"tabs": tabs,
	}

	// Convert location enum to string
	switch req.Location {
	case pb.TabLocation_TAB_LOCATION_BOTTOM:
		payload["location"] = "bottom"
	case pb.TabLocation_TAB_LOCATION_LEADING:
		payload["location"] = "leading"
	case pb.TabLocation_TAB_LOCATION_TRAILING:
		payload["location"] = "trailing"
	// TAB_LOCATION_TOP is default, no need to set
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createTabs",
		Payload: payload,
	}

	resp := s.bridge.handleCreateTabs(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateDocTabs creates a doc tabs container
func (s *grpcBridgeService) CreateDocTabs(ctx context.Context, req *pb.CreateDocTabsRequest) (*pb.Response, error) {
	tabs := make([]interface{}, len(req.Tabs))
	for i, tab := range req.Tabs {
		tabs[i] = map[string]interface{}{
			"title":     tab.Title,
			"contentId": tab.ContentId,
		}
	}

	payload := map[string]interface{}{
		"id":   req.WidgetId,
		"tabs": tabs,
	}

	if req.CloseCallbackId != "" {
		payload["closeCallbackId"] = req.CloseCallbackId
	}

	// Convert location enum to string
	switch req.Location {
	case pb.TabLocation_TAB_LOCATION_BOTTOM:
		payload["location"] = "bottom"
	case pb.TabLocation_TAB_LOCATION_LEADING:
		payload["location"] = "leading"
	case pb.TabLocation_TAB_LOCATION_TRAILING:
		payload["location"] = "trailing"
	// TAB_LOCATION_TOP is default, no need to set
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createDocTabs",
		Payload: payload,
	}

	resp := s.bridge.handleCreateDocTabs(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateThemeOverride creates a theme override container
func (s *grpcBridgeService) CreateThemeOverride(ctx context.Context, req *pb.CreateThemeOverrideRequest) (*pb.Response, error) {
	variant := "light"
	if req.Variant == pb.ThemeVariant_THEME_DARK {
		variant = "dark"
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "createThemeOverride",
		Payload: map[string]interface{}{
			"id":      req.WidgetId,
			"childId": req.ChildId,
			"variant": variant,
		},
	}

	resp := s.bridge.handleCreateThemeOverride(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateInnerWindow creates an inner window widget
func (s *grpcBridgeService) CreateInnerWindow(ctx context.Context, req *pb.CreateInnerWindowRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":        req.WidgetId,
		"title":     req.Title,
		"contentId": req.ContentId,
	}

	if req.OnCloseCallbackId != "" {
		payload["onCloseCallbackId"] = req.OnCloseCallbackId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createInnerWindow",
		Payload: payload,
	}

	resp := s.bridge.handleCreateInnerWindow(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateNavigation creates a navigation container
func (s *grpcBridgeService) CreateNavigation(ctx context.Context, req *pb.CreateNavigationRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":     req.WidgetId,
		"rootId": req.RootId,
	}

	if req.Title != "" {
		payload["title"] = req.Title
	}
	if req.OnBackCallbackId != "" {
		payload["onBackCallbackId"] = req.OnBackCallbackId
	}
	if req.OnForwardCallbackId != "" {
		payload["onForwardCallbackId"] = req.OnForwardCallbackId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createNavigation",
		Payload: payload,
	}

	resp := s.bridge.handleCreateNavigation(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreatePopup creates a popup widget
func (s *grpcBridgeService) CreatePopup(ctx context.Context, req *pb.CreatePopupRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "createPopup",
		Payload: map[string]interface{}{
			"id":        req.WidgetId,
			"contentId": req.ContentId,
			"windowId":  req.WindowId,
		},
	}

	resp := s.bridge.handleCreatePopup(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateMultipleWindows creates a multiple windows container
func (s *grpcBridgeService) CreateMultipleWindows(ctx context.Context, req *pb.CreateMultipleWindowsRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id": req.WidgetId,
	}

	if len(req.Children) > 0 {
		children := make([]interface{}, len(req.Children))
		for i, c := range req.Children {
			children[i] = c
		}
		payload["children"] = children
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createMultipleWindows",
		Payload: payload,
	}

	resp := s.bridge.handleCreateMultipleWindows(msg)

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
