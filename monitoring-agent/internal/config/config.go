package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/przemyslawsroka/CloudConsoleVibe/monitoring-agent/pkg/metrics"
	"github.com/spf13/viper"
	"github.com/google/uuid"
)

// Manager handles configuration loading and validation
type Manager struct {
	config *metrics.AgentConfig
	viper  *viper.Viper
}

// NewManager creates a new configuration manager
func NewManager() *Manager {
	v := viper.New()
	v.SetConfigName("agent-config")
	v.SetConfigType("yaml")
	
	// Add configuration search paths
	v.AddConfigPath(".")
	v.AddConfigPath("./config")
	v.AddConfigPath("/etc/network-monitor")
	v.AddConfigPath("$HOME/.network-monitor")
	
	// Set environment variable prefix
	v.SetEnvPrefix("NETMON")
	v.AutomaticEnv()
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	
	return &Manager{
		viper: v,
	}
}

// Load reads and validates the configuration
func (m *Manager) Load() error {
	// Set default values
	m.setDefaults()
	
	// Try to read config file
	if err := m.viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return fmt.Errorf("failed to read config file: %w", err)
		}
		// Config file not found, use defaults and environment variables
	}
	
	// Unmarshal into config struct
	config := &metrics.AgentConfig{}
	if err := m.viper.Unmarshal(config); err != nil {
		return fmt.Errorf("failed to unmarshal config: %w", err)
	}
	
	// Validate and auto-detect missing values
	if err := m.validateAndEnrich(config); err != nil {
		return fmt.Errorf("config validation failed: %w", err)
	}
	
	m.config = config
	return nil
}

// GetConfig returns the loaded configuration
func (m *Manager) GetConfig() *metrics.AgentConfig {
	return m.config
}

// SaveConfig writes the current configuration to file
func (m *Manager) SaveConfig(filePath string) error {
	if m.config == nil {
		return fmt.Errorf("no configuration loaded")
	}
	
	// Ensure directory exists
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}
	
	// Write configuration
	m.viper.SetConfigFile(filePath)
	return m.viper.WriteConfig()
}

// setDefaults sets default configuration values
func (m *Manager) setDefaults() {
	// Generate unique agent ID if not set
	agentID := uuid.New().String()
	m.viper.SetDefault("agent_id", agentID)
	
	// Backend configuration
	m.viper.SetDefault("backend_url", "ws://localhost:8080")
	m.viper.SetDefault("collect_interval", "30s")
	m.viper.SetDefault("batch_size", 100)
	m.viper.SetDefault("log_level", "info")
	
	// Default collectors
	m.viper.SetDefault("collectors", []string{"network_interface", "ping", "system"})
	
	// Location defaults
	m.viper.SetDefault("location.provider", "auto-detect")
	m.viper.SetDefault("location.region", "unknown")
	m.viper.SetDefault("location.zone", "unknown")
	m.viper.SetDefault("location.network", "default")
	m.viper.SetDefault("location.subnet", "default")
	
	// Custom targets
	m.viper.SetDefault("custom_targets.ping_targets", []string{"8.8.8.8", "1.1.1.1", "google.com"})
	m.viper.SetDefault("custom_targets.dns_servers", []string{"8.8.8.8", "1.1.1.1"})
	m.viper.SetDefault("custom_targets.tcp_ports", []int{80, 443, 22, 53})
	
	// HTTP targets
	httpTargets := []map[string]interface{}{
		{
			"url":             "https://google.com",
			"method":          "GET",
			"expected_code":   200,
			"timeout":         "10s",
			"follow_redirect": true,
		},
		{
			"url":             "https://cloudflare.com",
			"method":          "GET",
			"expected_code":   200,
			"timeout":         "10s",
			"follow_redirect": true,
		},
	}
	m.viper.SetDefault("custom_targets.http_targets", httpTargets)
}

// validateAndEnrich validates the configuration and enriches it with auto-detected values
func (m *Manager) validateAndEnrich(config *metrics.AgentConfig) error {
	// Validate agent ID
	if config.AgentID == "" {
		config.AgentID = uuid.New().String()
	}
	
	// Validate backend URL
	if config.BackendURL == "" {
		return fmt.Errorf("backend_url is required")
	}
	
	// Validate collect interval
	if config.CollectInterval == 0 {
		config.CollectInterval = 30 * time.Second
	}
	if config.CollectInterval < 5*time.Second {
		return fmt.Errorf("collect_interval must be at least 5 seconds")
	}
	
	// Validate batch size
	if config.BatchSize <= 0 {
		config.BatchSize = 100
	}
	if config.BatchSize > 1000 {
		return fmt.Errorf("batch_size cannot exceed 1000")
	}
	
	// Validate log level
	validLogLevels := map[string]bool{
		"debug": true, "info": true, "warn": true, "error": true, "fatal": true,
	}
	if !validLogLevels[strings.ToLower(config.LogLevel)] {
		config.LogLevel = "info"
	}
	
	// Validate collectors
	if len(config.Collectors) == 0 {
		config.Collectors = []string{"network_interface", "ping"}
	}
	
	// Auto-detect cloud provider and location
	if err := m.autoDetectLocation(&config.Location); err != nil {
		// Log error but don't fail - use defaults
		fmt.Printf("Warning: Failed to auto-detect location: %v\n", err)
	}
	
	// Validate custom targets
	if err := m.validateCustomTargets(&config.CustomTargets); err != nil {
		return fmt.Errorf("invalid custom targets: %w", err)
	}
	
	return nil
}

