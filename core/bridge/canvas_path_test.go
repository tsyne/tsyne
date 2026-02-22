package main

import (
	"image/color"
	"testing"
)

// TestPathRasterHiDPIScaling verifies that PathRaster.render() correctly
// scales path coordinates when the device pixel dimensions (w, h) differ
// from the logical dimensions (pr.width, pr.height).
//
// Background: On HiDPI displays (e.g. 153 DPI ≈ 1.6x), Fyne's canvas.Raster
// callback passes device-pixel dimensions. Without scaling, path coordinates
// (which are in logical pixel space) render at the wrong position/size.
func TestPathRasterHiDPIScaling(t *testing.T) {
	// Create a path raster at logical size 100x100 with a diagonal line
	pr := &PathRaster{
		pathString:  "M 10 10 L 90 90",
		fillColor:   color.RGBA{R: 255, A: 255},
		strokeColor: color.RGBA{G: 255, A: 255},
		strokeWidth: 2,
		width:       100,
		height:      100,
	}

	// A helper to check if a specific pixel is non-transparent
	isOpaque := func(img interface{ At(x, y int) color.Color }, x, y int) bool {
		_, _, _, a := img.At(x, y).RGBA()
		return a > 0
	}

	testCases := []struct {
		name       string
		deviceW    int
		deviceH    int
		scaleFactor float64
	}{
		{"1x (no scaling)", 100, 100, 1.0},
		{"1.5x HiDPI", 150, 150, 1.5},
		{"2x Retina", 200, 200, 2.0},
		{"1.59x (153 DPI)", 159, 159, 1.59},
		{"3x", 300, 300, 3.0},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			img := pr.render(tc.deviceW, tc.deviceH)
			sf := tc.scaleFactor

			// The path is "M 10 10 L 90 90" in logical coords.
			// At scale factor sf, the start point should be near (10*sf, 10*sf)
			// and the end point near (90*sf, 90*sf).

			startX := int(10 * sf)
			startY := int(10 * sf)
			endX := int(90*sf) - 1
			endY := int(90*sf) - 1

			// Check that the start region has drawn content
			startFound := false
			for dx := -3; dx <= 3; dx++ {
				for dy := -3; dy <= 3; dy++ {
					sx, sy := startX+dx, startY+dy
					if sx >= 0 && sy >= 0 && sx < tc.deviceW && sy < tc.deviceH {
						if isOpaque(img, sx, sy) {
							startFound = true
							break
						}
					}
				}
				if startFound {
					break
				}
			}
			if !startFound {
				t.Errorf("No drawn content near start point (%d, %d) at scale %.2fx", startX, startY, sf)
			}

			// Check that the end region has drawn content
			endFound := false
			for dx := -3; dx <= 3; dx++ {
				for dy := -3; dy <= 3; dy++ {
					ex, ey := endX+dx, endY+dy
					if ex >= 0 && ey >= 0 && ex < tc.deviceW && ey < tc.deviceH {
						if isOpaque(img, ex, ey) {
							endFound = true
							break
						}
					}
				}
				if endFound {
					break
				}
			}
			if !endFound {
				t.Errorf("No drawn content near end point (%d, %d) at scale %.2fx", endX, endY, sf)
			}

			// Verify that the area beyond the scaled path is empty.
			// If HiDPI scaling is NOT applied, the path would only reach
			// (90, 90) in a 200x200 buffer — leaving the bottom-right quadrant empty.
			// With correct scaling at 2x, the path reaches (180, 180).
			if tc.scaleFactor >= 2 {
				// Check a point that would be empty WITHOUT scaling but occupied WITH it
				checkX := int(85 * sf) // 170 at 2x — should be on the path
				checkY := int(85 * sf)
				nearLine := false
				for dx := -4; dx <= 4; dx++ {
					for dy := -4; dy <= 4; dy++ {
						cx, cy := checkX+dx, checkY+dy
						if cx >= 0 && cy >= 0 && cx < tc.deviceW && cy < tc.deviceH {
							if isOpaque(img, cx, cy) {
								nearLine = true
								break
							}
						}
					}
					if nearLine {
						break
					}
				}
				if !nearLine {
					t.Errorf("At scale %.2fx, expected content near (%d, %d) but found none — "+
						"HiDPI scaling may not be applied", sf, checkX, checkY)
				}
			}
		})
	}
}

// TestPathRasterHiDPIFilledRect verifies that a filled rectangle path
// at various HiDPI scales fills the correct region of the device buffer.
func TestPathRasterHiDPIFilledRect(t *testing.T) {
	// A filled rectangle covering the right half of a 100x100 logical canvas
	pr := &PathRaster{
		pathString: "M 50 0 L 100 0 L 100 100 L 50 100 Z",
		fillColor:  color.RGBA{R: 255, A: 255},
		width:      100,
		height:     100,
	}

	testCases := []struct {
		name    string
		deviceW int
		deviceH int
		scale   float64
	}{
		{"1x", 100, 100, 1.0},
		{"2x", 200, 200, 2.0},
		{"1.5x", 150, 150, 1.5},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			img := pr.render(tc.deviceW, tc.deviceH)

			// Left side (x=10*scale) should be empty
			leftX := int(10 * tc.scale)
			midY := tc.deviceH / 2
			_, _, _, aLeft := img.At(leftX, midY).RGBA()
			if aLeft > 0 {
				t.Errorf("Expected empty at left (%d, %d) but found content", leftX, midY)
			}

			// Right side (x=75*scale) should be filled
			rightX := int(75 * tc.scale)
			if rightX >= tc.deviceW {
				rightX = tc.deviceW - 1
			}
			_, _, _, aRight := img.At(rightX, midY).RGBA()
			if aRight == 0 {
				t.Errorf("Expected filled at right (%d, %d) but found empty — "+
					"HiDPI scaling may not be applied", rightX, midY)
			}

			// Edge of fill: x=50*scale should be near the boundary
			edgeX := int(50 * tc.scale)
			// Just past the edge should be filled
			pastEdge := edgeX + 2
			if pastEdge < tc.deviceW {
				_, _, _, aPast := img.At(pastEdge, midY).RGBA()
				if aPast == 0 {
					t.Errorf("Expected filled just past fill edge (%d, %d) at scale %.1fx",
						pastEdge, midY, tc.scale)
				}
			}
		})
	}
}

// TestPathRasterHiDPIStroke verifies stroke rendering at HiDPI scales.
func TestPathRasterHiDPIStroke(t *testing.T) {
	pr := &PathRaster{
		pathString:  "M 50 10 L 50 90",
		strokeColor: color.RGBA{B: 255, A: 255},
		strokeWidth: 4,
		width:       100,
		height:      100,
	}

	testCases := []struct {
		name    string
		deviceW int
		deviceH int
		scale   float64
	}{
		{"1x", 100, 100, 1.0},
		{"2x", 200, 200, 2.0},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			img := pr.render(tc.deviceW, tc.deviceH)

			// Midpoint of the stroke: (50*scale, 50*scale)
			mx := int(50 * tc.scale)
			my := int(50 * tc.scale)

			// Should have content at the stroke center
			_, _, _, a := img.At(mx, my).RGBA()
			if a == 0 {
				t.Errorf("Expected stroke at center (%d, %d) at scale %.1fx", mx, my, tc.scale)
			}

			// Should be empty well away from the stroke (x=10*scale)
			farX := int(10 * tc.scale)
			_, _, _, aFar := img.At(farX, my).RGBA()
			if aFar > 0 {
				t.Errorf("Expected empty away from stroke (%d, %d) at scale %.1fx", farX, my, tc.scale)
			}
		})
	}
}
