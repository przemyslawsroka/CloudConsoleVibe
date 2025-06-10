package collectors

import (
	"context"
	"fmt"
	"net"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/przemyslawsroka/CloudConsoleVibe/monitoring-agent/pkg/metrics"
	"github.com/sirupsen/logrus"
)

// PingCollector collects ping/ICMP latency metrics
type PingCollector struct {
	interval time.Duration
	targets  []string
	timeout  time.Duration
	logger   *logrus.Logger
	count    int
}

// NewPingCollector creates a new ping collector
func NewPingCollector(interval time.Duration, targets []string, logger *logrus.Logger) *PingCollector {
	if len(targets) == 0 {
		// Default targets for connectivity testing
		targets = []string{"8.8.8.8", "1.1.1.1", "google.com", "cloudflare.com"}
	}
	
	return &PingCollector{
		interval: interval,
		targets:  targets,
		timeout:  5 * time.Second,
		logger:   logger,
		count:    3, // Number of ping packets to send
	}
}

// Name returns the collector name
func (pc *PingCollector) Name() string {
	return "ping"
}

// Interval returns the collection interval
func (pc *PingCollector) Interval() time.Duration {
	return pc.interval
}

// Start initializes the collector
func (pc *PingCollector) Start(ctx context.Context) error {
	pc.logger.WithField("targets", pc.targets).Info("Starting ping collector")
	
	// Test if ping command is available
	var cmd string
	if runtime.GOOS == "windows" {
		cmd = "ping"
	} else {
		cmd = "ping"
	}
	
	if _, err := exec.LookPath(cmd); err != nil {
		return fmt.Errorf("ping command not found: %w", err)
	}
	
	return nil
}

// Stop shuts down the collector
func (pc *PingCollector) Stop() error {
	pc.logger.Info("Stopping ping collector")
	return nil
}

// Collect performs ping tests and collects latency metrics
func (pc *PingCollector) Collect(ctx context.Context) ([]metrics.Metric, error) {
	currentTime := time.Now()
	var collectedMetrics []metrics.Metric
	
	for _, target := range pc.targets {
		targetMetrics, err := pc.pingTarget(ctx, target, currentTime)
		if err != nil {
			pc.logger.WithFields(logrus.Fields{
				"target": target,
				"error":  err,
			}).Warn("Failed to ping target")
			
			// Add error metric
			collectedMetrics = append(collectedMetrics, metrics.Metric{
				Name:      "ping_success",
				Value:     0, // Failed
				Unit:      "boolean",
				Timestamp: currentTime,
				Tags: map[string]string{
					"target": target,
				},
				Type: metrics.MetricTypeGauge,
			})
			continue
		}
		
		collectedMetrics = append(collectedMetrics, targetMetrics...)
	}
	
	pc.logger.WithField("metrics_count", len(collectedMetrics)).Debug("Collected ping metrics")
	return collectedMetrics, nil
}

// pingTarget performs ping test for a specific target
func (pc *PingCollector) pingTarget(ctx context.Context, target string, timestamp time.Time) ([]metrics.Metric, error) {
	// Resolve hostname to IP if needed
	resolvedTarget, err := pc.resolveTarget(target)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve target %s: %w", target, err)
	}
	
	tags := map[string]string{
		"target":    target,
		"target_ip": resolvedTarget,
	}
	
	// Execute ping command
	results, err := pc.executePing(ctx, resolvedTarget)
	if err != nil {
		return nil, fmt.Errorf("ping execution failed: %w", err)
	}
	
	var collectedMetrics []metrics.Metric
	
	// Success metric
	collectedMetrics = append(collectedMetrics, metrics.Metric{
		Name:      "ping_success",
		Value:     1, // Success
		Unit:      "boolean",
		Timestamp: timestamp,
		Tags:      tags,
		Type:      metrics.MetricTypeGauge,
	})
	
	// RTT metrics
	if results.avgRTT > 0 {
		collectedMetrics = append(collectedMetrics, []metrics.Metric{
			{
				Name:      "ping_rtt_avg_ms",
				Value:     results.avgRTT,
				Unit:      "ms",
				Timestamp: timestamp,
				Tags:      tags,
				Type:      metrics.MetricTypeGauge,
			},
			{
				Name:      "ping_rtt_min_ms",
				Value:     results.minRTT,
				Unit:      "ms",
				Timestamp: timestamp,
				Tags:      tags,
				Type:      metrics.MetricTypeGauge,
			},
			{
				Name:      "ping_rtt_max_ms",
				Value:     results.maxRTT,
				Unit:      "ms",
				Timestamp: timestamp,
				Tags:      tags,
				Type:      metrics.MetricTypeGauge,
			},
		}...)
	}
	
	// Packet loss
	collectedMetrics = append(collectedMetrics, metrics.Metric{
		Name:      "ping_packet_loss_percent",
		Value:     results.packetLoss,
		Unit:      "percent",
		Timestamp: timestamp,
		Tags:      tags,
		Type:      metrics.MetricTypeGauge,
	})
	
	return collectedMetrics, nil
}

