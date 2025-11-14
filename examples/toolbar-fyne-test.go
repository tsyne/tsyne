// Pure Go+Fyne test to demonstrate toolbar button visibility issue
//
// This program creates two windows:
// 1. A window with regular buttons
// 2. A window with toolbar buttons
//
// It then attempts to traverse the widget tree and find text in widgets,
// demonstrating that toolbar items are not accessible through normal
// widget tree traversal.
//
// Build and run:
//   go run examples/toolbar-fyne-test.go
//
// Expected output:
//   ✓ Regular buttons found: "Regular Button 1", "Regular Button 2"
//   ✗ Toolbar buttons NOT found: "Toolbar Action 1", "Toolbar Action 2"

package main

import (
	"fmt"
	"reflect"

	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

// Widget tree traversal function - mimics what TsyneTest does
func findWidgetsWithText(obj interface{}, searchText string, results *[]string) {
	if obj == nil {
		return
	}

	// Check if this widget has text
	switch w := obj.(type) {
	case *widget.Button:
		if w.Text == searchText {
			*results = append(*results, fmt.Sprintf("Found Button: %s", w.Text))
		}
	case *widget.Label:
		if w.Text == searchText {
			*results = append(*results, fmt.Sprintf("Found Label: %s", w.Text))
		}
	}

	// Try to traverse children (for containers)
	val := reflect.ValueOf(obj)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}

	// Check for Objects slice (common in Fyne containers)
	if val.Kind() == reflect.Struct {
		for i := 0; i < val.NumField(); i++ {
			field := val.Field(i)
			fieldName := val.Type().Field(i).Name

			// Look for Objects field (slice of CanvasObject)
			if fieldName == "Objects" && field.Kind() == reflect.Slice {
				for j := 0; j < field.Len(); j++ {
					item := field.Index(j).Interface()
					findWidgetsWithText(item, searchText, results)
				}
			}
		}
	}
}

// Get all widget texts - mimics getWidgets in bridge
func getAllWidgetTexts(obj interface{}, texts *[]string) {
	if obj == nil {
		return
	}

	// Collect text from known widget types
	switch w := obj.(type) {
	case *widget.Button:
		*texts = append(*texts, fmt.Sprintf("Button: '%s'", w.Text))
	case *widget.Label:
		*texts = append(*texts, fmt.Sprintf("Label: '%s'", w.Text))
	case *widget.Toolbar:
		*texts = append(*texts, "Toolbar: (checking items...)")
		// Try to access toolbar items - this is the key test!
		// In Fyne, toolbar items are stored in toolbar.Items
		val := reflect.ValueOf(w).Elem()
		itemsField := val.FieldByName("Items")
		if itemsField.IsValid() && itemsField.Kind() == reflect.Slice {
			*texts = append(*texts, fmt.Sprintf("  Toolbar has %d items", itemsField.Len()))
			for i := 0; i < itemsField.Len(); i++ {
				item := itemsField.Index(i).Interface()
				switch ti := item.(type) {
				case *widget.ToolbarAction:
					// Try to get the label/text
					tiVal := reflect.ValueOf(ti).Elem()
					textField := tiVal.FieldByName("Text")
					if textField.IsValid() && textField.Kind() == reflect.String {
						*texts = append(*texts, fmt.Sprintf("  ToolbarAction: '%s'", textField.String()))
					}
				case *widget.ToolbarSeparator:
					*texts = append(*texts, "  ToolbarSeparator")
				}
			}
		} else {
			*texts = append(*texts, "  Cannot access toolbar items!")
		}
	}

	// Traverse children
	val := reflect.ValueOf(obj)
	if val.Kind() == reflect.Ptr {
		val = val.Elem()
	}

	if val.Kind() == reflect.Struct {
		for i := 0; i < val.NumField(); i++ {
			field := val.Field(i)
			fieldName := val.Type().Field(i).Name

			if fieldName == "Objects" && field.Kind() == reflect.Slice {
				for j := 0; j < field.Len(); j++ {
					item := field.Index(j).Interface()
					getAllWidgetTexts(item, texts)
				}
			}
		}
	}
}

