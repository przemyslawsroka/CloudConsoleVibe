import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  GoogleGenAI, 
  LiveServerMessage, 
  MediaResolution, 
  Modality, 
  Session 
} from '@google/genai';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type: 'text' | 'audio' | 'system';
}

export interface VoiceSessionState {
  isActive: boolean;
  isRecording: boolean;
  isProcessing: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiAiService {
  private session: Session | undefined = undefined;
  private responseQueue: LiveServerMessage[] = [];
  private audioParts: string[] = [];
  
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private voiceSessionSubject = new BehaviorSubject<VoiceSessionState>({
    isActive: false,
    isRecording: false,
    isProcessing: false
  });
  
  public messages$: Observable<ChatMessage[]> = this.messagesSubject.asObservable();
  public voiceSession$: Observable<VoiceSessionState> = this.voiceSessionSubject.asObservable();

  constructor() {
    this.addSystemMessage('Hello! I\'m your Google Cloud Console AI assistant. I can help you navigate the console, explain GCP services, and provide guidance. Click "Share your screen" to start a voice conversation!');
  }

  async sendTextMessage(message: string): Promise<void> {
    const userMessage: ChatMessage = {
      id: this.generateId(),
      content: message,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };
    
    this.addMessage(userMessage);
    
    try {
      // For now, simulate AI response - you can enhance this with actual Gemini API
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: this.generateId(),
          content: this.generateResponse(message),
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        this.addMessage(aiResponse);
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      this.addSystemMessage('Sorry, I encountered an error. Please try again.');
    }
  }

  async startVoiceSession(): Promise<void> {
    try {
      this.updateVoiceSession({ isActive: true, isRecording: false, isProcessing: true });
      
      const ai = new GoogleGenAI({
        apiKey: environment.geminiApiKey,
      });

      const model = 'models/gemini-2.5-flash-preview-native-audio-dialog';

      const config = {
        responseModalities: [Modality.AUDIO],
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Zephyr',
            }
          }
        },
        contextWindowCompression: {
          triggerTokens: '25600',
          slidingWindow: { targetTokens: '12800' },
        },
      };

      this.session = await ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            console.debug('Voice session opened');
            this.updateVoiceSession({ isActive: true, isRecording: true, isProcessing: false });
            this.addSystemMessage('Voice session started! You can now speak to me.');
          },
          onmessage: (message: LiveServerMessage) => {
            this.responseQueue.push(message);
            this.handleModelTurn(message);
          },
          onerror: (e: ErrorEvent) => {
            console.error('Voice session error:', e.message);
            this.addSystemMessage(`Voice session error: ${e.message}`);
            this.stopVoiceSession();
          },
          onclose: (e: CloseEvent) => {
            console.debug('Voice session closed:', e.reason);
            this.updateVoiceSession({ isActive: false, isRecording: false, isProcessing: false });
            this.addSystemMessage('Voice session ended.');
          },
        },
        config
      });

      // Send initial context about the application
      this.session.sendClientContent({
        turns: [
          `You are an AI assistant for CloudConsoleVibe, a demo Google Cloud Console application. 
           Help users navigate the interface, explain GCP networking features, and provide guidance on:
           - VPC networks and subnets
           - Load balancing
           - Cloud NAT and DNS
           - Firewall rules and security
           - Monitoring and observability
           - Kubernetes clusters
           Be helpful, concise, and focus on Google Cloud Platform networking services.`
        ]
      });

    } catch (error) {
      console.error('Error starting voice session:', error);
      this.addSystemMessage('Failed to start voice session. Please check your microphone permissions.');
      this.updateVoiceSession({ isActive: false, isRecording: false, isProcessing: false });
    }
  }

  async stopVoiceSession(): Promise<void> {
    if (this.session) {
      this.session.close();
      this.session = undefined;
    }
    this.updateVoiceSession({ isActive: false, isRecording: false, isProcessing: false });
  }

  async shareScreen(): Promise<void> {
    try {
      // Request screen sharing permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      this.addSystemMessage('Screen sharing started! I can now see your screen and provide contextual help.');
      
      // Start voice session if not already active
      if (!this.voiceSessionSubject.value.isActive) {
        await this.startVoiceSession();
      }
      
      // Handle screen sharing logic here
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          this.addSystemMessage('Screen sharing ended.');
        });
      });
      
    } catch (error) {
      console.error('Error sharing screen:', error);
      this.addSystemMessage('Failed to share screen. Please check your browser permissions.');
    }
  }

  private handleModelTurn(message: LiveServerMessage): void {
    if (message.serverContent?.modelTurn?.parts) {
      const part = message.serverContent.modelTurn.parts[0];

      if (part?.text) {
        const aiMessage: ChatMessage = {
          id: this.generateId(),
          content: part.text,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        this.addMessage(aiMessage);
      }

      if (part?.inlineData) {
        this.audioParts.push(part.inlineData.data ?? '');
        this.playAudioResponse();
        
        const aiMessage: ChatMessage = {
          id: this.generateId(),
          content: '[Voice Response]',
          isUser: false,
          timestamp: new Date(),
          type: 'audio'
        };
        this.addMessage(aiMessage);
      }
    }
  }

  private playAudioResponse(): void {
    // Convert audio parts to playable audio
    try {
      const audioData = this.audioParts.join('');
      const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], 
        { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      this.audioParts = []; // Clear after playing
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  }

  private generateResponse(userMessage: string): string {
    const responses = [
      "I can help you with Google Cloud Platform networking services. What specific area would you like to explore?",
      "For VPC configuration, you can use the Network topology section to visualize your setup.",
      "Load balancing in GCP offers several options. Would you like me to explain the different types?",
      "Security is crucial - check the Firewall section to review your current rules.",
      "The monitoring dashboard provides real-time insights into your network performance.",
      "For Kubernetes networking, visit the GKE Clusters section for detailed cluster information."
    ];
    
    // Simple keyword-based responses
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('vpc') || lowerMessage.includes('network')) {
      return "VPC networks are the foundation of your Google Cloud networking. You can manage them in the VPC section where you'll find network topology, subnets, and routing configurations.";
    }
    if (lowerMessage.includes('load') || lowerMessage.includes('balancer')) {
      return "Google Cloud offers various load balancing options: HTTP(S), TCP/SSL Proxy, and Network Load Balancers. Check the Load Balancing section to configure and monitor your load balancers.";
    }
    if (lowerMessage.includes('firewall') || lowerMessage.includes('security')) {
      return "Firewall rules control traffic to your resources. Visit the Network Security section to manage firewall rules, Cloud Armor policies, and other security features.";
    }
    if (lowerMessage.includes('monitor') || lowerMessage.includes('metrics')) {
      return "The Monitoring section provides comprehensive network observability with real-time metrics, agent management, and performance insights.";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private addMessage(message: ChatMessage): void {
    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, message]);
  }

  private addSystemMessage(content: string): void {
    const systemMessage: ChatMessage = {
      id: this.generateId(),
      content,
      isUser: false,
      timestamp: new Date(),
      type: 'system'
    };
    this.addMessage(systemMessage);
  }

  private updateVoiceSession(state: Partial<VoiceSessionState>): void {
    const currentState = this.voiceSessionSubject.value;
    this.voiceSessionSubject.next({ ...currentState, ...state });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
    this.addSystemMessage('Chat cleared. How can I help you with Google Cloud Console?');
  }
} 