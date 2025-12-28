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
	mu         sync.Mutex
	bufferPool sync.Pool // Pool for frame buffers to reduce allocations
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
	// Create socket in temp directory, prioritizing:
	// 1. socketDirOverride (set via StartBridgeMsgpackUDSWithDir for Android)
	// 2. TSYNE_SOCKET_DIR env var
	// 3. os.TempDir()
	socketDir := socketDirOverride
	if socketDir == "" {
		socketDir = os.Getenv("TSYNE_SOCKET_DIR")
	}
	if socketDir == "" {
		socketDir = os.TempDir()
	}
	socketPath := filepath.Join(socketDir, fmt.Sprintf("tsyne-%d.sock", os.Getpid()))

	server := &MsgpackServer{
		bridge:     bridge,
		socketPath: socketPath,
	}

	// Initialize buffer pool with factory function
	server.bufferPool.New = func() interface{} {
		// Pre-allocate 8KB buffers (typical message size)
		return make([]byte, 8192)
	}

	return server
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
}

// SendEvent sends an event to all connected clients synchronously
// This ensures events are delivered before the response that triggered them
func (s *MsgpackServer) SendEvent(event Event) {
	msgEvent := MsgpackEvent{
		Type:     event.Type,
		WidgetID: event.WidgetID,
		Data:     event.Data,
	}

	eventBuf, err := msgpack.Marshal(msgEvent)
	if err != nil {
		return
	}

	// Acquire buffer from pool
	frameBuf := s.getFrameBuffer(4 + len(eventBuf))
	binary.BigEndian.PutUint32(frameBuf[0:4], uint32(len(eventBuf)))
	copy(frameBuf[4:], eventBuf)

	// Broadcast to all clients synchronously
	frameSize := 4 + len(eventBuf)
	s.clients.Range(func(key, value interface{}) bool {
		conn := value.(net.Conn)
		s.mu.Lock()
		conn.Write(frameBuf[:frameSize])
		s.mu.Unlock()
		return true
	})

	// Return buffer to pool after broadcast
	s.putFrameBuffer(frameBuf)
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

		// Acquire buffer from pool
		frameBuf := s.getFrameBuffer(4 + len(respBuf))
		binary.BigEndian.PutUint32(frameBuf[0:4], uint32(len(respBuf)))
		copy(frameBuf[4:], respBuf)

		// Write to connection
		s.mu.Lock()
		conn.Write(frameBuf[:4+len(respBuf)])
		s.mu.Unlock()

		// Return buffer to pool
		s.putFrameBuffer(frameBuf)
	}
}

func (s *MsgpackServer) handleMessage(msg MsgpackMessage) MsgpackResponse {
	// Convert to bridge Message format
	bridgeMsg := Message{
		ID:      msg.ID,
		Type:    msg.Type,
		Payload: msg.Payload,
	}

	// Dispatch to bridge handler chain - now returns Response directly
	timer := StartOp(msg.Type, msg.ID)
	resp := s.bridge.handleMessage(bridgeMsg)
	timer.End()

	return MsgpackResponse{
		ID:      resp.ID,
		Success: resp.Success,
		Result:  resp.Result,
		Error:   resp.Error,
	}
}

// getFrameBuffer acquires a buffer from the pool, allocating a larger one if needed
func (s *MsgpackServer) getFrameBuffer(minSize int) []byte {
	buf := s.bufferPool.Get().([]byte)
	if cap(buf) < minSize {
		// Buffer too small, allocate new one
		return make([]byte, minSize)
	}
	return buf[:minSize]
}

// putFrameBuffer returns a buffer to the pool (only if it's reasonably sized)
func (s *MsgpackServer) putFrameBuffer(buf []byte) {
	// Only pool buffers up to 16KB to avoid holding huge buffers
	if cap(buf) <= 16384 {
		s.bufferPool.Put(buf)
	}
}
