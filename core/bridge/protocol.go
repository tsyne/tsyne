package main

import (
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"io"
)

// =============================================================================
// IPC Safeguards #3 & #4: Framing Protocol with CRC32 Validation
// =============================================================================
// Frame format: [length: 4 bytes][crc32: 4 bytes][json: N bytes]
// - Length prefix allows detection of message boundaries
// - CRC32 checksum validates message integrity
// - Prevents corruption from accidental stdout writes

// writeFramedMessage writes a JSON message with length-prefix and CRC32 checksum
// Format: [uint32 length][uint32 crc32][json bytes]
func writeFramedMessage(w io.Writer, data []byte) error {
	// Calculate CRC32 checksum
	checksum := crc32.ChecksumIEEE(data)

	// Write length prefix (4 bytes, big-endian)
	length := uint32(len(data))
	if err := binary.Write(w, binary.BigEndian, length); err != nil {
		return fmt.Errorf("failed to write length: %w", err)
	}

	// Write CRC32 checksum (4 bytes, big-endian)
	if err := binary.Write(w, binary.BigEndian, checksum); err != nil {
		return fmt.Errorf("failed to write checksum: %w", err)
	}

	// Write JSON payload
	if _, err := w.Write(data); err != nil {
		return fmt.Errorf("failed to write payload: %w", err)
	}

	return nil
}

// readFramedMessage reads a length-prefixed, CRC32-validated JSON message
// Returns the JSON bytes or an error if the message is corrupted
func readFramedMessage(r io.Reader) ([]byte, error) {
	// Read length prefix (4 bytes)
	var length uint32
	if err := binary.Read(r, binary.BigEndian, &length); err != nil {
		return nil, fmt.Errorf("failed to read length: %w", err)
	}

	// Sanity check: reject unreasonably large messages (> 10MB)
	if length > 10*1024*1024 {
		return nil, fmt.Errorf("message too large: %d bytes", length)
	}

	// Read CRC32 checksum (4 bytes)
	var expectedChecksum uint32
	if err := binary.Read(r, binary.BigEndian, &expectedChecksum); err != nil {
		return nil, fmt.Errorf("failed to read checksum: %w", err)
	}

	// Read JSON payload
	payload := make([]byte, length)
	if _, err := io.ReadFull(r, payload); err != nil {
		return nil, fmt.Errorf("failed to read payload: %w", err)
	}

	// Validate CRC32 checksum
	actualChecksum := crc32.ChecksumIEEE(payload)
	if actualChecksum != expectedChecksum {
		return nil, fmt.Errorf("checksum mismatch: expected %d, got %d", expectedChecksum, actualChecksum)
	}

	return payload, nil
}
