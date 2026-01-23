package main

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/vmihailenco/msgpack/v5"
)

// encoderPoolItem holds a reusable encoder and buffer (#6 optimization)
type encoderPoolItem struct {
	enc *msgpack.Encoder
	buf *bytes.Buffer
}

// MsgpackServer handles MessagePack over Unix Domain Socket communication
type MsgpackServer struct {
	bridge     *Bridge
	socketPath string
	listener   net.Listener
	clients    sync.Map // map of client connections
	mu         sync.Mutex
	bufferPool  sync.Pool // Pool for frame buffers to reduce allocations
	encoderPool sync.Pool // Pool for msgpack encoders (#6 optimization)

	// Message batching (#5 optimization)
	batchEnabled  bool
	batchWindow   time.Duration
	batchMu       sync.Mutex
	batchQueue    [][]byte       // Queued serialized messages
	batchTimer    *time.Timer    // Flush timer
	batchFlushCh  chan struct{}  // Signal to flush immediately
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
		bridge:       bridge,
		socketPath:   socketPath,
		batchEnabled: false, // Batching disabled by default
		batchWindow:  2 * time.Millisecond,
		batchFlushCh: make(chan struct{}, 1),
	}

	// Initialize buffer pool with factory function
	server.bufferPool.New = func() interface{} {
		// Pre-allocate 8KB buffers (typical message size)
		return make([]byte, 8192)
	}

	// Initialize encoder pool (#6 optimization)
	server.encoderPool.New = func() interface{} {
		buf := bytes.NewBuffer(make([]byte, 0, 4096))
		enc := msgpack.NewEncoder(buf)
		return &encoderPoolItem{enc: enc, buf: buf}
	}

	return server
}

// EnableBatching enables message batching with the specified window (#5 optimization)
func (s *MsgpackServer) EnableBatching(window time.Duration) {
	s.batchMu.Lock()
	defer s.batchMu.Unlock()
	s.batchEnabled = true
	s.batchWindow = window
}

// DisableBatching disables message batching
func (s *MsgpackServer) DisableBatching() {
	s.batchMu.Lock()
	defer s.batchMu.Unlock()
	s.batchEnabled = false
	if s.batchTimer != nil {
		s.batchTimer.Stop()
		s.batchTimer = nil
	}
	// Flush any pending messages
	s.flushBatchLocked()
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
// Optimization #4: Pre-serialize once, single lock for all writes
// Optimization #6: Use pooled encoder
func (s *MsgpackServer) SendEvent(event Event) {
	msgEvent := MsgpackEvent{
		Type:     event.Type,
		WidgetID: event.WidgetID,
		Data:     event.Data,
	}

	// Use pooled encoder (#6 optimization)
	eventBuf, err := s.encodeWithPool(msgEvent)
	if err != nil {
		return
	}

	// Acquire buffer from pool and create frame
	frameBuf := s.getFrameBuffer(4 + len(eventBuf))
	binary.BigEndian.PutUint32(frameBuf[0:4], uint32(len(eventBuf)))
	copy(frameBuf[4:], eventBuf)
	frameSize := 4 + len(eventBuf)

	// Collect all connections first (read phase - no lock contention)
	var conns []net.Conn
	s.clients.Range(func(key, value interface{}) bool {
		conns = append(conns, value.(net.Conn))
		return true
	})

	// Single lock for all writes (#4 optimization)
	// This reduces lock/unlock cycles from N to 1
	s.mu.Lock()
	for _, conn := range conns {
		conn.Write(frameBuf[:frameSize])
	}
	s.mu.Unlock()

	// Return buffer to pool after broadcast
	s.putFrameBuffer(frameBuf)
}

// encodeWithPool uses a pooled encoder for better performance (#6 optimization)
func (s *MsgpackServer) encodeWithPool(v interface{}) ([]byte, error) {
	item := s.encoderPool.Get().(*encoderPoolItem)
	defer func() {
		item.buf.Reset()
		s.encoderPool.Put(item)
	}()

	item.buf.Reset()
	if err := item.enc.Encode(v); err != nil {
		return nil, err
	}

	// Copy the buffer since we're returning it to the pool
	result := make([]byte, item.buf.Len())
	copy(result, item.buf.Bytes())
	return result, nil
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

		// Encode response using pooled encoder (#6 optimization)
		respBuf, err := s.encodeWithPool(response)
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

// flushBatchLocked flushes all queued batch messages (must hold batchMu)
func (s *MsgpackServer) flushBatchLocked() {
	if len(s.batchQueue) == 0 {
		return
	}

	// Collect all connections
	var conns []net.Conn
	s.clients.Range(func(key, value interface{}) bool {
		conns = append(conns, value.(net.Conn))
		return true
	})

	// Single lock for all writes
	s.mu.Lock()
	for _, conn := range conns {
		for _, frame := range s.batchQueue {
			conn.Write(frame)
		}
	}
	s.mu.Unlock()

	// Clear queue
	s.batchQueue = s.batchQueue[:0]
}

// FlushBatch immediately flushes any batched messages (#5 optimization)
func (s *MsgpackServer) FlushBatch() {
	s.batchMu.Lock()
	defer s.batchMu.Unlock()
	s.flushBatchLocked()
}

// SendEventBatched queues an event for batched sending (#5 optimization)
// Use this for high-frequency background updates
func (s *MsgpackServer) SendEventBatched(event Event) {
	msgEvent := MsgpackEvent{
		Type:     event.Type,
		WidgetID: event.WidgetID,
		Data:     event.Data,
	}

	// Use pooled encoder
	eventBuf, err := s.encodeWithPool(msgEvent)
	if err != nil {
		return
	}

	// Create frame
	frameBuf := make([]byte, 4+len(eventBuf))
	binary.BigEndian.PutUint32(frameBuf[0:4], uint32(len(eventBuf)))
	copy(frameBuf[4:], eventBuf)

	s.batchMu.Lock()
	defer s.batchMu.Unlock()

	if !s.batchEnabled {
		// Batching disabled, send immediately
		s.batchQueue = append(s.batchQueue, frameBuf)
		s.flushBatchLocked()
		return
	}

	// Add to batch queue
	s.batchQueue = append(s.batchQueue, frameBuf)

	// Start or reset timer
	if s.batchTimer == nil {
		s.batchTimer = time.AfterFunc(s.batchWindow, func() {
			s.batchMu.Lock()
			defer s.batchMu.Unlock()
			s.flushBatchLocked()
			s.batchTimer = nil
		})
	}
}
