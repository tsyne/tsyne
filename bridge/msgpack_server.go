package main

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"path/filepath"
	"sync"

	"github.com/vmihailenco/msgpack/v5"
)

// MsgpackServer handles MessagePack over Unix Domain Socket communication
type MsgpackServer struct {
	bridge     *Bridge
	socketPath string
	listener   net.Listener
	clients    sync.Map // map of client connections
	eventChan  chan Event
	mu         sync.Mutex
}

// MsgpackMessage represents a message in MessagePack format
type MsgpackMessage struct {
	ID      string                 `msgpack:"id"`
	Type    string                 `msgpack:"type"`
	Payload map[string]interface{} `msgpack:"payload"`
}

// MsgpackResponse represents a response in MessagePack format
type MsgpackResponse struct {
	ID      string                 `msgpack:"id"`
	Success bool                   `msgpack:"success"`
	Result  map[string]interface{} `msgpack:"result,omitempty"`
	Error   string                 `msgpack:"error,omitempty"`
}

// MsgpackEvent represents an event in MessagePack format
type MsgpackEvent struct {
	Type     string                 `msgpack:"type"`
	WidgetID string                 `msgpack:"widgetId"`
	Data     map[string]interface{} `msgpack:"data,omitempty"`
}

// NewMsgpackServer creates a new MessagePack UDS server
func NewMsgpackServer(bridge *Bridge) *MsgpackServer {
	// Create socket in temp directory
	socketPath := filepath.Join(os.TempDir(), fmt.Sprintf("tsyne-%d.sock", os.Getpid()))

	return &MsgpackServer{
		bridge:     bridge,
		socketPath: socketPath,
		eventChan:  make(chan Event, 256),
	}
}

// Start starts the MessagePack UDS server
func (s *MsgpackServer) Start() error {
	// Remove existing socket file if present
	os.Remove(s.socketPath)

	var err error
	s.listener, err = net.Listen("unix", s.socketPath)
	if err != nil {
		return fmt.Errorf("failed to listen on unix socket: %w", err)
	}

	// Start accepting connections in background
	go s.acceptConnections()

	// Start event broadcaster
	go s.broadcastEvents()

	return nil
}

// GetSocketPath returns the socket path for clients to connect
func (s *MsgpackServer) GetSocketPath() string {
	return s.socketPath
}

// Close closes the server and cleans up
func (s *MsgpackServer) Close() {
	if s.listener != nil {
		s.listener.Close()
	}
	os.Remove(s.socketPath)
	close(s.eventChan)
}

// SendEvent sends an event to all connected clients
func (s *MsgpackServer) SendEvent(event Event) {
	select {
	case s.eventChan <- event:
	default:
		// Channel full, drop event (shouldn't happen with large buffer)
	}
}

func (s *MsgpackServer) acceptConnections() {
	for {
		conn, err := s.listener.Accept()
		if err != nil {
			// Listener closed
			return
		}

		// Handle each client in a goroutine
		go s.handleClient(conn)
	}
}

func (s *MsgpackServer) handleClient(conn net.Conn) {
	defer conn.Close()

	// Register client for events
	clientID := fmt.Sprintf("%p", conn)
	s.clients.Store(clientID, conn)
	defer s.clients.Delete(clientID)

	reader := bufio.NewReader(conn)

	for {
		// Read length prefix (4 bytes, big-endian)
		lengthBuf := make([]byte, 4)
		_, err := io.ReadFull(reader, lengthBuf)
		if err != nil {
			if err != io.EOF {
				log.Printf("[msgpack] Error reading length: %v", err)
			}
			return
		}

		length := binary.BigEndian.Uint32(lengthBuf)
		if length > 100*1024*1024 { // 100MB max
			log.Printf("[msgpack] Message too large: %d bytes", length)
			return
		}

		// Read message body
		msgBuf := make([]byte, length)
		_, err = io.ReadFull(reader, msgBuf)
		if err != nil {
			log.Printf("[msgpack] Error reading message: %v", err)
			return
		}

		// Decode MessagePack
		var msg MsgpackMessage
		if err := msgpack.Unmarshal(msgBuf, &msg); err != nil {
			log.Printf("[msgpack] Error decoding message: %v", err)
			continue
		}

		// Handle the message
		response := s.handleMessage(msg)

		// Encode response
		respBuf, err := msgpack.Marshal(response)
		if err != nil {
			log.Printf("[msgpack] Error encoding response: %v", err)
			continue
		}

		// Write length prefix + response
		s.mu.Lock()
		binary.BigEndian.PutUint32(lengthBuf, uint32(len(respBuf)))
		conn.Write(lengthBuf)
		conn.Write(respBuf)
		s.mu.Unlock()
	}
}

func (s *MsgpackServer) handleMessage(msg MsgpackMessage) MsgpackResponse {
	// Convert to bridge Message format
	bridgeMsg := Message{
		ID:      msg.ID,
		Type:    msg.Type,
		Payload: msg.Payload,
	}

	// Use the bridge's existing message handler
	s.bridge.handleMessage(bridgeMsg)

	// For now, return success (the bridge handlers send responses via stdout in stdio mode,
	// but in msgpack mode we return directly)
	return MsgpackResponse{
		ID:      msg.ID,
		Success: true,
		Result:  make(map[string]interface{}),
	}
}

func (s *MsgpackServer) broadcastEvents() {
	for event := range s.eventChan {
		msgEvent := MsgpackEvent{
			Type:     event.Type,
			WidgetID: event.WidgetID,
			Data:     event.Data,
		}

		eventBuf, err := msgpack.Marshal(msgEvent)
		if err != nil {
			continue
		}

		lengthBuf := make([]byte, 4)
		binary.BigEndian.PutUint32(lengthBuf, uint32(len(eventBuf)))

		// Broadcast to all clients
		s.clients.Range(func(key, value interface{}) bool {
			conn := value.(net.Conn)
			s.mu.Lock()
			conn.Write(lengthBuf)
			conn.Write(eventBuf)
			s.mu.Unlock()
			return true
		})
	}
}
