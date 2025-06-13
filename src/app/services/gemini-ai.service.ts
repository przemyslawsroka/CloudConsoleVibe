import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  GoogleGenAI as LiveGoogleGenAI, 
  LiveServerMessage, 
  MediaResolution, 
  Modality, 
  Session,
  VoiceConfig,
  SpeechConfig,
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
  microphoneLevel: number; // 0-100 indicating microphone input level
  isMicrophoneDetected: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiAiService {
  private session: Session | undefined = undefined;
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private micStream: MediaStream | null = null;
  private isMicrophoneActive = false;
  private audioPlayer: HTMLAudioElement | null = null;
  private audioBuffer: string[] = [];
  private isPlayingAudio = false;
  private currentTurnText: string = '';

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$: Observable<ChatMessage[]> = this.messagesSubject.asObservable();
  
  private voiceSessionSubject = new BehaviorSubject<VoiceSessionState>({
    isActive: false,
    isRecording: false,
    isProcessing: false,
    microphoneLevel: 0,
    isMicrophoneDetected: false
  });
  public voiceSession$: Observable<VoiceSessionState> = this.voiceSessionSubject.asObservable();
  public microphoneVolume$ = new BehaviorSubject<number>(0);

  constructor(private zone: NgZone) {
    this.addSystemMessage('Hello! I\'m your Google Cloud Console AI assistant. I can help you navigate the console, explain GCP services, and provide guidance. Click "Start AI Assistant" to start a voice conversation!');
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

  public async startVoiceSession(): Promise<void> {
    try {
      this.updateVoiceSession({ isActive: true, isRecording: false, isProcessing: true, isMicrophoneDetected: false });
      
      const ai = new LiveGoogleGenAI({
        apiKey: environment.geminiApiKey,
        apiVersion: 'v1alpha'
      });

      const model = 'models/gemini-2.5-flash-preview-native-audio-dialog';
      const config = {
        responseModalities: [Modality.AUDIO, Modality.TEXT],
      };

      this.session = await ai.live.connect({
        model,
        callbacks: {
          onopen: async () => {
            console.debug('🚀 Voice session connection opened.');
            
            try {
              await this.setupMicrophoneStreaming();
              if (this.session) {
                console.log('✉️ Sending initial prompt to Gemini...');
                await this.session.sendClientContent({
                  turns: [
                    {
                      role: 'user',
                      parts: [{
                        text: `System prompt: You are an AI assistant for CloudConsoleVibe, a demo Google Cloud Console application. Your main role is to help users with questions about Google Cloud Platform. 
                    
                          Instructions for our conversation:
                          1. Start our conversation with a very short, friendly, one-sentence welcome message.
                          2. After your welcome, wait for me to speak.
                          3. Keep your answers concise and to the point.
                          
                          Begin.`
                      }]
                    }
                  ]
                });
                console.log('✅ Initial prompt sent.');
              }

              this.isMicrophoneActive = true;
              this.updateVoiceSession({ isActive: true, isRecording: true, isProcessing: false, isMicrophoneDetected: true });
              this.addSystemMessage('🎤 Voice session started! You can now speak to me.');

            } catch (error) {
              console.error('❌ Failed during voice session setup:', error);
              this.addSystemMessage('❌ Failed to access microphone. Please check permissions and try again.');
              await this.stopVoiceSession();
            }
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleLiveMessage(message);
          },
          onerror: async (e: ErrorEvent) => {
            console.error('Voice session error:', e.message);
            this.addSystemMessage(`❌ Voice session error: ${e.message}`);
            await this.stopVoiceSession();
          },
          onclose: async (e: CloseEvent) => {
            console.debug('Voice session closed:', e.reason);
            await this.stopVoiceSession();
          },
        },
        config
      });

    } catch (error) {
      console.error('Error starting voice session:', error);
      this.addSystemMessage('Failed to start voice session. Please check your microphone permissions.');
      this.updateVoiceSession({ isActive: false, isRecording: false, isProcessing: false });
    }
  }

  public async stopVoiceSession(): Promise<void> {
    // Basic guard to prevent multiple closing attempts
    if (!this.session) return;

    console.log('Stopping voice session...');
    this.isMicrophoneActive = false;

    if (this.session) {
      this.session.close();
      this.session = undefined;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }

    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage('stop');
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
    this.audioBuffer = [];
    this.isPlayingAudio = false;
    this.currentTurnText = '';

    this.updateVoiceSession({ isActive: false, isRecording: false, isProcessing: false, microphoneLevel: 0 });
    this.addSystemMessage('Voice session ended.');
  }

  private async setupMicrophoneStreaming(): Promise<void> {
    try {
      console.log('🎤 Requesting microphone access...');
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16
        }
      });
      console.log('🎤 Microphone access granted.');

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      console.log(`🔊 Audio context created - Sample rate: ${this.audioContext.sampleRate}Hz`);

      const source = this.audioContext.createMediaStreamSource(this.micStream);
      await this.setupAudioWorklet(this.audioContext, source);

    } catch (error) {
      console.error('❌ Error setting up microphone streaming:', error);
      throw error; // Propagate error to be handled in startVoiceSession
    }
  }

  private setupAudioWorklet(audioContext: AudioContext, source: MediaStreamAudioSourceNode): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await audioContext.audioWorklet.addModule('assets/audio-processor.worklet.js');
        this.audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor');
        
        this.audioWorkletNode.port.onmessage = (event: MessageEvent) => {
          if (!this.isMicrophoneActive || !this.session) return;
          
          const { pcmData, rms } = event.data;

          this.zone.run(() => this.microphoneVolume$.next(rms));
          
          // The API expects base64 encoded audio data
          const base64Audio = this.arrayBufferToBase64(pcmData.buffer);

          // Use sendRealtimeInput for streaming audio data
          this.session.sendRealtimeInput({
            audio: { data: base64Audio, mimeType: 'audio/pcm;rate=16000' }
          });
        };
        
        this.audioWorkletNode.port.onmessageerror = (e) => reject(e);
        source.connect(this.audioWorkletNode);
        // We don't connect to destination, as we don't want to hear ourselves.
        
        console.log('✅ AudioWorkletNode setup complete and connected.');
        resolve();

      } catch (error) {
        console.error('❌ Error setting up AudioWorklet:', error);
        reject(error);
      }
    });
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private handleLiveMessage(message: LiveServerMessage): void {
    if (message.serverContent?.modelTurn?.parts) {
      this.updateVoiceSession({ isProcessing: true, isRecording: false });

      for (const part of message.serverContent.modelTurn.parts) {
        if (part.text) {
          this.addMessage({
            id: this.generateId(),
            content: part.text,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          });
        }
        if (part.inlineData?.data) {
          this.audioBuffer.push(part.inlineData.data);
        }
      }
    }

    if (message.serverContent?.turnComplete) {
      if (this.audioBuffer.length > 0) {
        this.processAndPlayAudio();
      } else {
        this.updateVoiceSession({ isProcessing: false, isRecording: true });
      }
    }
  }

  private processAndPlayAudio(): void {
    if (this.isPlayingAudio || this.audioBuffer.length === 0) {
      return;
    }
    this.isPlayingAudio = true;
    
    const audioChunks = [...this.audioBuffer];
    this.audioBuffer = [];

    const audioBlob = this.createAudioBlobFromBase64Chunks(audioChunks, 'audio/mp3');
    
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      this.audioPlayer = new Audio(audioUrl);

      this.audioPlayer.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.isPlayingAudio = false;
        this.audioPlayer = null;
        this.updateVoiceSession({ isProcessing: false, isRecording: true });
      };

      this.audioPlayer.onerror = (e) => {
        console.error("Error playing audio:", e);
        URL.revokeObjectURL(audioUrl);
        this.isPlayingAudio = false;
        this.audioPlayer = null;
        this.updateVoiceSession({ isProcessing: false, isRecording: true });
      };

      this.audioPlayer.play().catch(e => {
        console.error("Audio playback failed:", e);
        this.isPlayingAudio = false;
        this.audioPlayer = null;
        this.updateVoiceSession({ isProcessing: false, isRecording: true });
      });
    } else {
      this.isPlayingAudio = false;
      this.updateVoiceSession({ isProcessing: false, isRecording: true });
    }
  }

  private createAudioBlobFromBase64Chunks(chunks: string[], mimeType: string): Blob | null {
    try {
      const byteCharacters = chunks.map(chunk => atob(chunk)).join('');
      const byteNumbers = new Array(byteCharacters.length);
      for (let j = 0; j < byteCharacters.length; j++) {
        byteNumbers[j] = byteCharacters.charCodeAt(j);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (e) {
      console.error("Error creating audio blob from base64 chunks:", e);
      return null;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private addMessage(message: ChatMessage): void {
    const currentMessages = this.messagesSubject.getValue();
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
    this.zone.run(() => {
      const currentState = this.voiceSessionSubject.getValue();
      this.voiceSessionSubject.next({ ...currentState, ...state });
    });
  }

  public clearMessages(): void {
    this.messagesSubject.next([]);
    this.addSystemMessage('Chat cleared. Start a new conversation!');
  }
}

// Add interface for WAV conversion options
interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
} 