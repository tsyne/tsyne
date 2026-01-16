package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	_ "image/png" // Register PNG decoder for blitImage
	"sort"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/theme"
	"github.com/golang/freetype"
	"github.com/golang/freetype/truetype"
	"golang.org/x/image/font"
)

// ============================================================================
// Sprite System - Efficient dirty rectangle based animation
// ============================================================================

// RasterSprite represents a movable image layer on a CanvasRaster
type RasterSprite struct {
	Name         string
	ResourceName string
	X, Y         int
	Width        int // Cached from decoded image
	Height       int // Cached from decoded image
	ZIndex       int
	Visible      bool
	Image        image.Image // Cached decoded image
}

// DirtyRect represents a rectangular region that needs redrawing
type DirtyRect struct {
	X, Y          int
	Width, Height int
}

// RasterSpriteSystem holds sprite state for a CanvasRaster
type RasterSpriteSystem struct {
	Background [][]color.Color      // Saved static background
	Sprites    map[string]*RasterSprite
	DirtyRects []DirtyRect
}

// AddDirty adds a dirty rectangle, merging with existing if overlapping
func (s *RasterSpriteSystem) AddDirty(x, y, w, h int) {
	// Simple approach: just add to list (could optimize with merging later)
	s.DirtyRects = append(s.DirtyRects, DirtyRect{X: x, Y: y, Width: w, Height: h})
}

// ClearDirty clears the dirty rectangle list
func (s *RasterSpriteSystem) ClearDirty() {
	s.DirtyRects = s.DirtyRects[:0]
}

// GetSortedSprites returns sprites sorted by z-index (lowest first)
func (s *RasterSpriteSystem) GetSortedSprites() []*RasterSprite {
	sprites := make([]*RasterSprite, 0, len(s.Sprites))
	for _, sp := range s.Sprites {
		if sp.Visible {
			sprites = append(sprites, sp)
		}
	}
	sort.Slice(sprites, func(i, j int) bool {
		return sprites[i].ZIndex < sprites[j].ZIndex
	})
	return sprites
}

// ============================================================================
// Canvas Primitives: Line, Circle, Rectangle, Text, Raster, LinearGradient
// ============================================================================

