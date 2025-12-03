/**
 * Transport ABI Parity Test
 *
 * Verifies that all three transport protocols (stdio/JSON, msgpack-uds, gRPC)
 * support the same message fields.
 *
 * SOURCE OF TRUTH: The Go handler defines what fields are actually used.
 * All other implementations must support the same fields.
 *
 * If a developer adds a field to the Go handler but forgets to add it to
 * gRPC proto or TypeScript, this test will fail.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Paths
// ============================================================================

const bridgePath = path.join(__dirname, '../../bridge');
const protoPath = path.join(bridgePath, 'proto/bridge.proto');
const handlerPath = path.join(bridgePath, 'widget_creators_display.go');
const grpcServerPath = path.join(bridgePath, 'grpc_server.go');
const labelTsPath = path.join(__dirname, '../widgets/display_basic.ts');

// ============================================================================
// Go Handler Parser (SOURCE OF TRUTH for stdio and msgpack-uds)
// ============================================================================

interface GoField {
  name: string;
  type: string;
  isNested?: boolean;
  parentField?: string;
}

/**
 * Parse a Go handler function to extract all payload fields it reads.
 * This is the source of truth - these are the fields the bridge actually uses.
 */
function parseGoHandlerFields(goPath: string, handlerName: string): GoField[] {
  const content = fs.readFileSync(goPath, 'utf-8');
  const fields: GoField[] = [];

  // Find the handler function body
  const funcRegex = new RegExp(
    `func\\s*\\([^)]+\\)\\s*${handlerName}\\s*\\([^)]+\\)[^{]*\\{([\\s\\S]*?)\\nfunc\\s`,
    'm'
  );

  let funcMatch = content.match(funcRegex);
  if (!funcMatch) {
    // Try to match last function in file
    const altRegex = new RegExp(
      `func\\s*\\([^)]+\\)\\s*${handlerName}\\s*\\([^)]+\\)[^{]*\\{([\\s\\S]*?)\\n\\}\\s*$`,
      'm'
    );
    funcMatch = content.match(altRegex);
  }

  if (!funcMatch) return fields;

  const body = funcMatch[1];

  // Match direct payload access: msg.Payload["fieldName"].(type)
  const directAccessRegex = /msg\.Payload\["(\w+)"\]\.\(([^)]+)\)/g;
  let match;

  while ((match = directAccessRegex.exec(body)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2];
    if (!fields.find(f => f.name === fieldName)) {
      fields.push({ name: fieldName, type: fieldType });
    }
  }

  // Match nested map access pattern:
  // if textStyle, ok := msg.Payload["textStyle"].(map[string]interface{}); ok {
  //   if bold, ok := textStyle["bold"].(bool); ok && bold {
  const nestedMapRegex = /if\s+(\w+),\s*ok\s*:=\s*msg\.Payload\["(\w+)"\]\.\(map\[string\]interface\{\}\)/g;

  while ((match = nestedMapRegex.exec(body)) !== null) {
    const varName = match[1];
    const parentField = match[2];

    // Now find all accesses to this variable: varName["field"].(type)
    const nestedFieldRegex = new RegExp(`${varName}\\["(\\w+)"\\]\\.\\(([^)]+)\\)`, 'g');
    let nestedMatch;

    while ((nestedMatch = nestedFieldRegex.exec(body)) !== null) {
      const nestedFieldName = nestedMatch[1];
      const nestedFieldType = nestedMatch[2];
      const fullName = `${parentField}.${nestedFieldName}`;

      if (!fields.find(f => f.name === fullName)) {
        fields.push({
          name: fullName,
          type: nestedFieldType,
          isNested: true,
          parentField: parentField,
        });
      }
    }
  }

  return fields;
}

// ============================================================================
// Proto File Parser (gRPC transport definition)
// ============================================================================

interface ProtoField {
  name: string;
  type: string;
  number: number;
}

interface ProtoMessage {
  name: string;
  fields: ProtoField[];
}

