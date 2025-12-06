package main

import (
	"context"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

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
