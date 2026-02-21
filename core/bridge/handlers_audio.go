package main

// Audio subsystem for Tsyne bridge.
// API design based on Three.js audio classes (Audio, AudioListener, AudioAnalyser).
// MIT License — Copyright © 2010-2026 three.js authors
// https://github.com/mrdoob/three.js/blob/dev/LICENSE

import (
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/hajimehoshi/go-mp3"
	"github.com/hajimehoshi/oto/v2"
)

// audioManager manages all audio instances and the shared oto context
type audioManager struct {
	mu           sync.Mutex
	otoCtx       *oto.Context
	listeners    map[string]*audioListenerState
	instances    map[string]*audioInstance
	masterVolume float64
	initialized  bool
}

type audioListenerState struct {
	masterVolume float64
}

type audioInstance struct {
	filePath     string
	volume       float64
	loop         bool
	playbackRate float64
	isPlaying    bool
	player       oto.Player        // oto.Player is an interface in v2
	file         *os.File          // keep open for player lifetime
	decoder      *mp3.Decoder
	stopChan     chan struct{}      // signal to stop playback goroutine
}

var globalAudioManager = &audioManager{
	listeners:    make(map[string]*audioListenerState),
	instances:    make(map[string]*audioInstance),
	masterVolume: 1.0,
}

// ensureOtoContext initializes the oto audio context lazily (on first play)
func (am *audioManager) ensureOtoContext(sampleRate int, channelCount int) error {
	if am.initialized {
		return nil
	}
	// oto/v2 NewContext: sampleRate, channelCount, bitDepthInBytes
	ctx, ready, err := oto.NewContext(sampleRate, channelCount, 2)
	if err != nil {
		return fmt.Errorf("failed to create audio context: %w", err)
	}
	<-ready
	am.otoCtx = ctx
	am.initialized = true
	return nil
}

// handleAudioCreateListener creates an audio listener
func (b *Bridge) handleAudioCreateListener(msg Message) Response {
	listenerId, _ := msg.Payload["listenerId"].(string)
	if listenerId == "" {
		return Response{ID: msg.ID, Success: false, Error: "missing listenerId"}
	}

	globalAudioManager.mu.Lock()
	globalAudioManager.listeners[listenerId] = &audioListenerState{masterVolume: 1.0}
	globalAudioManager.mu.Unlock()

	return Response{ID: msg.ID, Success: true}
}

// handleAudioSetMasterVolume sets the master volume for a listener
func (b *Bridge) handleAudioSetMasterVolume(msg Message) Response {
	listenerId, _ := msg.Payload["listenerId"].(string)
	volume := audioGetFloat64(msg.Payload, "volume", 1.0)

	globalAudioManager.mu.Lock()
	if listener, ok := globalAudioManager.listeners[listenerId]; ok {
		listener.masterVolume = volume
		globalAudioManager.masterVolume = volume
	}
	globalAudioManager.mu.Unlock()

	return Response{ID: msg.ID, Success: true}
}

// handleAudioLoad validates and registers an audio file
func (b *Bridge) handleAudioLoad(msg Message) Response {
	audioId, _ := msg.Payload["audioId"].(string)
	filePath, _ := msg.Payload["filePath"].(string)

	if audioId == "" || filePath == "" {
		return Response{ID: msg.ID, Success: false, Error: "missing audioId or filePath"}
	}

	// Validate file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return Response{ID: msg.ID, Success: false, Error: fmt.Sprintf("file not found: %s", filePath)}
	}

	globalAudioManager.mu.Lock()
	// Clean up existing instance if any
	if existing, ok := globalAudioManager.instances[audioId]; ok {
		stopInstance(existing)
	}
	globalAudioManager.instances[audioId] = &audioInstance{
		filePath:     filePath,
		volume:       1.0,
		loop:         false,
		playbackRate: 1.0,
	}
	globalAudioManager.mu.Unlock()

	return Response{ID: msg.ID, Success: true}
}

