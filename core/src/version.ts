/**
 * Tsyne Version Constants
 *
 * These values are used for version negotiation between TypeScript and Go bridge.
 */

/**
 * Protocol version for TS↔Go bridge communication.
 * Increment when making breaking changes to the message format.
 */
export const PROTOCOL_VERSION = 1;

/**
 * Tsyne package version (matches package.json)
 */
export const TSYNE_VERSION = '0.1.0';

/**
 * Handshake response from the bridge
 */
export interface BridgeHandshake {
  /** Protocol version supported by the bridge */
  protocol: number;
  /** Bridge version string */
  bridgeVersion: string;
  /** Whether the bridge considers itself compatible with the TS side */
  compatible: boolean;
  /** Reason for incompatibility (if compatible is false) */
  reason?: string;
}

/**
 * Check if a bridge handshake indicates compatibility
 */
export function isCompatibleHandshake(
  handshake: BridgeHandshake,
  requiredProtocol: number = PROTOCOL_VERSION
): { compatible: boolean; reason?: string } {
  if (handshake.protocol !== requiredProtocol) {
    return {
      compatible: false,
      reason: `Protocol mismatch: bridge has protocol ${handshake.protocol}, TypeScript requires ${requiredProtocol}`,
    };
  }

  if (!handshake.compatible) {
    return {
      compatible: false,
      reason: handshake.reason || 'Bridge reported incompatibility',
    };
  }

  return { compatible: true };
}