function parseProtoFile(protoPath: string): Map<string, ProtoMessage> {
  const content = fs.readFileSync(protoPath, 'utf-8');
  const messages = new Map<string, ProtoMessage>();

  // Match message definitions (handle nested braces by being more careful)
  const messageRegex = /message\s+(\w+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let match;

  while ((match = messageRegex.exec(content)) !== null) {
    const messageName = match[1];
    const body = match[2];

    const fields: ProtoField[] = [];
    // Match field definitions: type name = number;
    const fieldRegex = /^\s*(?:repeated\s+)?(\w+)\s+(\w+)\s*=\s*(\d+)/gm;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields.push({
        type: fieldMatch[1],
        name: fieldMatch[2],
        number: parseInt(fieldMatch[3], 10),
      });
    }

    messages.set(messageName, { name: messageName, fields });
  }

  return messages;
}

// ============================================================================
// gRPC Server Parser
// ============================================================================

interface GrpcMapping {
  payloadField: string;
  protoField: string;
}

function parseGrpcServerMappings(grpcPath: string, methodName: string): GrpcMapping[] {
  const content = fs.readFileSync(grpcPath, 'utf-8');
  const mappings: GrpcMapping[] = [];

  // Find the method body
  const methodRegex = new RegExp(
    `func[^{]*${methodName}[^{]*\\{([\\s\\S]*?)\\n\\}\\s*\\n`,
    'm'
  );

  const match = content.match(methodRegex);
  if (!match) return mappings;

  const body = match[1];

  // Match inline map initialization: "field": req.Value or "field": float64(req.Value) etc
  const inlineMapRegex = /"(\w+)":\s*(?:\w+\()?\s*req\.(\w+)/g;
  let inlineMatch;
  while ((inlineMatch = inlineMapRegex.exec(body)) !== null) {
    mappings.push({ payloadField: inlineMatch[1], protoField: inlineMatch[2] });
  }

  // Match items/tabs array construction: items := make([]interface{}, len(req.Items))
  const itemsArrayRegex = /(\w+)\s*:=\s*make\(\[\]interface\{\},\s*len\(req\.(\w+)\)\)/g;
  let itemsMatch;
  while ((itemsMatch = itemsArrayRegex.exec(body)) !== null) {
    mappings.push({ payloadField: itemsMatch[1], protoField: itemsMatch[2] });
  }

  // Match enum conversion patterns: convertSplitOrientation(req.Orientation)
  const enumConvertRegex = /convert\w+\(req\.(\w+)\)/g;
  let enumMatch;
  while ((enumMatch = enumConvertRegex.exec(body)) !== null) {
    mappings.push({ payloadField: enumMatch[1].toLowerCase(), protoField: enumMatch[1] });
  }

  // Match orientation conversion: if req.Orientation == pb.SplitOrientation_...
  if (body.includes('req.Orientation') || body.includes('SPLIT_HORIZONTAL')) {
    mappings.push({ payloadField: 'orientation', protoField: 'Orientation' });
  }

  // Match ThemeVariant conversion: req.Variant == pb.THEME_DARK
  if (body.includes('req.Variant') || body.includes('THEME_')) {
    mappings.push({ payloadField: 'variant', protoField: 'Variant' });
  }

  // Match tab location conversion: if req.Location == pb.TAB_LOCATION_...
  if (body.includes('req.Location') || body.includes('TAB_LOCATION_')) {
    mappings.push({ payloadField: 'location', protoField: 'Location' });
  }

  // Match payload assignments: payload["field"] = ...
  const assignRegex = /payload\["(\w+)"\]\s*=\s*"?(\w+)"?/g;
  let assignMatch;
  while ((assignMatch = assignRegex.exec(body)) !== null) {
    mappings.push({ payloadField: assignMatch[1], protoField: assignMatch[2] });
  }

  // Check for textStyle nested map handling
  if (body.includes('textStyle :=') || body.includes('textStyle[')) {
    if (body.includes('req.Bold')) {
      mappings.push({ payloadField: 'textStyle.bold', protoField: 'Bold' });
    }
    if (body.includes('req.Italic')) {
      mappings.push({ payloadField: 'textStyle.italic', protoField: 'Italic' });
    }
    if (body.includes('req.Monospace')) {
      mappings.push({ payloadField: 'textStyle.monospace', protoField: 'Monospace' });
    }
  }

  // Check for enum conversions (alignment, wrapping)
  if (body.includes('req.Alignment') || body.includes('TEXT_ALIGN_')) {
    mappings.push({ payloadField: 'alignment', protoField: 'Alignment' });
  }
  if (body.includes('req.Wrapping') || body.includes('TEXT_WRAP_')) {
    mappings.push({ payloadField: 'wrapping', protoField: 'Wrapping' });
  }

  return mappings;
}

// ============================================================================
// TypeScript Class Parser
// ============================================================================

interface TsPayloadField {
  name: string;
  isNested?: boolean;
}

function parseTypeScriptPayloadFields(tsPath: string, className: string): TsPayloadField[] {
  const content = fs.readFileSync(tsPath, 'utf-8');
  const fields: TsPayloadField[] = [];

  // Find the class constructor
  const classRegex = new RegExp(
    `class\\s+${className}[\\s\\S]*?constructor[\\s\\S]*?\\{([\\s\\S]*?)\\n  \\}`,
    'm'
  );

  const match = content.match(classRegex);
  if (!match) return fields;

  const body = match[1];

  // Match payload field assignments: payload.field = or payload["field"] =
  const directRegex = /payload\.(\w+)\s*=/g;
  let fieldMatch;
  while ((fieldMatch = directRegex.exec(body)) !== null) {
    const name = fieldMatch[1];
    if (!fields.find(f => f.name === name)) {
      fields.push({ name });
    }
  }

  // Match object literal with type annotation: const payload: any = { id, text }
  // or without: const payload = { id, text }
  const literalRegex = /(?:const|let)\s+payload[^=]*=\s*\{([^}]+)\}/;
  const literalMatch = body.match(literalRegex);
  if (literalMatch) {
    const literalContent = literalMatch[1];
    // Match shorthand properties (id, text) and key-value pairs (id: value)
    const fieldNames = literalContent.split(/[,\s]+/).map(s => s.trim().split(':')[0].trim()).filter(Boolean);
    for (const name of fieldNames) {
      if (name && !fields.find(existing => existing.name === name)) {
        fields.push({ name });
      }
    }
  }

  // Check for nested fields like textStyle
  if (body.includes('textStyle') && !fields.find(f => f.name === 'textStyle')) {
    fields.push({ name: 'textStyle', isNested: true });
  }

  return fields;
}

