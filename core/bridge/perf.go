package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sort"
	"sync"
	"time"
)

// PerfConfig controls performance monitoring behavior
type PerfConfig struct {
	Enabled bool
	Verbose bool // Log every operation
}

// PerfSample records a single timing measurement
type PerfSample struct {
	Name    string  `json:"name"`
	DurMs   float64 `json:"dur_ms"`
	StartNs int64   `json:"start_ns"` // Nanosecond timestamp for correlation
	OpID    string  `json:"op_id"`    // Message ID for correlation with client
}

// PerfStats tracks aggregated statistics for an operation
type PerfStats struct {
	Name      string  `json:"name"`
	Count     int64   `json:"count"`
	MinMs     float64 `json:"min_ms"`
	MaxMs     float64 `json:"max_ms"`
	AvgMs     float64 `json:"avg_ms"`
	MedianMs  float64 `json:"median_ms"`
	StddevMs  float64 `json:"stddev_ms"`
	TotalMs   float64 `json:"total_ms"`
	RecentDur float64 `json:"recent_dur_ms"` // Last 30s window
}

// PerfMonitor collects and reports performance metrics
type PerfMonitor struct {
	config     PerfConfig
	mu         sync.RWMutex
	samples    []PerfSample
	opStats    map[string]*opStats
	lastReport time.Time
	startTime  time.Time
}

// Internal operation stats tracking
type opStats struct {
	name      string
	samples   []float64   // Keep last 60 samples for rolling window
	durations []time.Time // For windowed stats
	count     int64
	sum       float64
	minVal    float64
	maxVal    float64
}

var perfMon *PerfMonitor

// InitPerfMonitor initializes the global performance monitor
func InitPerfMonitor(enabled bool) {
	verbose := os.Getenv("TSYNE_PERF_VERBOSE") == "true"
	perfMon = &PerfMonitor{
		config: PerfConfig{
			Enabled: enabled,
			Verbose: verbose,
		},
		opStats:    make(map[string]*opStats),
		lastReport: time.Now(),
		startTime:  time.Now(),
	}
	if enabled {
		log.Printf("[perf] Performance monitoring ENABLED (verbose=%v)", verbose)
	}
}

// StartOp marks the start of a timed operation
// Returns an OpTimer that should be called with End() to record the measurement
func StartOp(name string, msgID string) *OpTimer {
	if perfMon == nil || !perfMon.config.Enabled {
		return &OpTimer{}
	}
	return &OpTimer{
		name:    name,
		msgID:   msgID,
		start:   time.Now(),
		startNs: time.Now().UnixNano(),
	}
}

// OpTimer tracks a single operation
type OpTimer struct {
	name    string
	msgID   string
	start   time.Time
	startNs int64
	ended   bool
}

// End records the operation duration
func (ot *OpTimer) End() {
	if perfMon == nil || !perfMon.config.Enabled || ot.ended {
		return
	}
	ot.ended = true

	dur := time.Since(ot.start)
	durMs := float64(dur.Microseconds()) / 1000.0

	if perfMon.config.Verbose {
		log.Printf("[perf] %s: %.2fms (msgID=%s)", ot.name, durMs, ot.msgID)
	}

	sample := PerfSample{
		Name:    ot.name,
		DurMs:   durMs,
		StartNs: ot.startNs,
		OpID:    ot.msgID,
	}

	perfMon.recordSample(sample)
}

// recordSample adds a sample and updates statistics
func (pm *PerfMonitor) recordSample(sample PerfSample) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.samples = append(pm.samples, sample)
	if len(pm.samples) > 10000 {
		// Keep last 10000 samples to avoid unbounded memory growth
		pm.samples = pm.samples[1:]
	}

	// Update operation stats
	if pm.opStats[sample.Name] == nil {
		pm.opStats[sample.Name] = &opStats{
			name:   sample.Name,
			minVal: sample.DurMs,
			maxVal: sample.DurMs,
		}
	}

	stat := pm.opStats[sample.Name]
	stat.samples = append(stat.samples, sample.DurMs)
	if len(stat.samples) > 60 {
		stat.samples = stat.samples[1:]
	}
	stat.durations = append(stat.durations, time.Now())
	if len(stat.durations) > 60 {
		stat.durations = stat.durations[1:]
	}

	stat.count++
	stat.sum += sample.DurMs
	if sample.DurMs < stat.minVal {
		stat.minVal = sample.DurMs
	}
	if sample.DurMs > stat.maxVal {
		stat.maxVal = sample.DurMs
	}

	// Report stats periodically (every 10 seconds)
	if time.Since(pm.lastReport) > 10*time.Second {
		pm.reportStats()
		pm.lastReport = time.Now()
	}
}

// reportStats logs current performance statistics
func (pm *PerfMonitor) reportStats() {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if len(pm.opStats) == 0 {
		return
	}

	uptime := time.Since(pm.startTime).Seconds()

	// Compile stats in sorted order
	var stats []*PerfStats
	for name, s := range pm.opStats {
		stat := &PerfStats{
			Name:    name,
			Count:   s.count,
			MinMs:   s.minVal,
			MaxMs:   s.maxVal,
			TotalMs: s.sum,
			AvgMs:   s.sum / float64(s.count),
		}

		// Calculate median
		if len(s.samples) > 0 {
			sorted := make([]float64, len(s.samples))
			copy(sorted, s.samples)
			sort.Float64s(sorted)
			stat.MedianMs = sorted[len(sorted)/2]

			// Calculate stddev
			var sumSquares float64
			for _, val := range sorted {
				diff := val - stat.AvgMs
				sumSquares += diff * diff
			}
			stat.StddevMs = Math.Sqrt(sumSquares / float64(len(sorted)))

			// Recent window (last 30 seconds)
			var recentSum float64
			recentCount := 0
			cutoff := time.Now().Add(-30 * time.Second)
			for i, dur := range s.durations {
				if dur.After(cutoff) {
					recentSum += s.samples[i]
					recentCount++
				}
			}
			if recentCount > 0 {
				stat.RecentDur = recentSum / float64(recentCount)
			}
		}

		stats = append(stats, stat)
	}

	// Sort by total time descending
	sort.Slice(stats, func(i, j int) bool {
		return stats[i].TotalMs > stats[j].TotalMs
	})

	// Output as JSON
	report := map[string]interface{}{
		"uptime_sec": uptime,
		"operations": stats,
		"timestamp":  time.Now().Unix(),
	}

	if data, err := json.Marshal(report); err == nil {
		fmt.Fprintf(os.Stderr, "[PERF] %s\n", string(data))
	}
}

// GetStats returns current statistics (for embedding in responses if needed)
func (pm *PerfMonitor) GetStats(name string) map[string]float64 {
	if pm == nil || !pm.config.Enabled {
		return nil
	}

	pm.mu.RLock()
	defer pm.mu.RUnlock()

	stat, exists := pm.opStats[name]
	if !exists || stat.count == 0 {
		return nil
	}

	return map[string]float64{
		"count": float64(stat.count),
		"min":   stat.minVal,
		"max":   stat.maxVal,
		"avg":   stat.sum / float64(stat.count),
		"total": stat.sum,
	}
}

// Math helper (Go doesn't have math.Sqrt in standard, using inline)
var Math = struct {
	Sqrt func(float64) float64
}{
	Sqrt: func(x float64) float64 {
		// Simple Newton's method for sqrt
		if x < 0 {
			return 0
		}
		z := x
		for i := 0; i < 20; i++ {
			z = (z + x/z) / 2
		}
		return z
	},
}
