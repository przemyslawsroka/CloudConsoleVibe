package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AgentID          string   `json:"agent_id"`
	BackendURL       string   `json:"backend_url"`
	CollectionInterval int    `json:"collection_interval"`
	Targets          []string `json:"targets"`
	Region           string   `json:"region"`
	Zone             string   `json:"zone"`
	Network          string   `json:"network"`
	Subnetwork       string   `json:"subnetwork"`
}

type NetworkMetrics struct {
	AgentID     string                 `json:"agent_id"`
	Timestamp   int64                  `json:"timestamp"`
	Hostname    string                 `json:"hostname"`
	Region      string                 `json:"region"`
	Zone        string                 `json:"zone"`
	Network     string                 `json:"network"`
	Subnetwork  string                 `json:"subnetwork"`
	PingResults []PingResult           `json:"ping_results"`
	NetworkInfo NetworkInfo            `json:"network_info"`
	SystemInfo  SystemInfo             `json:"system_info"`
}

type PingResult struct {
	Target      string  `json:"target"`
	Success     bool    `json:"success"`
	Latency     float64 `json:"latency_ms"`
	PacketLoss  float64 `json:"packet_loss"`
	Error       string  `json:"error,omitempty"`
}

type NetworkInfo struct {
	Interfaces []NetworkInterface `json:"interfaces"`
	Routes     []Route           `json:"routes"`
}

type NetworkInterface struct {
	Name      string   `json:"name"`
	Addresses []string `json:"addresses"`
	MTU       int      `json:"mtu"`
	State     string   `json:"state"`
}

type Route struct {
	Destination string `json:"destination"`
	Gateway     string `json:"gateway"`
	Interface   string `json:"interface"`
}

type SystemInfo struct {
	CPUUsage    float64 `json:"cpu_usage"`
	MemoryUsage float64 `json:"memory_usage"`
	DiskUsage   float64 `json:"disk_usage"`
	Uptime      int64   `json:"uptime"`
}

var config Config

func main() {
	log.Println("🚀 Starting CloudConsoleVibe Monitoring Agent")
	
	// Load configuration
	if err := loadConfig(); err != nil {
		log.Fatalf("❌ Failed to load config: %v", err)
	}
	
	log.Printf("✅ Agent ID: %s", config.AgentID)
	log.Printf("✅ Backend URL: %s", config.BackendURL)
	log.Printf("✅ Collection Interval: %d seconds", config.CollectionInterval)
	log.Printf("✅ Monitoring Targets: %v", config.Targets)
	
	// Register agent with backend
	if err := registerAgent(); err != nil {
		log.Printf("⚠️ Failed to register agent: %v", err)
	}
	
	// Start metrics collection loop
	ticker := time.NewTicker(time.Duration(config.CollectionInterval) * time.Second)
	defer ticker.Stop()
	
	// Collect initial metrics
	collectAndSendMetrics()
	
	// Start periodic collection
	for range ticker.C {
		collectAndSendMetrics()
	}
}

func loadConfig() error {
	// Try to load from environment variables first
	config.AgentID = getEnvOrDefault("AGENT_ID", "agent-"+getHostname())
	config.BackendURL = getEnvOrDefault("BACKEND_URL", "http://localhost:8080")
	config.Region = getEnvOrDefault("AGENT_REGION", "us-central1")
	config.Zone = getEnvOrDefault("AGENT_ZONE", "us-central1-a")
	config.Network = getEnvOrDefault("AGENT_NETWORK", "default")
	config.Subnetwork = getEnvOrDefault("AGENT_SUBNETWORK", "default")
	
	intervalStr := getEnvOrDefault("COLLECTION_INTERVAL", "30")
	interval, err := strconv.Atoi(intervalStr)
	if err != nil {
		return fmt.Errorf("invalid collection interval: %v", err)
	}
	config.CollectionInterval = interval
	
	// Load targets
	targetsStr := getEnvOrDefault("MONITORING_TARGETS", "8.8.8.8,1.1.1.1,google.com,cloudflare.com")
	config.Targets = strings.Split(targetsStr, ",")
	
	// Try to load from config file if exists
	if _, err := os.Stat("/etc/monitoring-agent/config.json"); err == nil {
		return loadConfigFromFile("/etc/monitoring-agent/config.json")
	}
	
	return nil
}

