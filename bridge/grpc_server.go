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

// ============================================================================
// Additional Window operations
// ============================================================================

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

// ============================================================================
// Data widget creation
// ============================================================================

// CreateTable creates a table widget
func (s *grpcBridgeService) CreateTable(ctx context.Context, req *pb.CreateTableRequest) (*pb.Response, error) {
	// Convert headers
	headers := make([]interface{}, len(req.Headers))
	for i, h := range req.Headers {
		headers[i] = h
	}

	// Convert data ([]TableRow -> [][]interface{})
	data := make([]interface{}, len(req.Data))
	for i, row := range req.Data {
		rowData := make([]interface{}, len(row.Cells))
		for j, cell := range row.Cells {
			rowData[j] = cell
		}
		data[i] = rowData
	}

	payload := map[string]interface{}{
		"id":      req.WidgetId,
		"headers": headers,
		"data":    data,
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createTable",
		Payload: payload,
	}

	resp := s.bridge.handleCreateTable(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateTree creates a tree widget
func (s *grpcBridgeService) CreateTree(ctx context.Context, req *pb.CreateTreeRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":        req.WidgetId,
		"rootLabel": req.RootLabel,
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createTree",
		Payload: payload,
	}

	resp := s.bridge.handleCreateTree(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateList creates a list widget
func (s *grpcBridgeService) CreateList(ctx context.Context, req *pb.CreateListRequest) (*pb.Response, error) {
	// Convert items to []interface{}
	items := make([]interface{}, len(req.Items))
	for i, item := range req.Items {
		items[i] = item
	}

	payload := map[string]interface{}{
		"id":    req.WidgetId,
		"items": items,
	}

	if req.CallbackId != "" {
		payload["callbackId"] = req.CallbackId
	}
	if req.OnUnselectedCallbackId != "" {
		payload["onUnselectedCallbackId"] = req.OnUnselectedCallbackId
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createList",
		Payload: payload,
	}

	resp := s.bridge.handleCreateList(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateMenu creates a menu widget
func (s *grpcBridgeService) CreateMenu(ctx context.Context, req *pb.CreateMenuRequest) (*pb.Response, error) {
	items := convertMenuItems(req.Items)

	msg := Message{
		ID:   req.WidgetId,
		Type: "createMenu",
		Payload: map[string]interface{}{
			"id":    req.WidgetId,
			"items": items,
		},
	}

	resp := s.bridge.handleCreateMenu(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateToolbar creates a toolbar widget
func (s *grpcBridgeService) CreateToolbar(ctx context.Context, req *pb.CreateToolbarRequest) (*pb.Response, error) {
	items := make([]interface{}, len(req.Items))
	for i, item := range req.Items {
		itemMap := map[string]interface{}{}
		if item.Label != "" {
			itemMap["label"] = item.Label
		}
		if item.IconResource != "" {
			itemMap["iconResource"] = item.IconResource
		}
		if item.CallbackId != "" {
			itemMap["callbackId"] = item.CallbackId
		}
		if item.IsSeparator {
			itemMap["isSeparator"] = true
		}
		if item.IsSpacer {
			itemMap["isSpacer"] = true
		}
		items[i] = itemMap
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "createToolbar",
		Payload: map[string]interface{}{
			"id":    req.WidgetId,
			"items": items,
		},
	}

	resp := s.bridge.handleCreateToolbar(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// CreateTextGrid creates a text grid widget
func (s *grpcBridgeService) CreateTextGrid(ctx context.Context, req *pb.CreateTextGridRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"id":   req.WidgetId,
		"text": req.Text,
	}

	if req.ShowLineNumbers {
		payload["showLineNumbers"] = true
	}
	if req.ShowWhitespace {
		payload["showWhitespace"] = true
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "createTextGrid",
		Payload: payload,
	}

	resp := s.bridge.handleCreateTextGrid(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// Helper function to convert menu items
func convertMenuItems(items []*pb.MenuItem) []interface{} {
	result := make([]interface{}, len(items))
	for i, item := range items {
		itemMap := map[string]interface{}{
			"label": item.Label,
		}
		if item.CallbackId != "" {
			itemMap["callbackId"] = item.CallbackId
		}
		if item.IsSeparator {
			itemMap["isSeparator"] = true
		}
		if item.Disabled {
			itemMap["disabled"] = true
		}
		if item.Checked {
			itemMap["checked"] = true
		}
		if len(item.Children) > 0 {
			itemMap["children"] = convertMenuItems(item.Children)
		}
		result[i] = itemMap
	}
	return result
}

func convertMainMenuItems(items []*pb.MainMenuItem) []interface{} {
	result := make([]interface{}, len(items))
	for i, item := range items {
		itemMap := map[string]interface{}{
			"label": item.Label,
		}
		if len(item.Items) > 0 {
			itemMap["items"] = convertMenuItems(item.Items)
		}
		result[i] = itemMap
	}
	return result
}

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
			"id":     req.WidgetId,
			"width":  float64(req.Width),
			"height": float64(req.Height),
			"pixels": pixelData,
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

// ============================================================================
// Widget updates (additional)
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
		if v, ok := resp.Result["value"].(float64); ok {
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
		if v, ok := resp.Result["year"].(float64); ok {
			year = int32(v)
		}
		if v, ok := resp.Result["month"].(float64); ok {
			month = int32(v)
		}
		if v, ok := resp.Result["day"].(float64); ok {
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

// ============================================================================
// Widget state
// ============================================================================

// ShowWidget shows a widget
func (s *grpcBridgeService) ShowWidget(ctx context.Context, req *pb.ShowWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "showWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleShowWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// HideWidget hides a widget
func (s *grpcBridgeService) HideWidget(ctx context.Context, req *pb.HideWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "hideWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleHideWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// EnableWidget enables a widget
func (s *grpcBridgeService) EnableWidget(ctx context.Context, req *pb.EnableWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "enableWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleEnableWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// DisableWidget disables a widget
func (s *grpcBridgeService) DisableWidget(ctx context.Context, req *pb.DisableWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "disableWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleDisableWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// IsEnabled checks if widget is enabled
func (s *grpcBridgeService) IsEnabled(ctx context.Context, req *pb.IsEnabledRequest) (*pb.IsEnabledResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "isEnabled",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleIsEnabled(msg)

	enabled := false
	if resp.Result != nil {
		if v, ok := resp.Result["enabled"].(bool); ok {
			enabled = v
		}
	}

	return &pb.IsEnabledResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Enabled: enabled,
	}, nil
}

// ClearWidgets clears all widgets
func (s *grpcBridgeService) ClearWidgets(ctx context.Context, req *pb.ClearWidgetsRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "clearWidgets",
		Type: "clearWidgets",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleClearWidgets(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// StartActivity starts an activity indicator
func (s *grpcBridgeService) StartActivity(ctx context.Context, req *pb.StartActivityRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "startActivity",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleStartActivity(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// StopActivity stops an activity indicator
func (s *grpcBridgeService) StopActivity(ctx context.Context, req *pb.StopActivityRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "stopActivity",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleStopActivity(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// StartProgressInfinite starts infinite progress
func (s *grpcBridgeService) StartProgressInfinite(ctx context.Context, req *pb.StartProgressInfiniteRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "startProgressInfinite",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleStartProgressInfinite(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// StopProgressInfinite stops infinite progress
func (s *grpcBridgeService) StopProgressInfinite(ctx context.Context, req *pb.StopProgressInfiniteRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "stopProgressInfinite",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleStopProgressInfinite(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// IsProgressRunning checks if progress is running
func (s *grpcBridgeService) IsProgressRunning(ctx context.Context, req *pb.IsProgressRunningRequest) (*pb.IsProgressRunningResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "isProgressRunning",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleIsProgressRunning(msg)

	running := false
	if resp.Result != nil {
		if v, ok := resp.Result["running"].(bool); ok {
			running = v
		}
	}

	return &pb.IsProgressRunningResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Running: running,
	}, nil
}

// ============================================================================
// Container operations
// ============================================================================

// ContainerAdd adds a widget to a container
func (s *grpcBridgeService) ContainerAdd(ctx context.Context, req *pb.ContainerAddRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.ContainerId,
		Type: "containerAdd",
		Payload: map[string]interface{}{
			"containerId": req.ContainerId,
			"widgetId":    req.WidgetId,
		},
	}

	resp := s.bridge.handleContainerAdd(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ContainerRemoveAll removes all widgets from a container
func (s *grpcBridgeService) ContainerRemoveAll(ctx context.Context, req *pb.ContainerRemoveAllRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.ContainerId,
		Type: "containerRemoveAll",
		Payload: map[string]interface{}{
			"containerId": req.ContainerId,
		},
	}

	resp := s.bridge.handleContainerRemoveAll(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ContainerRefresh refreshes a container
func (s *grpcBridgeService) ContainerRefresh(ctx context.Context, req *pb.ContainerRefreshRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.ContainerId,
		Type: "containerRefresh",
		Payload: map[string]interface{}{
			"containerId": req.ContainerId,
		},
	}

	resp := s.bridge.handleContainerRefresh(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetContainerObjects gets container child widget IDs
func (s *grpcBridgeService) GetContainerObjects(ctx context.Context, req *pb.GetContainerObjectsRequest) (*pb.GetContainerObjectsResponse, error) {
	msg := Message{
		ID:   req.ContainerId,
		Type: "getContainerObjects",
		Payload: map[string]interface{}{
			"containerId": req.ContainerId,
		},
	}

	resp := s.bridge.handleGetContainerObjects(msg)

	var widgetIds []string
	if resp.Result != nil {
		if v, ok := resp.Result["widgetIds"].([]interface{}); ok {
			for _, item := range v {
				if s, ok := item.(string); ok {
					widgetIds = append(widgetIds, s)
				}
			}
		}
	}

	return &pb.GetContainerObjectsResponse{
		Success:   resp.Success,
		Error:     resp.Error,
		WidgetIds: widgetIds,
	}, nil
}

// DocTabsAppend appends a tab to doc tabs
func (s *grpcBridgeService) DocTabsAppend(ctx context.Context, req *pb.DocTabsAppendRequest) (*pb.Response, error) {
	tab := map[string]interface{}{
		"title":     req.Tab.Title,
		"contentId": req.Tab.ContentId,
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "docTabsAppend",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"tab":      tab,
		},
	}

	resp := s.bridge.handleDocTabsAppend(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// DocTabsRemove removes a tab from doc tabs
func (s *grpcBridgeService) DocTabsRemove(ctx context.Context, req *pb.DocTabsRemoveRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "docTabsRemove",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"index":    float64(req.Index),
		},
	}

	resp := s.bridge.handleDocTabsRemove(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// DocTabsSelect selects a tab in doc tabs
func (s *grpcBridgeService) DocTabsSelect(ctx context.Context, req *pb.DocTabsSelectRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "docTabsSelect",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"index":    float64(req.Index),
		},
	}

	resp := s.bridge.handleDocTabsSelect(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// MultipleWindowsAddWindow adds a window to multiple windows container
func (s *grpcBridgeService) MultipleWindowsAddWindow(ctx context.Context, req *pb.MultipleWindowsAddWindowRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "multipleWindowsAddWindow",
		Payload: map[string]interface{}{
			"widgetId":       req.WidgetId,
			"windowWidgetId": req.WindowWidgetId,
		},
	}

	resp := s.bridge.handleMultipleWindowsAddWindow(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// MultipleWindowsRemoveWindow removes a window from multiple windows container
func (s *grpcBridgeService) MultipleWindowsRemoveWindow(ctx context.Context, req *pb.MultipleWindowsRemoveWindowRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "multipleWindowsRemoveWindow",
		Payload: map[string]interface{}{
			"widgetId":       req.WidgetId,
			"windowWidgetId": req.WindowWidgetId,
		},
	}

	resp := s.bridge.handleMultipleWindowsRemoveWindow(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Popup and Navigation
// ============================================================================

// ShowPopup shows a popup
func (s *grpcBridgeService) ShowPopup(ctx context.Context, req *pb.ShowPopupRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "showPopup",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleShowPopup(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// HidePopup hides a popup
func (s *grpcBridgeService) HidePopup(ctx context.Context, req *pb.HidePopupRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "hidePopup",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleHidePopup(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// MovePopup moves a popup
func (s *grpcBridgeService) MovePopup(ctx context.Context, req *pb.MovePopupRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "movePopup",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"x":        float64(req.X),
			"y":        float64(req.Y),
		},
	}

	resp := s.bridge.handleMovePopup(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// NavigationPush pushes content to navigation
func (s *grpcBridgeService) NavigationPush(ctx context.Context, req *pb.NavigationPushRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "navigationPush",
		Payload: map[string]interface{}{
			"widgetId":  req.WidgetId,
			"contentId": req.ContentId,
		},
	}

	resp := s.bridge.handleNavigationPush(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// NavigationBack navigates back
func (s *grpcBridgeService) NavigationBack(ctx context.Context, req *pb.NavigationBackRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "navigationBack",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleNavigationBack(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// NavigationForward navigates forward
func (s *grpcBridgeService) NavigationForward(ctx context.Context, req *pb.NavigationForwardRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "navigationForward",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleNavigationForward(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// NavigationSetTitle sets navigation title
func (s *grpcBridgeService) NavigationSetTitle(ctx context.Context, req *pb.NavigationSetTitleRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "navigationSetTitle",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"title":    req.Title,
		},
	}

	resp := s.bridge.handleNavigationSetTitle(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// InnerWindowClose closes an inner window
func (s *grpcBridgeService) InnerWindowClose(ctx context.Context, req *pb.InnerWindowCloseRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "innerWindowClose",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleInnerWindowClose(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetInnerWindowTitle sets inner window title
func (s *grpcBridgeService) SetInnerWindowTitle(ctx context.Context, req *pb.SetInnerWindowTitleRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setInnerWindowTitle",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"title":    req.Title,
		},
	}

	resp := s.bridge.handleSetInnerWindowTitle(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

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

// ============================================================================
// Data widget operations
// ============================================================================

// GetTableData gets table data
func (s *grpcBridgeService) GetTableData(ctx context.Context, req *pb.GetTableDataRequest) (*pb.GetTableDataResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getTableData",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetTableData(msg)

	// Extract table data from response
	var rows int32
	var columns int32
	if resp.Result != nil {
		if v, ok := resp.Result["rows"].(float64); ok {
			rows = int32(v)
		}
		if v, ok := resp.Result["columns"].(float64); ok {
			columns = int32(v)
		}
	}

	return &pb.GetTableDataResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Rows:    rows,
		Columns: columns,
	}, nil
}

// UpdateTableData updates table data
func (s *grpcBridgeService) UpdateTableData(ctx context.Context, req *pb.UpdateTableDataRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "updateTableData",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"rows":     float64(req.Rows),
			"columns":  float64(req.Columns),
		},
	}

	resp := s.bridge.handleUpdateTableData(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetListData gets list data
func (s *grpcBridgeService) GetListData(ctx context.Context, req *pb.GetListDataRequest) (*pb.GetListDataResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getListData",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetListData(msg)

	var length int32
	if resp.Result != nil {
		if v, ok := resp.Result["length"].(float64); ok {
			length = int32(v)
		}
	}

	return &pb.GetListDataResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Length:  length,
	}, nil
}

// UpdateListData updates list data
func (s *grpcBridgeService) UpdateListData(ctx context.Context, req *pb.UpdateListDataRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "updateListData",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"length":   float64(req.Length),
		},
	}

	resp := s.bridge.handleUpdateListData(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// UnselectAllList unselects all list items
func (s *grpcBridgeService) UnselectAllList(ctx context.Context, req *pb.UnselectAllListRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "unselectAllList",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleUnselectAllList(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetTextGridText gets text grid text
func (s *grpcBridgeService) GetTextGridText(ctx context.Context, req *pb.GetTextGridTextRequest) (*pb.GetTextGridTextResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getTextGridText",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetTextGridText(msg)

	text := ""
	if resp.Result != nil {
		if v, ok := resp.Result["text"].(string); ok {
			text = v
		}
	}

	return &pb.GetTextGridTextResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Text:    text,
	}, nil
}

// SetTextGridText sets text grid text
func (s *grpcBridgeService) SetTextGridText(ctx context.Context, req *pb.SetTextGridTextRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setTextGridText",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"text":     req.Text,
		},
	}

	resp := s.bridge.handleSetTextGridText(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetTextGridCell sets a text grid cell
func (s *grpcBridgeService) SetTextGridCell(ctx context.Context, req *pb.SetTextGridCellRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setTextGridCell",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"row":      float64(req.Row),
			"col":      float64(req.Col),
			"char":     req.Text,
		},
	}

	resp := s.bridge.handleSetTextGridCell(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetTextGridRow sets a text grid row
func (s *grpcBridgeService) SetTextGridRow(ctx context.Context, req *pb.SetTextGridRowRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setTextGridRow",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"row":      float64(req.Row),
			"text":     req.Text,
		},
	}

	resp := s.bridge.handleSetTextGridRow(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetTextGridStyle sets text grid style
func (s *grpcBridgeService) SetTextGridStyle(ctx context.Context, req *pb.SetTextGridStyleRequest) (*pb.Response, error) {
	styleData := map[string]interface{}{}
	if req.Style != nil {
		styleData["fgColor"] = req.Style.Foreground
		styleData["bgColor"] = req.Style.Background
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "setTextGridStyle",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"row":      float64(req.Row),
			"col":      float64(req.Col),
			"style":    styleData,
		},
	}

	resp := s.bridge.handleSetTextGridStyle(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetTextGridStyleRange sets text grid style for a range
func (s *grpcBridgeService) SetTextGridStyleRange(ctx context.Context, req *pb.SetTextGridStyleRangeRequest) (*pb.Response, error) {
	styleData := map[string]interface{}{}
	if req.Style != nil {
		styleData["fgColor"] = req.Style.Foreground
		styleData["bgColor"] = req.Style.Background
	}

	msg := Message{
		ID:   req.WidgetId,
		Type: "setTextGridStyleRange",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"startRow": float64(req.StartRow),
			"startCol": float64(req.StartCol),
			"endRow":   float64(req.EndRow),
			"endCol":   float64(req.EndCol),
			"style":    styleData,
		},
	}

	resp := s.bridge.handleSetTextGridStyleRange(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetToolbarItems gets toolbar items
func (s *grpcBridgeService) GetToolbarItems(ctx context.Context, req *pb.GetToolbarItemsRequest) (*pb.GetToolbarItemsResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getToolbarItems",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetToolbarItems(msg)

	var labels []string
	if resp.Result != nil {
		if v, ok := resp.Result["labels"].([]interface{}); ok {
			for _, label := range v {
				if s, ok := label.(string); ok {
					labels = append(labels, s)
				}
			}
		}
	}

	return &pb.GetToolbarItemsResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Labels:  labels,
	}, nil
}

// ClickToolbarAction clicks a toolbar action
func (s *grpcBridgeService) ClickToolbarAction(ctx context.Context, req *pb.ClickToolbarActionRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.CustomId,
		Type: "clickToolbarAction",
		Payload: map[string]interface{}{
			"customId": req.CustomId,
		},
	}

	resp := s.bridge.handleClickToolbarAction(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Theme and styling
// ============================================================================

// SetTheme sets the theme
func (s *grpcBridgeService) SetTheme(ctx context.Context, req *pb.SetThemeRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "setTheme",
		Type: "setTheme",
		Payload: map[string]interface{}{
			"theme": req.Theme,
		},
	}

	resp := s.bridge.handleSetTheme(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetTheme gets the current theme
func (s *grpcBridgeService) GetTheme(ctx context.Context, req *pb.GetThemeRequest) (*pb.GetThemeResponse, error) {
	msg := Message{
		ID:      "getTheme",
		Type:    "getTheme",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleGetTheme(msg)

	theme := ""
	if resp.Result != nil {
		if v, ok := resp.Result["theme"].(string); ok {
			theme = v
		}
	}

	return &pb.GetThemeResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Theme:   theme,
	}, nil
}

// SetFontScale sets the font scale
func (s *grpcBridgeService) SetFontScale(ctx context.Context, req *pb.SetFontScaleRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "setFontScale",
		Type: "setFontScale",
		Payload: map[string]interface{}{
			"scale": req.Scale,
		},
	}

	resp := s.bridge.handleSetFontScale(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetCustomTheme sets a custom theme
func (s *grpcBridgeService) SetCustomTheme(ctx context.Context, req *pb.SetCustomThemeRequest) (*pb.Response, error) {
	colors := map[string]interface{}{}
	for k, v := range req.Colors {
		colors[k] = v
	}

	msg := Message{
		ID:   "setCustomTheme",
		Type: "setCustomTheme",
		Payload: map[string]interface{}{
			"colors": colors,
		},
	}

	resp := s.bridge.handleSetCustomTheme(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ClearCustomTheme clears custom theme
func (s *grpcBridgeService) ClearCustomTheme(ctx context.Context, req *pb.ClearCustomThemeRequest) (*pb.Response, error) {
	msg := Message{
		ID:      "clearCustomTheme",
		Type:    "clearCustomTheme",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleClearCustomTheme(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetCustomFont sets a custom font
func (s *grpcBridgeService) SetCustomFont(ctx context.Context, req *pb.SetCustomFontRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "setCustomFont",
		Type: "setCustomFont",
		Payload: map[string]interface{}{
			"path":  req.Path,
			"style": req.Style,
		},
	}

	resp := s.bridge.handleSetCustomFont(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ClearCustomFont clears custom font
func (s *grpcBridgeService) ClearCustomFont(ctx context.Context, req *pb.ClearCustomFontRequest) (*pb.Response, error) {
	msg := Message{
		ID:      "clearCustomFont",
		Type:    "clearCustomFont",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleClearCustomFont(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetAvailableFonts gets available fonts
func (s *grpcBridgeService) GetAvailableFonts(ctx context.Context, req *pb.GetAvailableFontsRequest) (*pb.GetAvailableFontsResponse, error) {
	msg := Message{
		ID:      "getAvailableFonts",
		Type:    "getAvailableFonts",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleGetAvailableFonts(msg)

	var extensions []string
	var styles []string
	if resp.Result != nil {
		if v, ok := resp.Result["extensions"].([]interface{}); ok {
			for _, item := range v {
				if s, ok := item.(string); ok {
					extensions = append(extensions, s)
				}
			}
		}
		if v, ok := resp.Result["styles"].([]interface{}); ok {
			for _, item := range v {
				if s, ok := item.(string); ok {
					styles = append(styles, s)
				}
			}
		}
	}

	return &pb.GetAvailableFontsResponse{
		Success:    resp.Success,
		Error:      resp.Error,
		Extensions: extensions,
		Styles:     styles,
	}, nil
}

// SetWidgetStyle sets widget style
func (s *grpcBridgeService) SetWidgetStyle(ctx context.Context, req *pb.SetWidgetStyleRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"widgetId": req.WidgetId,
	}
	if req.FontStyle != "" {
		payload["fontStyle"] = req.FontStyle
	}
	if req.FontFamily != "" {
		payload["fontFamily"] = req.FontFamily
	}
	if req.TextAlign != "" {
		payload["textAlign"] = req.TextAlign
	}
	if req.FontSize != 0 {
		payload["fontSize"] = float64(req.FontSize)
	}
	if req.BackgroundColor != "" {
		payload["backgroundColor"] = req.BackgroundColor
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "setWidgetStyle",
		Payload: payload,
	}

	resp := s.bridge.handleSetWidgetStyle(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetMainMenu sets the main menu
func (s *grpcBridgeService) SetMainMenu(ctx context.Context, req *pb.SetMainMenuRequest) (*pb.Response, error) {
	items := convertMainMenuItems(req.MenuItems)

	msg := Message{
		ID:   req.WindowId,
		Type: "setMainMenu",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"items":    items,
		},
	}

	resp := s.bridge.handleSetMainMenu(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetWidgetContextMenu sets widget context menu
func (s *grpcBridgeService) SetWidgetContextMenu(ctx context.Context, req *pb.SetWidgetContextMenuRequest) (*pb.Response, error) {
	items := convertMenuItems(req.Items)

	msg := Message{
		ID:   req.WidgetId,
		Type: "setWidgetContextMenu",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"items":    items,
		},
	}

	resp := s.bridge.handleSetWidgetContextMenu(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Platform integration
// ============================================================================

// SetSystemTray sets system tray
func (s *grpcBridgeService) SetSystemTray(ctx context.Context, req *pb.SetSystemTrayRequest) (*pb.Response, error) {
	menuItems := convertMenuItems(req.MenuItems)

	msg := Message{
		ID:   "setSystemTray",
		Type: "setSystemTray",
		Payload: map[string]interface{}{
			"iconPath":  req.IconPath,
			"menuItems": menuItems,
		},
	}

	resp := s.bridge.handleSetSystemTray(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SendNotification sends a notification
func (s *grpcBridgeService) SendNotification(ctx context.Context, req *pb.SendNotificationRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "sendNotification",
		Type: "sendNotification",
		Payload: map[string]interface{}{
			"title":   req.Title,
			"content": req.Content,
		},
	}

	resp := s.bridge.handleSendNotification(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ClipboardGet gets clipboard content
func (s *grpcBridgeService) ClipboardGet(ctx context.Context, req *pb.ClipboardGetRequest) (*pb.ClipboardGetResponse, error) {
	msg := Message{
		ID:      "clipboardGet",
		Type:    "clipboardGet",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleClipboardGet(msg)

	content := ""
	if resp.Result != nil {
		if v, ok := resp.Result["content"].(string); ok {
			content = v
		}
	}

	return &pb.ClipboardGetResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Content: content,
	}, nil
}

// ClipboardSet sets clipboard content
func (s *grpcBridgeService) ClipboardSet(ctx context.Context, req *pb.ClipboardSetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "clipboardSet",
		Type: "clipboardSet",
		Payload: map[string]interface{}{
			"content": req.Content,
		},
	}

	resp := s.bridge.handleClipboardSet(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// PreferencesGet gets a preference
func (s *grpcBridgeService) PreferencesGet(ctx context.Context, req *pb.PreferencesGetRequest) (*pb.PreferencesGetResponse, error) {
	msg := Message{
		ID:   "preferencesGet",
		Type: "preferencesGet",
		Payload: map[string]interface{}{
			"key": req.Key,
		},
	}

	resp := s.bridge.handlePreferencesGet(msg)

	value := ""
	if resp.Result != nil {
		if v, ok := resp.Result["value"].(string); ok {
			value = v
		}
	}

	return &pb.PreferencesGetResponse{
		Success: resp.Success,
		Error:   resp.Error,
		Value:   value,
	}, nil
}

// PreferencesSet sets a preference
func (s *grpcBridgeService) PreferencesSet(ctx context.Context, req *pb.PreferencesSetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "preferencesSet",
		Type: "preferencesSet",
		Payload: map[string]interface{}{
			"key":   req.Key,
			"value": req.Value,
		},
	}

	resp := s.bridge.handlePreferencesSet(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// PreferencesRemove removes a preference
func (s *grpcBridgeService) PreferencesRemove(ctx context.Context, req *pb.PreferencesRemoveRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "preferencesRemove",
		Type: "preferencesRemove",
		Payload: map[string]interface{}{
			"key": req.Key,
		},
	}

	resp := s.bridge.handlePreferencesRemove(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetDraggable sets widget draggable
func (s *grpcBridgeService) SetDraggable(ctx context.Context, req *pb.SetDraggableRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setDraggable",
		Payload: map[string]interface{}{
			"widgetId":             req.WidgetId,
			"dragData":             req.DragData,
			"onDragStartCallbackId": req.OnDragStartCallbackId,
			"onDragEndCallbackId":   req.OnDragEndCallbackId,
		},
	}

	resp := s.bridge.handleSetDraggable(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetDroppable sets widget droppable
func (s *grpcBridgeService) SetDroppable(ctx context.Context, req *pb.SetDroppableRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setDroppable",
		Payload: map[string]interface{}{
			"widgetId":              req.WidgetId,
			"onDropCallbackId":      req.OnDropCallbackId,
			"onDragEnterCallbackId": req.OnDragEnterCallbackId,
			"onDragLeaveCallbackId": req.OnDragLeaveCallbackId,
		},
	}

	resp := s.bridge.handleSetDroppable(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Additional Interactions
// ============================================================================

// HoverWidget hovers over a widget
func (s *grpcBridgeService) HoverWidget(ctx context.Context, req *pb.HoverWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "hoverWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleHoverWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// FocusWidget focuses a widget
func (s *grpcBridgeService) FocusWidget(ctx context.Context, req *pb.FocusWidgetRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "focusWidget",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleFocusWidget(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// FocusNext focuses the next widget
func (s *grpcBridgeService) FocusNext(ctx context.Context, req *pb.FocusNextRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "focusNext",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	resp := s.bridge.handleFocusNext(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// FocusPrevious focuses the previous widget
func (s *grpcBridgeService) FocusPrevious(ctx context.Context, req *pb.FocusPreviousRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "focusPrevious",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
		},
	}

	resp := s.bridge.handleFocusPrevious(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SubmitEntry submits an entry
func (s *grpcBridgeService) SubmitEntry(ctx context.Context, req *pb.SubmitEntryRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "submitEntry",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleSubmitEntry(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// DragCanvas performs a drag on canvas
func (s *grpcBridgeService) DragCanvas(ctx context.Context, req *pb.DragCanvasRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "dragCanvas",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"fromX":    float64(req.FromX),
			"fromY":    float64(req.FromY),
			"deltaX":   float64(req.DeltaX),
			"deltaY":   float64(req.DeltaY),
		},
	}

	resp := s.bridge.handleDragCanvas(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ScrollCanvas performs a scroll on canvas
func (s *grpcBridgeService) ScrollCanvas(ctx context.Context, req *pb.ScrollCanvasRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WindowId,
		Type: "scrollCanvas",
		Payload: map[string]interface{}{
			"windowId": req.WindowId,
			"deltaX":   float64(req.DeltaX),
			"deltaY":   float64(req.DeltaY),
		},
	}

	resp := s.bridge.handleScrollCanvas(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// ============================================================================
// Testing
// ============================================================================

// RegisterTestId registers a test ID for a widget
func (s *grpcBridgeService) RegisterTestId(ctx context.Context, req *pb.RegisterTestIdRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "registerTestId",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
			"testId":   req.TestId,
		},
	}

	resp := s.bridge.handleRegisterTestId(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// GetParent gets the parent widget ID
func (s *grpcBridgeService) GetParent(ctx context.Context, req *pb.GetParentRequest) (*pb.GetParentResponse, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "getParent",
		Payload: map[string]interface{}{
			"widgetId": req.WidgetId,
		},
	}

	resp := s.bridge.handleGetParent(msg)

	parentId := ""
	if resp.Result != nil {
		if v, ok := resp.Result["parentId"].(string); ok {
			parentId = v
		}
	}

	return &pb.GetParentResponse{
		Success:  resp.Success,
		Error:    resp.Error,
		ParentId: parentId,
	}, nil
}

// ============================================================================
// Accessibility
// ============================================================================

// SetAccessibility sets accessibility properties
func (s *grpcBridgeService) SetAccessibility(ctx context.Context, req *pb.SetAccessibilityRequest) (*pb.Response, error) {
	payload := map[string]interface{}{
		"widgetId": req.WidgetId,
	}
	if req.Label != "" {
		payload["label"] = req.Label
	}
	if req.Hint != "" {
		payload["hint"] = req.Hint
	}
	if req.Role != "" {
		payload["role"] = req.Role
	}

	msg := Message{
		ID:      req.WidgetId,
		Type:    "setAccessibility",
		Payload: payload,
	}

	resp := s.bridge.handleSetAccessibility(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// EnableAccessibility enables accessibility
func (s *grpcBridgeService) EnableAccessibility(ctx context.Context, req *pb.EnableAccessibilityRequest) (*pb.Response, error) {
	msg := Message{
		ID:      "enableAccessibility",
		Type:    "enableAccessibility",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleEnableAccessibility(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// DisableAccessibility disables accessibility
func (s *grpcBridgeService) DisableAccessibility(ctx context.Context, req *pb.DisableAccessibilityRequest) (*pb.Response, error) {
	msg := Message{
		ID:      "disableAccessibility",
		Type:    "disableAccessibility",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleDisableAccessibility(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// Announce announces text for accessibility
func (s *grpcBridgeService) Announce(ctx context.Context, req *pb.AnnounceRequest) (*pb.Response, error) {
	msg := Message{
		ID:   "announce",
		Type: "announce",
		Payload: map[string]interface{}{
			"message": req.Message,
		},
	}

	resp := s.bridge.handleAnnounce(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// StopSpeech stops speech
func (s *grpcBridgeService) StopSpeech(ctx context.Context, req *pb.StopSpeechRequest) (*pb.Response, error) {
	msg := Message{
		ID:      "stopSpeech",
		Type:    "stopSpeech",
		Payload: map[string]interface{}{},
	}

	resp := s.bridge.handleStopSpeech(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetWidgetHoverable sets widget hoverable
func (s *grpcBridgeService) SetWidgetHoverable(ctx context.Context, req *pb.SetWidgetHoverableRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setWidgetHoverable",
		Payload: map[string]interface{}{
			"widgetId":   req.WidgetId,
			"callbackId": req.CallbackId,
		},
	}

	resp := s.bridge.handleSetWidgetHoverable(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

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
			"id":                   req.WidgetId,
			"desktopId":            req.DesktopId,
			"label":                req.Label,
			"x":                    float64(req.X),
			"y":                    float64(req.Y),
			"color":                req.Color,
			"onClickCallbackId":    req.OnClickCallbackId,
			"onDblClickCallbackId": req.OnDblClickCallbackId,
			"onDragCallbackId":     req.DragCallbackId,
			"onDragEndCallbackId":  req.DragEndCallbackId,
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
