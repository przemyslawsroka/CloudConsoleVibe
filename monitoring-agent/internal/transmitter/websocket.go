package transmitter

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/przemyslawsroka/CloudConsoleVibe/monitoring-agent/pkg/metrics"
	"github.com/sirupsen/logrus"
)

// WebSocketTransmitter sends metrics via WebSocket connection
type WebSocketTransmitter struct {
	serverURL    string
	agentID      string
	location     metrics.CloudLocation
	conn         *websocket.Conn
	connected    bool
	mutex        sync.RWMutex
	logger       *logrus.Logger
	reconnectInterval time.Duration
	writeTimeout     time.Duration
	readTimeout      time.Duration
	pingInterval     time.Duration
	stopChan         chan bool
	doneChan         chan bool
}

// NewWebSocketTransmitter creates a new WebSocket-based metric transmitter
func NewWebSocketTransmitter(serverURL, agentID string, location metrics.CloudLocation, logger *logrus.Logger) *WebSocketTransmitter {
	return &WebSocketTransmitter{
		serverURL:         serverURL,
		agentID:          agentID,
		location:         location,
		logger:           logger,
		reconnectInterval: 10 * time.Second,
		writeTimeout:     10 * time.Second,
		readTimeout:      60 * time.Second,
		pingInterval:     30 * time.Second,
		stopChan:         make(chan bool),
		doneChan:         make(chan bool),
	}
}

// Connect establishes WebSocket connection to the backend
func (wst *WebSocketTransmitter) Connect() error {
	wst.mutex.Lock()
	defer wst.mutex.Unlock()

	if wst.connected {
		return nil
	}

	// Parse and construct WebSocket URL
	u, err := url.Parse(wst.serverURL)
	if err != nil {
		return fmt.Errorf("invalid server URL: %w", err)
	}

	// Convert HTTP(S) to WS(S)
	switch u.Scheme {
	case "http":
		u.Scheme = "ws"
	case "https":
		u.Scheme = "wss"
	}

	// Add agent registration path
	u.Path = "/api/v1/agents/connect"

	// Add query parameters
	query := u.Query()
	query.Set("agent_id", wst.agentID)
	query.Set("provider", wst.location.Provider)
	query.Set("region", wst.location.Region)
	u.RawQuery = query.Encode()

	wst.logger.WithField("url", u.String()).Info("Connecting to backend")

	// Establish WebSocket connection
	dialer := websocket.DefaultDialer
	dialer.HandshakeTimeout = 30 * time.Second

	conn, _, err := dialer.Dial(u.String(), nil)
	if err != nil {
		return fmt.Errorf("failed to connect to WebSocket: %w", err)
	}

	wst.conn = conn
	wst.connected = true

	// Send initial registration message
	if err := wst.sendRegistration(); err != nil {
		wst.conn.Close()
		wst.connected = false
		return fmt.Errorf("failed to register agent: %w", err)
	}

	// Start connection management goroutines
	go wst.pingHandler()
	go wst.readHandler()

	wst.logger.Info("Successfully connected to backend")
	return nil
}

// Disconnect closes the WebSocket connection
func (wst *WebSocketTransmitter) Disconnect() error {
	wst.mutex.Lock()
	defer wst.mutex.Unlock()

	if !wst.connected {
		return nil
	}

	wst.logger.Info("Disconnecting from backend")

	// Signal goroutines to stop
	close(wst.stopChan)

	// Close WebSocket connection
	if wst.conn != nil {
		wst.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
		wst.conn.Close()
		wst.conn = nil
	}

	wst.connected = false

	// Wait for goroutines to finish
	select {
	case <-wst.doneChan:
	case <-time.After(5 * time.Second):
		wst.logger.Warn("Timeout waiting for connection handlers to stop")
	}

	wst.logger.Info("Disconnected from backend")
	return nil
}

// IsConnected returns the current connection status
func (wst *WebSocketTransmitter) IsConnected() bool {
	wst.mutex.RLock()
	defer wst.mutex.RUnlock()
	return wst.connected
}

// Send transmits a batch of metrics to the backend
func (wst *WebSocketTransmitter) Send(ctx context.Context, batchMetrics []metrics.Metric) error {
	if !wst.IsConnected() {
		return fmt.Errorf("not connected to backend")
	}

	batch := metrics.MetricBatch{
		AgentID:   wst.agentID,
		Timestamp: time.Now(),
		Metrics:   batchMetrics,
		Location:  wst.location,
	}

	message := map[string]interface{}{
		"type": "metrics",
		"data": batch,
	}

	return wst.sendMessage(message)
}