func (b *Bridge) handleCreateCanvasLine(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	x1 := toFloat32(msg.Payload["x1"])
	y1 := toFloat32(msg.Payload["y1"])
	x2 := toFloat32(msg.Payload["x2"])
	y2 := toFloat32(msg.Payload["y2"])

	line := canvas.NewLine(color.Black)
	// Position1 and Position2 are absolute coordinates in the parent's space
	line.Position1 = fyne.NewPos(x1, y1)
	line.Position2 = fyne.NewPos(x2, y2)

	// Set stroke color if provided
	if colorHex, ok := msg.Payload["strokeColor"].(string); ok {
		line.StrokeColor = parseHexColorSimple(colorHex)
	}

	// Set stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"]; ok {
		line.StrokeWidth = toFloat32(strokeWidth)
	}

	b.mu.Lock()
	b.widgets[widgetID] = line
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasline", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleCreateCanvasCircle(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	circle := canvas.NewCircle(color.Transparent)

	// Set fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		circle.FillColor = parseHexColorSimple(fillHex)
	}

	// Set stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		circle.StrokeColor = parseHexColorSimple(strokeHex)
	}

	// Set stroke width if provided
	if strokeWidth, ok := msg.Payload["strokeWidth"]; ok {
		circle.StrokeWidth = toFloat32(strokeWidth)
	}

	// Set position and size
	if x, ok := msg.Payload["x"]; ok {
		if y, ok := msg.Payload["y"]; ok {
			circle.Position1 = fyne.NewPos(toFloat32(x), toFloat32(y))
		}
	}
	if x2, ok := msg.Payload["x2"]; ok {
		if y2, ok := msg.Payload["y2"]; ok {
			circle.Position2 = fyne.NewPos(toFloat32(x2), toFloat32(y2))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = circle
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvascircle", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

// EllipseData stores ellipse parameters for updates
type EllipseData struct {
	X, Y, Width, Height float32
	FillColor           color.RGBA
}

// handleCreateCanvasEllipse creates an ellipse using a raster
func (b *Bridge) handleCreateCanvasEllipse(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	x := toFloat32(msg.Payload["x"])
	y := toFloat32(msg.Payload["y"])
	width := toFloat32(msg.Payload["width"])
	height := toFloat32(msg.Payload["height"])

	var fillColor color.RGBA = color.RGBA{R: 128, G: 128, B: 128, A: 255}
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		if parsed, ok := parseHexColorSimple(fillHex).(color.RGBA); ok {
			fillColor = parsed
		}
	}

	// Store ellipse data for updates
	b.mu.Lock()
	if b.ellipseData == nil {
		b.ellipseData = make(map[string]*EllipseData)
	}
	b.ellipseData[widgetID] = &EllipseData{x, y, width, height, fillColor}
	b.mu.Unlock()

	ellipseID := widgetID

	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		b.mu.RLock()
		data := b.ellipseData[ellipseID]
		if data == nil {
			b.mu.RUnlock()
			return color.RGBA{A: 0}
		}
		fill := data.FillColor
		b.mu.RUnlock()

		// Ellipse equation: (x/a)^2 + (y/b)^2 <= 1
		cx := float64(w) / 2
		cy := float64(h) / 2
		a := float64(w) / 2
		b := float64(h) / 2

		dx := float64(px) - cx
		dy := float64(py) - cy

		if (dx*dx)/(a*a)+(dy*dy)/(b*b) <= 1.0 {
			return fill
		}
		return color.RGBA{A: 0}
	})

	raster.Move(fyne.NewPos(x, y))
	raster.Resize(fyne.NewSize(width, height))
	raster.SetMinSize(fyne.NewSize(width, height))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasellipse", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasEllipse(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	data, dataExists := b.ellipseData[widgetID]
	b.mu.RUnlock()

	if !exists || !dataExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Ellipse widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an ellipse raster",
		}
	}

	b.mu.Lock()
	if x, ok := getFloat64(msg.Payload["x"]); ok {
		data.X = float32(x)
	}
	if y, ok := getFloat64(msg.Payload["y"]); ok {
		data.Y = float32(y)
	}
	newX := data.X
	newY := data.Y
	b.mu.Unlock()

	fyne.DoAndWait(func() {
		raster.Move(fyne.NewPos(newX, newY))
		raster.Refresh()
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

// rainbowColor returns a rainbow color based on t (0 to 1, top to bottom)
func rainbowColor(t float64) color.RGBA {
	// ROYGBIV rainbow: Red -> Orange -> Yellow -> Green -> Blue -> Indigo -> Violet
	// Map t (0-1) to hue, with red at top (t=0) and violet at bottom (t=1)
	var r, g, b uint8

	if t < 0.143 {
		// Red (pure red)
		r = 255
		g = uint8(165 * (t / 0.143)) // fade toward orange
		b = 0
	} else if t < 0.286 {
		// Orange -> Yellow
		r = 255
		g = uint8(165 + 90*((t-0.143)/0.143)) // 165 -> 255
		b = 0
	} else if t < 0.429 {
		// Yellow -> Green
		r = uint8(255 * (1 - (t-0.286)/0.143))
		g = 255
		b = 0
	} else if t < 0.571 {
		// Green -> Blue
		r = 0
		g = uint8(255 * (1 - (t-0.429)/0.142))
		b = uint8(255 * ((t - 0.429) / 0.142))
	} else if t < 0.714 {
		// Blue (pure blue)
		r = 0
		g = 0
		b = 255
	} else if t < 0.857 {
		// Blue -> Indigo
		r = uint8(75 * ((t - 0.714) / 0.143))
		g = 0
		b = uint8(255 - 55*((t-0.714)/0.143)) // 255 -> 200
	} else {
		// Indigo -> Violet
		r = uint8(75 + 73*((t-0.857)/0.143)) // 75 -> 148
		g = 0
		b = uint8(200 + 11*((t-0.857)/0.143)) // 200 -> 211
	}

	return color.RGBA{R: r, G: g, B: b, A: 255}
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
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			_, _, _, a := maskImg.At(x, y).RGBA()
			if a > 0x8000 {
				if y < actualTop {
					actualTop = y
				}
				if y > actualBottom {
					actualBottom = y
				}
				if x < actualLeft {
					actualLeft = x
				}
				if x > actualRight {
					actualRight = x
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

func (b *Bridge) handleCreateCanvasRectangle(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	rect := canvas.NewRectangle(color.Transparent)

	// Set fill color if provided
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		rect.FillColor = parseHexColorSimple(fillHex)
	}

	// Set stroke color if provided
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		rect.StrokeColor = parseHexColorSimple(strokeHex)
	}

	// Set stroke width if provided
	if strokeWidth, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
		rect.StrokeWidth = float32(strokeWidth)
	}

	// Set corner radius if provided
	if radius, ok := getFloat64(msg.Payload["cornerRadius"]); ok {
		rect.CornerRadius = float32(radius)
	}

	// Set position and size from x, y, x2, y2 coordinates
	// Rectangle uses Move/Resize unlike Circle which has Position1/Position2
	var posX, posY, x2Val, y2Val float32
	hasPos := false
	hasSize := false
	if x, ok := msg.Payload["x"]; ok {
		posX = toFloat32(x)
		hasPos = true
	}
	if y, ok := msg.Payload["y"]; ok {
		posY = toFloat32(y)
	}
	if x2, ok := msg.Payload["x2"]; ok {
		x2Val = toFloat32(x2)
		hasSize = true
	}
	if y2, ok := msg.Payload["y2"]; ok {
		y2Val = toFloat32(y2)
	}
	if hasPos {
		rect.Move(fyne.NewPos(posX, posY))
	}
	if hasSize {
		rect.Resize(fyne.NewSize(x2Val-posX, y2Val-posY))
	}

	// Set minimum size if provided (alternative to x2, y2)
	if width, ok := getFloat64(msg.Payload["width"]); ok {
		if height, ok := getFloat64(msg.Payload["height"]); ok {
			rect.SetMinSize(fyne.NewSize(float32(width), float32(height)))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = rect
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasrectangle", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

// handleCreateTappableCanvasRectangle creates a tappable canvas rectangle widget
func (b *Bridge) handleCreateTappableCanvasRectangle(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Get dimensions
	width := toFloat32(msg.Payload["width"])
	height := toFloat32(msg.Payload["height"])

	// Get fill color
	var fillColor color.Color = color.Transparent
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		fillColor = parseHexColorSimple(fillHex)
	}

	// Get stroke color
	var strokeColor color.Color = nil
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		strokeColor = parseHexColorSimple(strokeHex)
	}

	// Get stroke width
	var strokeWidth float32 = 0
	if sw, ok := msg.Payload["strokeWidth"]; ok {
		strokeWidth = toFloat32(sw)
	}

	// Get corner radius
	var cornerRadius float32 = 0
	if radius, ok := msg.Payload["cornerRadius"]; ok {
		cornerRadius = toFloat32(radius)
	}

	// Create the tappable rectangle with callback
	tappable := NewTappableCanvasRectangle(width, height, fillColor, strokeColor, strokeWidth, cornerRadius, func(x, y int) {
		b.sendEvent(Event{
			Type:     "canvasRectangleTapped",
			WidgetID: widgetID,
			Data: map[string]interface{}{
				"x": x,
				"y": y,
			},
		})
	})

	b.mu.Lock()
	b.widgets[widgetID] = tappable
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "tappablecanvasrectangle", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

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

func (b *Bridge) handleCreateCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	width := toInt(msg.Payload["width"])
	height := toInt(msg.Payload["height"])

	// Get the initial pixel data if provided (format: [[r,g,b,a], ...])
	var pixelData [][]uint8
	if pixels, ok := msg.Payload["pixels"].([]interface{}); ok {
		for _, p := range pixels {
			if pArr, ok := p.([]interface{}); ok {
				pixel := make([]uint8, 4)
				for i := 0; i < 4 && i < len(pArr); i++ {
					pixel[i] = uint8(toInt(pArr[i]))
				}
				pixelData = append(pixelData, pixel)
			}
		}
	}

	// Create pixel buffer
	pixelBuffer := make([][]color.Color, height)
	for y := 0; y < height; y++ {
		pixelBuffer[y] = make([]color.Color, width)
		for x := 0; x < width; x++ {
			pixelIdx := y*width + x
			if pixelIdx < len(pixelData) {
				p := pixelData[pixelIdx]
				pixelBuffer[y][x] = color.RGBA{R: p[0], G: p[1], B: p[2], A: p[3]}
			} else {
				pixelBuffer[y][x] = color.RGBA{R: 255, G: 255, B: 255, A: 255} // Default white
			}
		}
	}

	// Store pixel buffer for later updates
	b.mu.Lock()
	if b.rasterData == nil {
		b.rasterData = make(map[string][][]color.Color)
	}
	b.rasterData[widgetID] = pixelBuffer
	b.mu.Unlock()

	// Create raster with generator function
	// Store the original dimensions for the generator to use
	origWidth := width
	origHeight := height
	raster := canvas.NewRasterWithPixels(func(x, y, w, h int) color.Color {
		// Scale coordinates from display size (w, h) to buffer size (origWidth, origHeight)
		bufX := x * origWidth / w
		bufY := y * origHeight / h
		if bufX >= origWidth {
			bufX = origWidth - 1
		}
		if bufY >= origHeight {
			bufY = origHeight - 1
		}

		b.mu.RLock()
		defer b.mu.RUnlock()
		if buf, ok := b.rasterData[widgetID]; ok {
			if bufY < len(buf) && bufX < len(buf[bufY]) {
				return buf[bufY][bufX]
			}
		}
		return color.White
	})

	raster.SetMinSize(fyne.NewSize(float32(width), float32(height)))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasraster", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Raster widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a raster",
		}
	}

	// Update individual pixels if provided
	if updates, ok := msg.Payload["updates"].([]interface{}); ok {
		b.mu.Lock()
		buf := b.rasterData[widgetID]
		for _, upd := range updates {
			if updMap, ok := upd.(map[string]interface{}); ok {
				x := toInt(updMap["x"])
				y := toInt(updMap["y"])
				r := uint8(toInt(updMap["r"]))
				g := uint8(toInt(updMap["g"]))
				bl := uint8(toInt(updMap["b"]))
				a := uint8(toInt(updMap["a"]))

				if y >= 0 && y < len(buf) && x >= 0 && x < len(buf[y]) {
					buf[y][x] = color.RGBA{R: r, G: g, B: bl, A: a}
				}
			}
		}
		b.mu.Unlock()
	}

	// Refresh the raster to show updates (must be done on main thread)
	fyne.Do(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleFillCanvasRasterRect fills a rectangular region with a solid color
func (b *Bridge) handleFillCanvasRasterRect(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Raster widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a raster",
		}
	}

	// Get fill parameters
	x := toInt(msg.Payload["x"])
	y := toInt(msg.Payload["y"])
	width := toInt(msg.Payload["width"])
	height := toInt(msg.Payload["height"])
	r := uint8(toInt(msg.Payload["r"]))
	g := uint8(toInt(msg.Payload["g"]))
	bl := uint8(toInt(msg.Payload["b"]))
	a := uint8(toInt(msg.Payload["a"]))

	fillColor := color.RGBA{R: r, G: g, B: bl, A: a}

	b.mu.Lock()
	buf := b.rasterData[widgetID]
	if buf != nil {
		bufHeight := len(buf)
		bufWidth := 0
		if bufHeight > 0 {
			bufWidth = len(buf[0])
		}

		// Fill the rectangle with bounds checking
		for dy := 0; dy < height; dy++ {
			py := y + dy
			if py < 0 || py >= bufHeight {
				continue
			}
			for dx := 0; dx < width; dx++ {
				px := x + dx
				if px < 0 || px >= bufWidth {
					continue
				}
				buf[py][px] = fillColor
			}
		}
	}
	b.mu.Unlock()

	// Refresh the raster
	fyne.Do(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleBlitToCanvasRaster copies a registered image resource onto the raster
func (b *Bridge) handleBlitToCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	resourceName := msg.Payload["resourceName"].(string)
	destX := toInt(msg.Payload["x"])
	destY := toInt(msg.Payload["y"])
	alpha := 255
	if a, ok := getFloat64(msg.Payload["alpha"]); ok {
		alpha = int(a)
	}

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Raster widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a raster",
		}
	}

	// Get the resource image data
	imgData, resourceExists := b.getResource(resourceName)
	if !resourceExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Resource '%s' not found", resourceName),
		}
	}

	// Decode the image
	decoded, _, err := image.Decode(bytes.NewReader(imgData))
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to decode resource image: %v", err),
		}
	}

	bounds := decoded.Bounds()

	b.mu.Lock()
	buf := b.rasterData[widgetID]
	if buf != nil {
		bufHeight := len(buf)
		bufWidth := 0
		if bufHeight > 0 {
			bufWidth = len(buf[0])
		}

		// Blit the image onto the raster buffer
		for dy := 0; dy < bounds.Dy(); dy++ {
			srcY := bounds.Min.Y + dy
			dstY := destY + dy
			if dstY < 0 || dstY >= bufHeight {
				continue
			}
			for dx := 0; dx < bounds.Dx(); dx++ {
				srcX := bounds.Min.X + dx
				dstX := destX + dx
				if dstX < 0 || dstX >= bufWidth {
					continue
				}

				srcColor := decoded.At(srcX, srcY)
				sr, sg, sb, sa := srcColor.RGBA()

				// Convert from 16-bit to 8-bit
				sr8 := uint8(sr >> 8)
				sg8 := uint8(sg >> 8)
				sb8 := uint8(sb >> 8)
				sa8 := uint8(sa >> 8)

				// Apply alpha parameter
				if alpha < 255 {
					sa8 = uint8((int(sa8) * alpha) / 255)
				}

				// Skip fully transparent pixels
				if sa8 == 0 {
					continue
				}

				// Alpha blending if source is not fully opaque
				if sa8 < 255 {
					dstColor := buf[dstY][dstX]
					dr, dg, db, da := dstColor.RGBA()
					dr8 := uint8(dr >> 8)
					dg8 := uint8(dg >> 8)
					db8 := uint8(db >> 8)
					da8 := uint8(da >> 8)

					// Standard alpha blending: out = src * srcAlpha + dst * (1 - srcAlpha)
					srcAlpha := float64(sa8) / 255.0
					invAlpha := 1.0 - srcAlpha

					sr8 = uint8(float64(sr8)*srcAlpha + float64(dr8)*invAlpha)
					sg8 = uint8(float64(sg8)*srcAlpha + float64(dg8)*invAlpha)
					sb8 = uint8(float64(sb8)*srcAlpha + float64(db8)*invAlpha)
					sa8 = uint8(float64(sa8) + float64(da8)*invAlpha)
				}

				buf[dstY][dstX] = color.RGBA{R: sr8, G: sg8, B: sb8, A: sa8}
			}
		}
	}
	b.mu.Unlock()

	// Refresh the raster
	fyne.Do(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateCanvasLinearGradient(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Parse start and end colors
	var startColor color.Color = color.White
	var endColor color.Color = color.Black

	if startHex, ok := msg.Payload["startColor"].(string); ok {
		startColor = parseHexColorSimple(startHex)
	}
	if endHex, ok := msg.Payload["endColor"].(string); ok {
		endColor = parseHexColorSimple(endHex)
	}

	gradient := canvas.NewLinearGradient(startColor, endColor, 0)

	// Set angle if provided (in degrees)
	if angle, ok := getFloat64(msg.Payload["angle"]); ok {
		gradient.Angle = angle
	}

	// Set minimum size if provided
	if width, ok := getFloat64(msg.Payload["width"]); ok {
		if height, ok := getFloat64(msg.Payload["height"]); ok {
			gradient.SetMinSize(fyne.NewSize(float32(width), float32(height)))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = gradient
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvaslineargradient", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasLine(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Line widget not found",
		}
	}

	line, ok := w.(*canvas.Line)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a line",
		}
	}

	fyne.DoAndWait(func() {
		// Update position if provided
		if x1, ok := getFloat64(msg.Payload["x1"]); ok {
			if y1, ok := getFloat64(msg.Payload["y1"]); ok {
				line.Position1 = fyne.NewPos(float32(x1), float32(y1))
			}
		}
		if x2, ok := getFloat64(msg.Payload["x2"]); ok {
			if y2, ok := getFloat64(msg.Payload["y2"]); ok {
				line.Position2 = fyne.NewPos(float32(x2), float32(y2))
			}
		}

		// Update stroke color if provided
		if colorHex, ok := msg.Payload["strokeColor"].(string); ok {
			line.StrokeColor = parseHexColorSimple(colorHex)
		}

		// Update stroke width if provided
		if strokeWidth, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
			line.StrokeWidth = float32(strokeWidth)
		}

		line.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleUpdateCanvasCircle(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Circle widget not found",
		}
	}

	circle, ok := w.(*canvas.Circle)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a circle",
		}
	}

	fyne.DoAndWait(func() {
		// Update fill color if provided
		if fillHex, ok := msg.Payload["fillColor"].(string); ok {
			circle.FillColor = parseHexColorSimple(fillHex)
		}

		// Update stroke color if provided
		if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
			circle.StrokeColor = parseHexColorSimple(strokeHex)
		}

		// Update stroke width if provided
		if strokeWidth, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
			circle.StrokeWidth = float32(strokeWidth)
		}

		// Update position if provided
		if x, ok := getFloat64(msg.Payload["x"]); ok {
			if y, ok := getFloat64(msg.Payload["y"]); ok {
				circle.Position1 = fyne.NewPos(float32(x), float32(y))
			}
		}
		if x2, ok := getFloat64(msg.Payload["x2"]); ok {
			if y2, ok := getFloat64(msg.Payload["y2"]); ok {
				circle.Position2 = fyne.NewPos(float32(x2), float32(y2))
			}
		}

		circle.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleUpdateCanvasRectangle(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Rectangle widget not found",
		}
	}

	// Handle both regular canvas.Rectangle and TappableCanvasRectangle
	if rect, ok := w.(*canvas.Rectangle); ok {
		fyne.DoAndWait(func() {
			if fillHex, ok := msg.Payload["fillColor"].(string); ok {
				rect.FillColor = parseHexColorSimple(fillHex)
			}
			if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
				rect.StrokeColor = parseHexColorSimple(strokeHex)
			}
			if strokeWidth, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
				rect.StrokeWidth = float32(strokeWidth)
			}
			if radius, ok := getFloat64(msg.Payload["cornerRadius"]); ok {
				rect.CornerRadius = float32(radius)
			}
			// Update position if provided
			var posX, posY, x2Val, y2Val float32
			hasPos := false
			hasSize := false
			if x, ok := msg.Payload["x"]; ok {
				posX = toFloat32(x)
				hasPos = true
			}
			if y, ok := msg.Payload["y"]; ok {
				posY = toFloat32(y)
			}
			if x2, ok := msg.Payload["x2"]; ok {
				x2Val = toFloat32(x2)
				hasSize = true
			}
			if y2, ok := msg.Payload["y2"]; ok {
				y2Val = toFloat32(y2)
			}
			if hasPos {
				rect.Move(fyne.NewPos(posX, posY))
			}
			if hasSize {
				rect.Resize(fyne.NewSize(x2Val-posX, y2Val-posY))
			}
			if width, ok := getFloat64(msg.Payload["width"]); ok {
				if height, ok := getFloat64(msg.Payload["height"]); ok {
					rect.SetMinSize(fyne.NewSize(float32(width), float32(height)))
				}
			}
			rect.Refresh()
		})
	} else if tappable, ok := w.(*TappableCanvasRectangle); ok {
		fyne.DoAndWait(func() {
			if fillHex, ok := msg.Payload["fillColor"].(string); ok {
				tappable.SetFillColor(parseHexColorSimple(fillHex))
			}
			if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
				tappable.SetStrokeColor(parseHexColorSimple(strokeHex))
			}
			if strokeWidth, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
				tappable.SetStrokeWidth(float32(strokeWidth))
			}
			if radius, ok := getFloat64(msg.Payload["cornerRadius"]); ok {
				tappable.SetCornerRadius(float32(radius))
			}
			tappable.Refresh()
		})
	} else {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a rectangle",
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
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
			Error:   "Canvas text widget not found",
		}
	}

	canvasText, ok := w.(*canvas.Text)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a canvas text",
		}
	}

	fyne.DoAndWait(func() {
		// Update text if provided
		if text, ok := msg.Payload["text"].(string); ok {
			canvasText.Text = text
		}

		// Update color if provided
		if colorHex, ok := msg.Payload["color"].(string); ok {
			canvasText.Color = parseHexColorSimple(colorHex)
		}

		// Update text size if provided
		if textSize, ok := getFloat64(msg.Payload["textSize"]); ok {
			canvasText.TextSize = float32(textSize)
		}

		canvasText.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleUpdateCanvasLinearGradient(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Gradient widget not found",
		}
	}

	gradient, ok := w.(*canvas.LinearGradient)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a linear gradient",
		}
	}

	fyne.DoAndWait(func() {
		// Update start color if provided
		if startHex, ok := msg.Payload["startColor"].(string); ok {
			gradient.StartColor = parseHexColorSimple(startHex)
		}

		// Update end color if provided
		if endHex, ok := msg.Payload["endColor"].(string); ok {
			gradient.EndColor = parseHexColorSimple(endHex)
		}

		// Update angle if provided
		if angle, ok := getFloat64(msg.Payload["angle"]); ok {
			gradient.Angle = angle
		}

		gradient.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateCanvasArc(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Parse start and end angles (in radians)
	var startAngle, endAngle float64 = 0, 3.14159 // Default half circle
	if sa, ok := getFloat64(msg.Payload["startAngle"]); ok {
		startAngle = sa
	}
	if ea, ok := getFloat64(msg.Payload["endAngle"]); ok {
		endAngle = ea
	}

	// Set fill color if provided
	fillColor := color.RGBA{R: 100, G: 100, B: 255, A: 255} // Default blue
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		fillColor = parseHexColorSimple(fillHex).(color.RGBA)
	}

	// Set stroke color if provided
	var strokeColor color.Color = color.Transparent
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		strokeColor = parseHexColorSimple(strokeHex)
	}

	// Set stroke width if provided
	var strokeWidth float32 = 1
	if sw, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
		strokeWidth = float32(sw)
	}

	// Set position and size
	var x1, y1, x2, y2 float32 = 0, 0, 100, 100
	if x, ok := getFloat64(msg.Payload["x"]); ok {
		x1 = float32(x)
	}
	if y, ok := getFloat64(msg.Payload["y"]); ok {
		y1 = float32(y)
	}
	if x, ok := getFloat64(msg.Payload["x2"]); ok {
		x2 = float32(x)
	}
	if y, ok := getFloat64(msg.Payload["y2"]); ok {
		y2 = float32(y)
	}

	// Store arc metadata for later use
	b.mu.Lock()
	if b.arcData == nil {
		b.arcData = make(map[string]*ArcData)
	}
	b.arcData[widgetID] = &ArcData{
		StartAngle:  startAngle,
		EndAngle:    endAngle,
		FillColor:   fillColor,
		StrokeColor: strokeColor,
		StrokeWidth: strokeWidth,
		X1:          x1,
		Y1:          y1,
		X2:          x2,
		Y2:          y2,
	}
	b.mu.Unlock()

	// Capture widgetID for closure to read dynamic arc data
	arcWidgetID := widgetID

	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		// Read current arc data (allows dynamic updates)
		b.mu.RLock()
		arcInfo := b.arcData[arcWidgetID]
		if arcInfo == nil {
			b.mu.RUnlock()
			return color.RGBA{A: 1}
		}
		arcStart := arcInfo.StartAngle
		arcEnd := arcInfo.EndAngle
		cR := int(arcInfo.FillColor.R)
		cG := int(arcInfo.FillColor.G)
		cB := int(arcInfo.FillColor.B)
		b.mu.RUnlock()

		// Calculate center and radius
		cx := float64(w) / 2
		cy := float64(h) / 2
		rx := float64(w) / 2
		ry := float64(h) / 2

		if rx < 1 || ry < 1 {
			return color.RGBA{A: 1} // Nearly transparent (A=0 causes render skip)
		}

		// Normalized distance from center
		dx := (float64(px) - cx) / rx
		dy := (float64(py) - cy) / ry
		dist := dx*dx + dy*dy

		// Outside ellipse
		if dist > 1.0 {
			return color.RGBA{R: 255, G: 255, B: 255, A: 1} // Nearly transparent white
		}

		// Calculate angle (flip Y for math coords)
		angle := atan2(-dy, dx)
		if angle < 0 {
			angle += 2 * 3.14159265358979
		}

		// Normalize arc angles to 0-2pi
		start := arcStart
		end := arcEnd
		for start < 0 {
			start += 2 * 3.14159265358979
		}
		for end < 0 {
			end += 2 * 3.14159265358979
		}
		start = float64Mod(start, 2*3.14159265358979)
		end = float64Mod(end, 2*3.14159265358979)

		// Check if angle is within arc range
		inArc := false
		if start <= end {
			inArc = angle >= start && angle <= end
		} else {
			inArc = angle >= start || angle <= end
		}

		if inArc {
			return color.RGBA{R: uint8(cR), G: uint8(cG), B: uint8(cB), A: 255}
		}
		return color.RGBA{A: 1} // Nearly transparent (A=0 causes render skip)
	})

	width := x2 - x1
	height := y2 - y1
	if width < 10 {
		width = 100
	}
	if height < 10 {
		height = 100
	}

	// For NewWithoutLayout containers, we need explicit position and size
	raster.Move(fyne.NewPos(x1, y1))
	raster.Resize(fyne.NewSize(width, height))
	raster.SetMinSize(fyne.NewSize(width, height))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasarc", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasArc(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	arcInfo, arcExists := b.arcData[widgetID]
	b.mu.RUnlock()

	if !exists || !arcExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Arc widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an arc raster",
		}
	}

	// Update arc data
	b.mu.Lock()
	if sa, ok := getFloat64(msg.Payload["startAngle"]); ok {
		arcInfo.StartAngle = sa
	}
	if ea, ok := getFloat64(msg.Payload["endAngle"]); ok {
		arcInfo.EndAngle = ea
	}
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		arcInfo.FillColor = parseHexColorSimple(fillHex).(color.RGBA)
	}
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		arcInfo.StrokeColor = parseHexColorSimple(strokeHex)
	}
	if sw, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
		arcInfo.StrokeWidth = float32(sw)
	}
	b.mu.Unlock()

	fyne.DoAndWait(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateCanvasPolygon(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Parse fill color
	fillColor := color.RGBA{R: 100, G: 100, B: 255, A: 255} // Default blue
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		fillColor = parseHexColorSimple(fillHex).(color.RGBA)
	}

	// Parse stroke color
	var strokeColor color.Color = color.Transparent
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		strokeColor = parseHexColorSimple(strokeHex)
	}

	// Parse stroke width
	var strokeWidth float32 = 1
	if sw, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
		strokeWidth = float32(sw)
	}

	// Parse points
	var points []fyne.Position
	if pts, ok := msg.Payload["points"].([]interface{}); ok {
		for _, p := range pts {
			if pt, ok := p.(map[string]interface{}); ok {
				x := toFloat32(pt["x"])
				y := toFloat32(pt["y"])
				points = append(points, fyne.NewPos(x, y))
			}
		}
	}

	// Store polygon data
	b.mu.Lock()
	if b.polygonData == nil {
		b.polygonData = make(map[string]*PolygonData)
	}
	b.polygonData[widgetID] = &PolygonData{
		Points:      points,
		FillColor:   fillColor,
		StrokeColor: strokeColor,
		StrokeWidth: strokeWidth,
	}
	b.mu.Unlock()

	// Calculate bounding box
	var minX, minY, maxX, maxY float32 = 0, 0, 100, 100
	if len(points) > 0 {
		minX, minY = points[0].X, points[0].Y
		maxX, maxY = points[0].X, points[0].Y
		for _, p := range points {
			if p.X < minX {
				minX = p.X
			}
			if p.Y < minY {
				minY = p.Y
			}
			if p.X > maxX {
				maxX = p.X
			}
			if p.Y > maxY {
				maxY = p.Y
			}
		}
	}

	width := maxX - minX
	height := maxY - minY
	if width < 10 {
		width = 100
	}
	if height < 10 {
		height = 100
	}

	// Create a raster that draws the polygon using point-in-polygon algorithm
	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		b.mu.RLock()
		polyInfo, exists := b.polygonData[widgetID]
		b.mu.RUnlock()

		if !exists || len(polyInfo.Points) < 3 {
			return color.Transparent
		}

		// Point in polygon test using ray casting
		x := float32(px)
		y := float32(py)
		inside := false
		n := len(polyInfo.Points)
		j := n - 1

		for i := 0; i < n; i++ {
			xi := polyInfo.Points[i].X
			yi := polyInfo.Points[i].Y
			xj := polyInfo.Points[j].X
			yj := polyInfo.Points[j].Y

			if ((yi > y) != (yj > y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi) {
				inside = !inside
			}
			j = i
		}

		if inside {
			return polyInfo.FillColor
		}
		return color.Transparent
	})

	raster.SetMinSize(fyne.NewSize(width, height))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvaspolygon", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasPolygon(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	polyInfo, polyExists := b.polygonData[widgetID]
	b.mu.RUnlock()

	if !exists || !polyExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Polygon widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a polygon raster",
		}
	}

	// Update polygon data
	b.mu.Lock()
	if pts, ok := msg.Payload["points"].([]interface{}); ok {
		var points []fyne.Position
		for _, p := range pts {
			if pt, ok := p.(map[string]interface{}); ok {
				x := toFloat32(pt["x"])
				y := toFloat32(pt["y"])
				points = append(points, fyne.NewPos(x, y))
			}
		}
		polyInfo.Points = points
	}
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		polyInfo.FillColor = parseHexColorSimple(fillHex).(color.RGBA)
	}
	if strokeHex, ok := msg.Payload["strokeColor"].(string); ok {
		polyInfo.StrokeColor = parseHexColorSimple(strokeHex)
	}
	if sw, ok := getFloat64(msg.Payload["strokeWidth"]); ok {
		polyInfo.StrokeWidth = float32(sw)
	}
	b.mu.Unlock()

	fyne.DoAndWait(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleCreateCanvasSphericalPatch creates a spherical patch primitive
// This renders a curved quadrilateral on a sphere surface, bounded by lat/lon lines
// Used for Amiga Boing ball style checkered spheres
func (b *Bridge) handleCreateCanvasSphericalPatch(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Parse parameters
	cx := toFloat32(msg.Payload["cx"])       // Sphere center X
	cy := toFloat32(msg.Payload["cy"])       // Sphere center Y
	radius := toFloat32(msg.Payload["radius"])
	latStart := toFloat64(msg.Payload["latStart"]) // Radians, -π/2 to π/2
	latEnd := toFloat64(msg.Payload["latEnd"])
	lonStart := toFloat64(msg.Payload["lonStart"]) // Radians, 0 to 2π
	lonEnd := toFloat64(msg.Payload["lonEnd"])
	rotation := 0.0
	if rot, ok := msg.Payload["rotation"]; ok {
		rotation = toFloat64(rot)
	}

	// Parse fill color
	var fillColor color.RGBA = color.RGBA{R: 255, G: 0, B: 0, A: 255}
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		parsed := parseHexColorSimple(fillHex)
		if rgba, ok := parsed.(color.RGBA); ok {
			fillColor = rgba
		}
	}

	// Store patch data for dynamic updates
	b.mu.Lock()
	if b.sphericalPatchData == nil {
		b.sphericalPatchData = make(map[string]*SphericalPatchData)
	}
	b.sphericalPatchData[widgetID] = &SphericalPatchData{
		CenterX:   cx,
		CenterY:   cy,
		Radius:    radius,
		LatStart:  latStart,
		LatEnd:    latEnd,
		LonStart:  lonStart,
		LonEnd:    lonEnd,
		Rotation:  rotation,
		FillColor: fillColor,
	}
	b.mu.Unlock()

	patchWidgetID := widgetID

	// Create raster that renders the spherical patch
	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		b.mu.RLock()
		patch := b.sphericalPatchData[patchWidgetID]
		if patch == nil {
			b.mu.RUnlock()
			return color.RGBA{A: 1} // Nearly transparent (A=0 causes render skip)
		}
		// Copy values to avoid holding lock during math
		pR := float64(patch.Radius)
		pLatStart := patch.LatStart
		pLatEnd := patch.LatEnd
		pLonStart := patch.LonStart
		pLonEnd := patch.LonEnd
		pRot := patch.Rotation
		pFill := patch.FillColor
		b.mu.RUnlock()

		// Convert pixel to coordinates relative to sphere center
		// Note: px, py are LOCAL to the raster (0 to w-1), center is at (radius, radius)
		x := float64(px) - pR
		y := float64(py) - pR

		// Check if within sphere circle
		distSq := x*x + y*y
		if distSq > pR*pR {
			return color.RGBA{A: 1}
		}

		// Calculate z for front face of sphere
		z := sqrt(pR*pR - distSq)

		// Apply inverse Y-axis rotation to find original (unrotated) position
		cosR := cos(pRot)
		sinR := sin(pRot)
		xOrig := x*cosR + z*sinR
		zOrig := -x*sinR + z*cosR

		// If z' < 0, this point is on the back face (shouldn't happen for front pixels)
		// but the patch might wrap around, so we check the original z
		// Actually for the Boing ball, we only render front-facing patches

		// Calculate latitude and longitude from 3D point
		// Latitude: angle from equator, -π/2 (south pole) to π/2 (north pole)
		// Note: negate y because screen Y increases downward but lat increases upward
		lat := asin(-y / pR)

		// Longitude: angle around Y axis, 0 to 2π
		lon := atan2(zOrig, xOrig)
		if lon < 0 {
			lon += 2 * pi
		}

		// Check if point falls within patch bounds
		// Latitude check
		if lat < pLatStart || lat > pLatEnd {
			return color.RGBA{A: 1}
		}

		// Longitude check (handle wraparound)
		inLon := false
		if pLonStart <= pLonEnd {
			inLon = lon >= pLonStart && lon <= pLonEnd
		} else {
			// Wraps around 0/2π
			inLon = lon >= pLonStart || lon <= pLonEnd
		}
		if !inLon {
			return color.RGBA{A: 1}
		}

		// Only render if on front face (after rotation, z > 0)
		if z <= 0 {
			return color.RGBA{A: 1}
		}

		return pFill
	})

	// Size the raster to contain the sphere
	size := radius * 2
	raster.Move(fyne.NewPos(cx-radius, cy-radius))
	raster.Resize(fyne.NewSize(size, size))
	raster.SetMinSize(fyne.NewSize(size, size))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvassphericalpatch", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasSphericalPatch(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	patch, patchExists := b.sphericalPatchData[widgetID]
	b.mu.RUnlock()

	if !exists || !patchExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Spherical patch widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a spherical patch raster",
		}
	}

	// Update patch data
	b.mu.Lock()
	if cx, ok := getFloat64(msg.Payload["cx"]); ok {
		patch.CenterX = float32(cx)
	}
	if cy, ok := getFloat64(msg.Payload["cy"]); ok {
		patch.CenterY = float32(cy)
	}
	if r, ok := getFloat64(msg.Payload["radius"]); ok {
		patch.Radius = float32(r)
	}
	if rot, ok := getFloat64(msg.Payload["rotation"]); ok {
		patch.Rotation = rot
	}
	if fillHex, ok := msg.Payload["fillColor"].(string); ok {
		patch.FillColor = parseHexColorSimple(fillHex).(color.RGBA)
	}
	b.mu.Unlock()

	fyne.DoAndWait(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleCreateCanvasCheckeredSphere creates a checkered sphere (Amiga Boing ball style)
// This renders ALL patches in a single raster to avoid z-order compositing issues
func (b *Bridge) handleCreateCanvasCheckeredSphere(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Parse parameters
	cx := toFloat32(msg.Payload["cx"])
	cy := toFloat32(msg.Payload["cy"])
	radius := toFloat32(msg.Payload["radius"])
	latBands := toInt(msg.Payload["latBands"])
	lonSegments := toInt(msg.Payload["lonSegments"])
	rotation := 0.0
	if rot, ok := msg.Payload["rotation"]; ok {
		rotation = toFloat64(rot)
	}

	// Parse colors
	var color1 color.RGBA = color.RGBA{R: 204, G: 0, B: 0, A: 255}   // #cc0000 red
	var color2 color.RGBA = color.RGBA{R: 255, G: 255, B: 255, A: 255} // white
	if c1Hex, ok := msg.Payload["color1"].(string); ok {
		if parsed, ok := parseHexColorSimple(c1Hex).(color.RGBA); ok {
			color1 = parsed
		}
	}
	if c2Hex, ok := msg.Payload["color2"].(string); ok {
		if parsed, ok := parseHexColorSimple(c2Hex).(color.RGBA); ok {
			color2 = parsed
		}
	}

	// Store sphere data for dynamic updates
	b.mu.Lock()
	if b.checkeredSphereData == nil {
		b.checkeredSphereData = make(map[string]*CheckeredSphereData)
	}
	b.checkeredSphereData[widgetID] = &CheckeredSphereData{
		CenterX:     cx,
		CenterY:     cy,
		Radius:      radius,
		LatBands:    latBands,
		LonSegments: lonSegments,
		Rotation:    rotation,
		Color1:      color1,
		Color2:      color2,
	}
	b.mu.Unlock()

	sphereWidgetID := widgetID

	// Create raster that renders ALL patches in one pass
	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		b.mu.RLock()
		sphere := b.checkeredSphereData[sphereWidgetID]
		if sphere == nil {
			b.mu.RUnlock()
			return color.RGBA{A: 0}
		}
		// Copy values to avoid holding lock during math
		sR := float64(sphere.Radius)
		sLatBands := sphere.LatBands
		sLonSegs := sphere.LonSegments
		sRot := sphere.Rotation
		sColor1 := sphere.Color1
		sColor2 := sphere.Color2
		b.mu.RUnlock()

		// Convert pixel to coordinates relative to sphere center
		// Use actual raster dimensions (w, h) for center, not stored radius
		// (Fyne may scale the raster)
		centerX := float64(w) / 2
		centerY := float64(h) / 2
		scale := float64(w) / (2 * sR) // Scale factor if raster was resized
		x := (float64(px) - centerX) / scale
		y := (float64(py) - centerY) / scale

		// Check if within sphere circle
		distSq := x*x + y*y
		if distSq > sR*sR {
			return color.RGBA{A: 0}
		}

		// Calculate z for front face of sphere
		z := sqrt(sR*sR - distSq)

		// Apply inverse Y-axis rotation to find original (unrotated) position
		cosR := cos(sRot)
		sinR := sin(sRot)
		xOrig := x*cosR + z*sinR
		zOrig := -x*sinR + z*cosR

		// Calculate latitude: angle from equator, -π/2 (south) to π/2 (north)
		// Negate y because screen Y increases downward but lat increases upward
		lat := asin(-y / sR)

		// Calculate longitude: angle around Y axis, 0 to 2π (full sphere)
		// atan2 returns [-π, π], we shift to [0, 2π]
		lon := atan2(zOrig, xOrig)
		if lon < 0 {
			lon += 2 * pi
		}

		// Determine which lat/lon band this pixel falls in
		// Latitude bands: divide [-π/2, π/2] into latBands
		latIdx := int((lat + pi/2) / (pi / float64(sLatBands)))
		if latIdx >= sLatBands {
			latIdx = sLatBands - 1
		}
		if latIdx < 0 {
			latIdx = 0
		}

		// Longitude segments: divide [0, 2π] into lonSegments (full sphere)
		lonIdx := int(lon / (2 * pi / float64(sLonSegs)))
		if lonIdx >= sLonSegs {
			lonIdx = sLonSegs - 1
		}
		if lonIdx < 0 {
			lonIdx = 0
		}

		// Checkerboard pattern
		if (latIdx+lonIdx)%2 == 0 {
			return sColor1
		}
		return sColor2
	})

	// Size the raster to contain the sphere
	size := radius * 2
	raster.Move(fyne.NewPos(cx-radius, cy-radius))
	raster.Resize(fyne.NewSize(size, size))
	raster.SetMinSize(fyne.NewSize(size, size))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvascheckeredsphere", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasCheckeredSphere(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	sphere, sphereExists := b.checkeredSphereData[widgetID]
	b.mu.RUnlock()

	if !exists || !sphereExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Checkered sphere widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a checkered sphere raster",
		}
	}

	// Update sphere data
	b.mu.Lock()
	if cx, ok := getFloat64(msg.Payload["cx"]); ok {
		sphere.CenterX = float32(cx)
	}
	if cy, ok := getFloat64(msg.Payload["cy"]); ok {
		sphere.CenterY = float32(cy)
	}
	if r, ok := getFloat64(msg.Payload["radius"]); ok {
		sphere.Radius = float32(r)
	}
	if rot, ok := getFloat64(msg.Payload["rotation"]); ok {
		sphere.Rotation = rot
	}

	// Update position
	newCx := sphere.CenterX
	newCy := sphere.CenterY
	newRadius := sphere.Radius
	b.mu.Unlock()

	// Update raster position/size
	fyne.DoAndWait(func() {
		raster.Move(fyne.NewPos(newCx-newRadius, newCy-newRadius))
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleCreateCanvasSphere creates a generalized sphere with pattern support (Phase 1)
// Supports: solid, checkered, stripes, gradient patterns
// Renders ALL patches in a single raster to avoid z-order compositing issues
func (b *Bridge) handleCreateCanvasSphere(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Parse parameters
	cx := toFloat32(msg.Payload["cx"])
	cy := toFloat32(msg.Payload["cy"])
	radius := toFloat32(msg.Payload["radius"])
	latBands := toInt(msg.Payload["latBands"])
	lonSegments := toInt(msg.Payload["lonSegments"])
	pattern := "checkered"
	if p, ok := msg.Payload["pattern"].(string); ok {
		pattern = p
	}
	rotation := 0.0
	if rot, ok := msg.Payload["rotation"]; ok {
		rotation = toFloat64(rot)
	}

	// Parse colors based on pattern type
	sphereData := &SphereData{
		CenterX:     cx,
		CenterY:     cy,
		Radius:      radius,
		LatBands:    latBands,
		LonSegments: lonSegments,
		Rotation:    rotation,
		Pattern:     pattern,
	}

	switch pattern {
	case "solid":
		sphereData.SolidColor = color.RGBA{R: 204, G: 0, B: 0, A: 255} // default red
		if solidHex, ok := msg.Payload["solidColor"].(string); ok {
			sphereData.SolidColor = parseHexColorSimple(solidHex).(color.RGBA)
		}

	case "stripes":
		sphereData.StripeDir = "horizontal"
		if dir, ok := msg.Payload["stripeDirection"].(string); ok {
			sphereData.StripeDir = dir
		}
		// Parse stripe colors array
		sphereData.StripeColors = []color.RGBA{
			{R: 204, G: 0, B: 0, A: 255},   // default red
			{R: 255, G: 255, B: 255, A: 255}, // default white
		}
		if colorsInterface, ok := msg.Payload["stripeColors"].([]interface{}); ok {
			sphereData.StripeColors = []color.RGBA{}
			for _, c := range colorsInterface {
				if hexStr, ok := c.(string); ok {
					sphereData.StripeColors = append(sphereData.StripeColors, parseHexColorSimple(hexStr).(color.RGBA))
				}
			}
		}

	case "gradient":
		sphereData.GradientStart = color.RGBA{R: 255, G: 0, B: 0, A: 255} // default red
		sphereData.GradientEnd = color.RGBA{R: 0, G: 0, B: 255, A: 255}   // default blue
		if startHex, ok := msg.Payload["gradientStart"].(string); ok {
			sphereData.GradientStart = parseHexColorSimple(startHex).(color.RGBA)
		}
		if endHex, ok := msg.Payload["gradientEnd"].(string); ok {
			sphereData.GradientEnd = parseHexColorSimple(endHex).(color.RGBA)
		}

	case "checkered":
	default:
		sphereData.CheckeredCol1 = color.RGBA{R: 204, G: 0, B: 0, A: 255}   // default red
		sphereData.CheckeredCol2 = color.RGBA{R: 255, G: 255, B: 255, A: 255} // default white
		if c1Hex, ok := msg.Payload["checkeredColor1"].(string); ok {
			sphereData.CheckeredCol1 = parseHexColorSimple(c1Hex).(color.RGBA)
		}
		if c2Hex, ok := msg.Payload["checkeredColor2"].(string); ok {
			sphereData.CheckeredCol2 = parseHexColorSimple(c2Hex).(color.RGBA)
		}
	}

	// Store sphere data for dynamic updates
	b.mu.Lock()
	if b.sphereData == nil {
		b.sphereData = make(map[string]*SphereData)
	}
	b.sphereData[widgetID] = sphereData
	b.mu.Unlock()

	sphereWidgetID := widgetID

	// Create raster that renders all patches in one pass
	raster := canvas.NewRasterWithPixels(func(px, py, w, h int) color.Color {
		b.mu.RLock()
		sphere := b.sphereData[sphereWidgetID]
		if sphere == nil {
			b.mu.RUnlock()
			return color.RGBA{A: 0}
		}
		// Copy values to avoid holding lock during math
		sR := float64(sphere.Radius)
		sLatBands := sphere.LatBands
		sLonSegs := sphere.LonSegments
		sRot := sphere.Rotation
		pattern := sphere.Pattern
		solidColor := sphere.SolidColor
		col1 := sphere.CheckeredCol1
		col2 := sphere.CheckeredCol2
		stripeColors := sphere.StripeColors
		stripeDir := sphere.StripeDir
		gradStart := sphere.GradientStart
		gradEnd := sphere.GradientEnd
		b.mu.RUnlock()

		// Convert pixel to coordinates relative to sphere center
		centerX := float64(w) / 2
		centerY := float64(h) / 2
		scale := float64(w) / (2 * sR)
		x := (float64(px) - centerX) / scale
		y := (float64(py) - centerY) / scale

		// Check if within sphere circle
		distSq := x*x + y*y
		if distSq > sR*sR {
			return color.RGBA{A: 0}
		}

		// Calculate z for front face of sphere
		z := sqrt(sR*sR - distSq)

		// Apply inverse Y-axis rotation to find original (unrotated) position
		cosR := cos(sRot)
		sinR := sin(sRot)
		xOrig := x*cosR + z*sinR
		zOrig := -x*sinR + z*cosR

		// Calculate latitude: angle from equator, -π/2 (south) to π/2 (north)
		lat := asin(-y / sR)

		// Calculate longitude: angle around Y axis, 0 to 2π (full sphere)
		lon := atan2(zOrig, xOrig)
		if lon < 0 {
			lon += 2 * pi
		}

		// Apply pattern
		switch pattern {
		case "solid":
			return solidColor

		case "stripes":
			if stripeDir == "vertical" {
				// Vertical stripes based on longitude
				stripeIdx := int(lon / (2 * pi / float64(len(stripeColors))))
				if stripeIdx >= len(stripeColors) {
					stripeIdx = len(stripeColors) - 1
				}
				return stripeColors[stripeIdx]
			} else {
				// Horizontal stripes based on latitude
				latIdx := int((lat + pi/2) / (pi / float64(len(stripeColors))))
				if latIdx >= len(stripeColors) {
					latIdx = len(stripeColors) - 1
				}
				return stripeColors[latIdx]
			}

		case "gradient":
			// Gradient from pole to pole (based on latitude)
			// lat: -π/2 (south) to π/2 (north) -> normalize to 0-1
			t := (lat + pi/2) / pi
			if t < 0 {
				t = 0
			}
			if t > 1 {
				t = 1
			}
			// Interpolate between start and end colors
			r := uint8(float64(gradStart.R)*(1-t) + float64(gradEnd.R)*t)
			g := uint8(float64(gradStart.G)*(1-t) + float64(gradEnd.G)*t)
			b := uint8(float64(gradStart.B)*(1-t) + float64(gradEnd.B)*t)
			a := uint8(float64(gradStart.A)*(1-t) + float64(gradEnd.A)*t)
			return color.RGBA{R: r, G: g, B: b, A: a}

		case "checkered":
		default:
			// Determine which lat/lon band this pixel falls in
			latIdx := int((lat + pi/2) / (pi / float64(sLatBands)))
			if latIdx >= sLatBands {
				latIdx = sLatBands - 1
			}
			if latIdx < 0 {
				latIdx = 0
			}

			lonIdx := int(lon / (2 * pi / float64(sLonSegs)))
			if lonIdx >= sLonSegs {
				lonIdx = sLonSegs - 1
			}
			if lonIdx < 0 {
				lonIdx = 0
			}

			// Checkerboard pattern
			if (latIdx+lonIdx)%2 == 0 {
				return col1
			}
			return col2
		}
	})

	// Size the raster to contain the sphere
	size := radius * 2
	raster.Move(fyne.NewPos(cx-radius, cy-radius))
	raster.Resize(fyne.NewSize(size, size))
	raster.SetMinSize(fyne.NewSize(size, size))

	b.mu.Lock()
	b.widgets[widgetID] = raster
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvassphere", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasSphere(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	sphere, sphereExists := b.sphereData[widgetID]
	b.mu.RUnlock()

	if !exists || !sphereExists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Sphere widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a sphere raster",
		}
	}

	// Update sphere data
	b.mu.Lock()
	if cx, ok := getFloat64(msg.Payload["cx"]); ok {
		sphere.CenterX = float32(cx)
	}
	if cy, ok := getFloat64(msg.Payload["cy"]); ok {
		sphere.CenterY = float32(cy)
	}
	if r, ok := getFloat64(msg.Payload["radius"]); ok {
		sphere.Radius = float32(r)
	}
	if rot, ok := getFloat64(msg.Payload["rotation"]); ok {
		sphere.Rotation = rot
	}

	// Update position
	newCx := sphere.CenterX
	newCy := sphere.CenterY
	newRadius := sphere.Radius
	b.mu.Unlock()

	// Update raster position/size
	fyne.DoAndWait(func() {
		raster.Move(fyne.NewPos(newCx-newRadius, newCy-newRadius))
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

func (b *Bridge) handleCreateCanvasRadialGradient(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Parse start and end colors
	var startColor color.Color = color.White
	var endColor color.Color = color.Black

	if startHex, ok := msg.Payload["startColor"].(string); ok {
		startColor = parseHexColorSimple(startHex)
	}
	if endHex, ok := msg.Payload["endColor"].(string); ok {
		endColor = parseHexColorSimple(endHex)
	}

	gradient := canvas.NewRadialGradient(startColor, endColor)

	// Set center offset if provided
	if offsetX, ok := getFloat64(msg.Payload["centerOffsetX"]); ok {
		gradient.CenterOffsetX = offsetX
	}
	if offsetY, ok := getFloat64(msg.Payload["centerOffsetY"]); ok {
		gradient.CenterOffsetY = offsetY
	}

	// Set minimum size if provided
	if width, ok := getFloat64(msg.Payload["width"]); ok {
		if height, ok := getFloat64(msg.Payload["height"]); ok {
			gradient.SetMinSize(fyne.NewSize(float32(width), float32(height)))
		}
	}

	b.mu.Lock()
	b.widgets[widgetID] = gradient
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "canvasradialgradient", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

func (b *Bridge) handleUpdateCanvasRadialGradient(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Radial gradient widget not found",
		}
	}

	gradient, ok := w.(*canvas.RadialGradient)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a radial gradient",
		}
	}

	fyne.DoAndWait(func() {
		// Update start color if provided
		if startHex, ok := msg.Payload["startColor"].(string); ok {
			gradient.StartColor = parseHexColorSimple(startHex)
		}

		// Update end color if provided
		if endHex, ok := msg.Payload["endColor"].(string); ok {
			gradient.EndColor = parseHexColorSimple(endHex)
		}

		// Update center offset if provided
		if offsetX, ok := getFloat64(msg.Payload["centerOffsetX"]); ok {
			gradient.CenterOffsetX = offsetX
		}
		if offsetY, ok := getFloat64(msg.Payload["centerOffsetY"]); ok {
			gradient.CenterOffsetY = offsetY
		}

		gradient.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// Helper functions for arc calculations
func atan2(y, x float64) float64 {
	// Simple atan2 implementation
	if x > 0 {
		return atan(y / x)
	}
	if x < 0 && y >= 0 {
		return atan(y/x) + 3.14159265358979
	}
	if x < 0 && y < 0 {
		return atan(y/x) - 3.14159265358979
	}
	if x == 0 && y > 0 {
		return 3.14159265358979 / 2
	}
	if x == 0 && y < 0 {
		return -3.14159265358979 / 2
	}
	return 0 // x == 0 && y == 0
}

func atan(x float64) float64 {
	// Simple atan approximation using Taylor series
	if x > 1 {
		return 3.14159265358979/2 - atan(1/x)
	}
	if x < -1 {
		return -3.14159265358979/2 - atan(1/x)
	}
	// Taylor series for |x| <= 1
	result := x
	term := x
	for i := 1; i < 20; i++ {
		term *= -x * x
		result += term / float64(2*i+1)
	}
	return result
}

func float64Mod(a, b float64) float64 {
	for a >= b {
		a -= b
	}
	for a < 0 {
		a += b
	}
	return a
}

// Math constants and helpers for spherical calculations
const pi = 3.14159265358979323846

func sin(x float64) float64 {
	// Normalize to [-π, π]
	for x > pi {
		x -= 2 * pi
	}
	for x < -pi {
		x += 2 * pi
	}
	// Taylor series approximation
	result := x
	term := x
	for i := 1; i < 15; i++ {
		term *= -x * x / float64((2*i)*(2*i+1))
		result += term
	}
	return result
}

func cos(x float64) float64 {
	return sin(x + pi/2)
}

func sqrt(x float64) float64 {
	if x <= 0 {
		return 0
	}
	// Newton-Raphson method
	guess := x / 2
	for i := 0; i < 20; i++ {
		guess = (guess + x/guess) / 2
	}
	return guess
}

func asin(x float64) float64 {
	// Clamp to valid range
	if x >= 1 {
		return pi / 2
	}
	if x <= -1 {
		return -pi / 2
	}
	// Use atan2 for better accuracy: asin(x) = atan2(x, sqrt(1-x²))
	return atan2(x, sqrt(1-x*x))
}

// parseHexColorSimple parses a hex color string (e.g., "#FF0000" or "FF0000") to color.Color
// This is a simpler version that returns a default color on error, used by canvas primitives
func parseHexColorSimple(hexStr string) color.Color {
	// Handle CSS rgb() and rgba() format
	if strings.HasPrefix(hexStr, "rgb(") && strings.HasSuffix(hexStr, ")") {
		inner := hexStr[4 : len(hexStr)-1]
		parts := strings.Split(inner, ",")
		if len(parts) == 3 {
			r := parseColorComponent(strings.TrimSpace(parts[0]))
			g := parseColorComponent(strings.TrimSpace(parts[1]))
			b := parseColorComponent(strings.TrimSpace(parts[2]))
			return color.RGBA{R: r, G: g, B: b, A: 255}
		}
	}
	if strings.HasPrefix(hexStr, "rgba(") && strings.HasSuffix(hexStr, ")") {
		inner := hexStr[5 : len(hexStr)-1]
		parts := strings.Split(inner, ",")
		if len(parts) == 4 {
			r := parseColorComponent(strings.TrimSpace(parts[0]))
			g := parseColorComponent(strings.TrimSpace(parts[1]))
			b := parseColorComponent(strings.TrimSpace(parts[2]))
			a := parseAlphaComponent(strings.TrimSpace(parts[3]))
			return color.RGBA{R: r, G: g, B: b, A: a}
		}
	}

	// Remove leading # if present
	if len(hexStr) > 0 && hexStr[0] == '#' {
		hexStr = hexStr[1:]
	}

	// Handle named colors
	switch strings.ToLower(hexStr) {
	case "transparent":
		return color.RGBA{R: 0, G: 0, B: 0, A: 0}
	case "black":
		return color.RGBA{R: 0, G: 0, B: 0, A: 255}
	case "white":
		return color.RGBA{R: 255, G: 255, B: 255, A: 255}
	case "red":
		return color.RGBA{R: 255, G: 0, B: 0, A: 255}
	case "green":
		return color.RGBA{R: 0, G: 255, B: 0, A: 255}
	case "blue":
		return color.RGBA{R: 0, G: 0, B: 255, A: 255}
	case "yellow":
		return color.RGBA{R: 255, G: 255, B: 0, A: 255}
	case "cyan":
		return color.RGBA{R: 0, G: 255, B: 255, A: 255}
	case "magenta":
		return color.RGBA{R: 255, G: 0, B: 255, A: 255}
	case "gray", "grey":
		return color.RGBA{R: 128, G: 128, B: 128, A: 255}
	}

	// Handle hex colors (#RGB, #RRGGBB, #RRGGBBAA)
	if strings.HasPrefix(hexStr, "#") {
		hexStr = hexStr[1:]
	}

	var r, g, b, a uint8 = 0, 0, 0, 255

	switch len(hexStr) {
	case 3: // #RGB
		fmt.Sscanf(hexStr, "%1x%1x%1x", &r, &g, &b)
		r *= 17
		g *= 17
		b *= 17
	case 6: // #RRGGBB
		fmt.Sscanf(hexStr, "%2x%2x%2x", &r, &g, &b)
	case 8: // #RRGGBBAA
		fmt.Sscanf(hexStr, "%2x%2x%2x%2x", &r, &g, &b, &a)
	}

	return color.RGBA{R: r, G: g, B: b, A: a}
}

// parseColorComponent parses an RGB component (0-255)
func parseColorComponent(s string) uint8 {
	var val int
	fmt.Sscanf(s, "%d", &val)
	if val < 0 {
		val = 0
	}
	if val > 255 {
		val = 255
	}
	return uint8(val)
}

// parseAlphaComponent parses an alpha component (0-1 float or 0-255 int)
func parseAlphaComponent(s string) uint8 {
	// Try float first (CSS standard: 0-1)
	var f float64
	if _, err := fmt.Sscanf(s, "%f", &f); err == nil {
		if f <= 1.0 {
			return uint8(f * 255)
		}
		// Treat as 0-255 value
		if f > 255 {
			f = 255
		}
		return uint8(f)
	}
	return 255
}

// handleCreateTappableCanvasRaster creates a tappable canvas raster widget that responds to tap events
func (b *Bridge) handleCreateTappableCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["id"].(string)
	width := toInt(msg.Payload["width"])
	height := toInt(msg.Payload["height"])

	// Create the tappable raster with a tap callback
	tappable := NewTappableCanvasRaster(width, height, func(x, y int) {
		// Send tap event back to the TypeScript layer
		b.sendEvent(Event{
			Type:     "canvasRasterTapped",
			WidgetID: widgetID,
			Data: map[string]interface{}{
				"x": x,
				"y": y,
			},
		})
	})

	// Set up keyboard callbacks if provided
	onKeyDownCallbackId, _ := msg.Payload["onKeyDownCallbackId"].(string)
	onKeyUpCallbackId, _ := msg.Payload["onKeyUpCallbackId"].(string)
	if onKeyDownCallbackId != "" || onKeyUpCallbackId != "" {
		tappable.SetKeyCallbacks(b, onKeyDownCallbackId, onKeyUpCallbackId)
	}

	// Set up scroll callback if provided
	onScrollCallbackId, _ := msg.Payload["onScrollCallbackId"].(string)
	if onScrollCallbackId != "" {
		tappable.SetOnScrollCallback(b, onScrollCallbackId)
	}

	// Set up mouse move callback if provided
	onMouseMoveCallbackId, _ := msg.Payload["onMouseMoveCallbackId"].(string)
	if onMouseMoveCallbackId != "" {
		tappable.SetOnMouseMoveCallback(b, onMouseMoveCallbackId)
	}

	// Set up drag callbacks if provided
	onDragCallbackId, _ := msg.Payload["onDragCallbackId"].(string)
	onDragEndCallbackId, _ := msg.Payload["onDragEndCallbackId"].(string)
	if onDragCallbackId != "" || onDragEndCallbackId != "" {
		tappable.SetOnDragCallback(b, onDragCallbackId, onDragEndCallbackId)
	}

	// Position the widget at (0,0) and resize to fill canvas area
	// This is required for NewWithoutLayout containers to receive tap events
	tappable.Move(fyne.NewPos(0, 0))
	tappable.Resize(fyne.NewSize(float32(width), float32(height)))

	// Get the initial pixel data if provided (format: [[r,g,b,a], ...])
	if pixels, ok := msg.Payload["pixels"].([]interface{}); ok {
		pixelBytes := make([]byte, width*height*4)

		for i, p := range pixels {
			if pArr, ok := p.([]interface{}); ok && len(pArr) >= 4 {
				pixelBytes[i*4] = uint8(toInt(pArr[0]))     // R
				pixelBytes[i*4+1] = uint8(toInt(pArr[1]))   // G
				pixelBytes[i*4+2] = uint8(toInt(pArr[2]))   // B
				pixelBytes[i*4+3] = uint8(toInt(pArr[3]))   // A
			}
		}

		tappable.SetPixels(pixelBytes)
	}

	b.mu.Lock()
	b.widgets[widgetID] = tappable
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "tappablecanvasraster", Text: ""}
	b.mu.Unlock()

	return Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	}
}

