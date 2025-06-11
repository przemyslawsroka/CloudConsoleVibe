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
  microphoneLevel: number; // 0-100 indicating microphone input level
  isMicrophoneDetected: boolean;
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
    isProcessing: false,
    microphoneLevel: 0,
    isMicrophoneDetected: false
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
            this.addSystemMessage('🎤 Voice session started! You can now speak to me.');
          },
          onmessage: (message: LiveServerMessage) => {
            console.log('Received message from Gemini:', message);
            this.responseQueue.push(message);
            this.handleModelTurn(message);
          },
          onerror: (e: ErrorEvent) => {
            console.error('Voice session error:', e.message);
            this.addSystemMessage(`❌ Voice session error: ${e.message}`);
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
        // Add small delay to ensure screen sharing is fully established
        setTimeout(async () => {
          await this.startVoiceSession();
        }, 1000);
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

      // Handle microphone audio for voice input using modern Web Audio API
      const audioTrack = micStream.getAudioTracks()[0];
      if (audioTrack && this.session) {
        this.setupMicrophoneStreaming(micStream);
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

  private setupMicrophoneStreaming(micStream: MediaStream): void {
    try {
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(micStream);
      
      // Use AudioWorklet for modern browsers (fallback to ScriptProcessor if needed)
      if (audioContext.audioWorklet) {
        this.setupAudioWorklet(audioContext, source);
      } else {
        this.setupScriptProcessor(audioContext, source);
      }
      
      console.log('🎤 Microphone streaming setup complete');
    } catch (error) {
      console.error('Error setting up microphone streaming:', error);
      this.addSystemMessage('Microphone setup failed. Please check permissions.');
    }
  }

  private setupScriptProcessor(audioContext: AudioContext, source: MediaStreamAudioSourceNode): void {
    const processor = audioContext.createScriptProcessor(2048, 1, 1); // Smaller buffer for better responsiveness
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    source.connect(analyser);
    analyser.connect(processor);
    
    processor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);
      
      // Calculate microphone level for visualization
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      const micLevel = Math.min(100, Math.floor(rms * 1000)); // Scale to 0-100
      
      // Update microphone status
      const isMicDetected = micLevel > 1; // Threshold for detecting input
      this.updateVoiceSession({ 
        microphoneLevel: micLevel, 
        isMicrophoneDetected: isMicDetected 
      });
      
      // Only send audio if recording and there's actual input
      if (!this.session || !this.voiceSessionSubject.value.isRecording) return;
      
      // Only send if there's meaningful audio (above noise threshold)
      if (micLevel > 5) {
        try {
          // Convert Float32Array to 16-bit PCM for Gemini
          const pcmData = this.convertToPCM16(inputData);
          const base64Audio = btoa(String.fromCharCode(...pcmData));
          
          // Send to Gemini Live API
          this.session.sendClientContent({
            turns: [{ parts: [{ inlineData: { mimeType: 'audio/pcm', data: base64Audio } }] }]
          });
          
          console.log(`🎤 Sending audio to Gemini (level: ${micLevel})`);
        } catch (error) {
          console.error('Error sending audio to Gemini:', error);
        }
      }
    };
    
    processor.connect(audioContext.destination);
  }

  private setupAudioWorklet(audioContext: AudioContext, source: MediaStreamAudioSourceNode): void {
    // For now, use the script processor as AudioWorklet requires separate files
    this.setupScriptProcessor(audioContext, source);
  }

  private convertToPCM16(floatSamples: Float32Array): Uint8Array {
    const buffer = new ArrayBuffer(floatSamples.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < floatSamples.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit signed integer
      const sample = Math.max(-1, Math.min(1, floatSamples[i]));
      view.setInt16(i * 2, sample * 0x7FFF, true);
    }
    
    return new Uint8Array(buffer);
  }

  private handleModelTurn(message: LiveServerMessage): void {
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
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

        if (part?.inlineData?.data) {
          // Each part contains a complete audio chunk, play immediately
          this.playAudioChunk(part.inlineData.data);
        }
      }
    }
  }

  private playAudioChunk(base64AudioData: string): void {
    try {
      // Gemini Live API returns audio as base64 encoded PCM
      const binaryString = atob(base64AudioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create proper WAV file for browser compatibility
      const wavBlob = this.createWavFile(bytes);
      const audioUrl = URL.createObjectURL(wavBlob);
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;
      audio.playbackRate = 0.9; // Slightly slower for better understanding
      
      audio.play().then(() => {
        console.log('🔊 Playing audio chunk (slower rate for clarity)');
      }).catch(error => {
        console.error('Audio playback failed:', error);
      });
      
      // Clean up when done
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });
      
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  }

  private createWavFile(pcmData: Uint8Array): Blob {
    // Audio format parameters for Gemini Live API - using lower sample rate for better compatibility
    const sampleRate = 16000; // Lower sample rate for better playback compatibility
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const byteRate = sampleRate * numChannels * bytesPerSample;
    const blockAlign = numChannels * bytesPerSample;
    
    // WAV file structure
    const headerSize = 44;
    const dataSize = pcmData.length;
    const fileSize = headerSize + dataSize;
    
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    
    // Helper function to write strings
    let offset = 0;
    const writeString = (str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset++, str.charCodeAt(i));
      }
    };
    
    // RIFF header
    writeString('RIFF');
    view.setUint32(offset, fileSize - 8, true); offset += 4;
    writeString('WAVE');
    
    // fmt chunk
    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4; // Subchunk size
    view.setUint16(offset, 1, true); offset += 2;  // Audio format (PCM)
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bitsPerSample, true); offset += 2;
    
    // data chunk
    writeString('data');
    view.setUint32(offset, dataSize, true); offset += 4;
    
    // Copy PCM data
    const dataView = new Uint8Array(buffer, offset);
    dataView.set(pcmData);
    
    return new Blob([buffer], { type: 'audio/wav' });
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