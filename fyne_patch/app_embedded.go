//go:build !tamago && !noos && !tinygo

package app

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/driver/embedded"
	intNoos "fyne.io/fyne/v2/internal/driver/embedded"
	"fyne.io/fyne/v2/theme"
)

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
