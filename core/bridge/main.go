package main

/*
#include <stdlib.h>
*/
import "C"

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

	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	pb "github.com/paul-hammant/tsyne/bridge/proto"
)

func (b *Bridge) handleMessage(msg Message) Response {
	switch msg.Type {
	case "ping":
		return Response{Success: true, Result: map[string]interface{}{"pong": true}}
	case "createWindow":
		return b.handleCreateWindow(msg)
	case "setContent":
		return b.handleSetContent(msg)
	case "setWindowOnResize":
		return b.handleSetWindowOnResize(msg)
	case "clearWidgets":
		return b.handleClearWidgets(msg)
	case "showWindow":
		return b.handleShowWindow(msg)
	case "createButton":
		return b.handleCreateButton(msg)
	case "createMenuButton":
		return b.handleCreateMenuButton(msg)
	case "createLabel":
		return b.handleCreateLabel(msg)
	case "createColorCell":
		return b.handleCreateColorCell(msg)
	case "updateColorCell":
		return b.handleUpdateColorCell(msg)
	case "createEntry":
		return b.handleCreateEntry(msg)
	case "createMultiLineEntry":
		return b.handleCreateMultiLineEntry(msg)
	case "createPasswordEntry":
		return b.handleCreatePasswordEntry(msg)
	case "createSeparator":
		return b.handleCreateSeparator(msg)
	case "createSpacer":
		return b.handleCreateSpacer(msg)
	case "createHyperlink":
		return b.handleCreateHyperlink(msg)
	case "createVBox":
		return b.handleCreateVBox(msg)
	case "createHBox":
		return b.handleCreateHBox(msg)
	case "createStack":
		return b.handleCreateStack(msg)
	case "createCanvasStack":
		return b.handleCreateCanvasStack(msg)
	case "createCheckbox":
		return b.handleCreateCheckbox(msg)
	case "createSelect":
		return b.handleCreateSelect(msg)
	case "createSelectEntry":
		return b.handleCreateSelectEntry(msg)
	case "setSelectEntryOptions":
		return b.handleSetSelectEntryOptions(msg)
	case "createSlider":
		return b.handleCreateSlider(msg)
	case "createProgressBar":
		return b.handleCreateProgressBar(msg)
	case "createActivity":
		return b.handleCreateActivity(msg)
	case "startActivity":
		return b.handleStartActivity(msg)
	case "stopActivity":
		return b.handleStopActivity(msg)
	case "createScroll":
		return b.handleCreateScroll(msg)
	case "createGrid":
		return b.handleCreateGrid(msg)
	case "createCenter":
		return b.handleCreateCenter(msg)
	case "createAspectRatio":
		return b.handleCreateAspectRatio(msg)
	case "createClip":
		return b.handleCreateClip(msg)
	case "createMax":
		return b.handleCreateMax(msg)
	case "createCard":
		return b.handleCreateCard(msg)
	case "createAccordion":
		return b.handleCreateAccordion(msg)
	case "createForm":
		return b.handleCreateForm(msg)
	case "createTree":
		return b.handleCreateTree(msg)
	case "createRichText":
		return b.handleCreateRichText(msg)
	case "createImage":
		return b.handleCreateImage(msg)
	case "updateImage":
		return b.handleUpdateImage(msg)
	case "registerResource":
		return b.handleRegisterResource(msg)
	case "unregisterResource":
		return b.handleUnregisterResource(msg)
	case "createBorder":
		return b.handleCreateBorder(msg)
	case "createGridWrap":
		return b.handleCreateGridWrap(msg)
	case "createAdaptiveGrid":
		return b.handleCreateAdaptiveGrid(msg)
	case "createPadded":
		return b.handleCreatePadded(msg)
	case "createRadioGroup":
		return b.handleCreateRadioGroup(msg)
	case "createCheckGroup":
		return b.handleCreateCheckGroup(msg)
	case "getCheckGroupSelected":
		return b.handleGetCheckGroupSelected(msg)
	case "setCheckGroupSelected":
		return b.handleSetCheckGroupSelected(msg)
	case "createSplit":
		return b.handleCreateSplit(msg)
	case "createTabs":
		return b.handleCreateTabs(msg)
	case "createDocTabs":
		return b.handleCreateDocTabs(msg)
	case "docTabsAppend":
		return b.handleDocTabsAppend(msg)
	case "docTabsRemove":
		return b.handleDocTabsRemove(msg)
	case "docTabsSelect":
		return b.handleDocTabsSelect(msg)
	case "tabsSelect":
		return b.handleTabsSelect(msg)
	case "createThemeOverride":
		return b.handleCreateThemeOverride(msg)
	case "createNavigation":
		return b.handleCreateNavigation(msg)
	case "navigationPush":
		return b.handleNavigationPush(msg)
	case "navigationBack":
		return b.handleNavigationBack(msg)
	case "navigationForward":
		return b.handleNavigationForward(msg)
	case "navigationSetTitle":
		return b.handleNavigationSetTitle(msg)
	case "setText":
		return b.handleSetText(msg)
	case "getText":
		return b.handleGetText(msg)
	case "setWidgetCallback":
		return b.handleSetWidgetCallback(msg)
	case "setProgress":
		return b.handleSetProgress(msg)
	case "getProgress":
		return b.handleGetProgress(msg)
	case "startProgressInfinite":
		return b.handleStartProgressInfinite(msg)
	case "stopProgressInfinite":
		return b.handleStopProgressInfinite(msg)
	case "isProgressRunning":
		return b.handleIsProgressRunning(msg)
	case "setChecked":
		return b.handleSetChecked(msg)
	case "getChecked":
		return b.handleGetChecked(msg)
	case "setSelected":
		return b.handleSetSelected(msg)
	case "getSelected":
		return b.handleGetSelected(msg)
	case "setSelectOptions":
		return b.handleSetSelectOptions(msg)
	case "setRadioOptions":
		return b.handleSetRadioOptions(msg)
	case "setValue":
		return b.handleSetValue(msg)
	case "getValue":
		return b.handleGetValue(msg)
	case "getWidgetSize":
		return b.handleGetWidgetSize(msg)
	case "setWidgetOnResize":
		return b.handleSetWidgetOnResize(msg)
	case "setRadioSelected":
		return b.handleSetRadioSelected(msg)
	case "getRadioSelected":
		return b.handleGetRadioSelected(msg)
	case "showInfo":
		return b.handleShowInfo(msg)
	case "showError":
		return b.handleShowError(msg)
	case "showConfirm":
		return b.handleShowConfirm(msg)
	case "showFileOpen":
		return b.handleShowFileOpen(msg)
	case "showFileSave":
		return b.handleShowFileSave(msg)
	case "showFolderOpen":
		return b.handleShowFolderOpen(msg)
	case "showForm":
		return b.handleShowForm(msg)
	case "showCustom":
		return b.handleShowCustom(msg)
	case "showCustomConfirm":
		return b.handleShowCustomConfirm(msg)
	case "showCustomWithoutButtons":
		return b.handleShowCustomWithoutButtons(msg)
	case "hideCustomDialog":
		return b.handleHideCustomDialog(msg)
	case "getActiveDialogs":
		return b.handleGetActiveDialogs(msg)
	case "dismissActiveDialog":
		return b.handleDismissActiveDialog(msg)
	case "showProgressDialog":
		return b.handleShowProgressDialog(msg)
	case "updateProgressDialog":
		return b.handleUpdateProgressDialog(msg)
	case "hideProgressDialog":
		return b.handleHideProgressDialog(msg)
	case "showColorPicker":
		return b.handleShowColorPicker(msg)
	case "showEntryDialog":
		return b.handleShowEntryDialog(msg)
	case "resizeWindow":
		return b.handleResizeWindow(msg)
	case "setWindowTitle":
		return b.handleSetWindowTitle(msg)
	case "centerWindow":
		return b.handleCenterWindow(msg)
	case "setWindowFullScreen":
		return b.handleSetWindowFullScreen(msg)
	case "setWindowIcon":
		return b.handleSetWindowIcon(msg)
	case "setWindowCloseIntercept":
		return b.handleSetWindowCloseIntercept(msg)
	case "closeInterceptResponse":
		return b.handleCloseInterceptResponse(msg)
	case "closeWindow":
		return b.handleCloseWindow(msg)
	case "requestFocusWindow":
		return b.handleRequestFocusWindow(msg)
	case "setMainMenu":
		return b.handleSetMainMenu(msg)
	case "createToolbar":
		return b.handleCreateToolbar(msg)
	case "createTable":
		return b.handleCreateTable(msg)
	case "createList":
		return b.handleCreateList(msg)
	case "createTextGrid":
		return b.handleCreateTextGrid(msg)
	case "setTextGridText":
		return b.handleSetTextGridText(msg)
	case "getTextGridText":
		return b.handleGetTextGridText(msg)
	case "setTextGridCell":
		return b.handleSetTextGridCell(msg)
	case "setTextGridRow":
		return b.handleSetTextGridRow(msg)
	case "setTextGridStyle":
		return b.handleSetTextGridStyle(msg)
	case "setTextGridStyleRange":
		return b.handleSetTextGridStyleRange(msg)
	case "createDesktopCanvas":
		return b.handleCreateDesktopCanvas(msg)
	case "createDesktopIcon":
		return b.handleCreateDesktopIcon(msg)
	case "moveDesktopIcon":
		return b.handleMoveDesktopIcon(msg)
	case "updateDesktopIconLabel":
		return b.handleUpdateDesktopIconLabel(msg)
	case "updateDesktopIconColor":
		return b.handleUpdateDesktopIconColor(msg)
	case "createDesktopMDI":
		return b.handleCreateDesktopMDI(msg)
	case "desktopMDIAddIcon":
		return b.handleDesktopMDIAddIcon(msg)
	case "desktopMDIAddWindow":
		return b.handleDesktopMDIAddWindow(msg)
	case "desktopMDIRemoveWindow":
		return b.handleDesktopMDIRemoveWindow(msg)
	case "createDateEntry":
		return b.handleCreateDateEntry(msg)
	case "setDate":
		return b.handleSetDate(msg)
	case "getDate":
		return b.handleGetDate(msg)
	case "updateTableData":
		return b.handleUpdateTableData(msg)
	case "updateListData":
		return b.handleUpdateListData(msg)
	case "unselectAllList":
		return b.handleUnselectAllList(msg)
	case "getTableData":
		return b.handleGetTableData(msg)
	case "getListData":
		return b.handleGetListData(msg)
	case "getToolbarItems":
		return b.handleGetToolbarItems(msg)
	case "getContainerObjects":
		return b.handleGetContainerObjects(msg)
	case "setTheme":
		return b.handleSetTheme(msg)
	case "getTheme":
		return b.handleGetTheme(msg)
	case "setFontScale":
		return b.handleSetFontScale(msg)
	case "setCustomTheme":
		return b.handleSetCustomTheme(msg)
	case "clearCustomTheme":
		return b.handleClearCustomTheme(msg)
	case "setCustomSizes":
		return b.handleSetCustomSizes(msg)
	case "clearCustomSizes":
		return b.handleClearCustomSizes(msg)
	case "getThemeConfig":
		return b.handleGetThemeConfig(msg)
	case "setCustomFont":
		return b.handleSetCustomFont(msg)
	case "clearCustomFont":
		return b.handleClearCustomFont(msg)
	case "getAvailableFonts":
		return b.handleGetAvailableFonts(msg)
	case "setWidgetStyle":
		return b.handleSetWidgetStyle(msg)
	case "setWidgetContextMenu":
		return b.handleSetWidgetContextMenu(msg)
	case "quit":
		return b.handleQuit(msg)
	// Testing methods
	case "findWidget":
		return b.handleFindWidget(msg)
	case "clickWidget":
		return b.handleClickWidget(msg)
	case "clickToolbarAction":
		return b.handleClickToolbarAction(msg)
	case "typeText":
		return b.handleTypeText(msg)
	case "getWidgetInfo":
		return b.handleGetWidgetInfo(msg)
	case "getAllWidgets":
		return b.handleGetAllWidgets(msg)
	case "dumpWidgetTree":
		return b.handleDumpWidgetTree(msg)
	case "getWidgetTree":
		return b.handleGetWidgetTree(msg)
	case "openInspector":
		return b.handleOpenInspector(msg)
	case "getInspectorTree":
		return b.handleGetInspectorTree(msg)
	case "listWindows":
		return b.handleListWindows(msg)
	case "captureWindow":
		return b.handleCaptureWindow(msg)
	case "doubleTapWidget":
		return b.handleDoubleTapWidget(msg)
	case "rightClickWidget":
		return b.handleRightClickWidget(msg)
	case "dragWidget":
		return b.handleDragWidget(msg)
	case "hoverWidget":
		return b.handleHoverWidget(msg)
	case "tapAt":
		return b.handleTapAt(msg)
	case "scrollCanvas":
		return b.handleScrollCanvas(msg)
	case "dragCanvas":
		return b.handleDragCanvas(msg)
	case "focusNext":
		return b.handleFocusNext(msg)
	case "focusPrevious":
		return b.handleFocusPrevious(msg)
	case "containerAdd":
		return b.handleContainerAdd(msg)
	case "containerRemoveAll":
		return b.handleContainerRemoveAll(msg)
	case "containerRefresh":
		return b.handleContainerRefresh(msg)
	case "disableWidget":
		return b.handleDisableWidget(msg)
	case "enableWidget":
		return b.handleEnableWidget(msg)
	case "isEnabled":
		return b.handleIsEnabled(msg)
	case "focusWidget":
		return b.handleFocusWidget(msg)
	case "submitEntry":
		return b.handleSubmitEntry(msg)
	case "hideWidget":
		return b.handleHideWidget(msg)
	case "showWidget":
		return b.handleShowWidget(msg)
	case "registerCustomId":
		return b.handleRegisterCustomId(msg)
	case "registerTestId":
		return b.handleRegisterTestId(msg)
	case "clearAllCustomIds":
		return b.handleClearAllCustomIds(msg)
	case "getCustomIdStats":
		return b.handleGetCustomIdStats(msg)
	case "getParent":
		return b.handleGetParent(msg)
	case "setAccessibility":
		return b.handleSetAccessibility(msg)
	case "enableAccessibility":
		return b.handleEnableAccessibility(msg)
	case "disableAccessibility":
		return b.handleDisableAccessibility(msg)
	case "announce":
		return b.handleAnnounce(msg)
	case "stopSpeech":
		return b.handleStopSpeech(msg)
	case "setPointerEnter":
		return b.handleSetPointerEnter(msg)
	case "processHoverWrappers":
		return b.handleProcessHoverWrappers(msg)
	case "setWidgetHoverable":
		return b.handleSetWidgetHoverable(msg)
	case "createMenu":
		return b.handleCreateMenu(msg)
	case "setScrollMinHeight":
		return b.handleSetScrollMinHeight(msg)
	case "setScrollMinSize":
		return b.handleSetScrollMinSize(msg)
	case "scrollToBottom":
		return b.handleScrollToBottom(msg)
	case "scrollToTop":
		return b.handleScrollToTop(msg)
	case "setWidgetMinSize":
		return b.handleSetWidgetMinSize(msg)
	// Canvas primitives
	case "createCanvasLine":
		return b.handleCreateCanvasLine(msg)
	case "createCanvasCircle":
		return b.handleCreateCanvasCircle(msg)
	case "createCanvasEllipse":
		return b.handleCreateCanvasEllipse(msg)
	case "updateCanvasEllipse":
		return b.handleUpdateCanvasEllipse(msg)
	case "createCanvasRainbowT":
		return b.handleCreateCanvasRainbowT(msg)
	case "createCanvasGradientText":
		return b.handleCreateCanvasGradientText(msg)
	case "createCanvasRectangle":
		return b.handleCreateCanvasRectangle(msg)
	case "createTappableCanvasRectangle":
		return b.handleCreateTappableCanvasRectangle(msg)
	case "createCanvasText":
		return b.handleCreateCanvasText(msg)
	case "createCanvasRaster":
		return b.handleCreateCanvasRaster(msg)
	case "updateCanvasRaster":
		return b.handleUpdateCanvasRaster(msg)
	case "fillCanvasRasterRect":
		return b.handleFillCanvasRasterRect(msg)
	case "blitToCanvasRaster":
		return b.handleBlitToCanvasRaster(msg)
	case "createTappableCanvasRaster":
		return b.handleCreateTappableCanvasRaster(msg)
	case "updateTappableCanvasRaster":
		return b.handleUpdateTappableCanvasRaster(msg)
	case "resizeTappableCanvasRaster":
		return b.handleResizeTappableCanvasRaster(msg)
	case "focusTappableCanvasRaster":
		return b.handleFocusTappableCanvasRaster(msg)
	case "setTappableCanvasBuffer":
		return b.handleSetTappableCanvasBuffer(msg)
	case "setTappableCanvasImage":
		return b.handleSetTappableCanvasImage(msg)
	case "setTappableCanvasRect":
		return b.handleSetTappableCanvasRect(msg)
	case "createCanvasLinearGradient":
		return b.handleCreateCanvasLinearGradient(msg)
	case "updateCanvasLine":
		return b.handleUpdateCanvasLine(msg)
	case "updateCanvasCircle":
		return b.handleUpdateCanvasCircle(msg)
	case "updateCanvasRectangle":
		return b.handleUpdateCanvasRectangle(msg)
	case "updateCanvasText":
		return b.handleUpdateCanvasText(msg)
	case "updateCanvasLinearGradient":
		return b.handleUpdateCanvasLinearGradient(msg)
	case "createCanvasArc":
		return b.handleCreateCanvasArc(msg)
	case "updateCanvasArc":
		return b.handleUpdateCanvasArc(msg)
	case "createCanvasPolygon":
		return b.handleCreateCanvasPolygon(msg)
	case "updateCanvasPolygon":
		return b.handleUpdateCanvasPolygon(msg)
	case "createCanvasSphericalPatch":
		return b.handleCreateCanvasSphericalPatch(msg)
	case "updateCanvasSphericalPatch":
		return b.handleUpdateCanvasSphericalPatch(msg)
	case "createCanvasCheckeredSphere":
		return b.handleCreateCanvasCheckeredSphere(msg)
	case "updateCanvasCheckeredSphere":
		return b.handleUpdateCanvasCheckeredSphere(msg)
	case "createCanvasSphere":
		return b.handleCreateCanvasSphere(msg)
	case "updateCanvasSphere":
		return b.handleUpdateCanvasSphere(msg)
	case "updateCanvasSphereBuffer":
		return b.handleUpdateCanvasSphereBuffer(msg)
	case "createCanvasRadialGradient":
		return b.handleCreateCanvasRadialGradient(msg)
	case "updateCanvasRadialGradient":
		return b.handleUpdateCanvasRadialGradient(msg)
	// Sprite system
	case "saveRasterBackground":
		return b.handleSaveRasterBackground(msg)
	case "createRasterSprite":
		return b.handleCreateRasterSprite(msg)
	case "moveRasterSprite":
		return b.handleMoveRasterSprite(msg)
	case "setRasterSpriteResource":
		return b.handleSetRasterSpriteResource(msg)
	case "setRasterSpriteVisible":
		return b.handleSetRasterSpriteVisible(msg)
	case "setRasterSpriteZIndex":
		return b.handleSetRasterSpriteZIndex(msg)
	case "removeRasterSprite":
		return b.handleRemoveRasterSprite(msg)
	case "flushRasterSprites":
		return b.handleFlushRasterSprites(msg)
	// Platform integration
	case "setSystemTray":
		return b.handleSetSystemTray(msg)
	case "sendNotification":
		return b.handleSendNotification(msg)
	case "clipboardGet":
		return b.handleClipboardGet(msg)
	case "clipboardSet":
		return b.handleClipboardSet(msg)
	case "preferencesGet":
		return b.handlePreferencesGet(msg)
	case "preferencesSet":
		return b.handlePreferencesSet(msg)
	case "preferencesRemove":
		return b.handlePreferencesRemove(msg)
	case "setDraggable":
		return b.handleSetDraggable(msg)
	case "setDroppable":
		return b.handleSetDroppable(msg)
	case "createInnerWindow":
		return b.handleCreateInnerWindow(msg)
	case "innerWindowClose":
		return b.handleInnerWindowClose(msg)
	case "setInnerWindowContent":
		return b.handleSetInnerWindowContent(msg)
	case "raiseInnerWindow":
		return b.handleRaiseInnerWindow(msg)
	case "moveInnerWindow":
		return b.handleMoveInnerWindow(msg)
	case "setInnerWindowTitle":
		return b.handleSetInnerWindowTitle(msg)
	case "setInnerWindowResizeCallback":
		return b.handleSetInnerWindowResizeCallback(msg)
	case "createMultipleWindows":
		return b.handleCreateMultipleWindows(msg)
	case "multipleWindowsAddWindow":
		return b.handleMultipleWindowsAddWindow(msg)
	case "multipleWindowsRemoveWindow":
		return b.handleMultipleWindowsRemoveWindow(msg)
	case "createWithoutLayout":
		return b.handleCreateWithoutLayout(msg)
	case "moveWidget":
		return b.handleMoveWidget(msg)
	case "createPopup":
		return b.handleCreatePopup(msg)
	case "showPopup":
		return b.handleShowPopup(msg)
	// Icon widget
	case "createIcon":
		return b.handleCreateIcon(msg)
	case "setIconResource":
		return b.handleSetIconResource(msg)
	// FileIcon widget
	case "createFileIcon":
		return b.handleCreateFileIcon(msg)
	case "setFileIconURI":
		return b.handleSetFileIconURI(msg)
	case "setFileIconSelected":
		return b.handleSetFileIconSelected(msg)
	// Calendar widget
	case "createCalendar":
		return b.handleCreateCalendar(msg)
	case "hidePopup":
		return b.handleHidePopup(msg)
	case "movePopup":
		return b.handleMovePopup(msg)
	// Virtual keyboard keystroke injection
	case "typeRune":
		return b.handleTypeRune(msg)
	case "typeKey":
		return b.handleTypeKey(msg)
	default:
		return Response{
			ID:      msg.ID,
			Success: false,
			Error:   fmt.Sprintf("Unknown message type: %s", msg.Type),
		}
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
	bridge.transport = "grpc"
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

	// 5. Send connection info with version handshake to TypeScript via stdout
	initMsg := map[string]interface{}{
		"grpcPort":        port,
		"token":           token,
		"protocol":        "grpc",
		"protocolVersion": ProtocolVersion,
		"bridgeVersion":   BridgeVersion,
	}
	jsonData, _ := json.Marshal(initMsg)
	os.Stdout.Write(jsonData)
	os.Stdout.Write([]byte("\n"))
	os.Stdout.Sync()

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

// runMsgpackUdsMode runs the bridge in MessagePack over Unix Domain Socket mode
func runMsgpackUdsMode(testMode bool) {
	// 1. Create bridge
	bridge := NewBridge(testMode)
	bridge.transport = "msgpack"

	// 2. Create and start MessagePack server
	msgpackServer := NewMsgpackServer(bridge)
	if err := msgpackServer.Start(); err != nil {
		log.Fatalf("MessagePack server failed to start: %v", err)
	}

	// 3. Set up event forwarding from bridge to msgpack server
	bridge.msgpackServer = msgpackServer

	// 4. Send connection info with version handshake to TypeScript via stdout
	initMsg := map[string]interface{}{
		"socketPath":      msgpackServer.GetSocketPath(),
		"protocol":        "msgpack-uds",
		"protocolVersion": ProtocolVersion,
		"bridgeVersion":   BridgeVersion,
	}
	jsonData, _ := json.Marshal(initMsg)
	os.Stdout.Write(jsonData)
	os.Stdout.Write([]byte("\n"))
	os.Stdout.Sync()

	// 5. Keep stdin open for shutdown signal (in background)
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

	// 6. Set up shutdown handler in background
	go func() {
		<-shutdownChan
		msgpackServer.Close()
		log.Println("[msgpack-uds] Bridge shutting down...")
		if !testMode {
			bridge.app.Quit()
		}
		os.Exit(0)
	}()

	// 7. Run the Fyne app on main goroutine (required by Fyne)
	if !testMode {
		bridge.app.Run()
	} else {
		<-shutdownChan
		msgpackServer.Close()
	}
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

			// Handle the message and send response
			timer := StartOp(msg.Type, msg.ID)
			resp := bridge.handleMessage(msg)
			timer.End()
			bridge.sendResponse(resp)
		}

		// If stdin closes, signal quit
		if testMode {
			select {
			case bridge.quitChan <- true:
			default:
			}
		}
	}()

	// Send ready signal with handshake info to indicate bridge is ready
	// The TypeScript side will validate protocol compatibility
	handshake := NewHandshakeInfo(ProtocolVersion) // Assume TS uses same protocol for now
	bridge.sendResponse(Response{
		ID:      "ready",
		Success: true,
		Result: map[string]interface{}{
			"status":        "ready",
			"protocol":      handshake.Protocol,
			"bridgeVersion": handshake.BridgeVersion,
			"compatible":    handshake.Compatible,
		},
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

// =============================================================================
// Shared Library Entry Point (for Android JNI / embedded use)
// =============================================================================
// When built with -buildmode=c-shared, this function is exported and can be
// called from JNI or other C code. The main() function is ignored in this mode.
//
// Usage from JNI:
//   extern int StartBridgeMsgpackUDS(int testMode);
//   StartBridgeMsgpackUDS(0);  // Normal mode
//   StartBridgeMsgpackUDS(1);  // Test/headless mode

// Socket directory override (set by StartBridgeMsgpackUDSWithDir for Android)
var socketDirOverride string

//export StartBridgeMsgpackUDS
func StartBridgeMsgpackUDS(testMode C.int) C.int {
	// Set up logging to stderr
	log.SetOutput(os.Stderr)
	log.SetPrefix("[tsyne-bridge] ")
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	// Initialize performance monitoring
	perfEnabled := os.Getenv("TSYNE_PERF_SAMPLE") == "true"
	InitPerfMonitor(perfEnabled)

	// Run in msgpack-uds mode (the default for IPC)
	runMsgpackUdsMode(testMode != 0)

	return 0
}

//export StartBridgeMsgpackUDSWithDir
func StartBridgeMsgpackUDSWithDir(testMode C.int, socketDir *C.char) C.int {
	// Store the socket directory override before starting
	if socketDir != nil {
		socketDirOverride = C.GoString(socketDir)
		log.Printf("Socket directory set to: %s", socketDirOverride)
	}

	// Set up logging to stderr
	log.SetOutput(os.Stderr)
	log.SetPrefix("[tsyne-bridge] ")
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	// Initialize performance monitoring
	perfEnabled := os.Getenv("TSYNE_PERF_SAMPLE") == "true"
	InitPerfMonitor(perfEnabled)

	// Run in msgpack-uds mode (the default for IPC)
	runMsgpackUdsMode(testMode != 0)

	return 0
}

//export StartBridgeGrpc
func StartBridgeGrpc(testMode C.int) C.int {
	log.SetOutput(os.Stderr)
	log.SetPrefix("[tsyne-bridge] ")
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	perfEnabled := os.Getenv("TSYNE_PERF_SAMPLE") == "true"
	InitPerfMonitor(perfEnabled)

	runGrpcMode(testMode != 0)

	return 0
}

func main() {
	// =============================================================================
	// IPC Safeguard #1: Redirect all log output to stderr
	// =============================================================================
	// stdout is reserved exclusively for JSON-RPC protocol messages.
	// Check for test mode flag BEFORE setting up logging
	testMode := false
	for _, arg := range os.Args[1:] {
		if arg == "--test" || arg == "--headless" {
			testMode = true
			break
		}
	}

	// Set up logging
	// Any accidental stdout writes (debug prints, panics, third-party libraries)
	// would corrupt the JSON stream and crash the application.
	// All logging goes to stderr (including in test mode for debugging).
	log.SetOutput(os.Stderr)
	log.SetPrefix("[tsyne-bridge] ")
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	// Initialize performance monitoring (env: TSYNE_PERF_SAMPLE=true)
	perfEnabled := os.Getenv("TSYNE_PERF_SAMPLE") == "true"
	InitPerfMonitor(perfEnabled)

	// Parse command-line flags
	mode := flag.String("mode", "stdio", "Communication mode: stdio, grpc, or msgpack-uds")
	// Filter out --headless and --test flags before parsing, as they're not recognized by flag package
	filteredArgs := []string{}
	for _, arg := range os.Args[1:] {
		if arg != "--headless" && arg != "--test" {
			filteredArgs = append(filteredArgs, arg)
		}
	}
	flag.CommandLine.Parse(filteredArgs)

	// Run in the specified mode
	switch *mode {
	case "grpc":
		runGrpcMode(testMode)
	case "msgpack-uds":
		runMsgpackUdsMode(testMode)
	case "stdio":
		runStdioMode(testMode)
	default:
		runMsgpackUdsMode(testMode)
	}
}
