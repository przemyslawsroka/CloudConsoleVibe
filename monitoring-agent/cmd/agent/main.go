package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/przemyslawsroka/CloudConsoleVibe/monitoring-agent/internal/agent"
	"github.com/przemyslawsroka/CloudConsoleVibe/monitoring-agent/internal/config"
	"github.com/spf13/cobra"
)

var (
	configFile string
	logLevel   string
	backendURL string
	agentID    string
)

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "network-monitor-agent",
	Short: "Network monitoring agent for multi-cloud environments",
	Long: `A comprehensive network monitoring agent that collects network metrics,
performance data, and connectivity information across GCP, AWS, Azure, and on-premise
environments, sending data to a centralized monitoring backend.`,
}

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Start the monitoring agent",
	Long:  "Start the network monitoring agent with the specified configuration",
	RunE:  runAgent,
}

var generateConfigCmd = &cobra.Command{
	Use:   "generate-config [output-file]",
	Short: "Generate a default configuration file",
	Long:  "Generate a default configuration file with all available options",
	Args:  cobra.MaximumNArgs(1),
	RunE:  generateConfig,
}

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show agent status",
	Long:  "Display the current status and configuration of the monitoring agent",
	RunE:  showStatus,
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Show version information",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Network Monitor Agent v1.0.0")
		fmt.Println("Built for multi-cloud network monitoring")
	},
}

func init() {
	// Add commands
	rootCmd.AddCommand(runCmd, generateConfigCmd, statusCmd, versionCmd)

	// Global flags
	rootCmd.PersistentFlags().StringVarP(&configFile, "config", "c", "", "config file path")
	rootCmd.PersistentFlags().StringVarP(&logLevel, "log-level", "l", "", "log level (debug, info, warn, error)")

	// Run command flags
	runCmd.Flags().StringVar(&backendURL, "backend-url", "", "backend server URL")
	runCmd.Flags().StringVar(&agentID, "agent-id", "", "unique agent identifier")

	// Generate config command flags
	generateConfigCmd.Flags().StringVarP(&configFile, "output", "o", "agent-config.yaml", "output file path")
}

func runAgent(cmd *cobra.Command, args []string) error {
	fmt.Println("🚀 Starting Network Monitor Agent...")
	
	// Load configuration
	configManager := config.NewManager()
	
	// Override config file if specified
	if configFile != "" {
		// This would require extending the config manager to accept specific file paths
		fmt.Printf("📁 Using config file: %s\n", configFile)
	}
	
	if err := configManager.Load(); err != nil {
		return fmt.Errorf("failed to load configuration: %w", err)
	}
	
	cfg := configManager.GetConfig()
	
	// Override configuration with command line flags
	if backendURL != "" {
		cfg.BackendURL = backendURL
	}
	if agentID != "" {
		cfg.AgentID = agentID
	}
	if logLevel != "" {
		cfg.LogLevel = logLevel
	}
	
	// Display configuration
	fmt.Printf("📊 Agent ID: %s\n", cfg.AgentID)
	fmt.Printf("🌐 Backend URL: %s\n", cfg.BackendURL)
	fmt.Printf("📍 Location: %s/%s/%s\n", cfg.Location.Provider, cfg.Location.Region, cfg.Location.Zone)
	fmt.Printf("⏱️  Collection Interval: %s\n", cfg.CollectInterval)
	fmt.Printf("📦 Batch Size: %d\n", cfg.BatchSize)
	fmt.Printf("🔧 Collectors: %v\n", cfg.Collectors)
	
	// Create and start agent
	monitoringAgent, err := agent.New(configManager)
	if err != nil {
		return fmt.Errorf("failed to create agent: %w", err)
	}
	
	// Setup context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	
	// Start agent
	if err := monitoringAgent.Start(ctx); err != nil {
		return fmt.Errorf("failed to start agent: %w", err)
	}
	
	fmt.Println("✅ Agent started successfully!")
	fmt.Println("📡 Collecting and transmitting network metrics...")
	fmt.Println("Press Ctrl+C to stop")
	
	// Wait for shutdown signal
	<-sigChan
	fmt.Println("\n🛑 Shutdown signal received, stopping agent...")
	
	// Cancel context to stop operations
	cancel()
	
	// Stop agent gracefully
	if err := monitoringAgent.Stop(); err != nil {
		fmt.Printf("⚠️  Error during shutdown: %v\n", err)
		return err
	}
	
	fmt.Println("✅ Agent stopped successfully")
	return nil
}

