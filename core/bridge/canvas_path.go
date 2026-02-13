package main

import (
	"image"
	"image/color"
	"math"
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

// FillGradient stores gradient data for rendering.
type FillGradient struct {
	Type           string  // "linear" or "radial"
	X1, Y1, X2, Y2 float64 // linear: gradient line (bbox-relative 0-1, or pixel-space if PixelSpace)
	Cx, Cy, R      float64 // radial: center + radius (bbox-relative 0-1)
	Rx, Ry         float64 // radial: separate x/y radii for elliptical gradients
	Fx, Fy         float64 // radial: focal point (defaults to Cx, Cy)
	HasFocal       bool    // true if Fx/Fy differ from Cx/Cy
	PixelSpace     bool    // true = coords are in pixel space (userSpaceOnUse)
	SpreadMethod   string  // "pad" (default), "reflect", or "repeat"
	Stops          []GradientStop
}

// PathRaster renders SVG-style paths with quadratic/cubic Bezier curves
// using the gg library for smooth antialiased rendering.
type PathRaster struct {
	raster       *canvas.Raster
	pathString   string
	strokeColor    color.Color
	strokeWidth    float64
	fillColor      color.Color
	fillGradient   *FillGradient
	strokeGradient *FillGradient
	lineCap      gg.LineCap
	lineJoin     gg.LineJoin
	fillRule     gg.FillRule
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

// SetSize stores new dimensions (applied on next Refresh via fyne.Do).
func (pr *PathRaster) SetSize(width, height int) {
	pr.width = width
	pr.height = height
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

// SetStrokeGradient sets the gradient stroke (overrides strokeColor when set)
func (pr *PathRaster) SetStrokeGradient(grad *FillGradient) {
	pr.strokeGradient = grad
}

// SetLineCap sets the line cap style
func (pr *PathRaster) SetLineCap(cap gg.LineCap) {
	pr.lineCap = cap
}

// SetLineJoin sets the line join style
func (pr *PathRaster) SetLineJoin(join gg.LineJoin) {
	pr.lineJoin = join
}

// SetFillRule sets the fill rule (winding or even-odd)
func (pr *PathRaster) SetFillRule(rule gg.FillRule) {
	pr.fillRule = rule
}

// Raster returns the underlying Fyne raster object
func (pr *PathRaster) Raster() *canvas.Raster {
	return pr.raster
}

// Refresh applies any pending size change and triggers a redraw, all on the Fyne thread.
func (pr *PathRaster) Refresh() {
	w, h := pr.width, pr.height
	fyne.Do(func() {
		pr.raster.Resize(fyne.NewSize(float32(w), float32(h)))
		pr.raster.Refresh()
	})
}

// render draws the path to an image
func (pr *PathRaster) render(w, h int) image.Image {
	dc := gg.NewContext(w, h)

	// Set line style
	dc.SetLineCap(pr.lineCap)
	dc.SetLineJoin(pr.lineJoin)
	dc.SetFillRule(pr.fillRule)

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
		sm := pr.fillGradient.SpreadMethod
		// Pad stops to cover 0-1 range — prevent extrapolation artifacts
		stops := pr.fillGradient.Stops
		paddedStops := make([]GradientStop, 0, len(stops)+2)
		if stops[0].Offset > 0 {
			paddedStops = append(paddedStops, GradientStop{Offset: 0, Color: stops[0].Color})
		}
		paddedStops = append(paddedStops, stops...)
		if stops[len(stops)-1].Offset < 1 {
			paddedStops = append(paddedStops, GradientStop{Offset: 1, Color: stops[len(stops)-1].Color})
		}
		if pr.fillGradient.Type == "radial" {
			rx := pr.fillGradient.Rx
			ry := pr.fillGradient.Ry
			if rx < 1e-10 {
				rx = 0.5
			}
			if ry < 1e-10 {
				ry = 0.5
			}
			if pr.fillGradient.PixelSpace {
				// userSpaceOnUse: cx/cy/rx/ry in pixel coords
				rg := &bboxRadialGradient{
					cx: pr.fillGradient.Cx,
					cy: pr.fillGradient.Cy,
					rx: rx, ry: ry,
					fx: pr.fillGradient.Fx, fy: pr.fillGradient.Fy,
					hasFocal: pr.fillGradient.HasFocal,
					minX: 0, minY: 0, bw: 1, bh: 1, // identity: bx = px
					stops: paddedStops,
					spreadMethod: sm,
				}
				dc.SetFillStyle(rg)
			} else {
				rg := &bboxRadialGradient{
					cx: pr.fillGradient.Cx,
					cy: pr.fillGradient.Cy,
					rx: rx, ry: ry,
					fx: pr.fillGradient.Fx, fy: pr.fillGradient.Fy,
					hasFocal: pr.fillGradient.HasFocal,
					minX: minX, minY: minY, bw: bw, bh: bh,
					stops: paddedStops,
					spreadMethod: sm,
				}
				dc.SetFillStyle(rg)
			}
		} else if pr.fillGradient.PixelSpace {
			// userSpaceOnUse: project in pixel space to preserve gradient angle
			grad := &pixelLinearGradient{
				x1: pr.fillGradient.X1, y1: pr.fillGradient.Y1,
				x2: pr.fillGradient.X2, y2: pr.fillGradient.Y2,
				stops: paddedStops,
				spreadMethod: sm,
			}
			dc.SetFillStyle(grad)
		} else {
			grad := &bboxLinearGradient{
				x1: pr.fillGradient.X1, y1: pr.fillGradient.Y1,
				x2: pr.fillGradient.X2, y2: pr.fillGradient.Y2,
				minX: minX, minY: minY, bw: bw, bh: bh,
				stops: paddedStops,
				spreadMethod: sm,
			}
			dc.SetFillStyle(grad)
		}
		dc.FillPreserve()
	} else if pr.fillColor != nil {
		dc.SetColor(pr.fillColor)
		dc.FillPreserve()
	}

	// Stroke
	if pr.strokeGradient != nil && len(pr.strokeGradient.Stops) > 0 && pr.strokeWidth > 0 {
		// Gradient stroke via mask: render stroke as white-on-black mask,
		// then composite gradient color at each mask pixel.
		maskDC := gg.NewContext(w, h)
		maskDC.SetLineCap(pr.lineCap)
		maskDC.SetLineJoin(pr.lineJoin)
		pr.drawPath(maskDC)
		maskDC.SetColor(color.White)
		maskDC.SetLineWidth(pr.strokeWidth)
		maskDC.Stroke()
		maskImg := maskDC.Image()

		// Build gradient pattern (reuse fill gradient infrastructure)
		grad := pr.strokeGradient
		paddedStops := padStops(grad.Stops)
		var pattern gradientPattern
		minX, minY, maxX, maxY := pr.computePathBounds()
		bw := maxX - minX
		bh := maxY - minY
		if bw < 1 {
			bw = 1
		}
		if bh < 1 {
			bh = 1
		}
		ssm := grad.SpreadMethod
		if grad.Type == "radial" {
			rx := grad.Rx
			ry := grad.Ry
			if rx < 1e-10 {
				rx = 0.5
			}
			if ry < 1e-10 {
				ry = 0.5
			}
			if grad.PixelSpace {
				pattern = &bboxRadialGradient{cx: grad.Cx, cy: grad.Cy, rx: rx, ry: ry, fx: grad.Fx, fy: grad.Fy, hasFocal: grad.HasFocal, minX: 0, minY: 0, bw: 1, bh: 1, stops: paddedStops, spreadMethod: ssm}
			} else {
				pattern = &bboxRadialGradient{cx: grad.Cx, cy: grad.Cy, rx: rx, ry: ry, fx: grad.Fx, fy: grad.Fy, hasFocal: grad.HasFocal, minX: minX, minY: minY, bw: bw, bh: bh, stops: paddedStops, spreadMethod: ssm}
			}
		} else if grad.PixelSpace {
			pattern = &pixelLinearGradient{x1: grad.X1, y1: grad.Y1, x2: grad.X2, y2: grad.Y2, stops: paddedStops, spreadMethod: ssm}
		} else {
			pattern = &bboxLinearGradient{x1: grad.X1, y1: grad.Y1, x2: grad.X2, y2: grad.Y2, minX: minX, minY: minY, bw: bw, bh: bh, stops: paddedStops, spreadMethod: ssm}
		}

		// Composite: where mask is non-zero, draw gradient color
		result := dc.Image().(*image.RGBA)
		for py := 0; py < h; py++ {
			for px := 0; px < w; px++ {
				_, _, _, ma := maskImg.At(px, py).RGBA()
				if ma == 0 {
					continue
				}
				gradColor := pattern.ColorAt(px, py)
				gr, gg, gb, ga := gradColor.RGBA()
				// Pre-multiply gradient color by mask alpha
				alpha := float64(ma) / 65535.0
				idx := result.PixOffset(px, py)
				// Source-over compositing
				sr := uint8(float64(gr) / 256 * alpha)
				sg := uint8(float64(gg) / 256 * alpha)
				sb := uint8(float64(gb) / 256 * alpha)
				sa := uint8(float64(ga) / 256 * alpha)
				da := result.Pix[idx+3]
				if da == 0 {
					result.Pix[idx+0] = sr
					result.Pix[idx+1] = sg
					result.Pix[idx+2] = sb
					result.Pix[idx+3] = sa
				} else {
					// Source-over: out = src + dst*(1-srcA)
					invA := 1.0 - float64(sa)/255.0
					result.Pix[idx+0] = uint8(min(int(float64(sr)+float64(result.Pix[idx+0])*invA), 255))
					result.Pix[idx+1] = uint8(min(int(float64(sg)+float64(result.Pix[idx+1])*invA), 255))
					result.Pix[idx+2] = uint8(min(int(float64(sb)+float64(result.Pix[idx+2])*invA), 255))
					result.Pix[idx+3] = uint8(min(int(float64(sa)+float64(result.Pix[idx+3])*invA), 255))
				}
			}
		}
	} else if pr.strokeColor != nil && pr.strokeWidth > 0 {
		dc.SetColor(pr.strokeColor)
		dc.SetLineWidth(pr.strokeWidth)
		dc.Stroke()
	}

	return dc.Image()
}

// gradientPattern is satisfied by all gradient types for use in stroke rendering.
type gradientPattern interface {
	ColorAt(x, y int) color.Color
}

// padStops ensures stops cover the 0-1 range by duplicating edge colors.
func padStops(stops []GradientStop) []GradientStop {
	padded := make([]GradientStop, 0, len(stops)+2)
	if stops[0].Offset > 0 {
		padded = append(padded, GradientStop{Offset: 0, Color: stops[0].Color})
	}
	padded = append(padded, stops...)
	if stops[len(stops)-1].Offset < 1 {
		padded = append(padded, GradientStop{Offset: 1, Color: stops[len(stops)-1].Color})
	}
	return padded
}

// bboxLinearGradient implements gg.Pattern, projecting in bbox-normalized
// space so that gradientTransform angles are preserved regardless of bbox
// aspect ratio.
type bboxLinearGradient struct {
	x1, y1, x2, y2 float64 // gradient line in bbox space (0-1)
	minX, minY      float64 // bbox origin in pixels
	bw, bh          float64 // bbox size in pixels
	stops           []GradientStop
	spreadMethod    string
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

	st, useSpread := applySpreadMethod(t, g.spreadMethod)
	return interpolateStops(g.stops, st, useSpread)
}

// pixelLinearGradient implements gg.Pattern for userSpaceOnUse linear gradients.
// Projects directly in pixel space so gradient angles are preserved.
type pixelLinearGradient struct {
	x1, y1, x2, y2 float64 // gradient line in pixel coordinates
	stops           []GradientStop
	spreadMethod    string
}

func (g *pixelLinearGradient) ColorAt(x, y int) color.Color {
	px := float64(x)
	py := float64(y)

	dx := g.x2 - g.x1
	dy := g.y2 - g.y1
	lenSq := dx*dx + dy*dy
	if lenSq < 1e-10 {
		if len(g.stops) > 0 {
			return g.stops[0].Color
		}
		return color.Transparent
	}
	t := ((px-g.x1)*dx + (py-g.y1)*dy) / lenSq

	st, useSpread := applySpreadMethod(t, g.spreadMethod)
	return interpolateStops(g.stops, st, useSpread)
}

// bboxRadialGradient implements gg.Pattern for radial gradients in bbox space.
type bboxRadialGradient struct {
	cx, cy         float64 // center in bbox space (0-1)
	rx, ry         float64 // radii in bbox space (separate for elliptical)
	fx, fy         float64 // focal point in same space as cx/cy
	hasFocal       bool    // true if focal point differs from center
	minX, minY     float64 // bbox origin in pixels
	bw, bh         float64 // bbox size in pixels
	stops          []GradientStop
	spreadMethod   string
}

func (g *bboxRadialGradient) ColorAt(x, y int) color.Color {
	// Convert pixel coords to bbox-normalized space (0-1)
	bx := (float64(x) - g.minX) / g.bw
	by := (float64(y) - g.minY) / g.bh

	var t float64
	if g.hasFocal {
		// SVG two-circle radial gradient: inner circle at (fx,fy) r=0, outer at (cx,cy) r=rx/ry
		// Normalize to unit circle space
		nx := (bx - g.cx) / g.rx
		ny := (by - g.cy) / g.ry
		nfx := (g.fx - g.cx) / g.rx
		nfy := (g.fy - g.cy) / g.ry
		// Vector from focal to point in normalized space
		dpx := nx - nfx
		dpy := ny - nfy
		// Solve for t: |focal + t*(point-focal)|^2 = 1 (unit circle)
		// Quadratic: a*t^2 + b*t + c = 0
		a := dpx*dpx + dpy*dpy
		b := 2 * (nfx*dpx + nfy*dpy)
		c := nfx*nfx + nfy*nfy - 1
		disc := b*b - 4*a*c
		if disc < 0 || a < 1e-20 {
			t = 1
		} else {
			// We want the positive root
			sqrtD := math.Sqrt(disc)
			t1 := (-b + sqrtD) / (2 * a)
			t2 := (-b - sqrtD) / (2 * a)
			// Pick the root that gives us t in range; prefer positive
			if t1 > 0 {
				t = 1.0 / t1
			} else if t2 > 0 {
				t = 1.0 / t2
			} else {
				t = 1
			}
		}
		if t < 0 {
			t = 0
		}
	} else {
		// Simple concentric elliptical distance from center
		dx := (bx - g.cx) / g.rx
		dy := (by - g.cy) / g.ry
		t = math.Sqrt(dx*dx + dy*dy)
	}

	st, useSpread := applySpreadMethod(t, g.spreadMethod)
	return interpolateStops(g.stops, st, useSpread)
}

// applySpreadMethod transforms gradient parameter t according to the spread method.
// pad: clamp to [0,1]; reflect: fold with mirroring; repeat: wrap.
func applySpreadMethod(t float64, method string) (float64, bool) {
	if t >= 0 && t <= 1 {
		return t, true
	}
	switch method {
	case "reflect":
		// Fold t into [0,1] with mirroring on odd cycles
		t = math.Abs(t)
		cycle := int(math.Floor(t))
		frac := t - float64(cycle)
		if cycle%2 == 1 {
			frac = 1 - frac
		}
		return frac, true
	case "repeat":
		// Wrap t into [0,1]
		frac := t - math.Floor(t)
		if frac < 0 {
			frac += 1
		}
		return frac, true
	default: // "pad"
		return t, false
	}
}

// interpolateStops looks up the color at parameter t from a slice of gradient stops.
// If useSpread is false and t is outside stop range, clamps to endpoint colors.
func interpolateStops(stops []GradientStop, t float64, useSpread bool) color.Color {
	if len(stops) == 0 {
		return color.Transparent
	}
	if !useSpread {
		if t <= stops[0].Offset {
			return stops[0].Color
		}
		last := stops[len(stops)-1]
		if t >= last.Offset {
			return last.Color
		}
	} else {
		// Map t from [0,1] to [firstStop, lastStop]
		first := stops[0].Offset
		last := stops[len(stops)-1].Offset
		t = first + t*(last-first)
	}
	for i := 1; i < len(stops); i++ {
		s0 := stops[i-1]
		s1 := stops[i]
		if t <= s1.Offset {
			denom := s1.Offset - s0.Offset
			if denom < 1e-10 {
				return s1.Color
			}
			frac := (t - s0.Offset) / denom
			return lerpColor(s0.Color, s1.Color, frac)
		}
	}
	return stops[len(stops)-1].Color
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
