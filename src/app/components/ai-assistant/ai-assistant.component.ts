import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { GeminiAiService, ChatMessage, VoiceSessionState } from '../../services/gemini-ai.service';

@Component({
  selector: 'app-ai-assistant',
  template: `
    <div class="ai-assistant-panel">
      <div class="ai-header">
        <div class="ai-title">
          <mat-icon class="ai-icon">smart_toy</mat-icon>
          <h3>Google Gemini AI</h3>
        </div>
        <button mat-icon-button (click)="closePanel()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="ai-content">
        <div class="chat-messages" #messagesContainer>
          <div 
            *ngFor="let message of messages$ | async" 
            class="message"
            [class.user-message]="message.isUser"
            [class.ai-message]="!message.isUser"
            [class.system-message]="message.type === 'system'">
            
            <div class="message-avatar" *ngIf="!message.isUser">
              <mat-icon [class.ai-avatar]="message.type !== 'system'" 
                       [class.system-avatar]="message.type === 'system'">
                {{ message.type === 'system' ? 'info' : 'smart_toy' }}
              </mat-icon>
            </div>
            
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            </div>
            
            <div class="message-avatar" *ngIf="message.isUser">
              <mat-icon class="user-avatar">person</mat-icon>
            </div>
          </div>
        </div>

        <div class="voice-controls" *ngIf="voiceSession$ | async as voiceState">
          <div class="voice-status" *ngIf="voiceState.isActive">
            <div class="voice-indicator-section">
              <mat-icon 
                class="voice-indicator" 
                [class.recording]="voiceState.isRecording"
                [class.mic-detected]="voiceState.isMicrophoneDetected">
                {{ voiceState.isRecording ? 'mic' : 'hourglass_empty' }}
              </mat-icon>
              
              <div class="microphone-level" *ngIf="voiceState.isRecording">
                <div class="level-bar">
                  <div 
                    class="level-fill" 
                    [style.width.%]="voiceState.microphoneLevel"
                    [class.active]="voiceState.microphoneLevel > 5">
                  </div>
                </div>
                <span class="level-text">{{ voiceState.microphoneLevel }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button 
            mat-raised-button 
            color="primary" 
            (click)="startOrStopVoice()"
            class="share-screen-btn"
            [disabled]="(voiceSession$ | async)?.isProcessing">
            <mat-icon>{{ (voiceSession$ | async)?.isActive ? 'stop' : 'mic' }}</mat-icon>
            {{ (voiceSession$ | async)?.isActive ? 'Stop AI Assistant' : 'Start AI Assistant' }}
          </button>
          
          <button 
            mat-stroked-button 
            color="accent" 
            (click)="clearChat()"
            class="clear-chat-btn">
            <mat-icon>clear_all</mat-icon>
            Clear Chat
          </button>
        </div>

        <div class="chat-input">
          <mat-form-field appearance="outline" class="message-input">
            <mat-label>Ask me anything about Google Cloud...</mat-label>
            <input 
              matInput 
              [formControl]="messageControl"
              (keydown.enter)="sendMessage()"
              placeholder="Type your question here"
              #messageInput>
            <button 
              mat-icon-button 
              matSuffix 
              (click)="sendMessage()"
              [disabled]="!messageControl.value?.trim()">
              <mat-icon>send</mat-icon>
            </button>
          </mat-form-field>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ai-assistant-panel {
      width: 400px;
      height: 100vh;
      background: var(--surface-color);
      border-left: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      position: fixed;
      right: 0;
      top: 0;
      z-index: 1000;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    }

    .ai-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      background: var(--primary-color);
      color: white;
    }

    .ai-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .ai-title h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 500;
    }

    .ai-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .close-btn {
      color: white;
    }

    .ai-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      max-width: 100%;
    }

    .user-message {
      flex-direction: row-reverse;
    }

    .message-avatar {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ai-avatar {
      color: var(--primary-color);
      background: rgba(66, 133, 244, 0.1);
      border-radius: 50%;
      padding: 4px;
    }

    .user-avatar {
      color: white;
      background: var(--accent-color);
      border-radius: 50%;
      padding: 4px;
    }

    .system-avatar {
      color: #ff9800;
      background: rgba(255, 152, 0, 0.1);
      border-radius: 50%;
      padding: 4px;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .message-text {
      background: var(--hover-color);
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .user-message .message-text {
      background: var(--primary-color);
      color: white;
    }

    .system-message .message-text {
      background: rgba(255, 152, 0, 0.1);
      color: var(--text-color);
      font-style: italic;
    }

    .message-time {
      font-size: 11px;
      color: var(--text-secondary-color);
      margin-top: 4px;
      text-align: right;
    }

    .user-message .message-time {
      text-align: left;
    }

    .voice-controls {
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
      border-bottom: 1px solid var(--border-color);
      background: rgba(66, 133, 244, 0.05);
    }

    .voice-status {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .voice-indicator-section {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-grow: 1;
    }

    .voice-indicator {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #e53935; /* Red for off/default */
      transition: color 0.3s ease-in-out;
    }

    .voice-indicator.recording {
      color: #43a047; /* Green for recording */
    }

    .voice-indicator.mic-detected {
      color: #1e88e5; /* Blue when audio is detected */
      animation: pulse 1s infinite;
    }

    .microphone-level {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .level-bar {
      width: 100%;
      height: 8px;
      background-color: var(--border-color);
      border-radius: 4px;
      overflow: hidden;
    }

    .level-fill {
      height: 100%;
      width: 0;
      background-color: #6c757d;
      border-radius: 4px;
      transition: width 0.1s linear;
    }

    .level-fill.active {
      background-color: #1e88e5;
    }

    .level-text {
      font-size: 0.8rem;
      color: var(--text-color-secondary);
      min-width: 30px;
    }

    .voice-status-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .voice-status-text {
      font-size: 14px;
      color: var(--text-color);
      font-weight: 500;
    }

    .mic-status {
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    .stop-voice-btn {
      font-size: 12px;
      padding: 4px 12px;
      min-height: 32px;
      align-self: flex-start;
    }

    .action-buttons {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .share-screen-btn {
      font-weight: 500;
    }

    .clear-chat-btn {
      font-size: 14px;
    }

    .chat-input {
      padding: 16px;
      border-top: 1px solid var(--border-color);
    }

    .message-input {
      width: 100%;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.2);
      }
      100% {
        transform: scale(1);
      }
    }

    /* Dark theme adjustments */
    :host-context(.dark-theme) .ai-assistant-panel {
      background: var(--surface-color);
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .ai-assistant-panel {
        width: 100vw;
        height: 100vh;
      }
    }
  `]
})
export class AiAssistantComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messageControl = new FormControl('');
  messages$: Observable<ChatMessage[]>;
  voiceSession$: Observable<VoiceSessionState>;
  
  private subscription = new Subscription();
  private shouldScrollToBottom = true;

  constructor(private geminiService: GeminiAiService) {
    this.messages$ = this.geminiService.messages$;
    this.voiceSession$ = this.geminiService.voiceSession$;
  }

  ngOnInit(): void {
    this.subscription.add(
      this.geminiService.messages$.subscribe(() => {
        this.shouldScrollToBottom = true;
      })
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.geminiService.stopVoiceSession();
  }

  sendMessage(): void {
    const message = this.messageControl.value;
    if (message && message.trim()) {
      this.geminiService.sendTextMessage(message);
      this.messageControl.reset();
    }
  }

  startOrStopVoice(): void {
    this.voiceSession$.pipe(take(1)).subscribe(async state => {
      if (state.isActive) {
        await this.geminiService.stopVoiceSession();
      } else {
        await this.geminiService.startVoiceSession();
      }
    });
  }

  clearChat(): void {
    this.geminiService.clearMessages();
  }

  closePanel(): void {
    console.log('Closing panel');
    // Stop any active voice session before closing
    this.voiceSession$.pipe(take(1)).subscribe(async state => {
      if (state.isActive) {
        await this.geminiService.stopVoiceSession();
      }
    });
    
    // Emit custom event that the app component is listening for
    window.dispatchEvent(new CustomEvent('closeAiPanel'));
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (error) {
      console.error('Error scrolling to bottom:', error);
    }
  }
} 