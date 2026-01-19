package main

// ============================================================================
// Canvas Widget Creators - Shared Utilities
//
// This file contains shared utilities and types used across canvas primitives.
// The canvas handlers are split into separate files by functionality:
//   - widget_creators_canvas_shapes.go: Line, Circle, Rectangle, Arc, Ellipse
//   - widget_creators_canvas_text.go: Text, GradientText, RainbowT
//   - widget_creators_canvas_raster.go: Raster, pixel buffers, sprites
//   - widget_creators_canvas_complex.go: Polygon, SphericalPatch, Sphere
//   - widget_creators_canvas_gradient.go: Linear, Radial gradients
// ============================================================================

import (
	"fmt"
	"image/color"
	"strings"
)

// EllipseData stores ellipse parameters for updates
type EllipseData struct {
	X, Y, Width, Height float32
	FillColor           color.RGBA
}

// ============================================================================
// Rainbow Color Helper (used by gradient text)
// ============================================================================

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

// ============================================================================
// Math Helpers for Canvas Primitives (arc, spheres, etc.)
// ============================================================================

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

// Phase 8: Absolute value function for cubemap face selection
func absf(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

// ============================================================================
// Color Parsing Utilities
// ============================================================================

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