// resolveTarget resolves hostname to IP address
func (pc *PingCollector) resolveTarget(target string) (string, error) {
	// Check if target is already an IP address
	if net.ParseIP(target) != nil {
		return target, nil
	}
	
	// Resolve hostname
	ips, err := net.LookupIP(target)
	if err != nil {
		return "", err
	}
	
	if len(ips) == 0 {
		return "", fmt.Errorf("no IP addresses found for %s", target)
	}
	
	// Return first IPv4 address, or first IPv6 if no IPv4
	for _, ip := range ips {
		if ip.To4() != nil {
			return ip.String(), nil
		}
	}
	
	return ips[0].String(), nil
}

// PingResults holds the results of a ping operation
type PingResults struct {
	avgRTT     float64
	minRTT     float64
	maxRTT     float64
	packetLoss float64
}

// executePing runs the actual ping command and parses results
func (pc *PingCollector) executePing(ctx context.Context, target string) (*PingResults, error) {
	var cmd *exec.Cmd
	
	ctxWithTimeout, cancel := context.WithTimeout(ctx, pc.timeout)
	defer cancel()
	
	if runtime.GOOS == "windows" {
		cmd = exec.CommandContext(ctxWithTimeout, "ping", "-n", fmt.Sprintf("%d", pc.count), target)
	} else {
		cmd = exec.CommandContext(ctxWithTimeout, "ping", "-c", fmt.Sprintf("%d", pc.count), target)
	}
	
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ping command failed: %w", err)
	}
	
	return pc.parsePingOutput(string(output))
}

// parsePingOutput parses ping command output to extract metrics
func (pc *PingCollector) parsePingOutput(output string) (*PingResults, error) {
	results := &PingResults{}
	
	if runtime.GOOS == "windows" {
		return pc.parseWindowsPingOutput(output)
	}
	return pc.parseUnixPingOutput(output)
}

// parseUnixPingOutput parses Unix/Linux ping output
func (pc *PingCollector) parseUnixPingOutput(output string) (*PingResults, error) {
	results := &PingResults{}
	
	// Parse packet loss: "3 packets transmitted, 3 received, 0% packet loss"
	lossRegex := regexp.MustCompile(`(\d+)% packet loss`)
	if matches := lossRegex.FindStringSubmatch(output); len(matches) > 1 {
		if loss, err := strconv.ParseFloat(matches[1], 64); err == nil {
			results.packetLoss = loss
		}
	}
	
	// Parse RTT statistics: "rtt min/avg/max/mdev = 12.345/23.456/34.567/1.234 ms"
	rttRegex := regexp.MustCompile(`rtt min/avg/max/mdev = ([\d.]+)/([\d.]+)/([\d.]+)/[\d.]+`)
	if matches := rttRegex.FindStringSubmatch(output); len(matches) > 3 {
		if min, err := strconv.ParseFloat(matches[1], 64); err == nil {
			results.minRTT = min
		}
		if avg, err := strconv.ParseFloat(matches[2], 64); err == nil {
			results.avgRTT = avg
		}
		if max, err := strconv.ParseFloat(matches[3], 64); err == nil {
			results.maxRTT = max
		}
	}
	
	return results, nil
}

// parseWindowsPingOutput parses Windows ping output
func (pc *PingCollector) parseWindowsPingOutput(output string) (*PingResults, error) {
	results := &PingResults{}
	
	lines := strings.Split(output, "\n")
	var rtts []float64
	packetsSent := 0
	packetsReceived := 0
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		// Count packets
		if strings.Contains(line, "Pinging") {
			packetsSent++
		}
		
		// Parse individual ping results: "Reply from 8.8.8.8: bytes=32 time=12ms TTL=64"
		if strings.Contains(line, "time=") {
			packetsReceived++
			timeRegex := regexp.MustCompile(`time=(\d+)ms`)
			if matches := timeRegex.FindStringSubmatch(line); len(matches) > 1 {
				if rtt, err := strconv.ParseFloat(matches[1], 64); err == nil {
					rtts = append(rtts, rtt)
				}
			}
		}
		
		// Handle "time<1ms" case
		if strings.Contains(line, "time<1ms") {
			packetsReceived++
			rtts = append(rtts, 0.5) // Assume 0.5ms for sub-millisecond
		}
	}
	
	// Calculate packet loss
	if packetsSent > 0 {
		results.packetLoss = float64(packetsSent-packetsReceived) / float64(packetsSent) * 100
	}
	
	// Calculate RTT statistics
	if len(rtts) > 0 {
		var sum, min, max float64
		min = rtts[0]
		max = rtts[0]
		
		for _, rtt := range rtts {
			sum += rtt
			if rtt < min {
				min = rtt
			}
			if rtt > max {
				max = rtt
			}
		}
		
		results.avgRTT = sum / float64(len(rtts))
		results.minRTT = min
		results.maxRTT = max
	}
	
	return results, nil
} 