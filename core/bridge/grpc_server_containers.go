package main

import (
	"context"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

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

// SetScrollMinHeight sets minimum height for a scroll container
func (s *grpcBridgeService) SetScrollMinHeight(ctx context.Context, req *pb.SetScrollMinHeightRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setScrollMinHeight",
		Payload: map[string]interface{}{
			"id":        req.WidgetId,
			"minHeight": float64(req.MinHeight),
		},
	}

	resp := s.bridge.handleSetScrollMinHeight(msg)

	return &pb.Response{
		Success: resp.Success,
		Error:   resp.Error,
	}, nil
}

// SetScrollMinSize sets minimum width and height for a scroll container
func (s *grpcBridgeService) SetScrollMinSize(ctx context.Context, req *pb.SetScrollMinSizeRequest) (*pb.Response, error) {
	msg := Message{
		ID:   req.WidgetId,
		Type: "setScrollMinSize",
		Payload: map[string]interface{}{
			"id":        req.WidgetId,
			"minWidth":  float64(req.MinWidth),
			"minHeight": float64(req.MinHeight),
		},
	}

	resp := s.bridge.handleSetScrollMinSize(msg)

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

	if req.Fixed {
		payload["fixed"] = true
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
// Popup and Navigation operations
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