// sendRegistration sends initial agent registration
func (wst *WebSocketTransmitter) sendRegistration() error {
	registration := map[string]interface{}{
		"type": "registration",
		"data": map[string]interface{}{
			"agent_id":  wst.agentID,
			"location":  wst.location,
			"timestamp": time.Now(),
			"version":   "1.0.0",
		},
	}

	return wst.sendMessage(registration)
}

// sendMessage sends a JSON message over WebSocket
func (wst *WebSocketTransmitter) sendMessage(message interface{}) error {
	wst.mutex.Lock()
	defer wst.mutex.Unlock()

	if !wst.connected || wst.conn == nil {
		return fmt.Errorf("connection not available")
	}

	// Set write timeout
	wst.conn.SetWriteDeadline(time.Now().Add(wst.writeTimeout))

	// Send JSON message
	if err := wst.conn.WriteJSON(message); err != nil {
		wst.logger.WithError(err).Error("Failed to send message")
		wst.connected = false
		return fmt.Errorf("failed to send message: %w", err)
	}

	return nil
}

// pingHandler sends periodic ping messages to keep connection alive
func (wst *WebSocketTransmitter) pingHandler() {
	defer func() {
		wst.doneChan <- true
	}()

	ticker := time.NewTicker(wst.pingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if wst.IsConnected() {
				wst.mutex.Lock()
				if wst.conn != nil {
					wst.conn.SetWriteDeadline(time.Now().Add(wst.writeTimeout))
					if err := wst.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
						wst.logger.WithError(err).Error("Failed to send ping")
						wst.connected = false
					}
				}
				wst.mutex.Unlock()
			}
		case <-wst.stopChan:
			return
		}
	}
}

// readHandler handles incoming messages from the backend
func (wst *WebSocketTransmitter) readHandler() {
	defer func() {
		wst.doneChan <- true
	}()

	for {
		select {
		case <-wst.stopChan:
			return
		default:
			if !wst.IsConnected() {
				time.Sleep(1 * time.Second)
				continue
			}

			wst.mutex.Lock()
			if wst.conn == nil {
				wst.mutex.Unlock()
				continue
			}

			wst.conn.SetReadDeadline(time.Now().Add(wst.readTimeout))
			messageType, message, err := wst.conn.ReadMessage()
			wst.mutex.Unlock()

			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					wst.logger.WithError(err).Error("WebSocket connection error")
				}
				wst.mutex.Lock()
				wst.connected = false
				wst.mutex.Unlock()
				return
			}

			wst.handleMessage(messageType, message)
		}
	}
}

// handleMessage processes incoming messages from the backend
func (wst *WebSocketTransmitter) handleMessage(messageType int, message []byte) {
	switch messageType {
	case websocket.TextMessage:
		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err != nil {
			wst.logger.WithError(err).Error("Failed to parse message")
			return
		}

		msgType, ok := msg["type"].(string)
		if !ok {
			wst.logger.Error("Message without type field")
			return
		}

		switch msgType {
		case "ping":
			// Respond to ping
			pong := map[string]interface{}{
				"type": "pong",
				"data": map[string]interface{}{
					"timestamp": time.Now(),
				},
			}
			wst.sendMessage(pong)

		case "config_update":
			// Handle configuration updates
			wst.logger.Info("Received configuration update")
			// TODO: Implement configuration update handling

		case "command":
			// Handle remote commands
			wst.logger.Info("Received remote command")
			// TODO: Implement remote command handling

		default:
			wst.logger.WithField("type", msgType).Debug("Received unknown message type")
		}

	case websocket.PongMessage:
		wst.logger.Debug("Received pong message")

	default:
		wst.logger.WithField("type", messageType).Debug("Received unknown message type")
	}
}

// StartReconnectLoop starts automatic reconnection in case of connection loss
func (wst *WebSocketTransmitter) StartReconnectLoop(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(wst.reconnectInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if !wst.IsConnected() {
					wst.logger.Info("Attempting to reconnect to backend")
					if err := wst.Connect(); err != nil {
						wst.logger.WithError(err).Error("Failed to reconnect")
					} else {
						wst.logger.Info("Successfully reconnected to backend")
					}
				}
			}
		}
	}()
} 