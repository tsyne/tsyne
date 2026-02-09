package main

import (
	"image"
	"image/color"
	"regexp"
	"strconv"
	"strings"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"

	"github.com/fogleman/gg"
)

// GradientStop represents a single color stop in a gradient.
type GradientStop struct {
	Offset float64
	Color  color.Color
}

// FillGradient stores linear gradient data for rendering.
type FillGradient struct {
	Type           string  // "linear"
	X1, Y1, X2, Y2 float64 // bbox-relative (0-1)
	Stops          []GradientStop
}

// PathRaster renders SVG-style paths with quadratic/cubic Bezier curves
// using the gg library for smooth antialiased rendering.
type PathRaster struct {
	raster       *canvas.Raster
	pathString   string
	strokeColor  color.Color
	strokeWidth  float64
	fillColor    color.Color
	fillGradient *FillGradient
	lineCap      gg.LineCap
	lineJoin     gg.LineJoin
	width        int
	height       int
}

// NewPathRaster creates a new path raster with the given dimensions
func NewPathRaster(width, height int) *PathRaster {
	pr := &PathRaster{
		strokeColor: color.White,
		strokeWidth: 2,
		lineCap:     gg.LineCapRound,
		lineJoin:    gg.LineJoinRound,
		width:       width,
		height:      height,
	}

	pr.raster = canvas.NewRaster(func(w, h int) image.Image {
		return pr.render(w, h)
	})
	pr.raster.Resize(fyne.NewSize(float32(width), float32(height)))

	return pr
}

// SetPath sets the SVG path string (supports M, L, Q, C, Z commands)
func (pr *PathRaster) SetPath(pathString string) {
	pr.pathString = pathString
}

// SetStrokeColor sets the stroke color
func (pr *PathRaster) SetStrokeColor(c color.Color) {
	pr.strokeColor = c
}

// SetStrokeWidth sets the stroke width
func (pr *PathRaster) SetStrokeWidth(width float64) {
	pr.strokeWidth = width
}

// SetFillColor sets the fill color (nil for no fill)
func (pr *PathRaster) SetFillColor(c color.Color) {
	pr.fillColor = c
}

// SetFillGradient sets the gradient fill (overrides fillColor when set)
func (pr *PathRaster) SetFillGradient(grad *FillGradient) {
	pr.fillGradient = grad
}

// SetLineCap sets the line cap style
func (pr *PathRaster) SetLineCap(cap gg.LineCap) {
	pr.lineCap = cap
}

// SetLineJoin sets the line join style
func (pr *PathRaster) SetLineJoin(join gg.LineJoin) {
	pr.lineJoin = join
}

// Raster returns the underlying Fyne raster object
func (pr *PathRaster) Raster() *canvas.Raster {
	return pr.raster
}

// Refresh triggers a redraw
func (pr *PathRaster) Refresh() {
	fyne.Do(func() {
		pr.raster.Refresh()
	})
}

// render draws the path to an image
func (pr *PathRaster) render(w, h int) image.Image {
	dc := gg.NewContext(w, h)

	// Set line style
	dc.SetLineCap(pr.lineCap)
	dc.SetLineJoin(pr.lineJoin)

	// Parse and draw the path
	pr.drawPath(dc)

	// Fill with gradient or solid color
	if pr.fillGradient != nil && len(pr.fillGradient.Stops) > 0 {
		// Compute path bounding box from the drawn path
		minX, minY, maxX, maxY := pr.computePathBounds()
		bw := maxX - minX
		bh := maxY - minY
		if bw < 1 {
			bw = 1
		}
		if bh < 1 {
			bh = 1
		}
		// Use custom bbox-space gradient that projects in normalized (0-1)
		// coordinates. gg.NewLinearGradient projects in pixel space, which
		// distorts the angle when the bbox isn't square.
		grad := &bboxLinearGradient{
			x1: pr.fillGradient.X1, y1: pr.fillGradient.Y1,
			x2: pr.fillGradient.X2, y2: pr.fillGradient.Y2,
			minX: minX, minY: minY, bw: bw, bh: bh,
		}
		// Pad stops to cover 0-1 range — prevent extrapolation artifacts
		stops := pr.fillGradient.Stops
		if stops[0].Offset > 0 {
			grad.stops = append(grad.stops, GradientStop{Offset: 0, Color: stops[0].Color})
		}
		grad.stops = append(grad.stops, stops...)
		if stops[len(stops)-1].Offset < 1 {
			grad.stops = append(grad.stops, GradientStop{Offset: 1, Color: stops[len(stops)-1].Color})
		}
		dc.SetFillStyle(grad)
		dc.FillPreserve()
	} else if pr.fillColor != nil {
		dc.SetColor(pr.fillColor)
		dc.FillPreserve()
	}

	// Stroke
	if pr.strokeColor != nil && pr.strokeWidth > 0 {
		dc.SetColor(pr.strokeColor)
		dc.SetLineWidth(pr.strokeWidth)
		dc.Stroke()
	}

	return dc.Image()
}