// autoDetectLocation attempts to auto-detect cloud provider and location
func (m *Manager) autoDetectLocation(location *metrics.CloudLocation) error {
	if location.Provider == "" || location.Provider == "auto-detect" {
		provider := m.detectCloudProvider()
		location.Provider = provider
		
		// Auto-detect additional metadata based on provider
		switch provider {
		case "gcp":
			m.detectGCPMetadata(location)
		case "aws":
			m.detectAWSMetadata(location)
		case "azure":
			m.detectAzureMetadata(location)
		default:
			location.Provider = "on-premise"
		}
	}
	
	// Set defaults for unknown values
	if location.Region == "" {
		location.Region = "unknown"
	}
	if location.Zone == "" {
		location.Zone = "unknown"
	}
	if location.Network == "" {
		location.Network = "default"
	}
	if location.Subnet == "" {
		location.Subnet = "default"
	}
	
	return nil
}

// detectCloudProvider attempts to detect the cloud provider
func (m *Manager) detectCloudProvider() string {
	// Check for GCP metadata server
	if m.checkMetadataServer("http://metadata.google.internal/computeMetadata/v1/", map[string]string{"Metadata-Flavor": "Google"}) {
		return "gcp"
	}
	
	// Check for AWS metadata server
	if m.checkMetadataServer("http://169.254.169.254/latest/meta-data/", nil) {
		return "aws"
	}
	
	// Check for Azure metadata server
	if m.checkMetadataServer("http://169.254.169.254/metadata/instance", map[string]string{"Metadata": "true"}) {
		return "azure"
	}
	
	return "on-premise"
}

// checkMetadataServer checks if a metadata server is accessible
func (m *Manager) checkMetadataServer(url string, headers map[string]string) bool {
	// This is a simplified check - in a real implementation,
	// you would make HTTP requests to these endpoints
	return false
}

// detectGCPMetadata detects GCP-specific metadata
func (m *Manager) detectGCPMetadata(location *metrics.CloudLocation) {
	// In a real implementation, you would query:
	// http://metadata.google.internal/computeMetadata/v1/instance/zone
	// http://metadata.google.internal/computeMetadata/v1/instance/id
	// http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/network
	// etc.
}

// detectAWSMetadata detects AWS-specific metadata
func (m *Manager) detectAWSMetadata(location *metrics.CloudLocation) {
	// In a real implementation, you would query:
	// http://169.254.169.254/latest/meta-data/placement/availability-zone
	// http://169.254.169.254/latest/meta-data/instance-id
	// etc.
}

// detectAzureMetadata detects Azure-specific metadata
func (m *Manager) detectAzureMetadata(location *metrics.CloudLocation) {
	// In a real implementation, you would query:
	// http://169.254.169.254/metadata/instance/compute/location
	// http://169.254.169.254/metadata/instance/compute/vmId
	// etc.
}

// validateCustomTargets validates custom monitoring targets
func (m *Manager) validateCustomTargets(targets *metrics.CustomTargets) error {
	// Validate ping targets
	if len(targets.PingTargets) == 0 {
		targets.PingTargets = []string{"8.8.8.8", "1.1.1.1"}
	}
	
	// Validate HTTP targets
	for i := range targets.HTTPTargets {
		target := &targets.HTTPTargets[i]
		if target.URL == "" {
			return fmt.Errorf("HTTP target URL cannot be empty")
		}
		if target.Method == "" {
			target.Method = "GET"
		}
		if target.ExpectedCode == 0 {
			target.ExpectedCode = 200
		}
		if target.Timeout == 0 {
			target.Timeout = 10 * time.Second
		}
	}
	
	// Validate TCP ports
	if len(targets.TCPPorts) == 0 {
		targets.TCPPorts = []int{80, 443, 22, 53}
	}
	
	// Validate DNS servers
	if len(targets.DNSServers) == 0 {
		targets.DNSServers = []string{"8.8.8.8", "1.1.1.1"}
	}
	
	return nil
}

// GenerateDefaultConfig creates a default configuration file
func GenerateDefaultConfig(filePath string) error {
	manager := NewManager()
	manager.setDefaults()
	
	// Load to populate with defaults
	if err := manager.Load(); err != nil {
		return fmt.Errorf("failed to generate default config: %w", err)
	}
	
	return manager.SaveConfig(filePath)
} 