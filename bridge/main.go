package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
)

func (b *Bridge) handleMessage(msg Message) {
	switch msg.Type {
	case "createWindow":
		b.handleCreateWindow(msg)
	case "setContent":
		b.handleSetContent(msg)
	case "clearWidgets":
		b.handleClearWidgets(msg)
	case "showWindow":
		b.handleShowWindow(msg)
	case "createButton":
		b.handleCreateButton(msg)
	case "createLabel":
		b.handleCreateLabel(msg)
	case "createEntry":
		b.handleCreateEntry(msg)
	case "createMultiLineEntry":
		b.handleCreateMultiLineEntry(msg)
	case "createPasswordEntry":
		b.handleCreatePasswordEntry(msg)
	case "createSeparator":
		b.handleCreateSeparator(msg)
	case "createHyperlink":
		b.handleCreateHyperlink(msg)
	case "createVBox":
		b.handleCreateVBox(msg)
	case "createHBox":
		b.handleCreateHBox(msg)
	case "createCheckbox":
		b.handleCreateCheckbox(msg)
	case "createSelect":
		b.handleCreateSelect(msg)
	case "createSlider":
		b.handleCreateSlider(msg)
	case "createProgressBar":
		b.handleCreateProgressBar(msg)
	case "createScroll":
		b.handleCreateScroll(msg)
	case "createGrid":
		b.handleCreateGrid(msg)
	case "createCenter":
		b.handleCreateCenter(msg)
	case "createCard":
		b.handleCreateCard(msg)
	case "createAccordion":
		b.handleCreateAccordion(msg)
	case "createForm":
		b.handleCreateForm(msg)
	case "createTree":
		b.handleCreateTree(msg)
	case "createRichText":
		b.handleCreateRichText(msg)
	case "createImage":
		b.handleCreateImage(msg)
	case "updateImage":
		b.handleUpdateImage(msg)
	case "createBorder":
		b.handleCreateBorder(msg)
	case "createGridWrap":
		b.handleCreateGridWrap(msg)
	case "createRadioGroup":
		b.handleCreateRadioGroup(msg)
	case "createSplit":
		b.handleCreateSplit(msg)
	case "createTabs":
		b.handleCreateTabs(msg)
	case "setText":
		b.handleSetText(msg)
	case "getText":
		b.handleGetText(msg)
	case "setProgress":
		b.handleSetProgress(msg)
	case "getProgress":
		b.handleGetProgress(msg)
	case "setChecked":
		b.handleSetChecked(msg)
	case "getChecked":
		b.handleGetChecked(msg)
	case "setSelected":
		b.handleSetSelected(msg)
	case "getSelected":
		b.handleGetSelected(msg)
	case "setValue":
		b.handleSetValue(msg)
	case "getValue":
		b.handleGetValue(msg)
	case "setRadioSelected":
		b.handleSetRadioSelected(msg)
	case "getRadioSelected":
		b.handleGetRadioSelected(msg)
	case "showInfo":
		b.handleShowInfo(msg)
	case "showError":
		b.handleShowError(msg)
	case "showConfirm":
		b.handleShowConfirm(msg)
	case "showFileOpen":
		b.handleShowFileOpen(msg)
	case "showFileSave":
		b.handleShowFileSave(msg)
	case "resizeWindow":
		b.handleResizeWindow(msg)
	case "setWindowTitle":
		b.handleSetWindowTitle(msg)
	case "centerWindow":
		b.handleCenterWindow(msg)
	case "setWindowFullScreen":
		b.handleSetWindowFullScreen(msg)
	case "setMainMenu":
		b.handleSetMainMenu(msg)
	case "createToolbar":
		b.handleCreateToolbar(msg)
	case "createTable":
		b.handleCreateTable(msg)
	case "createList":
		b.handleCreateList(msg)
	case "updateTableData":
		b.handleUpdateTableData(msg)
	case "updateListData":
		b.handleUpdateListData(msg)
	case "getTableData":
		b.handleGetTableData(msg)
	case "getListData":
		b.handleGetListData(msg)
	case "getToolbarItems":
		b.handleGetToolbarItems(msg)
	case "getContainerObjects":
		b.handleGetContainerObjects(msg)
	case "setTheme":
		b.handleSetTheme(msg)
	case "getTheme":
		b.handleGetTheme(msg)
	case "setWidgetStyle":
		b.handleSetWidgetStyle(msg)
	case "setWidgetContextMenu":
		b.handleSetWidgetContextMenu(msg)
	case "quit":
		b.handleQuit(msg)
	// Testing methods
	case "findWidget":
		b.handleFindWidget(msg)
	case "clickWidget":
		b.handleClickWidget(msg)
	case "typeText":
		b.handleTypeText(msg)
	case "getWidgetInfo":
		b.handleGetWidgetInfo(msg)
	case "getAllWidgets":
		b.handleGetAllWidgets(msg)
	case "captureWindow":
		b.handleCaptureWindow(msg)
	case "doubleTapWidget":
		b.handleDoubleTapWidget(msg)
	case "rightClickWidget":
		b.handleRightClickWidget(msg)
	case "dragWidget":
		b.handleDragWidget(msg)
	case "hoverWidget":
		b.handleHoverWidget(msg)
	case "scrollCanvas":
		b.handleScrollCanvas(msg)
	case "dragCanvas":
		b.handleDragCanvas(msg)
	case "focusNext":
		b.handleFocusNext(msg)
	case "focusPrevious":
		b.handleFocusPrevious(msg)
	case "containerAdd":
		b.handleContainerAdd(msg)
	case "containerRemoveAll":
		b.handleContainerRemoveAll(msg)
	case "containerRefresh":
		b.handleContainerRefresh(msg)
	case "disableWidget":
		b.handleDisableWidget(msg)
	case "enableWidget":
		b.handleEnableWidget(msg)
	case "isEnabled":
		b.handleIsEnabled(msg)
	case "focusWidget":
		b.handleFocusWidget(msg)
	case "submitEntry":
		b.handleSubmitEntry(msg)
	case "hideWidget":
		b.handleHideWidget(msg)
	case "showWidget":
		b.handleShowWidget(msg)
	case "registerCustomId":
		b.handleRegisterCustomId(msg)
	case "getParent":
		b.handleGetParent(msg)
	default:
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Unknown message type: %s", msg.Type),
		})
	}
}