// handleAudioPlay starts playback of a loaded audio file
func (b *Bridge) handleAudioPlay(msg Message) Response {
	audioId, _ := msg.Payload["audioId"].(string)
	delay := audioGetFloat64(msg.Payload, "delay", 0)

	globalAudioManager.mu.Lock()
	inst, ok := globalAudioManager.instances[audioId]
	if !ok {
		globalAudioManager.mu.Unlock()
		return Response{ID: msg.ID, Success: false, Error: fmt.Sprintf("audio not loaded: %s", audioId)}
	}

	if inst.isPlaying {
		globalAudioManager.mu.Unlock()
		return Response{ID: msg.ID, Success: true}
	}
	globalAudioManager.mu.Unlock()

	go func() {
		if delay > 0 {
			time.Sleep(time.Duration(delay * float64(time.Second)))
		}
		if err := playInstance(audioId); err != nil {
			log.Printf("[Audio] play error for %s: %v", audioId, err)
		}
	}()

	return Response{ID: msg.ID, Success: true}
}

// handleAudioPause pauses playback
func (b *Bridge) handleAudioPause(msg Message) Response {
	audioId, _ := msg.Payload["audioId"].(string)

	globalAudioManager.mu.Lock()
	inst, ok := globalAudioManager.instances[audioId]
	if ok && inst.isPlaying {
		inst.isPlaying = false
		if inst.player != nil {
			inst.player.Pause()
		}
	}
	globalAudioManager.mu.Unlock()

	return Response{ID: msg.ID, Success: true}
}

// handleAudioStop stops playback and resets position
func (b *Bridge) handleAudioStop(msg Message) Response {
	audioId, _ := msg.Payload["audioId"].(string)

	globalAudioManager.mu.Lock()
	inst, ok := globalAudioManager.instances[audioId]
	if ok {
		stopInstance(inst)
	}
	globalAudioManager.mu.Unlock()

	return Response{ID: msg.ID, Success: true}
}

// handleAudioSetVolume updates the volume for an audio instance
func (b *Bridge) handleAudioSetVolume(msg Message) Response {
	audioId, _ := msg.Payload["audioId"].(string)
	volume := audioGetFloat64(msg.Payload, "volume", 1.0)

	globalAudioManager.mu.Lock()
	inst, ok := globalAudioManager.instances[audioId]
	if ok {
		inst.volume = volume
		if inst.player != nil {
			inst.player.SetVolume(volume * globalAudioManager.masterVolume)
		}
	}
	globalAudioManager.mu.Unlock()

	return Response{ID: msg.ID, Success: true}
}

// handleAudioSetLoop updates the loop flag
func (b *Bridge) handleAudioSetLoop(msg Message) Response {
	audioId, _ := msg.Payload["audioId"].(string)
	loop, _ := msg.Payload["loop"].(bool)

	globalAudioManager.mu.Lock()
	inst, ok := globalAudioManager.instances[audioId]
	if ok {
		inst.loop = loop
	}
	globalAudioManager.mu.Unlock()

	return Response{ID: msg.ID, Success: true}
}

// handleAudioSetPlaybackRate updates the playback rate
func (b *Bridge) handleAudioSetPlaybackRate(msg Message) Response {
	audioId, _ := msg.Payload["audioId"].(string)
	rate := audioGetFloat64(msg.Payload, "rate", 1.0)

	globalAudioManager.mu.Lock()
	inst, ok := globalAudioManager.instances[audioId]
	if ok {
		inst.playbackRate = rate
		// Note: changing playback rate on a running player requires restarting.
		// This will take effect on next play().
	}
	globalAudioManager.mu.Unlock()

	return Response{ID: msg.ID, Success: true}
}

// handleAudioGetIsPlaying returns the playing state
func (b *Bridge) handleAudioGetIsPlaying(msg Message) Response {
	audioId, _ := msg.Payload["audioId"].(string)

	globalAudioManager.mu.Lock()
	inst, ok := globalAudioManager.instances[audioId]
	isPlaying := ok && inst.isPlaying
	globalAudioManager.mu.Unlock()

	return Response{ID: msg.ID, Success: true, Result: map[string]interface{}{"isPlaying": isPlaying}}
}

