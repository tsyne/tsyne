package main

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	pb "github.com/paul-hammant/tsyne/bridge/proto"
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
	case "createSpacer":
		b.handleCreateSpacer(msg)
	case "createHyperlink":
		b.handleCreateHyperlink(msg)
	case "createVBox":
		b.handleCreateVBox(msg)
	case "createHBox":
		b.handleCreateHBox(msg)
	case "createStack":
		b.handleCreateStack(msg)
	case "createCheckbox":
		b.handleCreateCheckbox(msg)
	case "createSelect":
		b.handleCreateSelect(msg)
	case "createSelectEntry":
		b.handleCreateSelectEntry(msg)
	case "setSelectEntryOptions":
		b.handleSetSelectEntryOptions(msg)
	case "createSlider":
		b.handleCreateSlider(msg)
	case "createProgressBar":
		b.handleCreateProgressBar(msg)
	case "createActivity":
		b.handleCreateActivity(msg)
	case "startActivity":
		b.handleStartActivity(msg)
	case "stopActivity":
		b.handleStopActivity(msg)
	case "createScroll":
		b.handleCreateScroll(msg)
	case "createGrid":
		b.handleCreateGrid(msg)
	case "createCenter":
		b.handleCreateCenter(msg)
	case "createClip":
		b.handleCreateClip(msg)
	case "createMax":
		b.handleCreateMax(msg)
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
	case "registerResource":
		b.handleRegisterResource(msg)
	case "unregisterResource":
		b.handleUnregisterResource(msg)
	case "createBorder":
		b.handleCreateBorder(msg)
	case "createGridWrap":
		b.handleCreateGridWrap(msg)
	case "createAdaptiveGrid":
		b.handleCreateAdaptiveGrid(msg)
	case "createPadded":
		b.handleCreatePadded(msg)
	case "createRadioGroup":
		b.handleCreateRadioGroup(msg)
	case "createCheckGroup":
		b.handleCreateCheckGroup(msg)
	case "getCheckGroupSelected":
		b.handleGetCheckGroupSelected(msg)
	case "setCheckGroupSelected":
		b.handleSetCheckGroupSelected(msg)
	case "createSplit":
		b.handleCreateSplit(msg)
	case "createTabs":
		b.handleCreateTabs(msg)
	case "createDocTabs":
		b.handleCreateDocTabs(msg)
	case "docTabsAppend":
		b.handleDocTabsAppend(msg)
	case "docTabsRemove":
		b.handleDocTabsRemove(msg)
	case "docTabsSelect":
		b.handleDocTabsSelect(msg)
	case "createThemeOverride":
		b.handleCreateThemeOverride(msg)
	case "createNavigation":
		b.handleCreateNavigation(msg)
	case "navigationPush":
		b.handleNavigationPush(msg)
	case "navigationBack":
		b.handleNavigationBack(msg)
	case "navigationForward":
		b.handleNavigationForward(msg)
	case "navigationSetTitle":
		b.handleNavigationSetTitle(msg)
	case "setText":
		b.handleSetText(msg)
	case "getText":
		b.handleGetText(msg)
	case "setProgress":
		b.handleSetProgress(msg)
	case "getProgress":
		b.handleGetProgress(msg)
	case "startProgressInfinite":
		b.handleStartProgressInfinite(msg)
	case "stopProgressInfinite":
		b.handleStopProgressInfinite(msg)
	case "isProgressRunning":
		b.handleIsProgressRunning(msg)
	case "setChecked":
		b.handleSetChecked(msg)
	case "getChecked":
		b.handleGetChecked(msg)
	case "setSelected":
		b.handleSetSelected(msg)
	case "getSelected":
		b.handleGetSelected(msg)
	case "setSelectOptions":
		b.handleSetSelectOptions(msg)
	case "setRadioOptions":
		b.handleSetRadioOptions(msg)
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
	case "showFolderOpen":
		b.handleShowFolderOpen(msg)
	case "showForm":
		b.handleShowForm(msg)
	case "showCustom":
		b.handleShowCustom(msg)
	case "showCustomConfirm":
		b.handleShowCustomConfirm(msg)
	case "showCustomWithoutButtons":
		b.handleShowCustomWithoutButtons(msg)
	case "hideCustomDialog":
		b.handleHideCustomDialog(msg)
	case "showProgressDialog":
		b.handleShowProgressDialog(msg)
	case "updateProgressDialog":
		b.handleUpdateProgressDialog(msg)
	case "hideProgressDialog":
		b.handleHideProgressDialog(msg)
	case "showColorPicker":
		b.handleShowColorPicker(msg)
	case "showEntryDialog":
		b.handleShowEntryDialog(msg)
	case "resizeWindow":
		b.handleResizeWindow(msg)
	case "setWindowTitle":
		b.handleSetWindowTitle(msg)
	case "centerWindow":
		b.handleCenterWindow(msg)
	case "setWindowFullScreen":
		b.handleSetWindowFullScreen(msg)
	case "setWindowIcon":
		b.handleSetWindowIcon(msg)
	case "setWindowCloseIntercept":
		b.handleSetWindowCloseIntercept(msg)
	case "closeInterceptResponse":
		b.handleCloseInterceptResponse(msg)
	case "closeWindow":
		b.handleCloseWindow(msg)
	case "setMainMenu":
		b.handleSetMainMenu(msg)
	case "createToolbar":
		b.handleCreateToolbar(msg)
	case "createTable":
		b.handleCreateTable(msg)
	case "createList":
		b.handleCreateList(msg)
	case "createTextGrid":
		b.handleCreateTextGrid(msg)
	case "setTextGridText":
		b.handleSetTextGridText(msg)
	case "getTextGridText":
		b.handleGetTextGridText(msg)
	case "setTextGridCell":
		b.handleSetTextGridCell(msg)
	case "setTextGridRow":
		b.handleSetTextGridRow(msg)
	case "setTextGridStyle":
		b.handleSetTextGridStyle(msg)
	case "setTextGridStyleRange":
		b.handleSetTextGridStyleRange(msg)
	case "createDateEntry":
		b.handleCreateDateEntry(msg)
	case "setDate":
		b.handleSetDate(msg)
	case "getDate":
		b.handleGetDate(msg)
	case "updateTableData":
		b.handleUpdateTableData(msg)
	case "updateListData":
		b.handleUpdateListData(msg)
	case "unselectAllList":
		b.handleUnselectAllList(msg)
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
	case "setFontScale":
		b.handleSetFontScale(msg)
	case "setCustomTheme":
		b.handleSetCustomTheme(msg)
	case "clearCustomTheme":
		b.handleClearCustomTheme(msg)
	case "setCustomFont":
		b.handleSetCustomFont(msg)
	case "clearCustomFont":
		b.handleClearCustomFont(msg)
	case "getAvailableFonts":
		b.handleGetAvailableFonts(msg)
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
	case "clickToolbarAction":
		b.handleClickToolbarAction(msg)
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
	case "registerTestId":
		b.handleRegisterTestId(msg)
	case "getParent":
		b.handleGetParent(msg)
	case "setAccessibility":
		b.handleSetAccessibility(msg)
	case "enableAccessibility":
		b.handleEnableAccessibility(msg)
	case "disableAccessibility":
		b.handleDisableAccessibility(msg)
	case "announce":
		b.handleAnnounce(msg)
	case "stopSpeech":
		b.handleStopSpeech(msg)
	case "setPointerEnter":
		b.handleSetPointerEnter(msg)
	case "processHoverWrappers":
		b.handleProcessHoverWrappers(msg)
	case "setWidgetHoverable":
		b.handleSetWidgetHoverable(msg)
	case "createMenu":
		b.handleCreateMenu(msg)
	// Canvas primitives
	case "createCanvasLine":
		b.handleCreateCanvasLine(msg)
	case "createCanvasCircle":
		b.handleCreateCanvasCircle(msg)
	case "createCanvasRectangle":
		b.handleCreateCanvasRectangle(msg)
	case "createCanvasText":
		b.handleCreateCanvasText(msg)
	case "createCanvasRaster":
		b.handleCreateCanvasRaster(msg)
	case "updateCanvasRaster":
		b.handleUpdateCanvasRaster(msg)
	case "createCanvasLinearGradient":
		b.handleCreateCanvasLinearGradient(msg)
	case "updateCanvasLine":
		b.handleUpdateCanvasLine(msg)
	case "updateCanvasCircle":
		b.handleUpdateCanvasCircle(msg)
	case "updateCanvasRectangle":
		b.handleUpdateCanvasRectangle(msg)
	case "updateCanvasText":
		b.handleUpdateCanvasText(msg)
	case "updateCanvasLinearGradient":
		b.handleUpdateCanvasLinearGradient(msg)
	case "createCanvasArc":
		b.handleCreateCanvasArc(msg)
	case "updateCanvasArc":
		b.handleUpdateCanvasArc(msg)
	case "createCanvasPolygon":
		b.handleCreateCanvasPolygon(msg)
	case "updateCanvasPolygon":
		b.handleUpdateCanvasPolygon(msg)
	case "createCanvasRadialGradient":
		b.handleCreateCanvasRadialGradient(msg)
	case "updateCanvasRadialGradient":
		b.handleUpdateCanvasRadialGradient(msg)
	// Platform integration
	case "setSystemTray":
		b.handleSetSystemTray(msg)
	case "sendNotification":
		b.handleSendNotification(msg)
	case "clipboardGet":
		b.handleClipboardGet(msg)
	case "clipboardSet":
		b.handleClipboardSet(msg)
	case "preferencesGet":
		b.handlePreferencesGet(msg)
	case "preferencesSet":
		b.handlePreferencesSet(msg)
	case "preferencesRemove":
		b.handlePreferencesRemove(msg)
	case "setDraggable":
		b.handleSetDraggable(msg)
	case "setDroppable":
		b.handleSetDroppable(msg)
	case "createInnerWindow":
		b.handleCreateInnerWindow(msg)
	case "innerWindowClose":
		b.handleInnerWindowClose(msg)
	case "setInnerWindowTitle":
		b.handleSetInnerWindowTitle(msg)
	case "createMultipleWindows":
		b.handleCreateMultipleWindows(msg)
	case "multipleWindowsAddWindow":
		b.handleMultipleWindowsAddWindow(msg)
	case "multipleWindowsRemoveWindow":
		b.handleMultipleWindowsRemoveWindow(msg)
	case "createPopup":
		b.handleCreatePopup(msg)
	case "showPopup":
		b.handleShowPopup(msg)
	// Icon widget
	case "createIcon":
		b.handleCreateIcon(msg)
	case "setIconResource":
		b.handleSetIconResource(msg)
	// FileIcon widget
	case "createFileIcon":
		b.handleCreateFileIcon(msg)
	case "setFileIconURI":
		b.handleSetFileIconURI(msg)
	case "setFileIconSelected":
		b.handleSetFileIconSelected(msg)
	// Calendar widget
	case "createCalendar":
		b.handleCreateCalendar(msg)
	case "hidePopup":
		b.handleHidePopup(msg)
	case "movePopup":
		b.handleMovePopup(msg)
	default:
		b.sendResponse(Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Unknown message type: %s", msg.Type),
		})
	}
}

