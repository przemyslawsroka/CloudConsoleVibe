package collectors

import (
	"context"
	"fmt"
	"time"

	"github.com/przemyslawsroka/CloudConsoleVibe/monitoring-agent/pkg/metrics"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/sirupsen/logrus"
)

// NetworkCollector collects network interface metrics
type NetworkCollector struct {
	interval        time.Duration
	lastStats       map[string]net.IOCountersStat
	lastTimestamp   time.Time
	logger          *logrus.Logger
}

// NewNetworkCollector creates a new network interface collector
func NewNetworkCollector(interval time.Duration, logger *logrus.Logger) *NetworkCollector {
	return &NetworkCollector{
		interval:      interval,
		lastStats:     make(map[string]net.IOCountersStat),
		lastTimestamp: time.Now(),
		logger:        logger,
	}
}

// Name returns the collector name
func (nc *NetworkCollector) Name() string {
	return "network_interface"
}

// Interval returns the collection interval
func (nc *NetworkCollector) Interval() time.Duration {
	return nc.interval
}

// Start initializes the collector
func (nc *NetworkCollector) Start(ctx context.Context) error {
	nc.logger.Info("Starting network interface collector")
	// Initialize with first measurement
	stats, err := net.IOCounters(true)
	if err != nil {
		return fmt.Errorf("failed to get initial network stats: %w", err)
	}
	
	for _, stat := range stats {
		nc.lastStats[stat.Name] = stat
	}
	nc.lastTimestamp = time.Now()
	
	return nil
}

// Stop shuts down the collector
func (nc *NetworkCollector) Stop() error {
	nc.logger.Info("Stopping network interface collector")
	return nil
}

// Collect gathers network interface metrics
func (nc *NetworkCollector) Collect(ctx context.Context) ([]metrics.Metric, error) {
	currentTime := time.Now()
	timeDelta := currentTime.Sub(nc.lastTimestamp).Seconds()
	
	stats, err := net.IOCounters(true)
	if err != nil {
		return nil, fmt.Errorf("failed to get network stats: %w", err)
	}
	
	var collectedMetrics []metrics.Metric
	
	for _, currentStat := range stats {
		interfaceName := currentStat.Name
		
		// Skip loopback and inactive interfaces
		if interfaceName == "lo" || currentStat.BytesRecv == 0 && currentStat.BytesSent == 0 {
			continue
		}
		
		tags := map[string]string{
			"interface": interfaceName,
		}
		
		// Calculate rates if we have previous data
		if lastStat, exists := nc.lastStats[interfaceName]; exists && timeDelta > 0 {
			// Bytes per second
			rxBytesPerSec := float64(currentStat.BytesRecv-lastStat.BytesRecv) / timeDelta
			txBytesPerSec := float64(currentStat.BytesSent-lastStat.BytesSent) / timeDelta
			
			// Packets per second
			rxPacketsPerSec := float64(currentStat.PacketsRecv-lastStat.PacketsRecv) / timeDelta
			txPacketsPerSec := float64(currentStat.PacketsSent-lastStat.PacketsSent) / timeDelta
			
			// Errors and drops per second
			rxErrorsPerSec := float64(currentStat.Errin-lastStat.Errin) / timeDelta
			txErrorsPerSec := float64(currentStat.Errout-lastStat.Errout) / timeDelta
			rxDropsPerSec := float64(currentStat.Dropin-lastStat.Dropin) / timeDelta
			txDropsPerSec := float64(currentStat.Dropout-lastStat.Dropout) / timeDelta
			
			// Rate metrics
			collectedMetrics = append(collectedMetrics, []metrics.Metric{
				{
					Name:      "network_interface_rx_bytes_per_sec",
					Value:     rxBytesPerSec,
					Unit:      "bytes/sec",
					Timestamp: currentTime,
					Tags:      tags,
					Type:      metrics.MetricTypeGauge,
				},
				{
					Name:      "network_interface_tx_bytes_per_sec",
					Value:     txBytesPerSec,
					Unit:      "bytes/sec",
					Timestamp: currentTime,
					Tags:      tags,
					Type:      metrics.MetricTypeGauge,
				},
				{
					Name:      "network_interface_rx_packets_per_sec",
					Value:     rxPacketsPerSec,
					Unit:      "packets/sec",
					Timestamp: currentTime,
					Tags:      tags,
					Type:      metrics.MetricTypeGauge,
				},
				{
					Name:      "network_interface_tx_packets_per_sec",
					Value:     txPacketsPerSec,
					Unit:      "packets/sec",
					Timestamp: currentTime,
					Tags:      tags,
					Type:      metrics.MetricTypeGauge,
				},
				{
					Name:      "network_interface_rx_errors_per_sec",
					Value:     rxErrorsPerSec,
					Unit:      "errors/sec",
					Timestamp: currentTime,
					Tags:      tags,
					Type:      metrics.MetricTypeGauge,
				},
				{
					Name:      "network_interface_tx_errors_per_sec",
					Value:     txErrorsPerSec,
					Unit:      "errors/sec",
					Timestamp: currentTime,
					Tags:      tags,
					Type:      metrics.MetricTypeGauge,
				},
				{
					Name:      "network_interface_rx_drops_per_sec",
					Value:     rxDropsPerSec,
					Unit:      "drops/sec",
					Timestamp: currentTime,
					Tags:      tags,
					Type:      metrics.MetricTypeGauge,
				},
				{
					Name:      "network_interface_tx_drops_per_sec",
					Value:     txDropsPerSec,
					Unit:      "drops/sec",
					Timestamp: currentTime,
					Tags:      tags,
					Type:      metrics.MetricTypeGauge,
				},
			}...)
		}
		
		// Cumulative counters
		collectedMetrics = append(collectedMetrics, []metrics.Metric{
			{
				Name:      "network_interface_rx_bytes_total",
				Value:     float64(currentStat.BytesRecv),
				Unit:      "bytes",
				Timestamp: currentTime,
				Tags:      tags,
				Type:      metrics.MetricTypeCounter,
			},
			{
				Name:      "network_interface_tx_bytes_total",
				Value:     float64(currentStat.BytesSent),
				Unit:      "bytes",
				Timestamp: currentTime,
				Tags:      tags,
				Type:      metrics.MetricTypeCounter,
			},
			{
				Name:      "network_interface_rx_packets_total",
				Value:     float64(currentStat.PacketsRecv),
				Unit:      "packets",
				Timestamp: currentTime,
				Tags:      tags,
				Type:      metrics.MetricTypeCounter,
			},
			{
				Name:      "network_interface_tx_packets_total",
				Value:     float64(currentStat.PacketsSent),
				Unit:      "packets",
				Timestamp: currentTime,
				Tags:      tags,
				Type:      metrics.MetricTypeCounter,
			},
		}...)
		
		// Update last stats
		nc.lastStats[interfaceName] = currentStat
	}
	
	nc.lastTimestamp = currentTime
	
	nc.logger.WithField("metrics_count", len(collectedMetrics)).Debug("Collected network interface metrics")
	return collectedMetrics, nil
} 