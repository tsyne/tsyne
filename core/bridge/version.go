package main

import "fmt"

// Version constants for the Tsyne bridge.
// These values are used for version negotiation between TypeScript and Go.

const (
	// ProtocolVersion is the version of the TS↔Go bridge communication protocol.
	// Increment when making breaking changes to the message format.
	ProtocolVersion = 1

	// BridgeVersion is the version of this bridge binary.
	// Should match the Tsyne package version.
	BridgeVersion = "0.1.0"
)

// HandshakeInfo contains version information sent during bridge initialization.
type HandshakeInfo struct {
	Protocol      int    `json:"protocol"`
	BridgeVersion string `json:"bridgeVersion"`
	Compatible    bool   `json:"compatible"`
	Reason        string `json:"reason,omitempty"`
}

// NewHandshakeInfo creates handshake info for the current bridge.
func NewHandshakeInfo(tsProtocol int) HandshakeInfo {
	info := HandshakeInfo{
		Protocol:      ProtocolVersion,
		BridgeVersion: BridgeVersion,
		Compatible:    true,
	}

	// Check protocol compatibility
	if tsProtocol != ProtocolVersion {
		info.Compatible = false
		info.Reason = fmt.Sprintf("protocol mismatch: TypeScript sent protocol %d, bridge supports protocol %d",
			tsProtocol, ProtocolVersion)
	}

	return info
}
