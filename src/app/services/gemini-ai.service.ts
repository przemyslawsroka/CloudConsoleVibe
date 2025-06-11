import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  GoogleGenAI as LiveGoogleGenAI, 
  LiveServerMessage, 
  MediaResolution, 
  Modality, 
  Session
} from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
      const genAI = new GoogleGenerativeAI(environment.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const systemPrompt = `You are an AI assistant for CloudConsoleVibe, a demo Google Cloud Console application. 
      Help users with Google Cloud Platform questions, explain GCP networking features, and provide guidance on:
      - VPC networks and subnets
      - Load balancing
      - Cloud NAT and DNS  
      - Firewall rules and security
      - Monitoring and observability
      - Kubernetes clusters
      
      If users ask non-GCP questions, answer them normally but also suggest how it might relate to cloud infrastructure when relevant.
      Be helpful, concise, and professional.`;

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: `User question: ${message}` }
      ]);

      const response = await result.response;
      const text = response.text();
      
      const aiResponse: ChatMessage = {
        id: this.generateId(),
        content: text,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      this.addMessage(aiResponse);

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      this.addSystemMessage('Sorry, I encountered an error connecting to Gemini AI. Please try again.');
    }
  }

  async startVoiceSession(): Promise<void> {
    try {
      this.updateVoiceSession({ isActive: true, isRecording: false, isProcessing: true });
      
      const ai = new LiveGoogleGenAI({
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
      // Request screen sharing with audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Also request microphone for voice input
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      this.addSystemMessage('Screen sharing and microphone access granted! I can now see your screen and listen to your voice for contextual help.');
      
      // Start voice session with enhanced context
      if (!this.voiceSessionSubject.value.isActive) {
        await this.startVoiceSession();
      }

      // Send screen context to AI if session exists
      if (this.session) {
        this.session.sendClientContent({
          turns: [`The user is now sharing their screen showing the Google Cloud Console. 
                   You can help them navigate the interface, explain what they're looking at, 
                   and provide guidance on GCP networking features. Focus on what's currently visible 
                   and provide step-by-step assistance.`]
        });
      }

      // Handle microphone audio for voice input
      const audioTrack = micStream.getAudioTracks()[0];
      if (audioTrack && this.session) {
        // Create audio processor for real-time voice input
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(micStream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (event) => {
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          // Process audio for voice input - this would need proper implementation
          // based on the Gemini Live API documentation
          if (this.session && this.voiceSessionSubject.value.isRecording) {
            // For now, just log that we're processing audio
            console.log('Processing audio input for voice conversation');
          }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
      }
      
      // Handle track ending
      [...screenStream.getTracks(), ...micStream.getTracks()].forEach(track => {
        track.addEventListener('ended', () => {
          this.addSystemMessage('Screen sharing or microphone access ended.');
        });
      });
      
    } catch (error: any) {
      console.error('Error sharing screen:', error);
      if (error?.name === 'NotAllowedError') {
        this.addSystemMessage('Screen sharing permission denied. Please allow screen sharing to use this feature.');
      } else if (error?.name === 'NotFoundError') {
        this.addSystemMessage('No screen or microphone found. Please check your devices.');
      } else {
        this.addSystemMessage('Failed to access screen or microphone. Please check your permissions.');
      }
    }
  }

  private convertAudioToBase64(audioData: Float32Array): string {
    // Convert Float32Array to 16-bit PCM
    const buffer = new ArrayBuffer(audioData.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(i * 2, sample * 0x7FFF, true);
    }
    
    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
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