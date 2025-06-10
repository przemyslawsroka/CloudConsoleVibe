package agent

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/przemyslawsroka/CloudConsoleVibe/monitoring-agent/internal/collectors"
	"github.com/przemyslawsroka/CloudConsoleVibe/monitoring-agent/internal/config"
	"github.com/przemyslawsroka/CloudConsoleVibe/monitoring-agent/internal/transmitter"
	"github.com/przemyslawsroka/CloudConsoleVibe/monitoring-agent/pkg/metrics"
	"github.com/sirupsen/logrus"
)

// Agent is the main monitoring agent that orchestrates metric collection and transmission
type Agent struct {
	config      *metrics.AgentConfig
	logger      *logrus.Logger
	collectors  []metrics.MetricCollector
	transmitter metrics.MetricTransmitter
	metricQueue chan metrics.Metric
	stopChan    chan bool
	wg          sync.WaitGroup
	running     bool
	mutex       sync.RWMutex
}

// New creates a new monitoring agent
func New(configManager *config.Manager) (*Agent, error) {
	config := configManager.GetConfig()
	if config == nil {
		return nil, fmt.Errorf("configuration is required")
	}

	// Setup logger
	logger := logrus.New()
	level, err := logrus.ParseLevel(config.LogLevel)
	if err != nil {
		level = logrus.InfoLevel
	}
	logger.SetLevel(level)

	// Create metric queue
	metricQueue := make(chan metrics.Metric, config.BatchSize*10) // Buffer for multiple batches

	// Create transmitter
	transmitter := transmitter.NewWebSocketTransmitter(
		config.BackendURL,
		config.AgentID,
		config.Location,
		logger,
	)

	agent := &Agent{
		config:      config,
		logger:      logger,
		transmitter: transmitter,
		metricQueue: metricQueue,
		stopChan:    make(chan bool),
	}

	// Initialize collectors
	if err := agent.initializeCollectors(); err != nil {
		return nil, fmt.Errorf("failed to initialize collectors: %w", err)
	}

	return agent, nil
}

// Start begins the monitoring agent operation
func (a *Agent) Start(ctx context.Context) error {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	if a.running {
		return fmt.Errorf("agent is already running")
	}

	a.logger.WithFields(logrus.Fields{
		"agent_id": a.config.AgentID,
		"location": a.config.Location,
	}).Info("Starting monitoring agent")

	// Connect to backend
	if err := a.transmitter.Connect(); err != nil {
		return fmt.Errorf("failed to connect to backend: %w", err)
	}

	// Start reconnection loop
	a.transmitter.(*transmitter.WebSocketTransmitter).StartReconnectLoop(ctx)

	// Start collectors
	for _, collector := range a.collectors {
		if err := collector.Start(ctx); err != nil {
			a.logger.WithFields(logrus.Fields{
				"collector": collector.Name(),
				"error":     err,
			}).Error("Failed to start collector")
			continue
		}
		a.logger.WithField("collector", collector.Name()).Info("Started collector")
	}

	// Start metric collection goroutines
	a.wg.Add(1)
	go a.metricCollectionLoop(ctx)

	// Start metric transmission goroutine
	a.wg.Add(1)
	go a.metricTransmissionLoop(ctx)

	a.running = true
	a.logger.Info("Monitoring agent started successfully")

	return nil
}

// Stop gracefully shuts down the monitoring agent
func (a *Agent) Stop() error {
	a.mutex.Lock()
	defer a.mutex.Unlock()

	if !a.running {
		return nil
	}

	a.logger.Info("Stopping monitoring agent")

	// Signal stop
	close(a.stopChan)

	// Stop collectors
	for _, collector := range a.collectors {
		if err := collector.Stop(); err != nil {
			a.logger.WithFields(logrus.Fields{
				"collector": collector.Name(),
				"error":     err,
			}).Error("Error stopping collector")
		}
	}

	// Wait for goroutines to finish
	a.wg.Wait()

	// Disconnect from backend
	if err := a.transmitter.Disconnect(); err != nil {
		a.logger.WithError(err).Error("Error disconnecting from backend")
	}

	// Close metric queue
	close(a.metricQueue)

	a.running = false
	a.logger.Info("Monitoring agent stopped")

	return nil
}

// IsRunning returns whether the agent is currently running
func (a *Agent) IsRunning() bool {
	a.mutex.RLock()
	defer a.mutex.RUnlock()
	return a.running
}

// GetStatus returns the current status of the agent
func (a *Agent) GetStatus() map[string]interface{} {
	a.mutex.RLock()
	defer a.mutex.RUnlock()

	status := map[string]interface{}{
		"running":          a.running,
		"agent_id":         a.config.AgentID,
		"location":         a.config.Location,
		"backend_url":      a.config.BackendURL,
		"collect_interval": a.config.CollectInterval.String(),
		"collectors":       make([]string, len(a.collectors)),
		"connected":        false,
	}

	// Get collector names
	for i, collector := range a.collectors {
		status["collectors"].([]string)[i] = collector.Name()
	}

	// Get connection status
	if a.transmitter != nil {
		status["connected"] = a.transmitter.IsConnected()
	}

	return status
}

