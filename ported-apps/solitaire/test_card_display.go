package main

import (
	"image"
	"image/color"
	"log"
	"os"
	"path/filepath"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// createTestCard creates a simple 200x290 image resembling a playing card
func createTestCard() image.Image {
	width, height := 200, 290
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// White background
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, color.White)
		}
	}

	// Red border
	borderColor := color.RGBA{R: 255, G: 0, B: 0, A: 255}
	borderWidth := 5

	// Top and bottom borders
	for y := 0; y < borderWidth; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, borderColor)
			img.Set(x, height-1-y, borderColor)
		}
	}

	// Left and right borders
	for x := 0; x < borderWidth; x++ {
		for y := 0; y < height; y++ {
			img.Set(x, y, borderColor)
			img.Set(width-1-x, y, borderColor)
		}
	}

	// Add a simple "A♠" in the center
	// (This is simplified - in reality you'd need proper text rendering)
	centerColor := color.RGBA{R: 0, G: 0, B: 0, A: 255}
	centerX, centerY := width/2, height/2
	for y := centerY - 20; y < centerY + 20; y++ {
		for x := centerX - 20; x < centerX + 20; x++ {
			img.Set(x, y, centerColor)
		}
	}

	return img
}

func main() {
	myApp := app.New()
	myWindow := myApp.NewWindow("Card Display Test - canvas.Image Sizing")
	myWindow.Resize(fyne.NewSize(900, 700))

	// Create a test card image
	testCard := createTestCard()
	log.Printf("Created test card image: %dx%d", testCard.Bounds().Dx(), testCard.Bounds().Dy())

	// Test 1: No sizing (default behavior)
	img1 := canvas.NewImageFromImage(testCard)
	img1.FillMode = canvas.ImageFillOriginal
	log.Printf("Test 1: No sizing - MinSize: %v, Size: %v", img1.MinSize(), img1.Size())

	// Test 2: With MinSize set
	img2 := canvas.NewImageFromImage(testCard)
	img2.FillMode = canvas.ImageFillOriginal
	img2.SetMinSize(fyne.NewSize(200, 290))
	log.Printf("Test 2: MinSize(200,290) - MinSize: %v, Size: %v", img2.MinSize(), img2.Size())

	// Test 3: With explicit Resize
	img3 := canvas.NewImageFromImage(testCard)
	img3.FillMode = canvas.ImageFillOriginal
	img3.Resize(fyne.NewSize(200, 290))
	log.Printf("Test 3: Resize(200,290) - MinSize: %v, Size: %v", img3.MinSize(), img3.Size())

	// Test 4: With both MinSize and Resize
	img4 := canvas.NewImageFromImage(testCard)
	img4.FillMode = canvas.ImageFillOriginal
	img4.SetMinSize(fyne.NewSize(200, 290))
	img4.Resize(fyne.NewSize(200, 290))
	log.Printf("Test 4: Both MinSize and Resize - MinSize: %v, Size: %v", img4.MinSize(), img4.Size())

	// Test 5: Try loading actual SVG card if available
	var img5 *canvas.Image
	facesDir := filepath.Join("examples", "solitaire", "faces")
	acPath := filepath.Join(facesDir, "AC.svg")

	if _, err := os.Stat(acPath); err == nil {
		log.Printf("Loading card from SVG file: %s", acPath)
		data, err := os.ReadFile(acPath)
		if err == nil {
			resource := fyne.NewStaticResource("AC.svg", data)
			img5 = canvas.NewImageFromResource(resource)
			img5.FillMode = canvas.ImageFillOriginal
			img5.Resize(fyne.NewSize(200, 290))
			log.Printf("Test 5: SVG with Resize - MinSize: %v, Size: %v", img5.MinSize(), img5.Size())
		} else {
			log.Printf("Error reading SVG: %v", err)
		}
	}

	// Test 6: Using ImageFillContain instead of Original
	img6 := canvas.NewImageFromImage(testCard)
	img6.FillMode = canvas.ImageFillContain
	img6.Resize(fyne.NewSize(200, 290))
	log.Printf("Test 6: FillContain with Resize - MinSize: %v, Size: %v", img6.MinSize(), img6.Size())

	// Create layout comparing all test cases side by side
	row1 := container.NewHBox(
		container.NewVBox(
			widget.NewLabel("1: No sizing"),
			img1,
		),
		container.NewVBox(
			widget.NewLabel("2: MinSize only"),
			img2,
		),
		container.NewVBox(
			widget.NewLabel("3: Resize only"),
			img3,
		),
	)

	row2 := container.NewHBox(
		container.NewVBox(
			widget.NewLabel("4: MinSize + Resize"),
			img4,
		),
		container.NewVBox(
			widget.NewLabel("6: FillContain + Resize"),
			img6,
		),
	)

	content := container.NewVBox(
		widget.NewLabel("canvas.Image Sizing Tests - Which one displays correctly?"),
		widget.NewSeparator(),
		row1,
		widget.NewSeparator(),
		row2,
	)

	if img5 != nil {
		content.Add(widget.NewSeparator())
		content.Add(widget.NewLabel("5: SVG from file with Resize"))
		content.Add(img5)
	}

	myWindow.SetContent(container.NewScroll(content))
	myWindow.ShowAndRun()
}
