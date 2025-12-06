package main

import (
	"fmt"
	"log"
	"net"
	"os"

	pb "github.com/paul-hammant/tsyne/bridge/proto"
	"google.golang.org/grpc"
)

// grpcBridgeService implements the gRPC BridgeService
type grpcBridgeService struct {
	pb.UnimplementedBridgeServiceServer
	bridge *Bridge
}

// StartGRPCServer starts the gRPC server
func (b *Bridge) StartGRPCServer() error {
	// Create gRPC event channel before starting server
	b.grpcEventChan = make(chan Event, 100)

	// Get gRPC port from environment or use default
	port := os.Getenv("TSYNE_GRPC_PORT")
	if port == "" {
		port = "50051"
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		return fmt.Errorf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterBridgeServiceServer(s, &grpcBridgeService{bridge: b})

	log.Printf("[gRPC] Server started on port %s", port)

	go func() {
		if err := s.Serve(lis); err != nil {
			log.Printf("[gRPC] Server error: %v", err)
		}
	}()

	return nil
}

// ============================================================================
// Helper functions
// ============================================================================

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
