package main

import (
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Simple Sphere Primitives: SphericalPatch, CheckeredSphere
// These are simpler/legacy sphere types with single-axis rotation
// ============================================================================

// handleCreateCanvasSphericalPatch creates a spherical patch primitive
// This renders a curved quadrilateral on a sphere surface, bounded by lat/lon lines
// Used for Amiga Boing ball style checkered spheres
func (b *Bridge) handleCreateCanvasSphericalPatch(msg Message) Response {
	widgetID := msg.Payload["id"].(string)

	// Parse parameters
	cx := toFloat32(msg.Payload["cx"])     // Sphere center X
	cy := toFloat32(msg.Payload["cy"])     // Sphere center Y
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
	var color1 color.RGBA = color.RGBA{R: 204, G: 0, B: 0, A: 255}     // #cc0000 red
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