// Helper functions for gRPC mode

// findFreePort finds an available port on localhost
func findFreePort() int {
	listener, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		log.Fatal(err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()
	return port
}

// generateSecureToken generates a random secure token
func generateSecureToken(length int) string {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// tokenAuthInterceptor validates the auth token for gRPC requests
func tokenAuthInterceptor(expectedToken string) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		// Extract token from metadata
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, fmt.Errorf("missing metadata")
		}

		tokens := md.Get("authorization")
		if len(tokens) == 0 || tokens[0] != expectedToken {
			return nil, fmt.Errorf("unauthorized")
		}

		return handler(ctx, req)
	}
}

// tokenStreamInterceptor validates the auth token for streaming gRPC requests
func tokenStreamInterceptor(expectedToken string) grpc.StreamServerInterceptor {
	return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		// Extract token from metadata
		md, ok := metadata.FromIncomingContext(ss.Context())
		if !ok {
			return fmt.Errorf("missing metadata")
		}

		tokens := md.Get("authorization")
		if len(tokens) == 0 || tokens[0] != expectedToken {
			return fmt.Errorf("unauthorized")
		}

		return handler(srv, ss)
	}
}

// startGrpcServer starts the gRPC server on the specified port
func startGrpcServer(port int, token string, bridge *Bridge, readyChan chan<- bool) error {
	lis, err := net.Listen("tcp", fmt.Sprintf("localhost:%d", port))
	if err != nil {
		return err
	}

	// Performance-optimized gRPC server options
	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(tokenAuthInterceptor(token)),
		grpc.StreamInterceptor(tokenStreamInterceptor(token)),
		// Larger buffers for reduced syscalls
		grpc.WriteBufferSize(64*1024),
		grpc.ReadBufferSize(64*1024),
		// Disable max connection age for persistent connections
		grpc.MaxRecvMsgSize(100*1024*1024),
		grpc.MaxSendMsgSize(100*1024*1024),
	)

	pb.RegisterBridgeServiceServer(grpcServer, &grpcBridgeService{bridge: bridge})

	// Signal ready immediately after registering - no artificial delay
	readyChan <- true

	log.Printf("[gRPC] Server listening on port %d", port)
	return grpcServer.Serve(lis)
}

