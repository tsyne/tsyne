/**
 * Unit tests for MessagePack protocol encoding/decoding
 * These tests verify the protocol layer without requiring the full bridge.
 */

import { encode, decode } from '@msgpack/msgpack';

interface MsgpackMessage {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}

interface MsgpackResponse {
  id: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

interface MsgpackEvent {
  type: string;
  widgetId: string;
  data?: Record<string, unknown>;
}

describe('MessagePack Protocol Unit Tests', () => {
  describe('Message Encoding', () => {
    it('should encode and decode a simple message', () => {
      const msg: MsgpackMessage = {
        id: 'test_1',
        type: 'createLabel',
        payload: {
          id: 'label_1',
          text: 'Hello World',
        },
      };

      const encoded = encode(msg);
      const decoded = decode(encoded) as MsgpackMessage;

      expect(decoded.id).toBe(msg.id);
      expect(decoded.type).toBe(msg.type);
      expect(decoded.payload.text).toBe(msg.payload.text);
    });

    it('should encode and decode a message with nested objects', () => {
      const msg: MsgpackMessage = {
        id: 'test_2',
        type: 'createWindow',
        payload: {
          id: 'window_1',
          title: 'Test Window',
          size: { width: 800, height: 600 },
          options: { resizable: true, centered: true },
        },
      };

      const encoded = encode(msg);
      const decoded = decode(encoded) as MsgpackMessage;

      expect(decoded.payload.size).toEqual({ width: 800, height: 600 });
      expect(decoded.payload.options).toEqual({ resizable: true, centered: true });
    });

    it('should encode and decode a message with arrays', () => {
      const msg: MsgpackMessage = {
        id: 'test_3',
        type: 'createSelect',
        payload: {
          id: 'select_1',
          options: ['Option A', 'Option B', 'Option C'],
          selected: 0,
        },
      };

      const encoded = encode(msg);
      const decoded = decode(encoded) as MsgpackMessage;

      expect(decoded.payload.options).toEqual(['Option A', 'Option B', 'Option C']);
    });
  });

  describe('Response Encoding', () => {
    it('should encode and decode a success response', () => {
      const resp: MsgpackResponse = {
        id: 'test_1',
        success: true,
        result: {
          widgetId: 'widget_123',
        },
      };

      const encoded = encode(resp);
      const decoded = decode(encoded) as MsgpackResponse;

      expect(decoded.id).toBe(resp.id);
      expect(decoded.success).toBe(true);
      expect(decoded.result?.widgetId).toBe('widget_123');
    });

    it('should encode and decode an error response', () => {
      const resp: MsgpackResponse = {
        id: 'test_2',
        success: false,
        error: 'Widget not found',
      };

      const encoded = encode(resp);
      const decoded = decode(encoded) as MsgpackResponse;

      expect(decoded.success).toBe(false);
      expect(decoded.error).toBe('Widget not found');
    });
  });

  describe('Event Encoding', () => {
    it('should encode and decode a click event', () => {
      const event: MsgpackEvent = {
        type: 'clicked',
        widgetId: 'button_1',
        data: {
          x: 100,
          y: 200,
        },
      };

      const encoded = encode(event);
      const decoded = decode(encoded) as MsgpackEvent;

      expect(decoded.type).toBe('clicked');
      expect(decoded.widgetId).toBe('button_1');
      expect(decoded.data?.x).toBe(100);
      expect(decoded.data?.y).toBe(200);
    });

    it('should encode and decode an event without data', () => {
      const event: MsgpackEvent = {
        type: 'closed',
        widgetId: 'window_1',
      };

      const encoded = encode(event);
      const decoded = decode(encoded) as MsgpackEvent;

      expect(decoded.type).toBe('closed');
      expect(decoded.widgetId).toBe('window_1');
      expect(decoded.data).toBeUndefined();
    });
  });

  describe('Length-Prefixed Framing', () => {
    it('should create correct length-prefixed frame', () => {
      const msg: MsgpackMessage = {
        id: 'frame_test',
        type: 'ping',
        payload: {},
      };

      // Encode message
      const msgBuf = Buffer.from(encode(msg));

      // Create frame: [4-byte length BE][message]
      const frame = Buffer.alloc(4 + msgBuf.length);
      frame.writeUInt32BE(msgBuf.length, 0);
      msgBuf.copy(frame, 4);

      // Verify frame structure
      expect(frame.readUInt32BE(0)).toBe(msgBuf.length);

      // Extract and decode message from frame
      const extractedLength = frame.readUInt32BE(0);
      const extractedMsg = frame.slice(4, 4 + extractedLength);
      const decoded = decode(extractedMsg) as MsgpackMessage;

      expect(decoded.id).toBe('frame_test');
    });

    it('should handle multiple messages in sequence', () => {
      const messages: MsgpackMessage[] = [
        { id: 'msg_1', type: 'type1', payload: { a: 1 } },
        { id: 'msg_2', type: 'type2', payload: { b: 2 } },
        { id: 'msg_3', type: 'type3', payload: { c: 3 } },
      ];

      // Create combined buffer with all framed messages
      const frames: Buffer[] = messages.map((msg) => {
        const msgBuf = Buffer.from(encode(msg));
        const frame = Buffer.alloc(4 + msgBuf.length);
        frame.writeUInt32BE(msgBuf.length, 0);
        msgBuf.copy(frame, 4);
        return frame;
      });

      const combined = Buffer.concat(frames);

      // Parse messages back out
      let offset = 0;
      const decoded: MsgpackMessage[] = [];

      while (offset < combined.length) {
        const length = combined.readUInt32BE(offset);
        const msgBuf = combined.slice(offset + 4, offset + 4 + length);
        decoded.push(decode(msgBuf) as MsgpackMessage);
        offset += 4 + length;
      }

      expect(decoded.length).toBe(3);
      expect(decoded[0].id).toBe('msg_1');
      expect(decoded[1].id).toBe('msg_2');
      expect(decoded[2].id).toBe('msg_3');
    });
  });

  describe('Encoding Size Comparison', () => {
    it('should produce smaller output than JSON for typical messages', () => {
      const msg: MsgpackMessage = {
        id: 'size_test',
        type: 'createWindow',
        payload: {
          id: 'window_1',
          title: 'My Application Window',
          width: 1024,
          height: 768,
          resizable: true,
          centered: true,
        },
      };

      const msgpackSize = encode(msg).byteLength;
      const jsonSize = Buffer.from(JSON.stringify(msg)).length;

      // MessagePack should be smaller
      expect(msgpackSize).toBeLessThan(jsonSize);

      // Log sizes for visibility
// console.log(`MessagePack: ${msgpackSize} bytes, JSON: ${jsonSize} bytes`);
// console.log(`Savings: ${((1 - msgpackSize / jsonSize) * 100).toFixed(1)}%`);
    });
  });

  describe('Special Values', () => {
    it('should handle null values', () => {
      const msg: MsgpackMessage = {
        id: 'null_test',
        type: 'test',
        payload: {
          value: null,
          nested: { inner: null },
        },
      };

      const encoded = encode(msg);
      const decoded = decode(encoded) as MsgpackMessage;

      expect(decoded.payload.value).toBeNull();
    });

    it('should handle boolean values', () => {
      const msg: MsgpackMessage = {
        id: 'bool_test',
        type: 'test',
        payload: {
          enabled: true,
          disabled: false,
        },
      };

      const encoded = encode(msg);
      const decoded = decode(encoded) as MsgpackMessage;

      expect(decoded.payload.enabled).toBe(true);
      expect(decoded.payload.disabled).toBe(false);
    });

    it('should handle unicode strings', () => {
      const msg: MsgpackMessage = {
        id: 'unicode_test',
        type: 'createLabel',
        payload: {
          text: '你好世界 🌍 مرحبا',
        },
      };

      const encoded = encode(msg);
      const decoded = decode(encoded) as MsgpackMessage;

      expect(decoded.payload.text).toBe('你好世界 🌍 مرحبا');
    });

    it('should handle large numbers', () => {
      const msg: MsgpackMessage = {
        id: 'number_test',
        type: 'test',
        payload: {
          small: 42,
          large: 9007199254740991, // Number.MAX_SAFE_INTEGER
          float: 3.14159265359,
          negative: -1000000,
        },
      };

      const encoded = encode(msg);
      const decoded = decode(encoded) as MsgpackMessage;

      expect(decoded.payload.small).toBe(42);
      expect(decoded.payload.large).toBe(9007199254740991);
      expect(decoded.payload.float).toBeCloseTo(3.14159265359);
      expect(decoded.payload.negative).toBe(-1000000);
    });
  });

  describe('Performance', () => {
    it('should encode 1000 messages quickly', () => {
      const msg: MsgpackMessage = {
        id: 'perf_test',
        type: 'createLabel',
        payload: { id: 'label_1', text: 'Performance test' },
      };

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        encode(msg);
      }
      const elapsed = performance.now() - start;

// console.log(`Encoded 1000 messages in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(200); // Should be well under 200ms (allow CI variance)
    });

    it('should decode 1000 messages quickly', () => {
      const msg: MsgpackMessage = {
        id: 'perf_test',
        type: 'createLabel',
        payload: { id: 'label_1', text: 'Performance test' },
      };
      const encoded = encode(msg);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        decode(encoded);
      }
      const elapsed = performance.now() - start;

// console.log(`Decoded 1000 messages in ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(100);
    });

    it('should roundtrip 1000 messages quickly', () => {
      const msg: MsgpackMessage = {
        id: 'perf_test',
        type: 'createLabel',
        payload: { id: 'label_1', text: 'Performance test' },
      };

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        const encoded = encode(msg);
        decode(encoded);
      }
      const elapsed = performance.now() - start;

// console.log(`Roundtripped 1000 messages in ${elapsed.toFixed(2)}ms`);
// console.log(`Average: ${(elapsed / 1000).toFixed(3)}ms per roundtrip`);
      expect(elapsed).toBeLessThan(200);
    });
  });
});
