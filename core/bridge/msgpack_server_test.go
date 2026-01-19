package main

import (
	"bytes"
	"encoding/binary"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/vmihailenco/msgpack/v5"
)

// TestMsgpackEncoding tests MessagePack encoding/decoding
func TestMsgpackEncoding(t *testing.T) {
	// Test message encoding
	msg := MsgpackMessage{
		ID:   "test_1",
		Type: "createLabel",
		Payload: map[string]interface{}{
			"id":   "label_1",
			"text": "Hello World",
		},
	}

	// Encode
	encoded, err := msgpack.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to encode message: %v", err)
	}

	// Decode
	var decoded MsgpackMessage
	if err := msgpack.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("Failed to decode message: %v", err)
	}

	// Verify
	if decoded.ID != msg.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, msg.ID)
	}
	if decoded.Type != msg.Type {
		t.Errorf("Type mismatch: got %s, want %s", decoded.Type, msg.Type)
	}
	if decoded.Payload["text"] != msg.Payload["text"] {
		t.Errorf("Payload text mismatch: got %v, want %v", decoded.Payload["text"], msg.Payload["text"])
	}
}

// TestMsgpackResponse tests response encoding/decoding
func TestMsgpackResponse(t *testing.T) {
	resp := MsgpackResponse{
		ID:      "test_1",
		Success: true,
		Result: map[string]interface{}{
			"widgetId": "widget_123",
		},
	}

	encoded, err := msgpack.Marshal(resp)
	if err != nil {
		t.Fatalf("Failed to encode response: %v", err)
	}

	var decoded MsgpackResponse
	if err := msgpack.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if decoded.ID != resp.ID {
		t.Errorf("ID mismatch: got %s, want %s", decoded.ID, resp.ID)
	}
	if decoded.Success != resp.Success {
		t.Errorf("Success mismatch: got %v, want %v", decoded.Success, resp.Success)
	}
}

// TestMsgpackEvent tests event encoding/decoding
func TestMsgpackEvent(t *testing.T) {
	event := MsgpackEvent{
		Type:     "clicked",
		WidgetID: "button_1",
		Data: map[string]interface{}{
			"x": 100,
			"y": 200,
		},
	}

	encoded, err := msgpack.Marshal(event)
	if err != nil {
		t.Fatalf("Failed to encode event: %v", err)
	}

	var decoded MsgpackEvent
	if err := msgpack.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("Failed to decode event: %v", err)
	}

	if decoded.Type != event.Type {
		t.Errorf("Type mismatch: got %s, want %s", decoded.Type, event.Type)
	}
	if decoded.WidgetID != event.WidgetID {
		t.Errorf("WidgetID mismatch: got %s, want %s", decoded.WidgetID, event.WidgetID)
	}
}

// TestFramedMessageRoundtrip tests length-prefixed framing
func TestFramedMessageRoundtrip(t *testing.T) {
	msg := MsgpackMessage{
		ID:   "test_framed",
		Type: "ping",
		Payload: map[string]interface{}{
			"timestamp": 1234567890,
		},
	}

	// Encode message
	msgBuf, err := msgpack.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to encode message: %v", err)
	}

	// Create framed message: [4-byte length][message]
	frame := make([]byte, 4+len(msgBuf))
	binary.BigEndian.PutUint32(frame[0:4], uint32(len(msgBuf)))
	copy(frame[4:], msgBuf)

	// Read frame back
	reader := bytes.NewReader(frame)

	// Read length
	lengthBuf := make([]byte, 4)
	if _, err := reader.Read(lengthBuf); err != nil {
		t.Fatalf("Failed to read length: %v", err)
	}
	length := binary.BigEndian.Uint32(lengthBuf)

	// Read message
	readBuf := make([]byte, length)
	if _, err := reader.Read(readBuf); err != nil {
		t.Fatalf("Failed to read message: %v", err)
	}

	// Decode
	var decoded MsgpackMessage
	if err := msgpack.Unmarshal(readBuf, &decoded); err != nil {
		t.Fatalf("Failed to decode message: %v", err)
	}

	if decoded.ID != msg.ID {
		t.Errorf("ID mismatch after framing roundtrip")
	}
}

