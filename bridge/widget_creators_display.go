package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"log"
	"net/url"
	"os"
	"strings"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/widget"
)

// ============================================================================
// Display Widgets: Label, Separator, Hyperlink, ProgressBar, Activity,
// RichText, Image, Icon, FileIcon, Calendar
// ============================================================================

func (b *Bridge) handleCreateLabel(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)

	lbl := widget.NewLabel(text)

	b.mu.Lock()
	b.widgets[widgetID] = lbl
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "label", Text: text}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateSeparator(msg Message) {
	widgetID := msg.Payload["id"].(string)

	separator := widget.NewSeparator()

	b.mu.Lock()
	b.widgets[widgetID] = separator
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "separator", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateHyperlink(msg Message) {
	widgetID := msg.Payload["id"].(string)
	text := msg.Payload["text"].(string)
	urlStr := msg.Payload["url"].(string)

	// Parse URL
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Invalid URL: %v", err),
		})
		return
	}

	hyperlink := widget.NewHyperlink(text, parsedURL)

	b.mu.Lock()
	b.widgets[widgetID] = hyperlink
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "hyperlink", Text: text, URL: urlStr}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateProgressBar(msg Message) {
	widgetID := msg.Payload["id"].(string)
	infinite, _ := msg.Payload["infinite"].(bool)

	var progressBar fyne.CanvasObject

	if infinite {
		progressBar = widget.NewProgressBarInfinite()
	} else {
		pb := widget.NewProgressBar()
		// Set initial value if provided
		if initialValue, ok := msg.Payload["value"].(float64); ok {
			pb.Value = initialValue
		}
		progressBar = pb
	}

	b.mu.Lock()
	b.widgets[widgetID] = progressBar
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "progressbar", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateActivity(msg Message) {
	widgetID := msg.Payload["id"].(string)

	activity := widget.NewActivity()

	b.mu.Lock()
	b.widgets[widgetID] = activity
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "activity", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleStartActivity(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	activity, ok := w.(*widget.Activity)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an Activity",
		})
		return
	}

	activity.Start()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleStopActivity(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	activity, ok := w.(*widget.Activity)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an Activity",
		})
		return
	}

	activity.Stop()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleCreateRichText(msg Message) {
	widgetID := msg.Payload["id"].(string)
	segmentsInterface := msg.Payload["segments"].([]interface{})

	var richTextSegments []widget.RichTextSegment

	for _, segInterface := range segmentsInterface {
		segData := segInterface.(map[string]interface{})
		text := segData["text"].(string)

		style := widget.RichTextStyle{}

		if bold, ok := segData["bold"].(bool); ok && bold {
			style.TextStyle.Bold = true
		}
		if italic, ok := segData["italic"].(bool); ok && italic {
			style.TextStyle.Italic = true
		}
		if monospace, ok := segData["monospace"].(bool); ok && monospace {
			style.TextStyle.Monospace = true
		}

		segment := &widget.TextSegment{
			Text:  text,
			Style: style,
		}
		richTextSegments = append(richTextSegments, segment)
	}

	richText := widget.NewRichText(richTextSegments...)

	b.mu.Lock()
	b.widgets[widgetID] = richText
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "richtext", Text: ""}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleCreateImage(msg Message) {
	widgetID := msg.Payload["id"].(string)
	path, hasPath := msg.Payload["path"].(string)
	resourceName, hasResource := msg.Payload["resource"].(string)

	var img *canvas.Image

	// Check if using resource reference (new approach)
	if hasResource && resourceName != "" {
		imageData, exists := b.getResource(resourceName)
		if !exists {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Resource not found: %s", resourceName),
			})
			return
		}

		// Decode image data
		decodedImg, _, err := image.Decode(bytes.NewReader(imageData))
		if err != nil {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode resource image: %v", err),
			})
			return
		}

		bounds := decodedImg.Bounds()
		width, height := bounds.Dx(), bounds.Dy()

		img = canvas.NewImageFromImage(decodedImg)
		// Set MinSize to ensure proper layout - this is critical for display!
		img.SetMinSize(fyne.NewSize(float32(width), float32(height)))
	} else if !hasPath || path == "" {
		// If path is empty, create a blank image (will be updated with base64 later)
		log.Printf("[Image] Creating blank image widget %s (will be updated with base64)", widgetID)
		img = canvas.NewImageFromImage(nil)
	} else if strings.HasPrefix(path, "data:") {
		// Handle base64 data URI directly
		// Parse the data URL format: "data:image/png;base64,..."
		parts := strings.SplitN(path, ",", 2)
		if len(parts) != 2 {
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   "Invalid data URL format",
			})
			return
		}

		base64Data := parts[1]
		imageData, err := base64.StdEncoding.DecodeString(base64Data)
		if err != nil {
			log.Printf("[Image] Error decoding base64: %v", err)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode base64: %v", err),
			})
			return
		}

		// Decode image data
		decodedImg, _, err := image.Decode(bytes.NewReader(imageData))
		if err != nil {
			log.Printf("[Image] Error decoding image: %v", err)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to decode image: %v", err),
			})
			return
		}

		bounds := decodedImg.Bounds()
		width, height := bounds.Dx(), bounds.Dy()

		img = canvas.NewImageFromImage(decodedImg)
		// Set MinSize to ensure proper layout - this is critical for display!
		img.SetMinSize(fyne.NewSize(float32(width), float32(height)))
	} else {
		// Load image from file - use file reading for better SVG support
		data, err := os.ReadFile(path)
		if err != nil {
			log.Printf("[Image] Error reading file %s: %v", path, err)
			b.sendResponse(Response{
				ID:      msg.ID,
				Success: false,
				Error:   fmt.Sprintf("Failed to read image file: %v", err),
			})
			return
		}

		// Create a static resource from the file data
		resource := fyne.NewStaticResource(path, data)
		img = canvas.NewImageFromResource(resource)
	}

	// Set fill mode if provided
	if fillMode, ok := msg.Payload["fillMode"].(string); ok {
		switch fillMode {
		case "contain":
			img.FillMode = canvas.ImageFillContain
		case "stretch":
			img.FillMode = canvas.ImageFillStretch
		case "original":
			img.FillMode = canvas.ImageFillOriginal
		}
	} else {
		img.FillMode = canvas.ImageFillOriginal // Use original size to preserve image quality
	}

	// Force refresh to ensure the image renders
	img.Refresh()

	// Check if we need to wrap the image for click and/or drag support
	var widgetToStore fyne.CanvasObject = img
	dragCallbackID, hasDragCallback := msg.Payload["onDragCallbackId"].(string)
	dragEndCallbackID, hasDragEndCallback := msg.Payload["onDragEndCallbackId"].(string)
	clickCallbackID, hasClickCallback := msg.Payload["callbackId"].(string)

	if hasDragCallback || hasDragEndCallback {
		// Wrap image in a draggable container for drag support
		var dragCallback func(x, y float32)
		var dragEndCallback func(x, y float32)
		var clickCallback func()

		if hasDragCallback {
			dragCallback = func(x, y float32) {
				log.Printf("[Image] Dragging image widget %s at (%f, %f), sending callback %s", widgetID, x, y, dragCallbackID)
				b.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": dragCallbackID,
						"x":          x,
						"y":          y,
					},
				})
			}
		}

		if hasDragEndCallback {
			dragEndCallback = func(x, y float32) {
				log.Printf("[Image] DragEnd for image widget %s at (%f, %f), sending callback %s", widgetID, x, y, dragEndCallbackID)
				b.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": dragEndCallbackID,
						"x":          x,
						"y":          y,
					},
				})
			}
		}

		if hasClickCallback {
			clickCallback = func() {
				log.Printf("[Image] Clicked image widget %s, sending callback %s", widgetID, clickCallbackID)
				b.sendEvent(Event{
					Type: "callback",
					Data: map[string]interface{}{
						"callbackId": clickCallbackID,
					},
				})
			}
		}

		widgetToStore = NewDraggableContainer(img, dragCallback, dragEndCallback, clickCallback)
	} else if hasClickCallback {
		// Wrap image in a clickable container for single-click support only
		callback := func() {
			b.sendEvent(Event{
				Type: "callback",
				Data: map[string]interface{}{
					"callbackId": clickCallbackID,
				},
			})
		}
		widgetToStore = NewClickableContainer(img, callback)
	}

	b.mu.Lock()
	b.widgets[widgetID] = widgetToStore
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "image", Text: path}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