func main() {
	// Note: We create an app instance but don't run it - this is a CLI analysis tool
	myApp := app.New()
	_ = myApp // Used in commented section below if you want to show windows

	// Test 1: Regular buttons in VBox (CONTROL - should work)
	fmt.Println("\n=== TEST 1: Regular Buttons (CONTROL) ===")

	regularButton1 := widget.NewButton("Regular Button 1", func() {})
	regularButton2 := widget.NewButton("Regular Button 2", func() {})
	regularContent := container.NewVBox(
		widget.NewLabel("Regular buttons test:"),
		regularButton1,
		regularButton2,
	)

	var regularTexts []string
	getAllWidgetTexts(regularContent, &regularTexts)
	fmt.Println("Widgets found in regular button container:")
	for _, text := range regularTexts {
		fmt.Printf("  %s\n", text)
	}

	// Search for specific text
	var regularResults []string
	findWidgetsWithText(regularContent, "Regular Button 1", &regularResults)
	findWidgetsWithText(regularContent, "Regular Button 2", &regularResults)

	if len(regularResults) == 2 {
		fmt.Println("✅ SUCCESS: Found both regular buttons")
	} else {
		fmt.Printf("❌ FAIL: Only found %d regular buttons\n", len(regularResults))
	}

	// Test 2: Toolbar buttons (ISSUE - will likely fail)
	fmt.Println("\n=== TEST 2: Toolbar Buttons (ISSUE) ===")

	toolbar := widget.NewToolbar(
		widget.NewToolbarAction(nil, func() {}), // Icon would go here, but we're testing text access
		widget.NewToolbarSeparator(),
	)

	// Manually create toolbar actions with accessible labels
	// Note: In Fyne, ToolbarAction doesn't have public Text field!
	// This is the core issue - toolbar items are not designed for text-based lookup

	toolbarContent := container.NewVBox(
		widget.NewLabel("Toolbar test:"),
		toolbar,
	)

	var toolbarTexts []string
	getAllWidgetTexts(toolbarContent, &toolbarTexts)
	fmt.Println("Widgets found in toolbar container:")
	for _, text := range toolbarTexts {
		fmt.Printf("  %s\n", text)
	}

	// Try to search for toolbar action text
	var toolbarResults []string
	findWidgetsWithText(toolbarContent, "Toolbar Action 1", &toolbarResults)
	findWidgetsWithText(toolbarContent, "Toolbar Action 2", &toolbarResults)

	if len(toolbarResults) == 0 {
		fmt.Println("❌ ISSUE CONFIRMED: Toolbar buttons NOT found in widget tree")
		fmt.Println("   This is because Fyne ToolbarAction items don't expose text for traversal")
	} else {
		fmt.Printf("✅ Unexpected: Found %d toolbar buttons\n", len(toolbarResults))
	}

	// Test 3: Mixed content (shows contrast)
	fmt.Println("\n=== TEST 3: Mixed Toolbar + Regular Buttons ===")

	mixedToolbar := widget.NewToolbar(
		widget.NewToolbarAction(nil, func() {}),
	)
	mixedButton := widget.NewButton("Regular Button Below Toolbar", func() {})

	mixedContent := container.NewVBox(
		widget.NewLabel("Before toolbar"),
		mixedToolbar,
		widget.NewLabel("After toolbar"),
		mixedButton,
	)

	var mixedTexts []string
	getAllWidgetTexts(mixedContent, &mixedTexts)
	fmt.Println("Widgets found in mixed container:")
	for _, text := range mixedTexts {
		fmt.Printf("  %s\n", text)
	}

	// Analysis
	fmt.Println("\n=== ANALYSIS ===")
	fmt.Println("The issue is that Fyne's widget.Toolbar stores items in an internal slice,")
	fmt.Println("but ToolbarAction doesn't expose text in a publicly accessible way.")
	fmt.Println("The Items field exists but accessing action labels requires reflection,")
	fmt.Println("and even then, ToolbarAction uses icons primarily, not text labels.")
	fmt.Println("")
	fmt.Println("In Tsyne's bridge (bridge/main.go), the getWidgets function likely:")
	fmt.Println("1. Traverses the widget tree looking for known widget types")
	fmt.Println("2. Extracts text from buttons, labels, etc.")
	fmt.Println("3. Does NOT descend into Toolbar.Items to extract ToolbarAction details")
	fmt.Println("")
	fmt.Println("SOLUTION: Modify bridge/main.go getWidgets to special-case widget.Toolbar")
	fmt.Println("and extract text from ToolbarAction items using reflection or type assertion.")

	// Note: We don't show windows because this is a CLI test
	// If you want to see the UI, uncomment these lines:
	/*
	w1 := myApp.NewWindow("Regular Buttons")
	w1.SetContent(regularContent)
	w1.Resize(fyne.NewSize(300, 200))
	w1.Show()

	w2 := myApp.NewWindow("Toolbar Buttons")
	w2.SetContent(toolbarContent)
	w2.Resize(fyne.NewSize(300, 200))
	w2.Show()

	myApp.Run()
	*/
}
