package main

import (
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
)

// ColorCell is a tappable cell with a colored background and centered text.
// Useful for game boards (Sudoku, chess), spreadsheets, color pickers, etc.
type ColorCell struct {
	widget.BaseWidget
	text        string
	fillColor   color.Color
	textColor   color.Color
	borderColor color.Color
	borderWidth float32
	width       float32
	height      float32
	centerText  bool // whether to center text (default true)
	onTapped    func()
}

// NewColorCell creates a new ColorCell with default colors
func NewColorCell(width, height float32) *ColorCell {
	c := &ColorCell{
		fillColor:   theme.BackgroundColor(),
		textColor:   theme.ForegroundColor(),
		borderColor: color.NRGBA{R: 128, G: 128, B: 128, A: 255}, // Gray border by default
		borderWidth: 1,
		width:       width,
		height:      height,
		centerText:  true,
	}
	c.ExtendBaseWidget(c)
	return c
}

// SetText sets the cell's text
func (c *ColorCell) SetText(text string) {
	c.text = text
	c.Refresh()
}

// SetFillColor sets the background color
func (c *ColorCell) SetFillColor(col color.Color) {
	c.fillColor = col
	c.Refresh()
}

// SetTextColor sets the text color
func (c *ColorCell) SetTextColor(col color.Color) {
	c.textColor = col
	c.Refresh()
}

// SetBorderColor sets the border color
func (c *ColorCell) SetBorderColor(col color.Color) {
	c.borderColor = col
	c.Refresh()
}

// SetBorderWidth sets the border width
func (c *ColorCell) SetBorderWidth(width float32) {
	c.borderWidth = width
	c.Refresh()
}

// SetCenterText sets whether text should be centered
func (c *ColorCell) SetCenterText(center bool) {
	c.centerText = center
	c.Refresh()
}

// SetOnTapped sets the tap callback
func (c *ColorCell) SetOnTapped(fn func()) {
	c.onTapped = fn
}

// Tapped handles tap/click events
func (c *ColorCell) Tapped(*fyne.PointEvent) {
	if c.onTapped != nil {
		c.onTapped()
	}
}

// MinSize returns the minimum size of the cell
func (c *ColorCell) MinSize() fyne.Size {
	return fyne.NewSize(c.width, c.height)
}

// CreateRenderer returns the widget renderer
func (c *ColorCell) CreateRenderer() fyne.WidgetRenderer {
	bg := canvas.NewRectangle(c.fillColor)
	bg.StrokeColor = c.borderColor
	bg.StrokeWidth = c.borderWidth

	text := canvas.NewText(c.text, c.textColor)
	text.TextStyle = fyne.TextStyle{Bold: true}

	return &colorCellRenderer{
		cell: c,
		bg:   bg,
		text: text,
	}
}

// colorCellRenderer handles the rendering of ColorCell
type colorCellRenderer struct {
	cell *ColorCell
	bg   *canvas.Rectangle
	text *canvas.Text
}

func (r *colorCellRenderer) Layout(size fyne.Size) {
	r.bg.Resize(size)

	textSize := r.text.MinSize()

	if r.cell.centerText {
		// Center both horizontally and vertically
		r.text.Move(fyne.NewPos(
			(size.Width-textSize.Width)/2,
			(size.Height-textSize.Height)/2,
		))
	} else {
		// Default positioning (top-left with small padding)
		r.text.Move(fyne.NewPos(2, 2))
	}
	r.text.Resize(textSize)
}

func (r *colorCellRenderer) MinSize() fyne.Size {
	return r.cell.MinSize()
}

func (r *colorCellRenderer) Refresh() {
	r.bg.FillColor = r.cell.fillColor
	r.bg.StrokeColor = r.cell.borderColor
	r.bg.StrokeWidth = r.cell.borderWidth
	r.text.Text = r.cell.text
	r.text.Color = r.cell.textColor
	r.bg.Refresh()
	r.text.Refresh()
	canvas.Refresh(r.cell) // Ensure layout is recalculated
}

func (r *colorCellRenderer) Objects() []fyne.CanvasObject {
	return []fyne.CanvasObject{r.bg, r.text}
}

func (r *colorCellRenderer) Destroy() {}

// ============================================================================
// Bridge Handlers
// ============================================================================

func (b *Bridge) handleCreateColorCell(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Get dimensions with defaults
	width := float32(40)
	height := float32(40)
	if w, ok := getFloat64(msg.Payload["width"]); ok {
		width = float32(w)
	}
	if h, ok := getFloat64(msg.Payload["height"]); ok {
		height = float32(h)
	}

	cell := NewColorCell(width, height)

	// Set initial text
	if text, ok := msg.Payload["text"].(string); ok {
		cell.text = text
	}

	// Set fill color
	if fillColor, ok := msg.Payload["fillColor"].(string); ok {
		cell.fillColor = parseHexColorSimple(fillColor)
	}

	// Set text color
	if textColor, ok := msg.Payload["textColor"].(string); ok {
		cell.textColor = parseHexColorSimple(textColor)
	}

	// Set border color
	if borderColor, ok := msg.Payload["borderColor"].(string); ok {
		cell.borderColor = parseHexColorSimple(borderColor)
	}

	// Set border width
	if borderWidth, ok := getFloat64(msg.Payload["borderWidth"]); ok {
		cell.borderWidth = float32(borderWidth)
	}

	// Set center text (default is true)
	if centerText, ok := msg.Payload["centerText"].(bool); ok {
		cell.centerText = centerText
	}

	// Set tap callback
	if callbackId, ok := msg.Payload["callbackId"].(string); ok {
		cell.SetOnTapped(func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": callbackId,
				},
			})
		})
	}

	b.mu.Lock()
	b.widgets[widgetID] = cell
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "colorcell", Text: cell.text}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateColorCell(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	widget, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "ColorCell not found: " + widgetID,
		}
	}

	cell, ok := widget.(*ColorCell)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a ColorCell",
		}
	}

	fyne.Do(func() {
		if text, ok := msg.Payload["text"].(string); ok {
			cell.SetText(text)
		}
		if fillColor, ok := msg.Payload["fillColor"].(string); ok {
			cell.SetFillColor(parseHexColorSimple(fillColor))
		}
		if textColor, ok := msg.Payload["textColor"].(string); ok {
			cell.SetTextColor(parseHexColorSimple(textColor))
		}
		if borderColor, ok := msg.Payload["borderColor"].(string); ok {
			cell.SetBorderColor(parseHexColorSimple(borderColor))
		}
		if borderWidth, ok := getFloat64(msg.Payload["borderWidth"]); ok {
			cell.SetBorderWidth(float32(borderWidth))
		}
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
