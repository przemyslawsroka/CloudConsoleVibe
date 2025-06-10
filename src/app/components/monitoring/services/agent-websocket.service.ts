import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Agent, Metric } from './monitoring.service';

export interface WebSocketMessage {
  type: 'agent_connected' | 'agent_disconnected' | 'metric_received' | 'agent_updated' | 'system_alert';
  data: any;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AgentWebSocketService {
  private ws: WebSocket | null = null;
  private readonly wsUrl: string;
  private reconnectInterval = 5000;
  private maxReconnectAttempts = 10;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;

  // Subjects for different types of messages
  private messagesSubject = new Subject<WebSocketMessage>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private agentUpdatesSubject = new Subject<Agent>();
  private metricUpdatesSubject = new Subject<Metric>();
  private systemAlertsSubject = new Subject<any>();

  // Public observables
  public messages$ = this.messagesSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public agentUpdates$ = this.agentUpdatesSubject.asObservable();
  public metricUpdates$ = this.metricUpdatesSubject.asObservable();
  public systemAlerts$ = this.systemAlertsSubject.asObservable();

  constructor() {
    // Convert HTTP URL to WebSocket URL
    const baseUrl = environment.apiBaseUrl || 'https://cloudconsolevibe-backend-6anbejtsta-uc.a.run.app';
    this.wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';
    console.log('WebSocket URL configured:', this.wsUrl);
  }

  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected to agent system');
        this.connectionStatusSubject.next(true);
        this.reconnectAttempts = 0;
        
        // Send authentication/identification message
        this.send({
          type: 'client_connect',
          data: {
            clientType: 'dashboard',
            timestamp: new Date().toISOString()
          }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          message.timestamp = new Date(message.timestamp);
          
          this.messagesSubject.next(message);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.connectionStatusSubject.next(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatusSubject.next(false);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.connectionStatusSubject.next(false);
  }

  public send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'agent_connected':
      case 'agent_disconnected':
      case 'agent_updated':
        if (message.data) {
          this.agentUpdatesSubject.next(message.data as Agent);
        }
        break;

      case 'metric_received':
        if (message.data) {
          this.metricUpdatesSubject.next(message.data as Metric);
        }
        break;

      case 'system_alert':
        this.systemAlertsSubject.next(message.data);
        break;

      default:
        console.log('Unhandled WebSocket message type:', message.type);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectInterval);
  }

  // Utility methods
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getConnectionStatus(): boolean {
    return this.connectionStatusSubject.value;
  }

  // Request specific data
  public requestAgentList(): void {
    this.send({
      type: 'request_agents',
      data: { timestamp: new Date().toISOString() }
    });
  }

  public requestMetrics(agentId?: string, metricType?: string): void {
    this.send({
      type: 'request_metrics',
      data: {
        agent_id: agentId,
        metric_type: metricType,
        timestamp: new Date().toISOString()
      }
    });
  }

  public subscribeToAgent(agentId: string): void {
    this.send({
      type: 'subscribe_agent',
      data: {
        agent_id: agentId,
        timestamp: new Date().toISOString()
      }
    });
  }

  public unsubscribeFromAgent(agentId: string): void {
    this.send({
      type: 'unsubscribe_agent',
      data: {
        agent_id: agentId,
        timestamp: new Date().toISOString()
      }
    });
  }
} 