// Draggable Desktop Icons - Pure Go+Fyne
//
// This example demonstrates that Fyne CAN handle draggable icons with
// click events, proving the limitation in docs/fyne-stack-click-limitation.md
// can be worked around with proper widget implementation.
//
// Run with: cd bridge && go run ./cmd/draggable-icons
//
// Key insight: The Stack limitation occurs when you try to layer containers.
// The solution is to use a SINGLE container with custom widgets that handle
// their own positioning, dragging, and click events.

package main

import (
	"fmt"
	"image/color"
	"log"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// DraggableIcon is a desktop icon that can be dragged freely
type DraggableIcon struct {
	widget.BaseWidget

	ID       string
	Label    string
	IconRect *canvas.Rectangle
	TextObj  *canvas.Text

	// Position tracking
	posX, posY float32

	// Drag state
	dragging   bool
	dragStartX float32
	dragStartY float32

	// Double-click detection
	lastTapTime time.Time

	// Reference to parent container for repositioning
	desktop *DesktopCanvas
}

// NewDraggableIcon creates a new draggable icon
func NewDraggableIcon(id, label string, iconColor color.Color, x, y float32, desktop *DesktopCanvas) *DraggableIcon {
	icon := &DraggableIcon{
		ID:      id,
		Label:   label,
		posX:    x,
		posY:    y,
		desktop: desktop,
	}

	// Create the icon rectangle (64x64)
	icon.IconRect = canvas.NewRectangle(iconColor)
	icon.IconRect.SetMinSize(fyne.NewSize(64, 64))
	icon.IconRect.CornerRadius = 8

	// Create the text label
	icon.TextObj = canvas.NewText(label, color.White)
	icon.TextObj.Alignment = fyne.TextAlignCenter
	icon.TextObj.TextSize = 12

	icon.ExtendBaseWidget(icon)
	return icon
}

// CreateRenderer returns the widget renderer
func (d *DraggableIcon) CreateRenderer() fyne.WidgetRenderer {
	// Stack icon and text vertically
	content := container.NewVBox(
		container.NewCenter(d.IconRect),
		container.NewCenter(d.TextObj),
	)
	return widget.NewSimpleRenderer(content)
}

// MinSize returns the minimum size of the icon
func (d *DraggableIcon) MinSize() fyne.Size {
	return fyne.NewSize(80, 90)
}

// Tapped handles single tap/click - used for double-click detection
func (d *DraggableIcon) Tapped(e *fyne.PointEvent) {
	now := time.Now()
	elapsed := now.Sub(d.lastTapTime)

	if elapsed < 400*time.Millisecond {
		// Double-click detected!
		log.Printf("[DOUBLE-CLICK] Icon '%s' (ID: %s) was double-clicked at position (%.0f, %.0f)",
			d.Label, d.ID, d.posX, d.posY)
		fmt.Printf(">>> DOUBLE-CLICK: %s (ID: %s)\n", d.Label, d.ID)
	} else {
		log.Printf("[CLICK] Icon '%s' (ID: %s) single-clicked", d.Label, d.ID)
	}

	d.lastTapTime = now
}

// Dragged handles drag events
func (d *DraggableIcon) Dragged(e *fyne.DragEvent) {
	if !d.dragging {
		d.dragging = true
		d.dragStartX = d.posX
		d.dragStartY = d.posY
		log.Printf("[DRAG-START] Icon '%s' starting drag from (%.0f, %.0f)",
			d.Label, d.posX, d.posY)
	}

	// Calculate new position based on drag delta
	dx := e.Dragged.DX
	dy := e.Dragged.DY

	d.posX += dx
	d.posY += dy

	// Ensure icon stays within bounds (minimum 0,0)
	if d.posX < 0 {
		d.posX = 0
	}
	if d.posY < 0 {
		d.posY = 0
	}

	log.Printf("[DRAGGING] Icon '%s' dx=%.1f, dy=%.1f -> new pos (%.0f, %.0f)",
		d.Label, dx, dy, d.posX, d.posY)

	// Update position in the desktop
	if d.desktop != nil {
		d.desktop.MoveIcon(d)
	}
}

// DragEnd handles the end of a drag operation
func (d *DraggableIcon) DragEnd() {
	if d.dragging {
		totalDX := d.posX - d.dragStartX
		totalDY := d.posY - d.dragStartY
		log.Printf("[DROP] Icon '%s' dropped at (%.0f, %.0f) - total movement: dx=%.0f, dy=%.0f",
			d.Label, d.posX, d.posY, totalDX, totalDY)
		fmt.Printf(">>> DROP: %s at (%.0f, %.0f)\n", d.Label, d.posX, d.posY)
		d.dragging = false
	}
}

// DesktopCanvas is a container that allows free positioning of icons
type DesktopCanvas struct {
	widget.BaseWidget

	icons   []*DraggableIcon
	bgColor color.Color
}

// NewDesktopCanvas creates a new desktop canvas
func NewDesktopCanvas() *DesktopCanvas {
	dc := &DesktopCanvas{
		icons:   make([]*DraggableIcon, 0),
		bgColor: color.RGBA{R: 30, G: 60, B: 90, A: 255}, // Dark blue desktop
	}
	dc.ExtendBaseWidget(dc)
	return dc
}

// AddIcon adds an icon to the desktop at the specified position
func (dc *DesktopCanvas) AddIcon(icon *DraggableIcon) {
	dc.icons = append(dc.icons, icon)
	dc.Refresh()
}

// MoveIcon updates the position of an icon
func (dc *DesktopCanvas) MoveIcon(icon *DraggableIcon) {
	dc.Refresh()
}

// CreateRenderer returns the widget renderer for the desktop
func (dc *DesktopCanvas) CreateRenderer() fyne.WidgetRenderer {
	return &desktopRenderer{
		desktop: dc,
		bg:      canvas.NewRectangle(dc.bgColor),
	}
}

// desktopRenderer handles the rendering of the desktop
type desktopRenderer struct {
	desktop *DesktopCanvas
	bg      *canvas.Rectangle
}

func (r *desktopRenderer) Layout(size fyne.Size) {
	r.bg.Resize(size)
	r.bg.Move(fyne.NewPos(0, 0))

	// Position each icon at its stored position
	for _, icon := range r.desktop.icons {
		iconSize := icon.MinSize()
		icon.Resize(iconSize)
		icon.Move(fyne.NewPos(icon.posX, icon.posY))
	}
}

func (r *desktopRenderer) MinSize() fyne.Size {
	return fyne.NewSize(800, 600)
}

func (r *desktopRenderer) Refresh() {
	r.bg.FillColor = r.desktop.bgColor
	r.bg.Refresh()
	for _, icon := range r.desktop.icons {
		icon.Refresh()
	}
}

func (r *desktopRenderer) Objects() []fyne.CanvasObject {
	objects := []fyne.CanvasObject{r.bg}
	for _, icon := range r.desktop.icons {
		objects = append(objects, icon)
	}
	return objects
}

func (r *desktopRenderer) Destroy() {}

func main() {
	log.SetFlags(log.Ltime | log.Lmicroseconds)
	log.Println("Starting Draggable Icons Demo")
	fmt.Println("=== Draggable Desktop Icons Demo ===")
	fmt.Println("- Drag icons anywhere on the desktop")
	fmt.Println("- Double-click an icon to see its ID")
	fmt.Println("- Watch the console for drag/drop events")
	fmt.Println("=====================================")

	myApp := app.New()
	myWindow := myApp.NewWindow("Draggable Desktop Icons - Fyne Demo")
	myWindow.Resize(fyne.NewSize(800, 600))

	// Create the desktop canvas
	desktop := NewDesktopCanvas()

	// Create some icons with different colors and positions
	iconColors := []color.Color{
		color.RGBA{R: 220, G: 50, B: 50, A: 255},   // Red
		color.RGBA{R: 50, G: 180, B: 50, A: 255},   // Green
		color.RGBA{R: 50, G: 100, B: 220, A: 255},  // Blue
		color.RGBA{R: 220, G: 180, B: 50, A: 255},  // Yellow
		color.RGBA{R: 180, G: 50, B: 180, A: 255},  // Purple
		color.RGBA{R: 50, G: 180, B: 180, A: 255},  // Cyan
	}

	iconNames := []string{
		"Documents",
		"Pictures",
		"Terminal",
		"Settings",
		"Browser",
		"Trash",
	}

	// Create icons in a grid-like initial layout
	for i, name := range iconNames {
		col := i % 3
		row := i / 3
		x := float32(50 + col*120)
		y := float32(50 + row*120)

		icon := NewDraggableIcon(
			fmt.Sprintf("icon-%d", i+1),
			name,
			iconColors[i],
			x, y,
			desktop,
		)
		desktop.AddIcon(icon)
		log.Printf("Created icon '%s' at (%.0f, %.0f)", name, x, y)
	}

	myWindow.SetContent(desktop)
	log.Println("Window ready - starting event loop")
	myWindow.ShowAndRun()
}
