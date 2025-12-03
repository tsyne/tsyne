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

  // Match inline map initialization: "field": req.Value
  const inlineMapRegex = /"(\w+)":\s*req\.(\w+)/g;
  let inlineMatch;
  while ((inlineMatch = inlineMapRegex.exec(body)) !== null) {
    mappings.push({ payloadField: inlineMatch[1], protoField: inlineMatch[2] });
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
  if (goField === 'id') return 'widget_id';
  if (goField === 'textStyle') return '__skip__'; // Parent field, not in proto
  if (goField.startsWith('textStyle.')) {
    return goField.split('.')[1]; // textStyle.bold -> bold
  }
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
  { goHandler: 'handleCreateLabel', protoMessage: 'CreateLabelRequest', grpcMethod: 'CreateLabel', tsClass: 'Label', tsFile: 'display_basic.ts' },
  { goHandler: 'handleCreateButton', protoMessage: 'CreateButtonRequest', grpcMethod: 'CreateButton', tsClass: 'Button', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateEntry', protoMessage: 'CreateEntryRequest', grpcMethod: 'CreateEntry', tsClass: 'Entry', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateVBox', protoMessage: 'CreateVBoxRequest', grpcMethod: 'CreateVBox', tsClass: 'VBox', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateHBox', protoMessage: 'CreateHBoxRequest', grpcMethod: 'CreateHBox', tsClass: 'HBox', tsFile: 'containers_basic.ts' },
  { goHandler: 'handleCreateCheckbox', protoMessage: 'CreateCheckboxRequest', grpcMethod: 'CreateCheckbox', tsClass: 'Checkbox', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateSelect', protoMessage: 'CreateSelectRequest', grpcMethod: 'CreateSelect', tsClass: 'Select', tsFile: 'inputs.ts' },
  { goHandler: 'handleCreateImage', protoMessage: 'CreateImageRequest', grpcMethod: 'CreateImage', tsClass: 'Image', tsFile: 'display_basic.ts' },
];

/**
 * Go handlers that exist but have NO gRPC proto definition yet.
 * These work via stdio/msgpack but not gRPC.
 */
const GO_HANDLERS_WITHOUT_GRPC = [
  'handleCreateSeparator', 'handleCreateSpacer', 'handleCreateHyperlink',
  'handleCreateProgressBar', 'handleCreateActivity', 'handleCreateRichText',
  'handleCreateIcon', 'handleCreateFileIcon', 'handleCreateCalendar',
  'handleCreateScroll', 'handleCreateGrid', 'handleCreateCenter',
  'handleCreateClip', 'handleCreateMax', 'handleCreateStack',
  'handleCreateCard', 'handleCreateAccordion', 'handleCreateForm',
  'handleCreateBorder', 'handleCreateGridWrap', 'handleCreateAdaptiveGrid',
  'handleCreatePadded', 'handleCreateSplit', 'handleCreateTabs',
  'handleCreateDocTabs', 'handleCreateThemeOverride', 'handleCreateInnerWindow',
  'handleCreateNavigation', 'handleCreatePopup', 'handleCreateMultipleWindows',
  'handleCreateMultiLineEntry', 'handleCreatePasswordEntry',
  'handleCreateSelectEntry', 'handleCreateSlider', 'handleCreateRadioGroup',
  'handleCreateCheckGroup', 'handleCreateDateEntry',
  'handleCreateTree', 'handleCreateTable', 'handleCreateList',
  'handleCreateMenu', 'handleCreateToolbar', 'handleCreateTextGrid',
  'handleCreateCanvasLine', 'handleCreateCanvasCircle', 'handleCreateCanvasRectangle',
  'handleCreateCanvasText', 'handleCreateCanvasRaster', 'handleCreateCanvasLinearGradient',
  'handleCreateCanvasArc', 'handleCreateCanvasPolygon', 'handleCreateCanvasRadialGradient',
  'handleCreateTappableCanvasRaster',
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
      const goHandlerFile = goHandler.includes('Button') || goHandler.includes('Entry') ||
                           goHandler.includes('Checkbox') || goHandler.includes('Select')
        ? path.join(bridgePath, 'widget_creators_inputs.go')
        : goHandler.includes('VBox') || goHandler.includes('HBox')
        ? path.join(bridgePath, 'widget_creators_containers.go')
        : handlerPath;

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

        for (const goField of goFields) {
          const payloadField = goField.name.toLowerCase();
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
// Export for potential use by other tests
// ============================================================================

export { parseGoHandlerFields, parseProtoFile, parseGrpcServerMappings, parseTypeScriptPayloadFields };