// runGrpcMode runs the bridge in gRPC mode
func runGrpcMode(testMode bool) {
	// 1. Find free port
	port := findFreePort()

	// 2. Generate secure token
	token := generateSecureToken(32)

	// 3. Create bridge
	bridge := NewBridge(testMode)
	bridge.grpcMode = true // Skip stdout writes in gRPC mode
	bridge.grpcEventChan = make(chan Event, 256) // Larger buffer for better throughput

	// 4. Start gRPC server in background - server signals ready via channel
	grpcReady := make(chan bool, 1)
	go func() {
		if err := startGrpcServer(port, token, bridge, grpcReady); err != nil {
			log.Fatalf("gRPC server failed: %v", err)
		}
	}()

	// Wait for server to be ready (signaled from startGrpcServer after registration)
	<-grpcReady

	// 5. Send connection info to TypeScript via stdout
	initMsg := map[string]interface{}{
		"grpcPort": port,
		"token":    token,
		"protocol": "grpc",
	}
	jsonData, _ := json.Marshal(initMsg)
	os.Stdout.Write(jsonData)
	os.Stdout.Write([]byte("\n"))
	os.Stdout.Sync()

	log.Printf("[gRPC] Sent connection info: port=%d", port)

	// 6. Keep stdin open for shutdown signal
	shutdownChan := make(chan bool)
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			line := scanner.Text()
			if line == "shutdown" {
				shutdownChan <- true
				break
			}
		}
	}()

	// 7. Run the Fyne app
	if !testMode {
		go bridge.app.Run()
	}

	<-shutdownChan
	log.Println("[gRPC] Bridge shutting down...")
}

// runStdioMode runs the bridge in stdio mode (existing behavior)
func runStdioMode(testMode bool) {
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

	// Check for test mode flag BEFORE parsing
	testMode := false
	for _, arg := range os.Args[1:] {
		if arg == "--test" || arg == "--headless" {
			testMode = true
			break
		}
	}

	// Parse command-line flags
	mode := flag.String("mode", "stdio", "Communication mode: stdio or grpc")
	// Filter out --headless and --test flags before parsing, as they're not recognized by flag package
	filteredArgs := []string{}
	for _, arg := range os.Args[1:] {
		if arg != "--headless" && arg != "--test" {
			filteredArgs = append(filteredArgs, arg)
		}
	}
	flag.CommandLine.Parse(filteredArgs)

	log.Printf("[main] Starting in mode: %s (testMode: %v)", *mode, testMode)

	// Run in the specified mode
	if *mode == "grpc" {
		runGrpcMode(testMode)
	} else {
		runStdioMode(testMode)
	}
}