func loadConfigFromFile(filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()
	
	decoder := json.NewDecoder(file)
	return decoder.Decode(&config)
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getHostname() string {
	hostname, err := os.Hostname()
	if err != nil {
		return "unknown"
	}
	return hostname
}

func registerAgent() error {
	registrationData := map[string]interface{}{
		"id":         config.AgentID,
		"hostname":   getHostname(),
		"region":     config.Region,
		"zone":       config.Zone,
		"network":    config.Network,
		"subnetwork": config.Subnetwork,
		"status":     "connected",
		"version":    "1.0.0",
		"started_at": time.Now().Unix(),
	}
	
	jsonData, err := json.Marshal(registrationData)
	if err != nil {
		return err
	}
	
	resp, err := http.Post(
		config.BackendURL+"/api/v1/agents/register",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("registration failed with status: %d", resp.StatusCode)
	}
	
	log.Println("✅ Agent registered successfully")
	return nil
}

func collectAndSendMetrics() {
	log.Println("📊 Collecting network metrics...")
	
	metrics := NetworkMetrics{
		AgentID:     config.AgentID,
		Timestamp:   time.Now().Unix(),
		Hostname:    getHostname(),
		Region:      config.Region,
		Zone:        config.Zone,
		Network:     config.Network,
		Subnetwork:  config.Subnetwork,
		PingResults: collectPingMetrics(),
		NetworkInfo: collectNetworkInfo(),
		SystemInfo:  collectSystemInfo(),
	}
	
	if err := sendMetrics(metrics); err != nil {
		log.Printf("❌ Failed to send metrics: %v", err)
	} else {
		log.Printf("✅ Metrics sent successfully (targets: %d)", len(metrics.PingResults))
	}
}

func collectPingMetrics() []PingResult {
	var results []PingResult
	
	for _, target := range config.Targets {
		result := pingTarget(target)
		results = append(results, result)
	}
	
	return results
}

func pingTarget(target string) PingResult {
	start := time.Now()
	
	// Use ping command
	cmd := exec.Command("ping", "-c", "3", "-W", "5", target)
	output, err := cmd.Output()
	
	if err != nil {
		return PingResult{
			Target:  target,
			Success: false,
			Error:   err.Error(),
		}
	}
	
	// Parse ping output for latency and packet loss
	outputStr := string(output)
	latency := parsePingLatency(outputStr)
	packetLoss := parsePingPacketLoss(outputStr)
	
	return PingResult{
		Target:     target,
		Success:    true,
		Latency:    latency,
		PacketLoss: packetLoss,
	}
}

func parsePingLatency(output string) float64 {
	// Look for "time=" in ping output
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.Contains(line, "time=") {
			parts := strings.Split(line, "time=")
			if len(parts) > 1 {
				timeStr := strings.Fields(parts[1])[0]
				if latency, err := strconv.ParseFloat(timeStr, 64); err == nil {
					return latency
				}
			}
		}
	}
	return 0
}

func parsePingPacketLoss(output string) float64 {
	// Look for packet loss percentage
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		if strings.Contains(line, "packet loss") {
			parts := strings.Fields(line)
			for i, part := range parts {
				if strings.Contains(part, "%") && i > 0 {
					lossStr := strings.TrimSuffix(part, "%")
					if loss, err := strconv.ParseFloat(lossStr, 64); err == nil {
						return loss
					}
				}
			}
		}
	}
	return 0
}

func collectNetworkInfo() NetworkInfo {
	interfaces := collectNetworkInterfaces()
	routes := collectRoutes()
	
	return NetworkInfo{
		Interfaces: interfaces,
		Routes:     routes,
	}
}

func collectNetworkInterfaces() []NetworkInterface {
	var interfaces []NetworkInterface
	
	ifaces, err := net.Interfaces()
	if err != nil {
		log.Printf("❌ Failed to get network interfaces: %v", err)
		return interfaces
	}
	
	for _, iface := range ifaces {
		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		
		var addresses []string
		for _, addr := range addrs {
			addresses = append(addresses, addr.String())
		}
		
		state := "down"
		if iface.Flags&net.FlagUp != 0 {
			state = "up"
		}
		
		interfaces = append(interfaces, NetworkInterface{
			Name:      iface.Name,
			Addresses: addresses,
			MTU:       iface.MTU,
			State:     state,
		})
	}
	
	return interfaces
}

func collectRoutes() []Route {
	var routes []Route
	
	// Use ip route command on Linux
	cmd := exec.Command("ip", "route")
	output, err := cmd.Output()
	if err != nil {
		return routes
	}
	
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		
		fields := strings.Fields(line)
		if len(fields) >= 3 {
			route := Route{
				Destination: fields[0],
			}
			
			// Parse gateway and interface
			for i, field := range fields {
				if field == "via" && i+1 < len(fields) {
					route.Gateway = fields[i+1]
				}
				if field == "dev" && i+1 < len(fields) {
					route.Interface = fields[i+1]
				}
			}
			
			routes = append(routes, route)
		}
	}
	
	return routes
}

func collectSystemInfo() SystemInfo {
	return SystemInfo{
		CPUUsage:    getCPUUsage(),
		MemoryUsage: getMemoryUsage(),
		DiskUsage:   getDiskUsage(),
		Uptime:      getUptime(),
	}
}

func getCPUUsage() float64 {
	// Simple CPU usage calculation
	cmd := exec.Command("sh", "-c", "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1")
	output, err := cmd.Output()
	if err != nil {
		return 0
	}
	
	cpuStr := strings.TrimSpace(string(output))
	if cpu, err := strconv.ParseFloat(cpuStr, 64); err == nil {
		return cpu
	}
	return 0
}

func getMemoryUsage() float64 {
	cmd := exec.Command("sh", "-c", "free | grep Mem | awk '{printf \"%.2f\", $3/$2 * 100.0}'")
	output, err := cmd.Output()
	if err != nil {
		return 0
	}
	
	memStr := strings.TrimSpace(string(output))
	if mem, err := strconv.ParseFloat(memStr, 64); err == nil {
		return mem
	}
	return 0
}

func getDiskUsage() float64 {
	cmd := exec.Command("sh", "-c", "df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1")
	output, err := cmd.Output()
	if err != nil {
		return 0
	}
	
	diskStr := strings.TrimSpace(string(output))
	if disk, err := strconv.ParseFloat(diskStr, 64); err == nil {
		return disk
	}
	return 0
}

func getUptime() int64 {
	cmd := exec.Command("sh", "-c", "cat /proc/uptime | cut -d' ' -f1")
	output, err := cmd.Output()
	if err != nil {
		return 0
	}
	
	uptimeStr := strings.TrimSpace(string(output))
	if uptime, err := strconv.ParseFloat(uptimeStr, 64); err == nil {
		return int64(uptime)
	}
	return 0
}

func sendMetrics(metrics NetworkMetrics) error {
	jsonData, err := json.Marshal(metrics)
	if err != nil {
		return err
	}
	
	resp, err := http.Post(
		config.BackendURL+"/api/v1/metrics",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("metrics submission failed with status: %d", resp.StatusCode)
	}
	
	return nil
} 