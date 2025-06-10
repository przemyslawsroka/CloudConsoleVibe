package metrics

import (
	"context"
	"time"
)

// Metric represents a single network monitoring metric
type Metric struct {
	Name      string            `json:"name"`
	Value     float64           `json:"value"`
	Unit      string            `json:"unit"`
	Timestamp time.Time         `json:"timestamp"`
	Tags      map[string]string `json:"tags"`
	Type      MetricType        `json:"type"`
}

// MetricType defines the type of metric being collected
type MetricType string

const (
	MetricTypeGauge     MetricType = "gauge"
	MetricTypeCounter   MetricType = "counter"
	MetricTypeHistogram MetricType = "histogram"
	MetricTypeTiming    MetricType = "timing"
)

// MetricCollector interface for all metric collection modules
type MetricCollector interface {
	Name() string
	Collect(ctx context.Context) ([]Metric, error)
	Interval() time.Duration
	Start(ctx context.Context) error
	Stop() error
}

// MetricTransmitter interface for sending metrics to backend
type MetricTransmitter interface {
	Send(ctx context.Context, metrics []Metric) error
	Connect() error
	Disconnect() error
	IsConnected() bool
}

// CloudLocation represents the location where the agent is running
type CloudLocation struct {
	Provider   string `json:"provider" yaml:"provider"`     // "gcp", "aws", "azure", "on-premise"
	Region     string `json:"region" yaml:"region"`
	Zone       string `json:"zone" yaml:"zone"`
	Network    string `json:"network" yaml:"network"`
	Subnet     string `json:"subnet" yaml:"subnet"`
	InstanceID string `json:"instance_id" yaml:"instance_id"`
	PrivateIP  string `json:"private_ip" yaml:"private_ip"`
	PublicIP   string `json:"public_ip" yaml:"public_ip"`
}

// AgentConfig represents the configuration for the monitoring agent
type AgentConfig struct {
	AgentID        string        `json:"agent_id" yaml:"agent_id"`
	Location       CloudLocation `json:"location" yaml:"location"`
	BackendURL     string        `json:"backend_url" yaml:"backend_url"`
	CollectInterval time.Duration `json:"collect_interval" yaml:"collect_interval"`
	BatchSize      int           `json:"batch_size" yaml:"batch_size"`
	LogLevel       string        `json:"log_level" yaml:"log_level"`
	Collectors     []string      `json:"collectors" yaml:"collectors"`
	CustomTargets  CustomTargets `json:"custom_targets" yaml:"custom_targets"`
}

// CustomTargets represents user-defined monitoring targets
type CustomTargets struct {
	PingTargets []string          `json:"ping_targets" yaml:"ping_targets"`
	HTTPTargets []HTTPTarget      `json:"http_targets" yaml:"http_targets"`
	TCPPorts    []int             `json:"tcp_ports" yaml:"tcp_ports"`
	DNSServers  []string          `json:"dns_servers" yaml:"dns_servers"`
	CustomHosts map[string]string `json:"custom_hosts" yaml:"custom_hosts"`
}

// HTTPTarget represents an HTTP endpoint to monitor
type HTTPTarget struct {
	URL           string            `json:"url" yaml:"url"`
	Method        string            `json:"method" yaml:"method"`
	ExpectedCode  int               `json:"expected_code" yaml:"expected_code"`
	Timeout       time.Duration     `json:"timeout" yaml:"timeout"`
	Headers       map[string]string `json:"headers" yaml:"headers"`
	FollowRedirect bool             `json:"follow_redirect" yaml:"follow_redirect"`
}

// MetricBatch represents a batch of metrics to be transmitted
type MetricBatch struct {
	AgentID   string    `json:"agent_id"`
	Timestamp time.Time `json:"timestamp"`
	Metrics   []Metric  `json:"metrics"`
	Location  CloudLocation `json:"location"`
} 