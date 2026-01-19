package main

import (
	"bytes"
	"image"
	"image/color"
	"image/gif"
	"image/jpeg"
	"image/png"
)

// ============================================================================
// Texture Mapping Helper Functions
// Used by sphere rendering for equirectangular and cubemap textures
// ============================================================================

// decodeImage decodes an image from raw bytes, supporting PNG, JPEG, and GIF formats
func decodeImage(data []byte) (image.Image, error) {
	reader := bytes.NewReader(data)

	// Try PNG first (most common for textures)
	reader.Seek(0, 0)
	if img, err := png.Decode(reader); err == nil {
		return img, nil
	}

	// Try JPEG
	reader.Seek(0, 0)
	if img, err := jpeg.Decode(reader); err == nil {
		return img, nil
	}

	// Try GIF
	reader.Seek(0, 0)
	if img, err := gif.Decode(reader); err == nil {
		return img, nil
	}

	// Try generic image.Decode as fallback
	reader.Seek(0, 0)
	img, _, err := image.Decode(reader)
	return img, err
}

// sampleTexture samples a color from an image using equirectangular (u, v) coordinates
// u, v should be in range [0, 1]
func sampleTexture(img image.Image, u, v float64) color.RGBA {
	if img == nil {
		return color.RGBA{R: 255, G: 0, B: 0, A: 255} // Magenta for missing texture
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Clamp u,v to [0,1] range
	if u < 0 {
		u = 0
	} else if u > 1 {
		u = 1
	}
	if v < 0 {
		v = 0
	} else if v > 1 {
		v = 1
	}

	// Map u,v to pixel coordinates
	// u maps to x (0 = left, 1 = right)
	// v maps to y (0 = top, 1 = bottom)
	x := bounds.Min.X + int(u*float64(width-1))
	y := bounds.Min.Y + int(v*float64(height-1))

	// Ensure within bounds
	if x >= bounds.Max.X {
		x = bounds.Max.X - 1
	}
	if y >= bounds.Max.Y {
		y = bounds.Max.Y - 1
	}

	// Sample the pixel
	pixelColor := img.At(x, y)
	r, g, bl, a := pixelColor.RGBA()

	// Convert from 16-bit to 8-bit
	return color.RGBA{
		R: uint8(r >> 8),
		G: uint8(g >> 8),
		B: uint8(bl >> 8),
		A: uint8(a >> 8),
	}
}
