package main

/*
#include <stdlib.h>
#include <stdint.h>

// Helper to call event callback from Go
extern void callEventCallback(void* callback, const char* eventJson);
*/
import "C"
import (
	"encoding/json"
	"log"
	"sync"
	"unsafe"
)

// Global bridge instance (single instance for FFI)
var (
	ffiInitialized bool
	ffiBridge      *Bridge
	ffiMu          sync.Mutex

	// Event queue for polling mode
	eventQueue   []string
	eventQueueMu sync.Mutex

	// Event callback for push mode (stored as unsafe.Pointer)
	eventCallbackPtr unsafe.Pointer
)

//export TsyneInit
func TsyneInit(headless C.int) C.int {
	ffiMu.Lock()
	defer ffiMu.Unlock()

	// Allow reinitialization after shutdown
	if ffiInitialized && ffiBridge != nil {
		return 0 // Already initialized
	}

	testMode := headless != 0

	ffiBridge = NewBridge(testMode)
	ffiBridge.grpcMode = true // Reuse flag to skip stdout writes

	// Set up event forwarding
	ffiBridge.SetEventCallback(func(event Event) {
		eventJson, err := json.Marshal(event)
		if err != nil {
			log.Printf("Error marshaling event: %v", err)
			return
		}

		// If callback is set, call it via C helper
		if eventCallbackPtr != nil {
			cStr := C.CString(string(eventJson))
			C.callEventCallback(eventCallbackPtr, cStr)
			C.free(unsafe.Pointer(cStr))
		} else {
			// Otherwise queue it for polling
			eventQueueMu.Lock()
			eventQueue = append(eventQueue, string(eventJson))
			eventQueueMu.Unlock()
		}
	})

	// Start Fyne in background if not headless
	if !testMode {
		go ffiBridge.app.Run()
	}

	ffiInitialized = true
	return 0
}

//export TsyneSendMessage
func TsyneSendMessage(messageJson *C.char) *C.char {
	ffiMu.Lock()
	bridge := ffiBridge
	ffiMu.Unlock()

	if bridge == nil {
		errResp := Response{
			ID:      "ffi_error",
			Success: false,
			Error:   "Bridge not initialized - call TsyneInit first",
		}
		respJson, _ := json.Marshal(errResp)
		return C.CString(string(respJson))
	}

	// Parse incoming message
	jsonStr := C.GoString(messageJson)
	var msg Message
	if err := json.Unmarshal([]byte(jsonStr), &msg); err != nil {
		errResp := Response{
			ID:      "ffi_error",
			Success: false,
			Error:   "Failed to parse message JSON: " + err.Error(),
		}
		respJson, _ := json.Marshal(errResp)
		return C.CString(string(respJson))
	}

	// Handle the message
	resp := bridge.handleMessage(msg)

	// Return response as JSON
	respJson, err := json.Marshal(resp)
	if err != nil {
		errResp := Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to marshal response: " + err.Error(),
		}
		respJson, _ = json.Marshal(errResp)
	}

	return C.CString(string(respJson))
}

//export TsyneFreeString
func TsyneFreeString(str *C.char) {
	C.free(unsafe.Pointer(str))
}

//export TsyneSetEventCallback
func TsyneSetEventCallback(callback unsafe.Pointer) {
	eventCallbackPtr = callback
}

//export TsyneGetNextEvent
func TsyneGetNextEvent() *C.char {
	eventQueueMu.Lock()
	defer eventQueueMu.Unlock()

	if len(eventQueue) == 0 {
		return nil
	}

	event := eventQueue[0]
	eventQueue = eventQueue[1:]
	return C.CString(event)
}

//export TsyneGetEventQueueLength
func TsyneGetEventQueueLength() C.int {
	eventQueueMu.Lock()
	defer eventQueueMu.Unlock()
	return C.int(len(eventQueue))
}

//export TsyneShutdown
func TsyneShutdown() {
	ffiMu.Lock()
	defer ffiMu.Unlock()

	if ffiBridge != nil {
		ffiBridge.app.Quit()
		ffiBridge = nil
	}

	ffiInitialized = false

	// Clear event queue
	eventQueueMu.Lock()
	eventQueue = nil
	eventQueueMu.Unlock()
}
