package main

import (
	"encoding/base64"
	"image"
	"image/color"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
)

// ============================================================================
// Generalized Sphere Primitive with Pattern, Texture, and Lighting Support
// Supports: solid, checkered, stripes, gradient, custom patterns
// Features: multi-axis rotation, equirectangular/cubemap textures, lighting
// ============================================================================

// handleCreateCanvasSphere creates a generalized sphere with pattern support
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

	// Parse rotations (multi-axis rotation support)
	rotX := 0.0
	if rot, ok := msg.Payload["rotationX"]; ok {
		rotX = toFloat64(rot)
	}
	rotY := 0.0
	if rot, ok := msg.Payload["rotationY"]; ok {
		rotY = toFloat64(rot)
	} else if rot, ok := msg.Payload["rotation"]; ok {
		// Backward compatibility: 'rotation' parameter maps to rotationY
		rotY = toFloat64(rot)
	}
	rotZ := 0.0
	if rot, ok := msg.Payload["rotationZ"]; ok {
		rotZ = toFloat64(rot)
	}

	// Parse colors based on pattern type
	sphereData := &SphereData{
		CenterX:     cx,
		CenterY:     cy,
		Radius:      radius,
		LatBands:    latBands,
		LonSegments: lonSegments,
		RotationX:   rotX,
		RotationY:   rotY,
		RotationZ:   rotZ,
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
			{R: 204, G: 0, B: 0, A: 255},     // default red
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
		sphereData.CheckeredCol1 = color.RGBA{R: 204, G: 0, B: 0, A: 255}   // default red
		sphereData.CheckeredCol2 = color.RGBA{R: 255, G: 255, B: 255, A: 255} // default white
		if c1Hex, ok := msg.Payload["checkeredColor1"].(string); ok {
			sphereData.CheckeredCol1 = parseHexColorSimple(c1Hex).(color.RGBA)
		}
		if c2Hex, ok := msg.Payload["checkeredColor2"].(string); ok {
			sphereData.CheckeredCol2 = parseHexColorSimple(c2Hex).(color.RGBA)
		}
	default:
		// Unknown pattern - default to checkered
		sphereData.Pattern = "checkered"
		sphereData.CheckeredCol1 = color.RGBA{R: 204, G: 0, B: 0, A: 255}
		sphereData.CheckeredCol2 = color.RGBA{R: 255, G: 255, B: 255, A: 255}
	}

	// Parse texture options
	if textureInterface, ok := msg.Payload["texture"]; ok {
		if textureMap, ok := textureInterface.(map[string]interface{}); ok {
			if resourceName, ok := textureMap["resourceName"].(string); ok {
				sphereData.TextureResourceName = resourceName
			}
			if mapping, ok := textureMap["mapping"].(string); ok {
				sphereData.TextureMapping = mapping
			} else {
				sphereData.TextureMapping = "equirectangular"
			}
			// Parse cubemap texture options
			if cubemapInterface, ok := textureMap["cubemap"]; ok {
				if cubemap, ok := cubemapInterface.(map[string]interface{}); ok {
					if pX, ok := cubemap["positiveX"].(string); ok {
						sphereData.CubemapPosX = pX
					}
					if nX, ok := cubemap["negativeX"].(string); ok {
						sphereData.CubemapNegX = nX
					}
					if pY, ok := cubemap["positiveY"].(string); ok {
						sphereData.CubemapPosY = pY
					}
					if nY, ok := cubemap["negativeY"].(string); ok {
						sphereData.CubemapNegY = nY
					}
					if pZ, ok := cubemap["positiveZ"].(string); ok {
						sphereData.CubemapPosZ = pZ
					}
					if nZ, ok := cubemap["negativeZ"].(string); ok {
						sphereData.CubemapNegZ = nZ
					}
				}
			}
		}
	}

	// Parse tap handler flag
	if hasTap, ok := msg.Payload["hasTapHandler"].(bool); ok && hasTap {
		sphereData.HasTapHandler = true
		sphereData.WidgetID = widgetID
	}

	// Parse lighting options with defaults
	sphereData.LightingEnabled = true // Default enabled
	sphereData.LightDirX = 0.5
	sphereData.LightDirY = -0.3
	sphereData.LightDirZ = 0.8
	sphereData.Ambient = 0.3
	sphereData.Diffuse = 0.7

	if lightingInterface, ok := msg.Payload["lighting"]; ok {
		if lightingMap, ok := lightingInterface.(map[string]interface{}); ok {
			if enabled, ok := lightingMap["enabled"].(bool); ok {
				sphereData.LightingEnabled = enabled
			}
			if dirInterface, ok := lightingMap["direction"]; ok {
				if dir, ok := dirInterface.(map[string]interface{}); ok {
					// Handle various numeric types (msgpack can send int8, int64, float64, etc.)
					sphereData.LightDirX = toFloat64(dir["x"])
					sphereData.LightDirY = toFloat64(dir["y"])
					sphereData.LightDirZ = toFloat64(dir["z"])
				}
			}
			if ambientVal, ok := lightingMap["ambient"]; ok {
				sphereData.Ambient = toFloat64(ambientVal)
			}
			if diffuseVal, ok := lightingMap["diffuse"]; ok {
				sphereData.Diffuse = toFloat64(diffuseVal)
			}
		}
	}

	// Parse custom pattern flag
	if hasCustom, ok := msg.Payload["hasCustomPattern"].(bool); ok && hasCustom {
		sphereData.HasCustomPattern = true
	}

	// Store sphere data for dynamic updates
	b.mu.Lock()
	if b.sphereData == nil {
		b.sphereData = make(map[string]*SphereData)
	}
	b.sphereData[widgetID] = sphereData
	b.mu.Unlock()

	sphereWidgetID := widgetID

	// Decode texture once if specified (cache for performance)
	var textureImage image.Image
	if sphereData.TextureResourceName != "" {
		if imgData, exists := b.getResource(sphereData.TextureResourceName); exists {
			if decoded, err := decodeImage(imgData); err == nil {
				textureImage = decoded
			}
		}
	}

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
		rotX := sphere.RotationX
		rotY := sphere.RotationY
		rotZ := sphere.RotationZ
		pattern := sphere.Pattern
		solidColor := sphere.SolidColor
		col1 := sphere.CheckeredCol1
		col2 := sphere.CheckeredCol2
		stripeColors := sphere.StripeColors
		stripeDir := sphere.StripeDir
		gradStart := sphere.GradientStart
		gradEnd := sphere.GradientEnd
		textureResourceName := sphere.TextureResourceName
		textureMapping := sphere.TextureMapping
		// Cubemap face resource names
		cubemapPosX := sphere.CubemapPosX
		cubemapNegX := sphere.CubemapNegX
		cubemapPosY := sphere.CubemapPosY
		cubemapNegY := sphere.CubemapNegY
		cubemapPosZ := sphere.CubemapPosZ
		cubemapNegZ := sphere.CubemapNegZ
		// Configurable lighting
		lightingEnabled := sphere.LightingEnabled
		sphereLightDirX := sphere.LightDirX
		sphereLightDirY := sphere.LightDirY
		sphereLightDirZ := sphere.LightDirZ
		sphereAmbient := sphere.Ambient
		sphereDiffuse := sphere.Diffuse
		// Custom pattern buffer
		customBuffer := b.sphereCustomBuffers[sphereWidgetID]
		b.mu.RUnlock()

		// Convert pixel to coordinates relative to sphere center
		centerX := float64(w) / 2
		centerY := float64(h) / 2
		// Use min dimension to ensure sphere fits without clipping
		minDim := float64(w)
		if float64(h) < minDim {
			minDim = float64(h)
		}
		scale := minDim / (2 * sR)
		x := (float64(px) - centerX) / scale
		y := (float64(py) - centerY) / scale

		// Check if within sphere circle
		distSq := x*x + y*y
		if distSq > sR*sR {
			return color.RGBA{A: 0}
		}

		// Calculate z for front face of sphere
		z := sqrt(sR*sR - distSq)

		// Apply inverse 3D rotation matrix to find original (unrotated) position
		// Rotations are applied in forward order Z, X, Y, so we apply inverses in reverse: -Y, -X, -Z

		// Apply inverse Y-axis rotation (yaw/spin)
		cosRY := cos(-rotY)
		sinRY := sin(-rotY)
		x1 := x*cosRY + z*sinRY
		z1 := -x*sinRY + z*cosRY
		y1 := y

		// Apply inverse X-axis rotation (pitch/tilt)
		cosRX := cos(-rotX)
		sinRX := sin(-rotX)
		x2 := x1
		y2 := y1*cosRX - z1*sinRX
		z2 := y1*sinRX + z1*cosRX

		// Apply inverse Z-axis rotation (roll)
		cosRZ := cos(-rotZ)
		sinRZ := sin(-rotZ)
		xOrig := x2*cosRZ - y2*sinRZ
		yOrig := x2*sinRZ + y2*cosRZ
		zOrig := z2

		// Calculate latitude: angle from equator, -π/2 (south) to π/2 (north)
		lat := asin(-yOrig / sR)

		// Calculate longitude: angle around Y axis, 0 to 2π (full sphere)
		lon := atan2(zOrig, xOrig)
		if lon < 0 {
			lon += 2 * pi
		}

		// Calculate lighting factor using configurable parameters
		var shade float64 = 1.0 // Default to full brightness
		if lightingEnabled {
			lightDirX := sphereLightDirX
			lightDirY := sphereLightDirY
			lightDirZ := sphereLightDirZ
			// Normalize light direction
			lightLen := sqrt(lightDirX*lightDirX + lightDirY*lightDirY + lightDirZ*lightDirZ)
			if lightLen > 0 {
				lightDirX /= lightLen
				lightDirY /= lightLen
				lightDirZ /= lightLen
			}
			// Surface normal (normalized) is just the point on the sphere
			// Use screen-space coordinates (x, y, z) for view-relative lighting
			normalX := x / sR
			normalY := y / sR
			normalZ := z / sR
			// Dot product gives lighting intensity
			lightFactor := normalX*lightDirX + normalY*lightDirY + normalZ*lightDirZ
			if lightFactor < 0 {
				lightFactor = 0
			}
			// Ambient + diffuse using configurable values
			shade = sphereAmbient + sphereDiffuse*lightFactor
		}

		// Helper to apply shading to a color
		applyShade := func(c color.RGBA) color.RGBA {
			return color.RGBA{
				R: uint8(float64(c.R) * shade),
				G: uint8(float64(c.G) * shade),
				B: uint8(float64(c.B) * shade),
				A: c.A,
			}
		}

		// Check if texture should be used (takes precedence over pattern)
		if textureMapping == "cubemap" && cubemapPosX != "" {
			// Cubemap texture sampling
			// The normal (nx, ny, nz) determines which face to sample
			// Use the original (unrotated) normal for face selection
			nx := xOrig / sR
			ny := yOrig / sR
			nz := zOrig / sR

			absNX := absf(nx)
			absNY := absf(ny)
			absNZ := absf(nz)

			var faceResourceName string
			var u, v float64

			if absNX >= absNY && absNX >= absNZ {
				// X is dominant - sample +X or -X face
				if nx > 0 {
					faceResourceName = cubemapPosX
					u = (-nz/absNX + 1) / 2
					v = (-ny/absNX + 1) / 2
				} else {
					faceResourceName = cubemapNegX
					u = (nz/absNX + 1) / 2
					v = (-ny/absNX + 1) / 2
				}
			} else if absNY >= absNX && absNY >= absNZ {
				// Y is dominant - sample +Y or -Y face
				if ny > 0 {
					faceResourceName = cubemapPosY
					u = (nx/absNY + 1) / 2
					v = (nz/absNY + 1) / 2
				} else {
					faceResourceName = cubemapNegY
					u = (nx/absNY + 1) / 2
					v = (-nz/absNY + 1) / 2
				}
			} else {
				// Z is dominant - sample +Z or -Z face
				if nz > 0 {
					faceResourceName = cubemapPosZ
					u = (nx/absNZ + 1) / 2
					v = (-ny/absNZ + 1) / 2
				} else {
					faceResourceName = cubemapNegZ
					u = (-nx/absNZ + 1) / 2
					v = (-ny/absNZ + 1) / 2
				}
			}

			// Load and sample the face texture
			if faceResourceName != "" {
				if imgData, exists := b.getResource(faceResourceName); exists {
					if faceImg, err := decodeImage(imgData); err == nil {
						texColor := sampleTexture(faceImg, u, v)
						return applyShade(texColor)
					}
				}
			}
		} else if textureImage != nil && textureResourceName != "" {
			// Equirectangular texture mapping
			// Calculate equirectangular (u, v) coordinates from lat/lon
			// u: longitude mapped to [0, 1] -> (lon + π) / (2π)
			// v: latitude mapped to [0, 1] -> (lat + π/2) / π
			u := (lon + pi) / (2 * pi)
			v := (lat + pi/2) / pi

			// Sample texture
			texColor := sampleTexture(textureImage, u, v)
			return applyShade(texColor)
		}

		// Apply pattern
		switch pattern {
		case "solid":
			return applyShade(solidColor)

		case "stripes":
			if len(stripeColors) == 0 {
				return color.RGBA{R: 255, G: 0, B: 0, A: 255} // fallback red
			}
			var baseColor color.RGBA
			if stripeDir == "vertical" {
				// Vertical stripes based on longitude
				stripeIdx := int(lon / (2 * pi / float64(len(stripeColors))))
				if stripeIdx >= len(stripeColors) {
					stripeIdx = len(stripeColors) - 1
				}
				if stripeIdx < 0 {
					stripeIdx = 0
				}
				baseColor = stripeColors[stripeIdx]
			} else {
				// Horizontal stripes based on latitude
				latIdx := int((lat + pi/2) / (pi / float64(len(stripeColors))))
				if latIdx >= len(stripeColors) {
					latIdx = len(stripeColors) - 1
				}
				if latIdx < 0 {
					latIdx = 0
				}
				baseColor = stripeColors[latIdx]
			}
			return applyShade(baseColor)

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
			baseColor := color.RGBA{
				R: uint8(float64(gradStart.R)*(1-t) + float64(gradEnd.R)*t),
				G: uint8(float64(gradStart.G)*(1-t) + float64(gradEnd.G)*t),
				B: uint8(float64(gradStart.B)*(1-t) + float64(gradEnd.B)*t),
				A: uint8(float64(gradStart.A)*(1-t) + float64(gradEnd.A)*t),
			}
			return applyShade(baseColor)

		case "checkered":
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
				return applyShade(col1)
			}
			return applyShade(col2)

		case "custom":
			// Custom pattern - sample from pre-rendered buffer
			if customBuffer == nil {
				return color.RGBA{A: 0} // No buffer yet
			}
			bounds := customBuffer.Bounds()
			bufW := bounds.Dx()
			bufH := bounds.Dy()
			// Map pixel coordinates to buffer coordinates
			bufX := px
			bufY := py
			if bufX >= 0 && bufX < bufW && bufY >= 0 && bufY < bufH {
				return customBuffer.RGBAAt(bufX, bufY)
			}
			return color.RGBA{A: 0}

		default:
			// Unknown pattern - return transparent
			return color.RGBA{A: 0}
		}
	})

	// Size the raster to contain the sphere
	size := radius * 2
	raster.Resize(fyne.NewSize(size, size))
	raster.SetMinSize(fyne.NewSize(size, size))

	// Wrap in tappable if tap handler is registered
	var finalWidget fyne.CanvasObject = raster
	if sphereData.HasTapHandler {
		// When wrapped in tappable, raster position is (0,0) relative to wrapper
		// The wrapper's position is managed by the layout
		raster.Move(fyne.NewPos(0, 0))
		tappable := NewTappableCanvasObject(raster, func(pos fyne.Position) {
			// Get current sphere data for rotation values
			b.mu.RLock()
			sphere := b.sphereData[sphereWidgetID]
			if sphere == nil {
				b.mu.RUnlock()
				return
			}
			sR := float64(sphere.Radius)
			rotX := sphere.RotationX
			rotY := sphere.RotationY
			rotZ := sphere.RotationZ
			wID := sphere.WidgetID
			b.mu.RUnlock()

			// Get actual size for coordinate calculations
			rasterSize := raster.Size()
			actualW := float64(rasterSize.Width)
			actualH := float64(rasterSize.Height)

			// The sphere is rendered centered in the ACTUAL size, not min size
			// because the raster pixel function receives actual dimensions
			centerX := actualW / 2
			centerY := actualH / 2

			// Scale is based on min dimension to prevent clipping
			minDim := actualW
			if actualH < minDim {
				minDim = actualH
			}
			scale := minDim / (2 * sR)

			x := (float64(pos.X) - centerX) / scale
			y := (float64(pos.Y) - centerY) / scale

			// Check if tap is within sphere
			distSq := x*x + y*y
			if distSq > sR*sR {
				return // Outside sphere, ignore
			}

			// Calculate z on sphere surface
			z := sqrt(sR*sR - distSq)

			// Apply inverse rotations to get geographic coordinates (same as rendering)
			// Inverse Y-axis rotation
			cosRY := cos(-rotY)
			sinRY := sin(-rotY)
			x1 := x*cosRY + z*sinRY
			z1 := -x*sinRY + z*cosRY
			y1 := y

			// Inverse X-axis rotation
			cosRX := cos(-rotX)
			sinRX := sin(-rotX)
			y2 := y1*cosRX - z1*sinRX
			z2 := y1*sinRX + z1*cosRX
			x2 := x1

			// Inverse Z-axis rotation
			cosRZ := cos(-rotZ)
			sinRZ := sin(-rotZ)
			x3 := x2*cosRZ - y2*sinRZ
			y3 := x2*sinRZ + y2*cosRZ
			z3 := z2

			// Convert to spherical coordinates (lat/lon)
			// Normalize to unit sphere
			r := sqrt(x3*x3 + y3*y3 + z3*z3)
			if r == 0 {
				return
			}
			nx := x3 / r
			ny := y3 / r
			nz := z3 / r

			// lat = asin(y), lon = atan2(z, x)
			lat := asin(ny)
			lon := atan2(nz, nx)

			// Send tap event
			b.sendEvent(Event{
				Type:     "sphereTapped",
				WidgetID: wID,
				Data: map[string]interface{}{
					"lat":     lat,
					"lon":     lon,
					"screenX": int(pos.X),
					"screenY": int(pos.Y),
				},
			})
		})
		finalWidget = tappable
	} else {
		// Non-tappable sphere: use cx/cy for absolute positioning (e.g., on a canvas)
		raster.Move(fyne.NewPos(cx-radius, cy-radius))
	}

	b.mu.Lock()
	b.widgets[widgetID] = finalWidget
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

	// Support new rotation parameters (rotationX, rotationY, rotationZ)
	// Maintain backward compatibility with old "rotation" parameter -> maps to rotationY
	if rotX, ok := getFloat64(msg.Payload["rotationX"]); ok {
		sphere.RotationX = rotX
	}
	if rotY, ok := getFloat64(msg.Payload["rotationY"]); ok {
		sphere.RotationY = rotY
	} else if rot, ok := getFloat64(msg.Payload["rotation"]); ok {
		// Backward compatibility: old "rotation" parameter maps to rotationY
		sphere.RotationY = rot
	}
	if rotZ, ok := getFloat64(msg.Payload["rotationZ"]); ok {
		sphere.RotationZ = rotZ
	}

	// Handle texture updates
	if textureInterface, ok := msg.Payload["texture"]; ok {
		if textureMap, ok := textureInterface.(map[string]interface{}); ok {
			if resourceName, ok := textureMap["resourceName"].(string); ok {
				sphere.TextureResourceName = resourceName
			}
			if mapping, ok := textureMap["mapping"].(string); ok {
				sphere.TextureMapping = mapping
			} else {
				sphere.TextureMapping = "equirectangular"
			}
			// Handle cubemap texture updates
			if cubemapInterface, ok := textureMap["cubemap"]; ok {
				if cubemap, ok := cubemapInterface.(map[string]interface{}); ok {
					if pX, ok := cubemap["positiveX"].(string); ok {
						sphere.CubemapPosX = pX
					}
					if nX, ok := cubemap["negativeX"].(string); ok {
						sphere.CubemapNegX = nX
					}
					if pY, ok := cubemap["positiveY"].(string); ok {
						sphere.CubemapPosY = pY
					}
					if nY, ok := cubemap["negativeY"].(string); ok {
						sphere.CubemapNegY = nY
					}
					if pZ, ok := cubemap["positiveZ"].(string); ok {
						sphere.CubemapPosZ = pZ
					}
					if nZ, ok := cubemap["negativeZ"].(string); ok {
						sphere.CubemapNegZ = nZ
					}
				}
			}
		}
	}

	// Handle lighting updates
	if lightingInterface, ok := msg.Payload["lighting"]; ok {
		if lightingMap, ok := lightingInterface.(map[string]interface{}); ok {
			if enabled, ok := lightingMap["enabled"].(bool); ok {
				sphere.LightingEnabled = enabled
			}
			if dirInterface, ok := lightingMap["direction"]; ok {
				if dir, ok := dirInterface.(map[string]interface{}); ok {
					if x, ok := dir["x"].(float64); ok {
						sphere.LightDirX = x
					}
					if y, ok := dir["y"].(float64); ok {
						sphere.LightDirY = y
					}
					if z, ok := dir["z"].(float64); ok {
						sphere.LightDirZ = z
					}
				}
			}
			if ambient, ok := lightingMap["ambient"].(float64); ok {
				sphere.Ambient = ambient
			}
			if diffuse, ok := lightingMap["diffuse"].(float64); ok {
				sphere.Diffuse = diffuse
			}
		}
	}
	b.mu.Unlock()

	// Refresh the raster to re-render with updated rotation/texture/lighting
	// Note: Don't call Move() here as it conflicts with Fyne layout containers
	fyne.DoAndWait(func() {
		raster.Refresh()
	})

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}