// bboxLinearGradient implements gg.Pattern, projecting in bbox-normalized
// space so that gradientTransform angles are preserved regardless of bbox
// aspect ratio.
type bboxLinearGradient struct {
	x1, y1, x2, y2 float64 // gradient line in bbox space (0-1)
	minX, minY      float64 // bbox origin in pixels
	bw, bh          float64 // bbox size in pixels
	stops           []GradientStop
}

func (g *bboxLinearGradient) ColorAt(x, y int) color.Color {
	// Convert pixel coords to bbox-normalized space (0-1)
	bx := (float64(x) - g.minX) / g.bw
	by := (float64(y) - g.minY) / g.bh

	// Project onto gradient line in bbox space
	dx := g.x2 - g.x1
	dy := g.y2 - g.y1
	lenSq := dx*dx + dy*dy
	if lenSq < 1e-10 {
		if len(g.stops) > 0 {
			return g.stops[0].Color
		}
		return color.Transparent
	}
	t := ((bx-g.x1)*dx + (by-g.y1)*dy) / lenSq

	// Interpolate color from stops
	if len(g.stops) == 0 {
		return color.Transparent
	}
	if t <= g.stops[0].Offset {
		return g.stops[0].Color
	}
	last := g.stops[len(g.stops)-1]
	if t >= last.Offset {
		return last.Color
	}
	for i := 1; i < len(g.stops); i++ {
		s0 := g.stops[i-1]
		s1 := g.stops[i]
		if t <= s1.Offset {
			frac := (t - s0.Offset) / (s1.Offset - s0.Offset)
			return lerpColor(s0.Color, s1.Color, frac)
		}
	}
	return last.Color
}

func lerpColor(c0, c1 color.Color, t float64) color.Color {
	r0, g0, b0, a0 := c0.RGBA()
	r1, g1, b1, a1 := c1.RGBA()
	return color.NRGBA{
		R: uint8((float64(r0) + float64(int32(r1)-int32(r0))*t) / 256),
		G: uint8((float64(g0) + float64(int32(g1)-int32(g0))*t) / 256),
		B: uint8((float64(b0) + float64(int32(b1)-int32(b0))*t) / 256),
		A: uint8((float64(a0) + float64(int32(a1)-int32(a0))*t) / 256),
	}
}

// computePathBounds parses the path string and returns its bounding box.
func (pr *PathRaster) computePathBounds() (minX, minY, maxX, maxY float64) {
	if pr.pathString == "" {
		return 0, 0, 0, 0
	}
	minX, minY = 1e18, 1e18
	maxX, maxY = -1e18, -1e18

	re := regexp.MustCompile(`([MLQCZ])\s*([-\d.,\s]*)`)
	matches := re.FindAllStringSubmatch(strings.ToUpper(pr.pathString), -1)

	for _, match := range matches {
		cmd := match[1]
		if cmd == "Z" {
			continue
		}
		args := parseNumbers(match[2])
		for i := 0; i+1 < len(args); i += 2 {
			x, y := args[i], args[i+1]
			if x < minX {
				minX = x
			}
			if x > maxX {
				maxX = x
			}
			if y < minY {
				minY = y
			}
			if y > maxY {
				maxY = y
			}
		}
	}
	if minX > maxX {
		return 0, 0, 0, 0
	}
	return
}

// drawPath parses SVG path commands and draws them
func (pr *PathRaster) drawPath(dc *gg.Context) {
	if pr.pathString == "" {
		return
	}

	// Parse SVG path commands
	// Supports: M (moveto), L (lineto), Q (quadratic), C (cubic), Z (close)
	re := regexp.MustCompile(`([MLQCZ])\s*([-\d.,\s]*)`)
	matches := re.FindAllStringSubmatch(strings.ToUpper(pr.pathString), -1)

	var currentX, currentY float64

	for _, match := range matches {
		cmd := match[1]
		args := parseNumbers(match[2])

		switch cmd {
		case "M": // MoveTo
			if len(args) >= 2 {
				currentX, currentY = args[0], args[1]
				dc.MoveTo(currentX, currentY)
			}
		case "L": // LineTo
			if len(args) >= 2 {
				currentX, currentY = args[0], args[1]
				dc.LineTo(currentX, currentY)
			}
		case "Q": // Quadratic Bezier
			if len(args) >= 4 {
				cpX, cpY := args[0], args[1]
				currentX, currentY = args[2], args[3]
				dc.QuadraticTo(cpX, cpY, currentX, currentY)
			}
		case "C": // Cubic Bezier
			if len(args) >= 6 {
				cp1X, cp1Y := args[0], args[1]
				cp2X, cp2Y := args[2], args[3]
				currentX, currentY = args[4], args[5]
				dc.CubicTo(cp1X, cp1Y, cp2X, cp2Y, currentX, currentY)
			}
		case "Z": // Close path
			dc.ClosePath()
		}
	}
}

// parseNumbers extracts numbers from a string
func parseNumbers(s string) []float64 {
	re := regexp.MustCompile(`[-+]?[0-9]*\.?[0-9]+`)
	matches := re.FindAllString(s, -1)
	result := make([]float64, 0, len(matches))
	for _, m := range matches {
		if f, err := strconv.ParseFloat(m, 64); err == nil {
			result = append(result, f)
		}
	}
	return result
}
