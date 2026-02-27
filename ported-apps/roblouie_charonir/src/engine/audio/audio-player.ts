// @ts-nocheck
// Audio stubs for Tsyne (no Web Audio API available)
import { EnhancedDOMPoint } from '@/engine/enhanced-dom-point';

// Stub GainNode
function createGainStub() {
  return { gain: { value: 0 }, connect(dest: any) { return dest; } };
}

// Stub AudioBufferSourceNode
function createSourceStub(): any {
  return {
    connect(dest: any) { return dest; },
    start() {},
    stop() {},
    loop: false,
    playbackRate: { value: 1 },
    buffer: null,
  };
}

// Stub AudioContext
export const audioCtx: any = {
  listener: {
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    forwardX: { value: 0 },
    forwardY: { value: -1 },
    forwardZ: { value: 0 },
    upX: { value: 0 },
    upY: { value: 1 },
    upZ: { value: 0 },
  },
  destination: {},
  createGain() { return createGainStub(); },
  createBufferSource() { return createSourceStub(); },
  sampleRate: 44100,
};

// zzfxV - global volume
const zzfxV = .3;

// zzfxR - global sample rate
const zzfxR = 44100;

// zzfxP() - stub sound player -- returns a stub AudioBufferSourceNode
export const zzfxP = (...t: number[][]): any => createSourceStub();

// zzfxG() - stub sound generator -- returns an empty array
export const zzfxG = (p=1,k=.05,b=220,e=0,r=0,t=.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0): number[] => [];

export function createPannerNode(buffer: number[]) {
  return (position: EnhancedDOMPoint) => {
    return createSourceStub();
  };
}

export function createAudioNode(buffer: number[]) {
  return () => {
    return createSourceStub();
  };
}

export function addGap(buffer: number[], seconds: number) {
  return buffer;
}
