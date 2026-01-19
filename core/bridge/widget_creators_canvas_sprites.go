package main

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"sort"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
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
	Background [][]color.Color // Saved static background
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