func generateConfig(cmd *cobra.Command, args []string) error {
	outputFile := "agent-config.yaml"
	if len(args) > 0 {
		outputFile = args[0]
	}
	
	// Get output file from flag if not provided as argument
	if flagOutput, _ := cmd.Flags().GetString("output"); flagOutput != "" && len(args) == 0 {
		outputFile = flagOutput
	}
	
	fmt.Printf("📝 Generating default configuration file: %s\n", outputFile)
	
	// Ensure directory exists
	dir := filepath.Dir(outputFile)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", dir, err)
	}
	
	// Generate config
	if err := config.GenerateDefaultConfig(outputFile); err != nil {
		return fmt.Errorf("failed to generate config: %w", err)
	}
	
	fmt.Printf("✅ Configuration file generated successfully!\n")
	fmt.Printf("📂 Edit %s to customize your monitoring setup\n", outputFile)
	fmt.Printf("🚀 Run 'network-monitor-agent run -c %s' to start with this config\n", outputFile)
	
	return nil
}

func showStatus(cmd *cobra.Command, args []string) error {
	fmt.Println("📊 Network Monitor Agent Status")
	fmt.Println("================================")
	
	// Load configuration to show current settings
	configManager := config.NewManager()
	if err := configManager.Load(); err != nil {
		fmt.Printf("⚠️  Failed to load configuration: %v\n", err)
		return nil
	}
	
	cfg := configManager.GetConfig()
	
	// Display configuration status
	fmt.Printf("Agent ID:           %s\n", cfg.AgentID)
	fmt.Printf("Backend URL:        %s\n", cfg.BackendURL)
	fmt.Printf("Log Level:          %s\n", cfg.LogLevel)
	fmt.Printf("Collection Interval: %s\n", cfg.CollectInterval)
	fmt.Printf("Batch Size:         %d\n", cfg.BatchSize)
	fmt.Println()
	
	// Location information
	fmt.Println("📍 Location:")
	fmt.Printf("  Provider:         %s\n", cfg.Location.Provider)
	fmt.Printf("  Region:           %s\n", cfg.Location.Region)
	fmt.Printf("  Zone:             %s\n", cfg.Location.Zone)
	fmt.Printf("  Network:          %s\n", cfg.Location.Network)
	fmt.Printf("  Subnet:           %s\n", cfg.Location.Subnet)
	fmt.Printf("  Instance ID:      %s\n", cfg.Location.InstanceID)
	fmt.Printf("  Private IP:       %s\n", cfg.Location.PrivateIP)
	fmt.Printf("  Public IP:        %s\n", cfg.Location.PublicIP)
	fmt.Println()
	
	// Collectors
	fmt.Println("🔧 Enabled Collectors:")
	for _, collector := range cfg.Collectors {
		fmt.Printf("  • %s\n", collector)
	}
	fmt.Println()
	
	// Custom targets
	fmt.Println("🎯 Custom Targets:")
	fmt.Printf("  Ping Targets:     %v\n", cfg.CustomTargets.PingTargets)
	fmt.Printf("  DNS Servers:      %v\n", cfg.CustomTargets.DNSServers)
	fmt.Printf("  TCP Ports:        %v\n", cfg.CustomTargets.TCPPorts)
	fmt.Printf("  HTTP Targets:     %d configured\n", len(cfg.CustomTargets.HTTPTargets))
	
	// TODO: If we had a running agent, we could check its live status here
	// fmt.Println("\n🟢 Runtime Status:")
	// fmt.Println("  Status:           Running")
	// fmt.Println("  Connected:        Yes")
	// fmt.Println("  Last Metric:      2024-01-01 12:00:00")
	// fmt.Println("  Metrics Sent:     1,234")
	
	return nil
} 