// handleAudioDispose cleans up an audio instance
func (b *Bridge) handleAudioDispose(msg Message) Response {
	audioId, _ := msg.Payload["audioId"].(string)

	globalAudioManager.mu.Lock()
	inst, ok := globalAudioManager.instances[audioId]
	if ok {
		stopInstance(inst)
		delete(globalAudioManager.instances, audioId)
	}
	globalAudioManager.mu.Unlock()

	return Response{ID: msg.ID, Success: true}
}

// playInstance opens the MP3 file, decodes it, and plays through oto
func playInstance(audioId string) error {
	globalAudioManager.mu.Lock()
	inst, ok := globalAudioManager.instances[audioId]
	if !ok {
		globalAudioManager.mu.Unlock()
		return fmt.Errorf("instance not found: %s", audioId)
	}

	// Open the file
	f, err := os.Open(inst.filePath)
	if err != nil {
		globalAudioManager.mu.Unlock()
		return fmt.Errorf("failed to open file: %w", err)
	}

	// Decode MP3
	decoder, err := mp3.NewDecoder(f)
	if err != nil {
		f.Close()
		globalAudioManager.mu.Unlock()
		return fmt.Errorf("failed to decode MP3: %w", err)
	}

	sampleRate := decoder.SampleRate()

	// Ensure oto context is initialized
	if err := globalAudioManager.ensureOtoContext(sampleRate, 2); err != nil {
		f.Close()
		globalAudioManager.mu.Unlock()
		return err
	}

	// Create player
	player := globalAudioManager.otoCtx.NewPlayer(decoder)
	player.SetVolume(inst.volume * globalAudioManager.masterVolume)

	inst.player = player
	inst.file = f
	inst.decoder = decoder
	inst.isPlaying = true
	inst.stopChan = make(chan struct{})
	stopChan := inst.stopChan
	loop := inst.loop

	globalAudioManager.mu.Unlock()

	// Play in a goroutine — blocks until playback finishes or is stopped
	player.Play()

	// Wait for playback to complete by reading player state
	for {
		select {
		case <-stopChan:
			return nil
		default:
			if !player.IsPlaying() {
				if loop {
					// Seek back to start and replay
					f.Close()
					globalAudioManager.mu.Lock()
					inst2, ok2 := globalAudioManager.instances[audioId]
					if !ok2 || inst2.stopChan != stopChan {
						globalAudioManager.mu.Unlock()
						return nil
					}

					f2, err := os.Open(inst2.filePath)
					if err != nil {
						inst2.isPlaying = false
						globalAudioManager.mu.Unlock()
						return nil
					}
					dec2, err := mp3.NewDecoder(f2)
					if err != nil {
						f2.Close()
						inst2.isPlaying = false
						globalAudioManager.mu.Unlock()
						return nil
					}
					player2 := globalAudioManager.otoCtx.NewPlayer(dec2)
					player2.SetVolume(inst2.volume * globalAudioManager.masterVolume)
					inst2.player = player2
					inst2.file = f2
					inst2.decoder = dec2
					loop = inst2.loop
					globalAudioManager.mu.Unlock()

					player = player2
					f = f2
					player.Play()
				} else {
					globalAudioManager.mu.Lock()
					inst2, ok2 := globalAudioManager.instances[audioId]
					if ok2 && inst2.stopChan == stopChan {
						inst2.isPlaying = false
					}
					globalAudioManager.mu.Unlock()
					f.Close()
					return nil
				}
			}
			time.Sleep(50 * time.Millisecond)
		}
	}
}

// stopInstance stops playback and cleans up resources
func stopInstance(inst *audioInstance) {
	inst.isPlaying = false
	if inst.stopChan != nil {
		close(inst.stopChan)
		inst.stopChan = nil
	}
	if inst.player != nil {
		inst.player.Pause()
		inst.player.Close()
		inst.player = nil
	}
	if inst.file != nil {
		inst.file.Close()
		inst.file = nil
	}
	inst.decoder = nil
}

// audioGetFloat64 safely extracts a float64 from a payload map with a default value
func audioGetFloat64(payload map[string]interface{}, key string, defaultVal float64) float64 {
	if v, ok := payload[key]; ok {
		if f, ok2 := getFloat64(v); ok2 {
			return f
		}
	}
	return defaultVal
}