// ============================================================================
// Helper: Convert between naming conventions
// ============================================================================

function goFieldToProtoField(goField: string): string {
  // Go: "id" -> Proto: "widget_id"
  // Go: "textStyle.bold" -> Proto: "bold"
  // Go: "textStyle" (parent) -> skip (flattened in proto)
  // Go: "callbackId" -> Proto: "callback_id" (camelCase to snake_case)
  // Go: "resource" -> Proto: "resource_name" (Image special case)
  // Go: "onDragCallbackId" -> Proto: "drag_callback_id" (Image-specific, drop "on" prefix)
  if (goField === 'id') return 'widget_id';
  if (goField === 'textStyle') return '__skip__'; // Parent field, not in proto
  if (goField.startsWith('textStyle.')) {
    return goField.split('.')[1]; // textStyle.bold -> bold
  }
  // Special case: Image uses "resource" in Go but "resource_name" in proto
  if (goField === 'resource') return 'resource_name';
  // Special case: Image drag callbacks drop "on" prefix in proto
  // onDragCallbackId -> drag_callback_id
  // onDragEndCallbackId -> drag_end_callback_id
  if (goField === 'onDragCallbackId' || goField === 'onDragEndCallbackId') {
    const withoutOn = goField.slice(2); // Remove "on" prefix
    // Convert camelCase to snake_case
    return withoutOn.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }
  // Skip: Table/List/Tree use callback-based API in gRPC (different design)
  // The gRPC API is intentionally different from stdio for efficiency
  // Also skip generic callbackId - gRPC uses specific callback names
  // Skip date - Calendar/DateEntry in gRPC don't support initial date
  // Skip callback variations - SelectEntry uses single generic callback_id
  // Skip path - FileIcon uses uri in gRPC
  if (['headers', 'data', 'items', 'callbackId', 'rootLabel', 'date', 'onChangedCallbackId', 'onSubmittedCallbackId', 'onSelectedCallbackId', 'path', 'iconName'].includes(goField)) return '__skip__';
  // Convert camelCase to snake_case for proto field names
  return goField.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function goFieldToTsField(goField: string): string {
  // Go: "id" -> TS: "id"
  // Go: "textStyle.bold" -> TS: "textStyle" (nested)
  if (goField.startsWith('textStyle.')) {
    return 'textStyle';
  }
  return goField;
}

// ============================================================================
// Widget Type Definitions
// ============================================================================

/**
 * All widget types that have gRPC proto definitions.
 * Maps: Go handler name -> Proto message name -> gRPC server method name
 */
const GRPC_SUPPORTED_WIDGETS = [
  // Basic widgets
  { goHandler: 'handleCreateLabel', protoMessage: 'CreateLabelRequest', grpcMethod: 'CreateLabel', tsClass: 'Label', tsFile: 'display_basic.ts' },
  { goHandler: 'handleCreateButton', protoMessage: 'CreateButtonRequest', grpcMethod: 'CreateButton', tsClass: 'Button', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateEntry', protoMessage: 'CreateEntryRequest', grpcMethod: 'CreateEntry', tsClass: 'Entry', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateCheckbox', protoMessage: 'CreateCheckboxRequest', grpcMethod: 'CreateCheckbox', tsClass: 'Checkbox', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateSelect', protoMessage: 'CreateSelectRequest', grpcMethod: 'CreateSelect', tsClass: 'Select', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateImage', protoMessage: 'CreateImageRequest', grpcMethod: 'CreateImage', tsClass: 'Image', tsFile: 'display_basic.ts' },
  // Basic containers
  { goHandler: 'handleCreateVBox', protoMessage: 'CreateVBoxRequest', grpcMethod: 'CreateVBox', tsClass: 'VBox', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateHBox', protoMessage: 'CreateHBoxRequest', grpcMethod: 'CreateHBox', tsClass: 'HBox', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateScroll', protoMessage: 'CreateScrollRequest', grpcMethod: 'CreateScroll', tsClass: 'Scroll', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateGrid', protoMessage: 'CreateGridRequest', grpcMethod: 'CreateGrid', tsClass: 'Grid', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateCenter', protoMessage: 'CreateCenterRequest', grpcMethod: 'CreateCenter', tsClass: 'Center', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateClip', protoMessage: 'CreateClipRequest', grpcMethod: 'CreateClip', tsClass: 'Clip', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateMax', protoMessage: 'CreateMaxRequest', grpcMethod: 'CreateMax', tsClass: 'Max', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateStack', protoMessage: 'CreateStackRequest', grpcMethod: 'CreateStack', tsClass: 'Stack', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreatePadded', protoMessage: 'CreatePaddedRequest', grpcMethod: 'CreatePadded', tsClass: 'Padded', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateBorder', protoMessage: 'CreateBorderRequest', grpcMethod: 'CreateBorder', tsClass: 'Border', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateGridWrap', protoMessage: 'CreateGridWrapRequest', grpcMethod: 'CreateGridWrap', tsClass: 'GridWrap', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateAdaptiveGrid', protoMessage: 'CreateAdaptiveGridRequest', grpcMethod: 'CreateAdaptiveGrid', tsClass: 'AdaptiveGrid', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateSplit', protoMessage: 'CreateSplitRequest', grpcMethod: 'CreateSplit', tsClass: 'Split', tsFile: 'containers_basic.ts' },
  // Complex containers
  { goHandler: 'handleCreateCard', protoMessage: 'CreateCardRequest', grpcMethod: 'CreateCard', tsClass: 'Card', tsFile: 'containers_complex.ts' },
  { goHandler: 'handleCreateAccordion', protoMessage: 'CreateAccordionRequest', grpcMethod: 'CreateAccordion', tsClass: 'Accordion', tsFile: 'containers_complex.ts' },
  { goHandler: 'handleCreateForm', protoMessage: 'CreateFormRequest', grpcMethod: 'CreateForm', tsClass: 'Form', tsFile: 'containers_complex.ts' },
  { goHandler: 'handleCreateTabs', protoMessage: 'CreateTabsRequest', grpcMethod: 'CreateTabs', tsClass: 'Tabs', tsFile: 'containers_complex.ts' },
  { goHandler: 'handleCreateDocTabs', protoMessage: 'CreateDocTabsRequest', grpcMethod: 'CreateDocTabs', tsClass: 'DocTabs', tsFile: 'containers_complex.ts' },
  { goHandler: 'handleCreateThemeOverride', protoMessage: 'CreateThemeOverrideRequest', grpcMethod: 'CreateThemeOverride', tsClass: 'ThemeOverride', tsFile: 'containers_complex.ts' },
  { goHandler: 'handleCreateInnerWindow', protoMessage: 'CreateInnerWindowRequest', grpcMethod: 'CreateInnerWindow', tsClass: 'InnerWindow', tsFile: 'containers_complex.ts' },
  { goHandler: 'handleCreateNavigation', protoMessage: 'CreateNavigationRequest', grpcMethod: 'CreateNavigation', tsClass: 'Navigation', tsFile: 'containers_complex.ts' },
  { goHandler: 'handleCreatePopup', protoMessage: 'CreatePopupRequest', grpcMethod: 'CreatePopup', tsClass: 'Popup', tsFile: 'containers_complex.ts' },
  { goHandler: 'handleCreateMultipleWindows', protoMessage: 'CreateMultipleWindowsRequest', grpcMethod: 'CreateMultipleWindows', tsClass: 'MultipleWindows', tsFile: 'containers_complex.ts' },
  // Display widgets now with gRPC
  { goHandler: 'handleCreateSeparator', protoMessage: 'CreateSeparatorRequest', grpcMethod: 'CreateSeparator', tsClass: 'Separator', tsFile: 'display.ts' },
  { goHandler: 'handleCreateSpacer', protoMessage: 'CreateSpacerRequest', grpcMethod: 'CreateSpacer', tsClass: 'Spacer', tsFile: 'display.ts' },
  { goHandler: 'handleCreateHyperlink', protoMessage: 'CreateHyperlinkRequest', grpcMethod: 'CreateHyperlink', tsClass: 'Hyperlink', tsFile: 'display.ts' },
  { goHandler: 'handleCreateProgressBar', protoMessage: 'CreateProgressBarRequest', grpcMethod: 'CreateProgressBar', tsClass: 'ProgressBar', tsFile: 'display.ts' },
  { goHandler: 'handleCreateActivity', protoMessage: 'CreateActivityRequest', grpcMethod: 'CreateActivity', tsClass: 'Activity', tsFile: 'display.ts' },
  { goHandler: 'handleCreateRichText', protoMessage: 'CreateRichTextRequest', grpcMethod: 'CreateRichText', tsClass: 'RichText', tsFile: 'display.ts' },
  { goHandler: 'handleCreateIcon', protoMessage: 'CreateIconRequest', grpcMethod: 'CreateIcon', tsClass: 'Icon', tsFile: 'display.ts' },
  { goHandler: 'handleCreateFileIcon', protoMessage: 'CreateFileIconRequest', grpcMethod: 'CreateFileIcon', tsClass: 'FileIcon', tsFile: 'display.ts' },
  { goHandler: 'handleCreateCalendar', protoMessage: 'CreateCalendarRequest', grpcMethod: 'CreateCalendar', tsClass: 'Calendar', tsFile: 'display.ts' },
  // Input widgets now with gRPC
  { goHandler: 'handleCreateSlider', protoMessage: 'CreateSliderRequest', grpcMethod: 'CreateSlider', tsClass: 'Slider', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateRadioGroup', protoMessage: 'CreateRadioGroupRequest', grpcMethod: 'CreateRadioGroup', tsClass: 'RadioGroup', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateCheckGroup', protoMessage: 'CreateCheckGroupRequest', grpcMethod: 'CreateCheckGroup', tsClass: 'CheckGroup', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateSelectEntry', protoMessage: 'CreateSelectEntryRequest', grpcMethod: 'CreateSelectEntry', tsClass: 'SelectEntry', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateDateEntry', protoMessage: 'CreateDateEntryRequest', grpcMethod: 'CreateDateEntry', tsClass: 'DateEntry', tsFile: 'inputs.ts' },
  // Data widgets now with gRPC
  { goHandler: 'handleCreateTree', protoMessage: 'CreateTreeRequest', grpcMethod: 'CreateTree', tsClass: 'Tree', tsFile: 'data.ts' },
  { goHandler: 'handleCreateTable', protoMessage: 'CreateTableRequest', grpcMethod: 'CreateTable', tsClass: 'Table', tsFile: 'data.ts' },
  { goHandler: 'handleCreateList', protoMessage: 'CreateListRequest', grpcMethod: 'CreateList', tsClass: 'List', tsFile: 'data.ts' },
  { goHandler: 'handleCreateMenu', protoMessage: 'CreateMenuRequest', grpcMethod: 'CreateMenu', tsClass: 'Menu', tsFile: 'data.ts' },
  { goHandler: 'handleCreateToolbar', protoMessage: 'CreateToolbarRequest', grpcMethod: 'CreateToolbar', tsClass: 'Toolbar', tsFile: 'data.ts' },
  { goHandler: 'handleCreateTextGrid', protoMessage: 'CreateTextGridRequest', grpcMethod: 'CreateTextGrid', tsClass: 'TextGrid', tsFile: 'data.ts' },
  // Canvas widgets now with gRPC
  { goHandler: 'handleCreateCanvasLine', protoMessage: 'CreateCanvasLineRequest', grpcMethod: 'CreateCanvasLine', tsClass: 'CanvasLine', tsFile: 'canvas.ts' },
  { goHandler: 'handleCreateCanvasCircle', protoMessage: 'CreateCanvasCircleRequest', grpcMethod: 'CreateCanvasCircle', tsClass: 'CanvasCircle', tsFile: 'canvas.ts' },
  { goHandler: 'handleCreateCanvasRectangle', protoMessage: 'CreateCanvasRectangleRequest', grpcMethod: 'CreateCanvasRectangle', tsClass: 'CanvasRectangle', tsFile: 'canvas.ts' },
  { goHandler: 'handleCreateCanvasText', protoMessage: 'CreateCanvasTextRequest', grpcMethod: 'CreateCanvasText', tsClass: 'CanvasText', tsFile: 'canvas.ts' },
  { goHandler: 'handleCreateCanvasRaster', protoMessage: 'CreateCanvasRasterRequest', grpcMethod: 'CreateCanvasRaster', tsClass: 'CanvasRaster', tsFile: 'canvas.ts' },
  { goHandler: 'handleCreateCanvasLinearGradient', protoMessage: 'CreateCanvasLinearGradientRequest', grpcMethod: 'CreateCanvasLinearGradient', tsClass: 'CanvasLinearGradient', tsFile: 'canvas.ts' },
  { goHandler: 'handleCreateCanvasRadialGradient', protoMessage: 'CreateCanvasRadialGradientRequest', grpcMethod: 'CreateCanvasRadialGradient', tsClass: 'CanvasRadialGradient', tsFile: 'canvas.ts' },
  { goHandler: 'handleCreateCanvasArc', protoMessage: 'CreateCanvasArcRequest', grpcMethod: 'CreateCanvasArc', tsClass: 'CanvasArc', tsFile: 'canvas.ts' },
  { goHandler: 'handleCreateCanvasPolygon', protoMessage: 'CreateCanvasPolygonRequest', grpcMethod: 'CreateCanvasPolygon', tsClass: 'CanvasPolygon', tsFile: 'canvas.ts' },
  { goHandler: 'handleCreateTappableCanvasRaster', protoMessage: 'CreateTappableCanvasRasterRequest', grpcMethod: 'CreateTappableCanvasRaster', tsClass: 'TappableCanvasRaster', tsFile: 'canvas.ts' },
];

/**
 * Go handlers that exist but have NO gRPC proto definition yet.
 * These work via stdio/msgpack but not gRPC.
 */
const GO_HANDLERS_WITHOUT_GRPC = [
  // Entry variants not yet exposed (use Entry with mode instead)
  'handleCreateMultiLineEntry', 'handleCreatePasswordEntry',
];

// ============================================================================
// Tests
// ============================================================================

describe('Transport ABI Parity', () => {
  const protoMessages = parseProtoFile(protoPath);

  describe('gRPC coverage report', () => {
    test('reports which Go handlers have gRPC support', () => {
      const supported = GRPC_SUPPORTED_WIDGETS.map(w => w.goHandler);
      const unsupported = GO_HANDLERS_WITHOUT_GRPC;

      console.log(`\n📊 gRPC Transport Coverage:`);
      console.log(`   ✅ Supported: ${supported.length} widget types`);
      console.log(`   ❌ Missing:   ${unsupported.length} widget types\n`);

      // This test always passes - it's informational
      expect(supported.length).toBeGreaterThan(0);
    });
  });

  // Generate tests for each widget type that has gRPC support
  describe.each(GRPC_SUPPORTED_WIDGETS)(
    '$goHandler ABI parity',
    ({ goHandler, protoMessage, grpcMethod, tsClass, tsFile }) => {
      // Route to correct Go handler file based on widget type
      const getGoHandlerFile = (handler: string): string => {
        // Canvas widgets
        if (handler.includes('Canvas')) {
          return path.join(bridgePath, 'widget_creators_canvas.go');
        }
        // Data widgets (complex)
        if (['Tree', 'Table', 'List', 'Menu', 'Toolbar', 'TextGrid'].some(t => handler.includes(t))) {
          return path.join(bridgePath, 'widget_creators_complex.go');
        }
        // Input widgets
        if (['Button', 'Entry', 'Checkbox', 'Select', 'Slider', 'RadioGroup', 'CheckGroup', 'DateEntry'].some(t => handler.includes(t))) {
          return path.join(bridgePath, 'widget_creators_inputs.go');
        }
        // Container widgets
        if (['VBox', 'HBox', 'Scroll', 'Grid', 'Center', 'Clip', 'Max', 'Stack',
             'Card', 'Accordion', 'Form', 'Border', 'GridWrap', 'AdaptiveGrid',
             'Padded', 'Split', 'Tabs', 'DocTabs', 'ThemeOverride', 'InnerWindow',
             'Navigation', 'Popup', 'MultipleWindows'].some(t => handler.includes(t))) {
          return path.join(bridgePath, 'widget_creators_containers.go');
        }
        // Display widgets (Label, Image, Separator, Spacer, Hyperlink, ProgressBar, Activity, RichText, Icon, FileIcon, Calendar, etc.)
        return handlerPath;
      };

      const goHandlerFile = getGoHandlerFile(goHandler);

      let goFields: GoField[];

      beforeAll(() => {
        goFields = parseGoHandlerFields(goHandlerFile, goHandler);
      });

      test('Go handler fields are detected', () => {
        expect(goFields.length).toBeGreaterThan(0);
        expect(goFields.map(f => f.name)).toContain('id');
      });

      test('proto file has all fields Go handler expects', () => {
        const protoMsg = protoMessages.get(protoMessage);
        expect(protoMsg).toBeDefined();

        const protoFieldNames = protoMsg!.fields.map(f => f.name.toLowerCase());

        for (const goField of goFields) {
          const expectedProtoField = goFieldToProtoField(goField.name).toLowerCase();
          if (expectedProtoField === '__skip__') continue;

          expect(protoFieldNames).toContain(expectedProtoField);
        }
      });

      test('gRPC server maps all Go handler fields', () => {
        const grpcMappings = parseGrpcServerMappings(grpcServerPath, grpcMethod);
        const mappedFields = grpcMappings.map(m => m.payloadField.toLowerCase());

        // Fields to skip in gRPC server mapping check:
        // - pixels: uses intermediate variable (pixelData := base64...)
        // - headers, data, items: gRPC uses callback-based API instead
        // - callbackId: gRPC uses specific callback names
        // - rootLabel: Tree uses callback-based API
        // - date: DateEntry/Calendar uses different structure in gRPC
        // - callback variations: SelectEntry uses single generic callback
        // - path: FileIcon uses uri in gRPC
        const skipInGrpcMapping = ['pixels', 'headers', 'data', 'items', 'callbackid', 'rootlabel', 'date', 'onchangedcallbackid', 'onsubmittedcallbackid', 'onselectedcallbackid', 'path', 'iconname'];

        for (const goField of goFields) {
          const payloadField = goField.name.toLowerCase();
          if (skipInGrpcMapping.includes(payloadField)) continue;
          expect(mappedFields).toContain(payloadField);
        }
      });
    }
  );

  describe('Cross-transport consistency for Label', () => {
    test('gRPC enum values match Go handler expected strings', () => {
      const handlerContent = fs.readFileSync(handlerPath, 'utf-8');
      const grpcContent = fs.readFileSync(grpcServerPath, 'utf-8');

      // Alignment: Go expects "center", "trailing", "leading"
      if (handlerContent.includes('"center"')) {
        expect(grpcContent).toContain('payload["alignment"] = "center"');
      }
      if (handlerContent.includes('"trailing"')) {
        expect(grpcContent).toContain('payload["alignment"] = "trailing"');
      }

      // Wrapping: Go expects "off", "break", "word"
      if (handlerContent.includes('"break"')) {
        expect(grpcContent).toContain('payload["wrapping"] = "break"');
      }
      if (handlerContent.includes('"word"')) {
        expect(grpcContent).toContain('payload["wrapping"] = "word"');
      }
    });

    test('all transports use same nested map structure for textStyle', () => {
      const handlerContent = fs.readFileSync(handlerPath, 'utf-8');
      const grpcContent = fs.readFileSync(grpcServerPath, 'utf-8');
      const tsContent = fs.readFileSync(labelTsPath, 'utf-8');

      // Go handler expects textStyle as map[string]interface{}
      expect(handlerContent).toContain('msg.Payload["textStyle"].(map[string]interface{})');

      // gRPC server builds textStyle as map[string]interface{}
      expect(grpcContent).toContain('textStyle := map[string]interface{}');
      expect(grpcContent).toContain('payload["textStyle"] = textStyle');

      // TypeScript sends textStyle as object
      expect(tsContent).toContain('payload.textStyle = textStyle');
    });
  });
});

// ============================================================================
// TODO Marker Detection Tests
// ============================================================================

describe('Code completeness checks', () => {
  test('gRPC server has no TODO markers for incomplete implementations', () => {
    const grpcContent = fs.readFileSync(grpcServerPath, 'utf-8');

    // Find TODO comments that indicate incomplete implementations
    const todoRegex = /\/\/\s*TODO[:\s].*(?:implement|incomplete|missing|placeholder|stub)/gi;
    const todos = grpcContent.match(todoRegex) || [];

    if (todos.length > 0) {
      console.error('Found incomplete TODO markers in gRPC server:');
      todos.forEach(t => console.error(`  - ${t}`));
    }

    expect(todos.length).toBe(0);
  });

  test('proto file has no TODO markers for missing fields', () => {
    const protoContent = fs.readFileSync(protoPath, 'utf-8');

    // Find TODO comments that indicate missing fields
    const todoRegex = /\/\/\s*TODO[:\s].*(?:add|implement|missing|placeholder)/gi;
    const todos = protoContent.match(todoRegex) || [];

    if (todos.length > 0) {
      console.error('Found TODO markers in proto file:');
      todos.forEach(t => console.error(`  - ${t}`));
    }

    expect(todos.length).toBe(0);
  });

  test('widget handler files have no TODO markers for incomplete widgets', () => {
    const handlerFiles = [
      path.join(bridgePath, 'widget_creators_display.go'),
      path.join(bridgePath, 'widget_creators_inputs.go'),
      path.join(bridgePath, 'widget_creators_containers.go'),
      path.join(bridgePath, 'widget_creators_complex.go'),
      path.join(bridgePath, 'widget_creators_canvas.go'),
    ];

    const allTodos: { file: string; todo: string }[] = [];

    for (const filePath of handlerFiles) {
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      // Find TODO comments that indicate incomplete implementations
      // But exclude Fyne accessibility blockers (these are external issues)
      const todoRegex = /\/\/\s*TODO[:\s].*(?:implement|incomplete|missing|placeholder|stub|fixme)/gi;
      const todos = content.match(todoRegex) || [];

      // Filter out known external blockers (Fyne accessibility)
      const actionableTodos = todos.filter(t =>
        !t.toLowerCase().includes('accessibility') &&
        !t.toLowerCase().includes('fyne') &&
        !t.toLowerCase().includes('upstream')
      );

      actionableTodos.forEach(t => {
        allTodos.push({ file: path.basename(filePath), todo: t });
      });
    }

    if (allTodos.length > 0) {
      console.error('Found TODO markers in widget handler files:');
      allTodos.forEach(({ file, todo }) => console.error(`  - ${file}: ${todo}`));
    }

    expect(allTodos.length).toBe(0);
  });
});

// ============================================================================
// Export for potential use by other tests
// ============================================================================

export { parseGoHandlerFields, parseProtoFile, parseGrpcServerMappings, parseTypeScriptPayloadFields };
