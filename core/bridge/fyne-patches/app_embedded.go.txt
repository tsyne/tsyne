//go:build !tamago && !noos && !tinygo

package app

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/driver/embedded"
	intNoos "fyne.io/fyne/v2/internal/driver/embedded"
	"fyne.io/fyne/v2/theme"
)

// embeddedClipboard is a simple in-memory clipboard for embedded mode
type embeddedClipboard struct {
	content string
}

func (c *embeddedClipboard) Content() string {
	return c.content
}

func (c *embeddedClipboard) SetContent(content string) {
	c.content = content
}

// NewEmbedded creates a new Fyne application using the embedded driver.
// This is useful for environments like Android where the standard driver
// initialization may not work from background threads.
//
// The embedded.Driver interface must provide:
//   - Render(image.Image) - called when a frame is ready to display
//   - Run(func()) - called to start the main loop
//   - ScreenSize() fyne.Size - returns the current screen dimensions
//   - Queue() chan Event - channel for receiving input events
//
// Since: 2.7
func NewEmbedded(d embedded.Driver) fyne.App {
	driver := intNoos.NewNoOSDriver(d.Render, d.Run, d.Queue(), d.ScreenSize)
	a := newAppWithDriver(driver, &embeddedClipboard{}, "")
	a.(*fyneApp).Settings().SetTheme(theme.DefaultTheme())
	return a
}

// SetEmbeddedDriver configures an app to use the embedded driver for rendering.
// This allows Fyne to render to images which can be displayed by an external system,
// such as an Android SurfaceView or custom display hardware.
//
// The embedded.Driver interface must provide:
//   - Render(image.Image) - called when a frame is ready to display
//   - Run(func()) - called to start the main loop
//   - ScreenSize() fyne.Size - returns the current screen dimensions
//   - Queue() chan Event - channel for receiving input events
//
// Example usage on Android:
//
//	app := app.New()
//	driver := &myAndroidDriver{...}
//	app.SetEmbeddedDriver(app, driver)
//	// Now create windows and run as normal
//
// Since: 2.7
func SetEmbeddedDriver(a fyne.App, d embedded.Driver) {
	a.(*fyneApp).Settings().SetTheme(theme.DefaultTheme())
	a.(*fyneApp).driver = intNoos.NewNoOSDriver(d.Render, d.Run, d.Queue(), d.ScreenSize)
}
