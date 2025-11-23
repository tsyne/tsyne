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
	"fyne.io/fyne/v2/storage"
	"fyne.io/fyne/v2/theme"
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
		return theme.CancelIcon()
	case "confirm":
		return theme.ConfirmIcon()
	case "delete":
		return theme.DeleteIcon()
	case "search":
		return theme.SearchIcon()
	case "searchReplace":
		return theme.SearchReplaceIcon()

	// Media icons
	case "mediaPlay":
		return theme.MediaPlayIcon()
	case "mediaPause":
		return theme.MediaPauseIcon()
	case "mediaStop":
		return theme.MediaStopIcon()
	case "mediaRecord":
		return theme.MediaRecordIcon()
	case "mediaReplay":
		return theme.MediaReplayIcon()
	case "mediaSkipNext":
		return theme.MediaSkipNextIcon()
	case "mediaSkipPrevious":
		return theme.MediaSkipPreviousIcon()
	case "mediaFastForward":
		return theme.MediaFastForwardIcon()
	case "mediaFastRewind":
		return theme.MediaFastRewindIcon()

	// Navigation icons
	case "home":
		return theme.HomeIcon()
	case "menu":
		return theme.MenuIcon()
	case "menuExpand":
		return theme.MenuExpandIcon()
	case "moveDown":
		return theme.MoveDownIcon()
	case "moveUp":
		return theme.MoveUpIcon()
	case "navigate":
		return theme.NavigateNextIcon()
	case "arrowBack":
		return theme.NavigateBackIcon()
	case "arrowForward":
		return theme.NavigateNextIcon()

	// File icons
	case "file":
		return theme.FileIcon()
	case "fileApplication":
		return theme.FileApplicationIcon()
	case "fileAudio":
		return theme.FileAudioIcon()
	case "fileImage":
		return theme.FileImageIcon()
	case "fileText":
		return theme.FileTextIcon()
	case "fileVideo":
		return theme.FileVideoIcon()
	case "folder":
		return theme.FolderIcon()
	case "folderNew":
		return theme.FolderNewIcon()
	case "folderOpen":
		return theme.FolderOpenIcon()

	// Document icons
	case "document":
		return theme.DocumentIcon()
	case "documentCreate":
		return theme.DocumentCreateIcon()
	case "documentSave":
		return theme.DocumentSaveIcon()
	case "documentPrint":
		return theme.DocumentPrintIcon()

	// Content icons
	case "content":
		return theme.ContentAddIcon()
	case "contentAdd":
		return theme.ContentAddIcon()
	case "contentClear":
		return theme.ContentClearIcon()
	case "contentCopy":
		return theme.ContentCopyIcon()
	case "contentCut":
		return theme.ContentCutIcon()
	case "contentPaste":
		return theme.ContentPasteIcon()
	case "contentRedo":
		return theme.ContentRedoIcon()
	case "contentRemove":
		return theme.ContentRemoveIcon()
	case "contentUndo":
		return theme.ContentUndoIcon()

	// View icons
	case "viewFullScreen":
		return theme.ViewFullScreenIcon()
	case "viewRefresh":
		return theme.ViewRefreshIcon()
	case "viewZoomFit":
		return theme.ZoomFitIcon()
	case "viewZoomIn":
		return theme.ZoomInIcon()
	case "viewZoomOut":
		return theme.ZoomOutIcon()
	case "viewRestore":
		return theme.ViewRestoreIcon()
	case "visibility":
		return theme.VisibilityIcon()
	case "visibilityOff":
		return theme.VisibilityOffIcon()

	// Status icons
	case "info":
		return theme.InfoIcon()
	case "question":
		return theme.QuestionIcon()
	case "warning":
		return theme.WarningIcon()
	case "error":
		return theme.ErrorIcon()
	case "help":
		return theme.HelpIcon()
	case "history":
		return theme.HistoryIcon()

	// Action icons
	case "settings":
		return theme.SettingsIcon()
	case "mailAttachment":
		return theme.MailAttachmentIcon()
	case "mailCompose":
		return theme.MailComposeIcon()
	case "mailForward":
		return theme.MailForwardIcon()
	case "mailReply":
		return theme.MailReplyIcon()
	case "mailReplyAll":
		return theme.MailReplyAllIcon()
	case "mailSend":
		return theme.MailSendIcon()

	// Volume icons
	case "volumeDown":
		return theme.VolumeDownIcon()
	case "volumeMute":
		return theme.VolumeMuteIcon()
	case "volumeUp":
		return theme.VolumeUpIcon()

	// Misc icons
	case "download":
		return theme.DownloadIcon()
	case "upload":
		return theme.UploadIcon()
	case "computer":
		return theme.ComputerIcon()
	case "storage":
		return theme.StorageIcon()
	case "account":
		return theme.AccountIcon()
	case "login":
		return theme.LoginIcon()
	case "logout":
		return theme.LogoutIcon()
	case "list":
		return theme.ListIcon()
	case "grid":
		return theme.GridIcon()
	case "colorChromatic":
		return theme.ColorChromaticIcon()
	case "colorPalette":
		return theme.ColorPaletteIcon()

	// Checkbox icons
	case "checkButtonChecked":
		return theme.CheckButtonCheckedIcon()
	case "checkButton":
		return theme.CheckButtonIcon()
	case "radioButton":
		return theme.RadioButtonIcon()
	case "radioButtonChecked":
		return theme.RadioButtonCheckedIcon()

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

	// Create URI from file path
	uri := storage.NewFileURI(path)

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

	uri := storage.NewFileURI(path)
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