// initializeCollectors creates and configures metric collectors based on configuration
func (a *Agent) initializeCollectors() error {
	a.collectors = make([]metrics.MetricCollector, 0)

	for _, collectorName := range a.config.Collectors {
		var collector metrics.MetricCollector
		var err error

		switch collectorName {
		case "network_interface":
			collector = collectors.NewNetworkCollector(a.config.CollectInterval, a.logger)

		case "ping":
			collector = collectors.NewPingCollector(
				a.config.CollectInterval,
				a.config.CustomTargets.PingTargets,
				a.logger,
			)

		case "system":
			// TODO: Implement system metrics collector
			a.logger.WithField("collector", collectorName).Warn("System collector not yet implemented")
			continue

		case "http":
			// TODO: Implement HTTP endpoint monitoring collector
			a.logger.WithField("collector", collectorName).Warn("HTTP collector not yet implemented")
			continue

		case "dns":
			// TODO: Implement DNS resolution monitoring collector
			a.logger.WithField("collector", collectorName).Warn("DNS collector not yet implemented")
			continue

		default:
			a.logger.WithField("collector", collectorName).Error("Unknown collector type")
			continue
		}

		if err != nil {
			a.logger.WithFields(logrus.Fields{
				"collector": collectorName,
				"error":     err,
			}).Error("Failed to create collector")
			continue
		}

		a.collectors = append(a.collectors, collector)
		a.logger.WithField("collector", collectorName).Info("Initialized collector")
	}

	if len(a.collectors) == 0 {
		return fmt.Errorf("no collectors were successfully initialized")
	}

	return nil
}

// metricCollectionLoop runs the main metric collection loop
func (a *Agent) metricCollectionLoop(ctx context.Context) {
	defer a.wg.Done()

	ticker := time.NewTicker(a.config.CollectInterval)
	defer ticker.Stop()

	a.logger.WithField("interval", a.config.CollectInterval).Info("Starting metric collection loop")

	for {
		select {
		case <-ctx.Done():
			a.logger.Info("Metric collection loop stopped due to context cancellation")
			return

		case <-a.stopChan:
			a.logger.Info("Metric collection loop stopped")
			return

		case <-ticker.C:
			a.collectMetrics(ctx)
		}
	}
}

// collectMetrics runs all collectors and queues the metrics
func (a *Agent) collectMetrics(ctx context.Context) {
	collectStart := time.Now()
	totalMetrics := 0

	for _, collector := range a.collectors {
		collectorStart := time.Now()

		metrics, err := collector.Collect(ctx)
		if err != nil {
			a.logger.WithFields(logrus.Fields{
				"collector": collector.Name(),
				"error":     err,
			}).Error("Failed to collect metrics")
			continue
		}

		// Queue metrics
		for _, metric := range metrics {
			select {
			case a.metricQueue <- metric:
				totalMetrics++
			default:
				a.logger.Warn("Metric queue is full, dropping metric")
			}
		}

		collectorDuration := time.Since(collectorStart)
		a.logger.WithFields(logrus.Fields{
			"collector": collector.Name(),
			"metrics":   len(metrics),
			"duration":  collectorDuration.String(),
		}).Debug("Collected metrics from collector")
	}

	collectDuration := time.Since(collectStart)
	a.logger.WithFields(logrus.Fields{
		"total_metrics": totalMetrics,
		"duration":      collectDuration.String(),
	}).Debug("Completed metric collection cycle")
}

// metricTransmissionLoop handles batching and transmitting metrics
func (a *Agent) metricTransmissionLoop(ctx context.Context) {
	defer a.wg.Done()

	batch := make([]metrics.Metric, 0, a.config.BatchSize)
	batchTimer := time.NewTimer(30 * time.Second) // Maximum batch time
	defer batchTimer.Stop()

	a.logger.WithField("batch_size", a.config.BatchSize).Info("Starting metric transmission loop")

	for {
		select {
		case <-ctx.Done():
			// Send remaining metrics before stopping
			if len(batch) > 0 {
				a.sendBatch(ctx, batch)
			}
			a.logger.Info("Metric transmission loop stopped due to context cancellation")
			return

		case <-a.stopChan:
			// Send remaining metrics before stopping
			if len(batch) > 0 {
				a.sendBatch(ctx, batch)
			}
			a.logger.Info("Metric transmission loop stopped")
			return

		case metric, ok := <-a.metricQueue:
			if !ok {
				// Channel closed, send remaining batch
				if len(batch) > 0 {
					a.sendBatch(ctx, batch)
				}
				return
			}

			batch = append(batch, metric)

			// Send batch if it's full
			if len(batch) >= a.config.BatchSize {
				a.sendBatch(ctx, batch)
				batch = batch[:0] // Reset batch
				batchTimer.Reset(30 * time.Second)
			}

		case <-batchTimer.C:
			// Send batch after timeout even if not full
			if len(batch) > 0 {
				a.sendBatch(ctx, batch)
				batch = batch[:0] // Reset batch
			}
			batchTimer.Reset(30 * time.Second)
		}
	}
}

// sendBatch transmits a batch of metrics to the backend
func (a *Agent) sendBatch(ctx context.Context, batch []metrics.Metric) {
	if len(batch) == 0 {
		return
	}

	sendStart := time.Now()

	err := a.transmitter.Send(ctx, batch)
	if err != nil {
		a.logger.WithFields(logrus.Fields{
			"batch_size": len(batch),
			"error":      err,
		}).Error("Failed to send metric batch")
		return
	}

	sendDuration := time.Since(sendStart)
	a.logger.WithFields(logrus.Fields{
		"batch_size": len(batch),
		"duration":   sendDuration.String(),
	}).Debug("Successfully sent metric batch")
} 