// handleUpdateTappableCanvasRaster updates pixels in a tappable canvas raster
func (b *Bridge) handleUpdateTappableCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	// Handle pixel updates (format: [{x, y, r, g, b, a}, ...])
	// Use SetPixelNoRefresh for all pixels, then refresh once at the end
	if updates, ok := msg.Payload["updates"].([]interface{}); ok {
		for _, u := range updates {
			if update, ok := u.(map[string]interface{}); ok {
				x := toInt(update["x"])
				y := toInt(update["y"])
				r := uint8(toInt(update["r"]))
				g := uint8(toInt(update["g"]))
				b := uint8(toInt(update["b"]))
				a := uint8(toInt(update["a"]))

				tappable.SetPixelNoRefresh(x, y, r, g, b, a)
			}
		}
		// Single refresh after all pixels are set
		tappable.RefreshCanvas()
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleResizeTappableCanvasRaster resizes the pixel buffer of a tappable canvas raster
func (b *Bridge) handleResizeTappableCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	width := toInt(msg.Payload["width"])
	height := toInt(msg.Payload["height"])

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	tappable.ResizeBuffer(width, height)

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"width":  width,
			"height": height,
		},
	}
}

// handleFocusTappableCanvasRaster requests keyboard focus for a tappable canvas raster
func (b *Bridge) handleFocusTappableCanvasRaster(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	fyne.Do(func() {
		tappable.RequestFocus()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetTappableCanvasImage sets the canvas from a base64-encoded PNG image
// This allows sending PNG bytes directly without TS-side decoding
func (b *Bridge) handleSetTappableCanvasImage(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	imageB64 := msg.Payload["image"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	// Decode base64 image data
	imageBytes, err := base64.StdEncoding.DecodeString(imageB64)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode image data: " + err.Error(),
		}
	}

	// Decode the PNG image
	img, _, err := image.Decode(bytes.NewReader(imageBytes))
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode PNG image: " + err.Error(),
		}
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Convert image to RGBA pixels
	pixels := make([]byte, width*height*4)
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			r, g, bl, a := img.At(bounds.Min.X+x, bounds.Min.Y+y).RGBA()
			idx := (y*width + x) * 4
			pixels[idx] = uint8(r >> 8)
			pixels[idx+1] = uint8(g >> 8)
			pixels[idx+2] = uint8(bl >> 8)
			pixels[idx+3] = uint8(a >> 8)
		}
	}

	// Set all pixels at once
	tappable.SetPixels(pixels)

	return Response{
		ID:      msg.ID,
		Success: true,
		Result: map[string]interface{}{
			"width":  width,
			"height": height,
		},
	}
}

