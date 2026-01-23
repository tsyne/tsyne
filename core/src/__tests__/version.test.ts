import {
  PROTOCOL_VERSION,
  TSYNE_VERSION,
  BridgeHandshake,
  isCompatibleHandshake,
} from '../version';

describe('Version Module', () => {
  describe('constants', () => {
    it('should have a numeric protocol version', () => {
      expect(typeof PROTOCOL_VERSION).toBe('number');
      expect(PROTOCOL_VERSION).toBeGreaterThan(0);
    });

    it('should have a semver version string', () => {
      expect(typeof TSYNE_VERSION).toBe('string');
      expect(TSYNE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('isCompatibleHandshake', () => {
    it('should return compatible for matching protocol versions', () => {
      const handshake: BridgeHandshake = {
        protocol: PROTOCOL_VERSION,
        bridgeVersion: '0.1.0',
        compatible: true,
      };

      const result = isCompatibleHandshake(handshake);
      expect(result.compatible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return incompatible for mismatched protocol versions', () => {
      const handshake: BridgeHandshake = {
        protocol: PROTOCOL_VERSION + 1, // Higher version
        bridgeVersion: '0.2.0',
        compatible: true,
      };

      const result = isCompatibleHandshake(handshake);
      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('Protocol mismatch');
    });

    it('should return incompatible when bridge reports incompatibility', () => {
      const handshake: BridgeHandshake = {
        protocol: PROTOCOL_VERSION,
        bridgeVersion: '0.1.0',
        compatible: false,
        reason: 'Some bridge-side error',
      };

      const result = isCompatibleHandshake(handshake);
      expect(result.compatible).toBe(false);
      expect(result.reason).toContain('Some bridge-side error');
    });

    it('should accept custom required protocol version', () => {
      const handshake: BridgeHandshake = {
        protocol: 99,
        bridgeVersion: '0.1.0',
        compatible: true,
      };

      // Should be compatible with protocol 99
      const result = isCompatibleHandshake(handshake, 99);
      expect(result.compatible).toBe(true);
    });
  });
});