// ============================================================================
// Icon Widget - Theme icon display
// ============================================================================

func (b *Bridge) handleCreateIcon(msg Message) {
	widgetID := msg.Payload["id"].(string)
	iconName := msg.Payload["iconName"].(string)

	// Map icon name string to Fyne theme icon
	resource := mapIconNameToResource(iconName)
	if resource == nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Unknown icon name: %s", iconName),
		})
		return
	}

	icon := widget.NewIcon(resource)

	b.mu.Lock()
	b.widgets[widgetID] = icon
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "icon", Text: iconName}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleSetIconResource(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	iconName := msg.Payload["iconName"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	icon, ok := w.(*widget.Icon)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not an Icon",
		})
		return
	}

	resource := mapIconNameToResource(iconName)
	if resource == nil {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Unknown icon name: %s", iconName),
		})
		return
	}

	icon.SetResource(resource)

	b.mu.Lock()
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "icon", Text: iconName}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

// mapIconNameToResource maps icon name strings to Fyne theme resources
func mapIconNameToResource(name string) fyne.Resource {
	switch name {
	// Standard icons
	case "cancel":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconCancel)
	case "confirm":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconConfirm)
	case "delete":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconDelete)
	case "search":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconSearch)
	case "searchReplace":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconSearchReplace)

	// Media icons
	case "mediaPlay":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMediaPlay)
	case "mediaPause":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMediaPause)
	case "mediaStop":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMediaStop)
	case "mediaRecord":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMediaRecord)
	case "mediaReplay":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMediaReplay)
	case "mediaSkipNext":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMediaSkipNext)
	case "mediaSkipPrevious":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMediaSkipPrevious)
	case "mediaFastForward":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMediaFastForward)
	case "mediaFastRewind":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMediaFastRewind)

	// Navigation icons
	case "home":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconHome)
	case "menu":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMenu)
	case "menuExpand":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMenuExpand)
	case "moveDown":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMoveDown)
	case "moveUp":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMoveUp)
	case "navigate":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconNavigate)
	case "arrowBack":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconArrowBack)
	case "arrowForward":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconArrowForward)

	// File icons
	case "file":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconFile)
	case "fileApplication":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconFileApplication)
	case "fileAudio":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconFileAudio)
	case "fileImage":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconFileImage)
	case "fileText":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconFileText)
	case "fileVideo":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconFileVideo)
	case "folder":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconFolder)
	case "folderNew":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconFolderNew)
	case "folderOpen":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconFolderOpen)

	// Document icons
	case "document":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconDocument)
	case "documentCreate":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconDocumentCreate)
	case "documentSave":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconDocumentSave)
	case "documentPrint":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconDocumentPrint)

	// Content icons
	case "content":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconContent)
	case "contentAdd":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconContentAdd)
	case "contentClear":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconContentClear)
	case "contentCopy":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconContentCopy)
	case "contentCut":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconContentCut)
	case "contentPaste":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconContentPaste)
	case "contentRedo":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconContentRedo)
	case "contentRemove":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconContentRemove)
	case "contentUndo":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconContentUndo)

	// View icons
	case "viewFullScreen":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconViewFullScreen)
	case "viewRefresh":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconViewRefresh)
	case "viewZoomFit":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconViewZoomFit)
	case "viewZoomIn":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconViewZoomIn)
	case "viewZoomOut":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconViewZoomOut)
	case "viewRestore":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconViewRestore)
	case "visibility":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconVisibility)
	case "visibilityOff":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconVisibilityOff)

	// Status icons
	case "info":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconInfo)
	case "question":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconQuestion)
	case "warning":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconWarning)
	case "error":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconError)
	case "help":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconHelp)
	case "history":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconHistory)

	// Action icons
	case "settings":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconSettings)
	case "mailAttachment":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMailAttachment)
	case "mailCompose":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMailCompose)
	case "mailForward":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMailForward)
	case "mailReply":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMailReply)
	case "mailReplyAll":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMailReplyAll)
	case "mailSend":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconMailSend)

	// Volume icons
	case "volumeDown":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconVolumeDown)
	case "volumeMute":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconVolumeMute)
	case "volumeUp":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconVolumeUp)

	// Misc icons
	case "download":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconDownload)
	case "upload":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconUpload)
	case "computer":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconComputer)
	case "storage":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconStorage)
	case "account":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconAccount)
	case "login":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconLogin)
	case "logout":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconLogout)
	case "list":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconList)
	case "grid":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconGrid)
	case "colorChromatic":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconColorChromatic)
	case "colorPalette":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconColorPalette)

	// Checkbox icons
	case "checkButtonChecked":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconCheckButtonChecked)
	case "checkButton":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconCheckButton)
	case "radioButton":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconRadioButton)
	case "radioButtonChecked":
		return fyne.CurrentApp().Settings().Theme().Icon(fyne.ThemeIconRadioButtonChecked)

	default:
		return nil
	}
}

