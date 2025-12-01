package main

import (
	"log"
)

// Transport defines the interface for different IPC mechanisms
// Responses are returned directly (synchronous), only events need to be sent
type Transport interface {
	SendEvent(event Event)
}

// GrpcTransport implements Transport for gRPC mode
type GrpcTransport struct {
	eventChan chan Event
}

func NewGrpcTransport(eventChan chan Event) *GrpcTransport {
	return &GrpcTransport{eventChan: eventChan}
}

func (t *GrpcTransport) SendEvent(event Event) {
	if t.eventChan != nil {
		select {
		case t.eventChan <- event:
			// Event sent successfully
		default:
			// Channel full or closed, log and drop
			log.Printf("Warning: gRPC event channel full, dropping event: %s", event.Type)
		}
	}
}

// MsgpackTransport implements Transport for msgpack-uds mode
type MsgpackTransport struct {
	server *MsgpackServer
}

func NewMsgpackTransport(server *MsgpackServer) *MsgpackTransport {
	return &MsgpackTransport{server: server}
}

func (t *MsgpackTransport) SendEvent(event Event) {
	if t.server != nil {
		t.server.SendEvent(event)
	}
}