func main() {
	// =============================================================================
	// IPC Safeguard #1: Redirect all log output to stderr
	// =============================================================================
	// stdout is reserved exclusively for JSON-RPC protocol messages.
	// Any accidental stdout writes (debug prints, panics, third-party libraries)
	// would corrupt the JSON stream and crash the application.
	// All logging MUST go to stderr.
	log.SetOutput(os.Stderr)
	log.SetPrefix("[tsyne-bridge] ")
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	// Check for test mode flag
	testMode := false
	for _, arg := range os.Args[1:] {
		if arg == "--test" || arg == "--headless" {
			testMode = true
			break
		}
	}

	bridge := NewBridge(testMode)

	// Read messages from stdin in a goroutine
	go func() {
		// IPC Safeguard #3 & #4: Read framed messages with length-prefix and CRC32 validation
		for {
			// Read framed message from stdin
			jsonData, err := readFramedMessage(os.Stdin)
			if err != nil {
				if errors.Is(err, io.EOF) {
					// Stdin closed - normal termination
					break
				}
				log.Printf("Error reading framed message: %v", err)
				continue // Try to recover and read next message
			}

			// Parse JSON message
			var msg Message
			if err := json.Unmarshal(jsonData, &msg); err != nil {
				log.Printf("Error parsing message: %v", err)
				continue
			}

			// Handle the message
			bridge.handleMessage(msg)
		}

		// If stdin closes, signal quit
		if testMode {
			select {
			case bridge.quitChan <- true:
			default:
			}
		}
	}()

	// Send ready signal to indicate bridge is ready to receive commands
	bridge.sendResponse(Response{
		ID:      "ready",
		Success: true,
		Result:  map[string]interface{}{"status": "ready"},
	})

	// Run the Fyne app
	// In normal mode, this blocks until quit
	// In test mode, DON'T call app.Run() - test apps don't need the event loop
	if !testMode {
		bridge.app.Run()
	} else {
		// In test mode, just wait for quit signal
		<-bridge.quitChan
	}
}