// ============================================================================
// FileIcon Widget - File type icon
// ============================================================================

func (b *Bridge) handleCreateFileIcon(msg Message) {
	widgetID := msg.Payload["id"].(string)
	path := msg.Payload["path"].(string)

	// Create URI from path
	uri := fyne.CurrentApp().Driver().LegacyStorage().Create(path)
	if uri == nil {
		// Fallback: try to create a file URI
		uri = fyne.CurrentApp().Driver().LegacyStorage().Create("file://" + path)
	}

	fileIcon := widget.NewFileIcon(uri)

	b.mu.Lock()
	b.widgets[widgetID] = fileIcon
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "fileicon", Text: path}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}

func (b *Bridge) handleSetFileIconURI(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	path := msg.Payload["path"].(string)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	fileIcon, ok := w.(*widget.FileIcon)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a FileIcon",
		})
		return
	}

	uri := fyne.CurrentApp().Driver().LegacyStorage().Create(path)
	fileIcon.SetURI(uri)

	b.mu.Lock()
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "fileicon", Text: path}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

func (b *Bridge) handleSetFileIconSelected(msg Message) {
	widgetID := msg.Payload["widgetId"].(string)
	selected := msg.Payload["selected"].(bool)

	b.mu.RLock()
	w, exists := b.widgets[widgetID]
	b.mu.RUnlock()

	if !exists {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget not found",
		})
		return
	}

	fileIcon, ok := w.(*widget.FileIcon)
	if !ok {
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   "Widget is not a FileIcon",
		})
		return
	}

	fileIcon.SetSelected(selected)

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
	})
}