// ============================================================================
// Custom Pattern Buffer Handler
// ============================================================================

// handleUpdateCanvasSphereBuffer receives a pre-rendered pixel buffer for custom patterns
func (b *Bridge) handleUpdateCanvasSphereBuffer(msg Message) Response {
	widgetID := msg.Payload["widgetId"].(string)
	bufferBase64, ok := msg.Payload["buffer"].(string)
	if !ok {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Missing buffer data",
		}
	}

	width, _ := getFloat64(msg.Payload["width"])
	height, _ := getFloat64(msg.Payload["height"])
	if width <= 0 || height <= 0 {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Invalid buffer dimensions",
		}
	}

	// Decode base64 buffer
	bufferData, err := base64.StdEncoding.DecodeString(bufferBase64)
	if err != nil {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Failed to decode buffer: " + err.Error(),
		}
	}

	// Check buffer size matches expected dimensions (width * height * 4 for RGBA)
	expectedSize := int(width) * int(height) * 4
	if len(bufferData) != expectedSize {
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Buffer size mismatch",
		}
	}

	// Convert buffer to an image
	img := image.NewRGBA(image.Rect(0, 0, int(width), int(height)))
	copy(img.Pix, bufferData)

	b.mu.Lock()
	// Store the custom pattern image for the sphere
	if b.sphereCustomBuffers == nil {
		b.sphereCustomBuffers = make(map[string]*image.RGBA)
	}
	b.sphereCustomBuffers[widgetID] = img
	b.mu.Unlock()

	// Refresh the widget
	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if exists {
		if raster, ok := w.(*canvas.Raster); ok {
			fyne.DoAndWait(func() {
				raster.Refresh()
			})
		}
	}

	return Response{
		ID:      msg.ID,
		Success: true,
	}
}