// handleSetTappableCanvasBuffer sets all pixels at once from a base64-encoded RGBA buffer
func (b *Bridge) handleSetTappableCanvasBuffer(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	bufferB64 := msg.Payload["buffer"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	// Decode base64 buffer
	pixels, err := base64.StdEncoding.DecodeString(bufferB64)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode pixel buffer: " + err.Error(),
		}
	}

	// Set all pixels at once
	tappable.SetPixels(pixels)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetTappableCanvasRect sets a rectangular region of pixels from a base64-encoded RGBA buffer
func (b *Bridge) handleSetTappableCanvasRect(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	x := toInt(msg.Payload["x"])
	y := toInt(msg.Payload["y"])
	rectWidth := toInt(msg.Payload["width"])
	rectHeight := toInt(msg.Payload["height"])
	bufferB64 := msg.Payload["buffer"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Tappable raster widget not found",
		}
	}

	tappable, ok := w.(*TappableCanvasRaster)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a tappable canvas raster",
		}
	}

	// Decode base64 buffer
	pixels, err := base64.StdEncoding.DecodeString(bufferB64)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode pixel buffer: " + err.Error(),
		}
	}

	// Set the rectangular region
	tappable.SetPixelRect(x, y, rectWidth, rectHeight, pixels)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// ============================================================================