// ============================================================================
// Calendar Widget - Standalone calendar
// ============================================================================

func (b *Bridge) handleCreateCalendar(msg Message) {
	widgetID := msg.Payload["id"].(string)
	callbackID, hasCallback := msg.Payload["callbackId"].(string)

	// Parse initial date if provided
	initialTime := time.Now()
	if initialDate, ok := msg.Payload["date"].(string); ok && initialDate != "" {
		if t, err := time.Parse("2006-01-02", initialDate); err == nil {
			initialTime = t
		}
	}

	var calendar *widget.Calendar
	if hasCallback {
		calendar = widget.NewCalendar(initialTime, func(t time.Time) {
			b.sendEvent(Event{
				Type:     "callback",
				WidgetID: widgetID,
				Data: map[string]interface{}{
					"callbackId": callbackID,
					"date":       t.Format("2006-01-02"),
				},
			})
		})
	} else {
		calendar = widget.NewCalendar(initialTime, func(t time.Time) {})
	}

	b.mu.Lock()
	b.widgets[widgetID] = calendar
	b.widgetMeta[widgetID] = WidgetMetadata{Type: "calendar", Text: initialTime.Format("2006-01-02")}
	if hasCallback {
		b.callbacks[widgetID] = callbackID
	}
	b.mu.Unlock()

	b.sendResponse(Response{
		ID:      msg.ID,
		Success: true,
		Result:  map[string]interface{}{"widgetId": widgetID},
	})
}