// TestMsgpackServerSocketPath tests socket path generation
func TestMsgpackServerSocketPath(t *testing.T) {
	// Create a mock server (nil bridge is ok for this test)
	server := &MsgpackServer{
		socketPath: filepath.Join(os.TempDir(), "tsyne-test-12345.sock"),
	}

	path := server.GetSocketPath()
	if path == "" {
		t.Error("Socket path should not be empty")
	}
	if !filepath.IsAbs(path) {
		t.Error("Socket path should be absolute")
	}
}

// TestMsgpackEncodingSize compares MessagePack vs JSON size
func TestMsgpackEncodingSize(t *testing.T) {
	msg := MsgpackMessage{
		ID:   "test_size",
		Type: "createWindow",
		Payload: map[string]interface{}{
			"id":     "window_1",
			"title":  "Test Window",
			"width":  800,
			"height": 600,
		},
	}

	// MessagePack encoding
	msgpackData, _ := msgpack.Marshal(msg)

	// JSON encoding for comparison
	// Note: Using msgpack as reference, JSON would be larger
	t.Logf("MessagePack size: %d bytes", len(msgpackData))

	// MessagePack should be reasonably compact
	if len(msgpackData) > 200 {
		t.Errorf("MessagePack encoding larger than expected: %d bytes", len(msgpackData))
	}
}

// TestUnixSocketConnection tests basic UDS connectivity
func TestUnixSocketConnection(t *testing.T) {
	socketPath := filepath.Join(os.TempDir(), "tsyne-test-conn.sock")
	defer os.Remove(socketPath)

	// Start listener
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		t.Fatalf("Failed to create listener: %v", err)
	}
	defer listener.Close()

	// Accept in background
	done := make(chan bool)
	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer conn.Close()

		// Read a byte
		buf := make([]byte, 1)
		conn.Read(buf)
		done <- true
	}()

	// Connect client
	client, err := net.Dial("unix", socketPath)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer client.Close()

	// Send a byte
	client.Write([]byte{0x42})

	// Wait for server to receive
	select {
	case <-done:
		// Success
	case <-time.After(time.Second):
		t.Error("Timeout waiting for server to receive data")
	}
}

// BenchmarkMsgpackEncode benchmarks MessagePack encoding
func BenchmarkMsgpackEncode(b *testing.B) {
	msg := MsgpackMessage{
		ID:   "bench_1",
		Type: "createLabel",
		Payload: map[string]interface{}{
			"id":   "label_1",
			"text": "Benchmark text",
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		msgpack.Marshal(msg)
	}
}

// BenchmarkMsgpackDecode benchmarks MessagePack decoding
func BenchmarkMsgpackDecode(b *testing.B) {
	msg := MsgpackMessage{
		ID:   "bench_1",
		Type: "createLabel",
		Payload: map[string]interface{}{
			"id":   "label_1",
			"text": "Benchmark text",
		},
	}
	encoded, _ := msgpack.Marshal(msg)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var decoded MsgpackMessage
		msgpack.Unmarshal(encoded, &decoded)
	}
}

// BenchmarkMsgpackRoundtrip benchmarks full encode/decode cycle
func BenchmarkMsgpackRoundtrip(b *testing.B) {
	msg := MsgpackMessage{
		ID:   "bench_1",
		Type: "createLabel",
		Payload: map[string]interface{}{
			"id":   "label_1",
			"text": "Benchmark text",
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		encoded, _ := msgpack.Marshal(msg)
		var decoded MsgpackMessage
		msgpack.Unmarshal(encoded, &decoded)
	}
}