// Sprite System Handlers
// ============================================================================

// handleSaveRasterBackground saves the current raster contents as the static background
func (b *Bridge) handleSaveRasterBackground(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.Lock()
	defer b.mu.Unlock()

	buf, exists := b.rasterData[widgetID]
	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Raster widget not found",
		}
	}

	// Initialize sprite system if needed
	if b.rasterSprites == nil {
		b.rasterSprites = make(map[string]*RasterSpriteSystem)
	}

	sys := b.rasterSprites[widgetID]
	if sys == nil {
		sys = &RasterSpriteSystem{
			Sprites: make(map[string]*RasterSprite),
		}
		b.rasterSprites[widgetID] = sys
	}

	// Deep copy the current buffer as background
	height := len(buf)
	if height == 0 {
		return Response{ID: msg.ID, Success: true}
	}
	width := len(buf[0])

	sys.Background = make([][]color.Color, height)
	for y := 0; y < height; y++ {
		sys.Background[y] = make([]color.Color, width)
		copy(sys.Background[y], buf[y])
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleCreateRasterSprite creates a new sprite on a CanvasRaster
func (b *Bridge) handleCreateRasterSprite(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	name := msg.Payload["name"].(string)
	resourceName := msg.Payload["resourceName"].(string)
	x := toInt(msg.Payload["x"])
	y := toInt(msg.Payload["y"])
	zIndex := 0
	if z, ok := msg.Payload["zIndex"]; ok {
		zIndex = toInt(z)
	}
	visible := true
	if v, ok := msg.Payload["visible"].(bool); ok {
		visible = v
	}

	// Get the resource image
	imgData, exists := b.getResource(resourceName)
	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Resource '%s' not found", resourceName),
		}
	}

	// Decode the image
	decoded, _, err := image.Decode(bytes.NewReader(imgData))
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to decode sprite image: %v", err),
		}
	}

	bounds := decoded.Bounds()

	b.mu.Lock()
	defer b.mu.Unlock()

	// Initialize sprite system if needed
	if b.rasterSprites == nil {
		b.rasterSprites = make(map[string]*RasterSpriteSystem)
	}

	sys := b.rasterSprites[widgetID]
	if sys == nil {
		sys = &RasterSpriteSystem{
			Sprites: make(map[string]*RasterSprite),
		}
		b.rasterSprites[widgetID] = sys
	}

	// Create the sprite
	sprite := &RasterSprite{
		Name:         name,
		ResourceName: resourceName,
		X:            x,
		Y:            y,
		Width:        bounds.Dx(),
		Height:       bounds.Dy(),
		ZIndex:       zIndex,
		Visible:      visible,
		Image:        decoded,
	}
	sys.Sprites[name] = sprite

	// Mark initial position as dirty
	if visible {
		sys.AddDirty(x, y, sprite.Width, sprite.Height)
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleMoveRasterSprite moves a sprite to a new position
func (b *Bridge) handleMoveRasterSprite(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	name := msg.Payload["name"].(string)
	newX := toInt(msg.Payload["x"])
	newY := toInt(msg.Payload["y"])

	b.mu.Lock()
	defer b.mu.Unlock()

	sys := b.rasterSprites[widgetID]
	if sys == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Sprite system not initialized",
		}
	}

	sprite := sys.Sprites[name]
	if sprite == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Sprite '%s' not found", name),
		}
	}

	// Mark old position as dirty
	if sprite.Visible {
		sys.AddDirty(sprite.X, sprite.Y, sprite.Width, sprite.Height)
	}

	// Update position
	sprite.X = newX
	sprite.Y = newY

	// Mark new position as dirty
	if sprite.Visible {
		sys.AddDirty(newX, newY, sprite.Width, sprite.Height)
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetRasterSpriteResource changes a sprite's image
func (b *Bridge) handleSetRasterSpriteResource(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	name := msg.Payload["name"].(string)
	resourceName := msg.Payload["resourceName"].(string)

	// Get the resource image
	imgData, exists := b.getResource(resourceName)
	if !exists {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Resource '%s' not found", resourceName),
		}
	}

	// Decode the image
	decoded, _, err := image.Decode(bytes.NewReader(imgData))
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Failed to decode sprite image: %v", err),
		}
	}

	bounds := decoded.Bounds()

	b.mu.Lock()
	defer b.mu.Unlock()

	sys := b.rasterSprites[widgetID]
	if sys == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Sprite system not initialized",
		}
	}

	sprite := sys.Sprites[name]
	if sprite == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Sprite '%s' not found", name),
		}
	}

	// Mark current position as dirty (image is changing)
	if sprite.Visible {
		sys.AddDirty(sprite.X, sprite.Y, sprite.Width, sprite.Height)
	}

	// Update sprite
	sprite.ResourceName = resourceName
	sprite.Image = decoded
	sprite.Width = bounds.Dx()
	sprite.Height = bounds.Dy()

	// Mark again in case size changed
	if sprite.Visible {
		sys.AddDirty(sprite.X, sprite.Y, sprite.Width, sprite.Height)
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetRasterSpriteVisible shows or hides a sprite
func (b *Bridge) handleSetRasterSpriteVisible(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	name := msg.Payload["name"].(string)
	visible := msg.Payload["visible"].(bool)

	b.mu.Lock()
	defer b.mu.Unlock()

	sys := b.rasterSprites[widgetID]
	if sys == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Sprite system not initialized",
		}
	}

	sprite := sys.Sprites[name]
	if sprite == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Sprite '%s' not found", name),
		}
	}

	// Mark position as dirty (visibility is changing)
	sys.AddDirty(sprite.X, sprite.Y, sprite.Width, sprite.Height)
	sprite.Visible = visible

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleSetRasterSpriteZIndex changes a sprite's z-index
func (b *Bridge) handleSetRasterSpriteZIndex(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	name := msg.Payload["name"].(string)
	zIndex := toInt(msg.Payload["zIndex"])

	b.mu.Lock()
	defer b.mu.Unlock()

	sys := b.rasterSprites[widgetID]
	if sys == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Sprite system not initialized",
		}
	}

	sprite := sys.Sprites[name]
	if sprite == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Sprite '%s' not found", name),
		}
	}

	// Mark position as dirty (z-order is changing, need to redraw)
	if sprite.Visible {
		sys.AddDirty(sprite.X, sprite.Y, sprite.Width, sprite.Height)
	}
	sprite.ZIndex = zIndex

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleRemoveRasterSprite removes a sprite
func (b *Bridge) handleRemoveRasterSprite(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	name := msg.Payload["name"].(string)

	b.mu.Lock()
	defer b.mu.Unlock()

	sys := b.rasterSprites[widgetID]
	if sys == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Sprite system not initialized",
		}
	}

	sprite := sys.Sprites[name]
	if sprite == nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Sprite '%s' not found", name),
		}
	}

	// Mark position as dirty before removing
	if sprite.Visible {
		sys.AddDirty(sprite.X, sprite.Y, sprite.Width, sprite.Height)
	}

	delete(sys.Sprites, name)

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// handleFlushRasterSprites redraws only dirty regions
func (b *Bridge) handleFlushRasterSprites(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.Lock()

	w, exists := b.widgets[widgetID]
	if !exists {
		b.mu.Unlock()
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Raster widget not found",
		}
	}

	raster, ok := w.(*canvas.Raster)
	if !ok {
		b.mu.Unlock()
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a raster",
		}
	}

	buf := b.rasterData[widgetID]
	sys := b.rasterSprites[widgetID]

	if buf == nil || sys == nil {
		b.mu.Unlock()
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Sprite system or raster data not found",
		}
	}

	bufHeight := len(buf)
	if bufHeight == 0 {
		b.mu.Unlock()
		return Response{ID: msg.ID, Success: true}
	}
	bufWidth := len(buf[0])

	// Get sorted sprites
	sprites := sys.GetSortedSprites()

	// Process each dirty rectangle
	for _, dirty := range sys.DirtyRects {
		// Clamp to buffer bounds
		x1 := dirty.X
		y1 := dirty.Y
		x2 := dirty.X + dirty.Width
		y2 := dirty.Y + dirty.Height

		if x1 < 0 {
			x1 = 0
		}
		if y1 < 0 {
			y1 = 0
		}
		if x2 > bufWidth {
			x2 = bufWidth
		}
		if y2 > bufHeight {
			y2 = bufHeight
		}

		// 1. Restore background in dirty region
		if sys.Background != nil {
			for py := y1; py < y2; py++ {
				for px := x1; px < x2; px++ {
					if py < len(sys.Background) && px < len(sys.Background[py]) {
						buf[py][px] = sys.Background[py][px]
					}
				}
			}
		}

		// 2. Redraw sprites that overlap this dirty region (in z-order)
		for _, sprite := range sprites {
			// Check if sprite overlaps dirty region
			sx1 := sprite.X
			sy1 := sprite.Y
			sx2 := sprite.X + sprite.Width
			sy2 := sprite.Y + sprite.Height

			// No overlap check
			if sx2 <= x1 || sx1 >= x2 || sy2 <= y1 || sy1 >= y2 {
				continue
			}

			// Blit the overlapping portion
			bounds := sprite.Image.Bounds()
			for py := y1; py < y2; py++ {
				imgY := py - sprite.Y + bounds.Min.Y
				if imgY < bounds.Min.Y || imgY >= bounds.Max.Y {
					continue
				}
				for px := x1; px < x2; px++ {
					imgX := px - sprite.X + bounds.Min.X
					if imgX < bounds.Min.X || imgX >= bounds.Max.X {
						continue
					}

					srcColor := sprite.Image.At(imgX, imgY)
					sr, sg, sb, sa := srcColor.RGBA()
					sr8 := uint8(sr >> 8)
					sg8 := uint8(sg >> 8)
					sb8 := uint8(sb >> 8)
					sa8 := uint8(sa >> 8)

					// Skip fully transparent pixels
					if sa8 == 0 {
						continue
					}

					// Alpha blending if not fully opaque
					if sa8 < 255 {
						dstColor := buf[py][px]
						dr, dg, db, da := dstColor.RGBA()
						dr8 := uint8(dr >> 8)
						dg8 := uint8(dg >> 8)
						db8 := uint8(db >> 8)
						da8 := uint8(da >> 8)

						srcAlpha := float64(sa8) / 255.0
						invAlpha := 1.0 - srcAlpha

						sr8 = uint8(float64(sr8)*srcAlpha + float64(dr8)*invAlpha)
						sg8 = uint8(float64(sg8)*srcAlpha + float64(dg8)*invAlpha)
						sb8 = uint8(float64(sb8)*srcAlpha + float64(db8)*invAlpha)
						sa8 = uint8(float64(sa8) + float64(da8)*invAlpha)
					}

					buf[py][px] = color.RGBA{R: sr8, G: sg8, B: sb8, A: sa8}
				}
			}
		}
	}

	// Clear dirty rects
	sys.ClearDirty()

	b.mu.Unlock()

	// Refresh the raster
	fyne.Do(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
