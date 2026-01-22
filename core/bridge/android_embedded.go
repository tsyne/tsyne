package main

/*
#include <stdint.h>

// Callback function types that will be set from JNI
typedef void (*RenderCallback)(uint8_t* pixels, int width, int height, int stride);

// Global callback pointer (set from JNI)
static RenderCallback g_renderCallback = NULL;

static inline void SetRenderCallback(RenderCallback cb) {
    g_renderCallback = cb;
}

static inline void CallRenderCallback(uint8_t* pixels, int width, int height, int stride) {
    if (g_renderCallback != NULL) {
        g_renderCallback(pixels, width, height, stride);
    }
}
*/
import "C"

import (
	"encoding/json"
	"image"
	"log"
	"os"
	"sync"
	"unsafe"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/driver/embedded"
)

// logWriter writes to stderr (needed for Android logging)
type logWriter struct{}

func (logWriter) Write(p []byte) (n int, err error) {
	return os.Stderr.Write(p)
}

// AndroidEmbeddedDriver implements embedded.Driver for Android
type AndroidEmbeddedDriver struct {
	events     chan embedded.Event
	screenSize fyne.Size
	sizeMu     sync.RWMutex
	runFunc    func()
}

// Global instance for JNI access
var androidDriver *AndroidEmbeddedDriver
var androidDriverMu sync.Mutex

// NewAndroidEmbeddedDriver creates a new Android embedded driver
func NewAndroidEmbeddedDriver(width, height float32) *AndroidEmbeddedDriver {
	d := &AndroidEmbeddedDriver{
		events:     make(chan embedded.Event, 100),
		screenSize: fyne.NewSize(width, height),
	}

	androidDriverMu.Lock()
	androidDriver = d
	androidDriverMu.Unlock()

	return d
}

// Render receives a rendered frame and passes it to Android
func (d *AndroidEmbeddedDriver) Render(img image.Image) {
	// Convert image to RGBA if needed
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Get pixels as RGBA
	var pixels []byte
	var stride int

	switch rgba := img.(type) {
	case *image.RGBA:
		pixels = rgba.Pix
		stride = rgba.Stride
	case *image.NRGBA:
		pixels = rgba.Pix
		stride = rgba.Stride
	default:
		// Convert to RGBA
		rgbaImg := image.NewRGBA(bounds)
		for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				rgbaImg.Set(x, y, img.At(x, y))
			}
		}
		pixels = rgbaImg.Pix
		stride = rgbaImg.Stride
	}

	// Call the C callback to pass pixels to Android
	if len(pixels) > 0 {
		C.CallRenderCallback(
			(*C.uint8_t)(unsafe.Pointer(&pixels[0])),
			C.int(width),
			C.int(height),
			C.int(stride),
		)
	}
}

// Run starts the main loop
func (d *AndroidEmbeddedDriver) Run(mainLoop func()) {
	d.runFunc = mainLoop
	mainLoop()
}

// ScreenSize returns the current screen dimensions
func (d *AndroidEmbeddedDriver) ScreenSize() fyne.Size {
	d.sizeMu.RLock()
	defer d.sizeMu.RUnlock()
	return d.screenSize
}

// Queue returns the event channel
func (d *AndroidEmbeddedDriver) Queue() chan embedded.Event {
	return d.events
}

// SetScreenSize updates the screen size (called from JNI when surface changes)
func (d *AndroidEmbeddedDriver) SetScreenSize(width, height float32) {
	d.sizeMu.Lock()
	d.screenSize = fyne.NewSize(width, height)
	d.sizeMu.Unlock()
}

// SendTouchDown sends a touch down event (called from JNI)
func (d *AndroidEmbeddedDriver) SendTouchDown(x, y float32, id int) {
	log.Printf("TouchDown: x=%.0f y=%.0f id=%d", x, y, id)
	d.events <- &embedded.TouchDownEvent{
		Position: fyne.NewPos(x, y),
		ID:       id,
	}
}

// SendTouchMove sends a touch move event (called from JNI)
func (d *AndroidEmbeddedDriver) SendTouchMove(x, y float32, id int) {
	d.events <- &embedded.TouchMoveEvent{
		Position: fyne.NewPos(x, y),
		ID:       id,
	}
}

// SendTouchUp sends a touch up event (called from JNI)
func (d *AndroidEmbeddedDriver) SendTouchUp(x, y float32, id int) {
	log.Printf("TouchUp: x=%.0f y=%.0f id=%d", x, y, id)
	d.events <- &embedded.TouchUpEvent{
		Position: fyne.NewPos(x, y),
		ID:       id,
	}
}

//export SetAndroidScreenSize
func SetAndroidScreenSize(width, height C.float) {
	androidDriverMu.Lock()
	d := androidDriver
	androidDriverMu.Unlock()

	if d != nil {
		d.SetScreenSize(float32(width), float32(height))
	}
}

//export SendAndroidTouchDown
func SendAndroidTouchDown(x, y C.float, id C.int) {
	androidDriverMu.Lock()
	d := androidDriver
	androidDriverMu.Unlock()

	if d != nil {
		d.SendTouchDown(float32(x), float32(y), int(id))
	}
}

//export SendAndroidTouchMove
func SendAndroidTouchMove(x, y C.float, id C.int) {
	androidDriverMu.Lock()
	d := androidDriver
	androidDriverMu.Unlock()

	if d != nil {
		d.SendTouchMove(float32(x), float32(y), int(id))
	}
}

//export SendAndroidTouchUp
func SendAndroidTouchUp(x, y C.float, id C.int) {
	androidDriverMu.Lock()
	d := androidDriver
	androidDriverMu.Unlock()

	if d != nil {
		d.SendTouchUp(float32(x), float32(y), int(id))
	}
}

//export SetAndroidRenderCallback
func SetAndroidRenderCallback(cb C.RenderCallback) {
	C.SetRenderCallback(cb)
}

// Global bridge for embedded mode
var embeddedBridge *Bridge
var embeddedBridgeMu sync.Mutex

//export StartBridgeAndroidEmbedded
func StartBridgeAndroidEmbedded(width, height C.float, socketDir *C.char) C.int {
	log.SetOutput(logWriter{})
	log.SetPrefix("[tsyne-bridge] ")
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	log.Printf("Starting Android embedded mode with screen size: %.0fx%.0f", float32(width), float32(height))

	// Store the socket directory override
	if socketDir != nil {
		socketDirOverride = C.GoString(socketDir)
		log.Printf("Socket directory set to: %s", socketDirOverride)
	}

	// Create the Android embedded driver
	driver := NewAndroidEmbeddedDriver(float32(width), float32(height))

	// Create bridge with embedded driver
	embeddedBridgeMu.Lock()
	embeddedBridge = NewBridgeWithEmbeddedDriver(driver)
	embeddedBridge.transport = "msgpack"
	embeddedBridgeMu.Unlock()

	// Start msgpack server in a goroutine
	go func() {
		server := NewMsgpackServer(embeddedBridge)
		embeddedBridge.msgpackServer = server

		// Output the socket info to stdout
		info := map[string]string{
			"protocol":   "msgpack-uds",
			"socketPath": server.GetSocketPath(),
		}
		infoJSON, _ := json.Marshal(info)
		log.Printf("%s", string(infoJSON))

		// Start accepting connections
		if err := server.Start(); err != nil {
			log.Printf("Failed to start msgpack server: %v", err)
		}
	}()

	// Run the app (this drives the embedded rendering loop)
	// This runs in the current goroutine
	embeddedBridge.app.Run()

	return 0
}
