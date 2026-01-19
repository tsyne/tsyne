package main

import (
	"image"
	"image/color"
	"image/draw"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/theme"
	"github.com/golang/freetype"
	"github.com/golang/freetype/truetype"
	"golang.org/x/image/font"
)

// ============================================================================
// Canvas Text Primitives: Text, GradientText, RainbowT
// ============================================================================

func (b *Bridge) handleCreateCanvasText(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)

	canvasText := canvas.NewText(text, color.Black)

	// Set text color if provided
	if colorHex, ok := msg.Payload["color"].(string); ok {
		canvasText.Color = parseHexColorSimple(colorHex)
	}

	// Set text size if provided
	if textSize, ok := getFloat64(msg.Payload["textSize"]); ok {
		canvasText.TextSize = float32(textSize)
	}

	// Set text style
	if bold, ok := msg.Payload["bold"].(bool); ok && bold {
		canvasText.TextStyle.Bold = true
	}
	if italic, ok := msg.Payload["italic"].(bool); ok && italic {
		canvasText.TextStyle.Italic = true
	}
	if monospace, ok := msg.Payload["monospace"].(bool); ok && monospace {
		canvasText.TextStyle.Monospace = true
	}

	// Set alignment
	if alignment, ok := msg.Payload["alignment"].(string); ok {
		switch alignment {
		case "leading":
			canvasText.Alignment = fyne.TextAlignLeading
		case "center":
			canvasText.Alignment = fyne.TextAlignCenter
		case "trailing":
			canvasText.Alignment = fyne.TextAlignTrailing
		}
	}

	// Set position if provided
	if x, ok := getFloat64(msg.Payload["x"]); ok {
		if y, ok := getFloat64(msg.Payload["y"]); ok {
			canvasText.Move(fyne.NewPos(float32(x), float32(y)))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = canvasText
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvastext", Text: text}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasText(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Text widget not found",
		}
	}

	canvasText, ok := w.(*canvas.Text)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a text",
		}
	}

	fyne.DoAndWait(func() {
		// Update text if provided
		if text, ok := msg.Payload["text"].(string); ok {
			canvasText.Text = text
			// Update metadata
			b.mu.Lock()
			if meta, exists := b.widgetMeta[widgetID]; exists {
				meta.Text = text
				b.widgetMeta[widgetID] = meta
			}
			b.mu.Unlock()
		}

		// Update color if provided
		if colorHex, ok := msg.Payload["color"].(string); ok {
			canvasText.Color = parseHexColorSimple(colorHex)
		}

		// Update text size if provided
		if textSize, ok := getFloat64(msg.Payload["textSize"]); ok {
			canvasText.TextSize = float32(textSize)
		}

		// Update position if provided
		if x, ok := getFloat64(msg.Payload["x"]); ok {
			if y, ok := getFloat64(msg.Payload["y"]); ok {
				canvasText.Move(fyne.NewPos(float32(x), float32(y)))
			}
		}

		canvasText.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleCreateCanvasRainbowT creates a "T" letter with rainbow gradient (legacy)
func (b *Bridge) handleCreateCanvasRainbowT(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	x := toFloat32(msg.Payload["x"])
	y := toFloat32(msg.Payload["y"])
	width := toFloat32(msg.Payload["width"])
	height := toFloat32(msg.Payload["height"])

	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		// T shape: top bar and vertical stem
		fx := float64(px) / float64(w)
		fy := float64(py) / float64(h)

		inT := false
		if fy < 0.28 {
			inT = true
		}
		if fy >= 0.28 && fx >= 0.32 && fx <= 0.68 {
			inT = true
		}

		if !inT {
			return color.RGBA{A: 0}
		}

		return rainbowColor(fy)
	})

	raster.Move(fyne.NewPos(x, y))
	raster.Resize(fyne.NewSize(width, height))
	raster.SetMinSize(fyne.NewSize(width, height))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasrainbowt", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

// handleCreateCanvasGradientText creates text with a vertical gradient fill
// Uses Fyne's theme font with freetype for rendering
func (b *Bridge) handleCreateCanvasGradientText(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)

	x := toFloat32(msg.Payload["x"])
	y := toFloat32(msg.Payload["y"])
	fontSize := float64(48)
	if fs, ok := getFloat64(msg.Payload["fontSize"]); ok {
		fontSize = fs
	}

	gradientType := "rainbow"
	if gt, ok := msg.Payload["gradient"].(string); ok {
		gradientType = gt
	}

	bold := false
	if b, ok := msg.Payload["bold"].(bool); ok {
		bold = b
	}

	direction := "down" // default: ROYGBIV top to bottom
	if d, ok := msg.Payload["direction"].(string); ok {
		direction = d
	}

	// Load Fyne's font (bold or regular)
	var fontResource fyne.Resource
	if bold {
		fontResource = theme.DefaultTextBoldFont()
	} else {
		fontResource = theme.DefaultTextFont()
	}
	ttFont, err := truetype.Parse(fontResource.Content())
	if err != nil {
		return Response{ID: msg.ID, Success: false, Error: "failed to parse font: " + err.Error()}
	}

	// Create freetype context to measure and render text
	ctx := freetype.NewContext()
	ctx.SetDPI(72)
	ctx.SetFont(ttFont)
	ctx.SetFontSize(fontSize)

	// Measure text bounds
	opts := truetype.Options{Size: fontSize, DPI: 72}
	face := truetype.NewFace(ttFont, &opts)
	textWidth := font.MeasureString(face, text).Ceil()
	metrics := face.Metrics()
	ascent := metrics.Ascent.Ceil()
	descent := metrics.Descent.Ceil()
	textHeight := ascent + descent

	// Minimal padding
	padX := 2
	padY := 2
	width := textWidth + padX*2
	height := textHeight + padY*2

	// Text top and bottom within the image (for gradient mapping)
	textTop := padY
	textBottom := padY + textHeight

	// Create mask image (white text on transparent background)
	maskImg := image.NewRGBA(image.Rect(0, 0, width, height))
	draw.Draw(maskImg, maskImg.Bounds(), image.Transparent, image.Point{}, draw.Src)

	// Render text to mask
	ctx.SetClip(maskImg.Bounds())
	ctx.SetDst(maskImg)
	ctx.SetSrc(image.White)

	// Position text (baseline is at ascent from top + padding)
	pt := freetype.Pt(padX, padY+ascent)
	ctx.DrawString(text, pt)

	// Scan the mask to find actual text bounds (where pixels exist)
	actualTop := height
	actualBottom := 0
	actualLeft := width
	actualRight := 0
	for iy := 0; iy < height; iy++ {
		for ix := 0; ix < width; ix++ {
			_, _, _, a := maskImg.At(ix, iy).RGBA()
			if a > 0x8000 {
				if iy < actualTop {
					actualTop = iy
				}
				if iy > actualBottom {
					actualBottom = iy
				}
				if ix < actualLeft {
					actualLeft = ix
				}
				if ix > actualRight {
					actualRight = ix
				}
			}
		}
	}
	// Ensure we have valid bounds
	if actualTop >= actualBottom {
		actualTop = textTop
		actualBottom = textBottom
	}
	if actualLeft >= actualRight {
		actualLeft = 0
		actualRight = width
	}

	// Create raster that applies gradient to mask
	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		// Scale coordinates if raster size differs from mask size
		mx := px * width / w
		my := py * height / h

		if mx >= width || my >= height {
			return color.RGBA{A: 0}
		}

		// Sample the mask
		c := maskImg.At(mx, my)
		_, _, _, a := c.RGBA()

		// If pixel has content (check alpha)
		if a > 0x8000 {
			// Calculate gradient position based on direction
			var t float64
			switch direction {
			case "up":
				// ROYGBIV bottom to top (reverse of down)
				t = 1.0 - float64(my-actualTop)/float64(actualBottom-actualTop)
			case "left":
				// ROYGBIV right to left
				t = 1.0 - float64(mx-actualLeft)/float64(actualRight-actualLeft)
			case "right":
				// ROYGBIV left to right
				t = float64(mx-actualLeft) / float64(actualRight-actualLeft)
			default: // "down"
				// ROYGBIV top to bottom
				t = float64(my-actualTop) / float64(actualBottom-actualTop)
			}
			if t < 0 {
				t = 0
			}
			if t > 1 {
				t = 1
			}
			if gradientType == "rainbow" {
				return rainbowColor(t)
			}
			return rainbowColor(t)
		}

		return color.RGBA{A: 0}
	})

	raster.Move(fyne.NewPos(x, y))
	raster.Resize(fyne.NewSize(float32(width), float32(height)))
	raster.SetMinSize(fyne.NewSize(float32(width), float32(height)))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasgradienttext", Text: text}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID, "width": width, "height": height},
	}
}
