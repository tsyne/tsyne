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

// PathRaster renders SVG-style paths with quadratic/cubic Bezier curves
// using the gg library for smooth antialiased rendering.
type PathRaster struct {
	raster      *canvas.Raster
	pathString  string
	strokeColor color.Color
	strokeWidth float64
	fillColor   color.Color
	lineCap     gg.LineCap
	lineJoin    gg.LineJoin
	width       int
	height      int
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

	// Fill if fill color is set
	if pr.fillColor != nil {
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
