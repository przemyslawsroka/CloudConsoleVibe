import { Component } from '@angular/core';

@Component({
  selector: 'app-network-solutions',
  template: `
    <div class="network-solutions-container">
      <!-- Header Section -->
      <div class="header-section">
        <h1>Network solutions</h1>
        <p class="header-description">
          Build out a network solution to create a cross-cloud network architecture to scale for your high demand AI / ML workloads or distributed applications across multiple clouds and on-prem
          <a href="#" class="learn-more-link">Learn more in Cloud Architecture Center</a>
        </p>
      </div>

      <!-- Steps Section -->
      <div class="steps-section">
        <div class="steps-container">
          <div class="step-item">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>Select a solution or answer a few architecture questions</h3>
              <p>Get started with an existing solution or answer questions to pick a solution for your use case</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>Configure solution</h3>
              <p>Configure and customize a solution for your specific requirements</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>Deploy your solution</h3>
              <p>Finalize your solution for deployment</p>
            </div>
          </div>
        </div>
        <div class="illustration-container">
          <svg viewBox="0 0 400 300" class="steps-illustration">
            <!-- Background shapes -->
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="400" height="300" fill="url(#grid)" opacity="0.3"/>
            
            <!-- Hand drawing gesture -->
            <path d="M 80 120 Q 100 100 120 120 Q 140 140 160 120 Q 180 100 200 120" 
                  fill="none" stroke="#9aa0a6" stroke-width="3" stroke-linecap="round"/>
            
            <!-- Document/grid representation -->
            <rect x="250" y="180" width="80" height="60" fill="white" stroke="#dadce0" stroke-width="2" rx="4"/>
            <line x1="260" y1="190" x2="320" y2="190" stroke="#dadce0" stroke-width="1"/>
            <line x1="260" y1="200" x2="320" y2="200" stroke="#dadce0" stroke-width="1"/>
            <line x1="260" y1="210" x2="320" y2="210" stroke="#dadce0" stroke-width="1"/>
            <line x1="260" y1="220" x2="320" y2="220" stroke="#dadce0" stroke-width="1"/>
            <line x1="270" y1="185" x2="270" y2="235" stroke="#dadce0" stroke-width="1"/>
            <line x1="280" y1="185" x2="280" y2="235" stroke="#dadce0" stroke-width="1"/>
            <line x1="290" y1="185" x2="290" y2="235" stroke="#dadce0" stroke-width="1"/>
            
            <!-- Abstract geometric shapes -->
            <polygon points="50,50 70,40 90,50 80,70 60,70" fill="#e8f0fe" stroke="#4285f4" stroke-width="2"/>
            <circle cx="320" cy="80" r="25" fill="#fce8e6" stroke="#ea4335" stroke-width="2"/>
            <rect x="150" y="40" width="40" height="40" fill="#e6f4ea" stroke="#34a853" stroke-width="2" rx="4"/>
            
            <!-- Connection lines -->
            <path d="M 75 70 Q 100 90 150 60" fill="none" stroke="#9aa0a6" stroke-width="2" stroke-dasharray="5,5"/>
            <path d="M 190 60 Q 250 70 295 80" fill="none" stroke="#9aa0a6" stroke-width="2" stroke-dasharray="5,5"/>
          </svg>
        </div>
      </div>

      <!-- Solutions Grid -->
      <div class="solutions-grid">
        <!-- Distributed Application -->
        <div class="solution-card">
          <div class="solution-header">
            <span class="by-google-badge">By Google</span>
          </div>
          <div class="solution-diagram">
            <svg viewBox="0 0 280 200" class="distributed-app-diagram">
              <!-- On-premises section -->
              <rect x="10" y="20" width="80" height="160" fill="#f8f9fa" stroke="#dadce0" stroke-width="1" rx="8"/>
              <text x="50" y="15" text-anchor="middle" class="diagram-label">On-premises</text>
              
              <!-- Database -->
              <circle cx="50" cy="50" r="15" fill="#4285f4" stroke="white" stroke-width="2"/>
              <text x="50" y="55" text-anchor="middle" class="node-label">DB</text>
              
              <!-- Apps -->
              <circle cx="30" cy="100" r="12" fill="#34a853" stroke="white" stroke-width="2"/>
              <text x="30" y="105" text-anchor="middle" class="node-label-small">App</text>
              <circle cx="70" cy="100" r="12" fill="#34a853" stroke="white" stroke-width="2"/>
              <text x="70" y="105" text-anchor="middle" class="node-label-small">App</text>
              
              <!-- VPN Gateway -->
              <circle cx="50" cy="150" r="12" fill="#fbbc04" stroke="white" stroke-width="2"/>
              <text x="50" y="155" text-anchor="middle" class="node-label-small">VPN</text>
              
              <!-- Cloud section -->
              <ellipse cx="140" cy="100" rx="60" ry="80" fill="#e8f0fe" stroke="#4285f4" stroke-width="2"/>
              <image x="115" y="75" width="50" height="50" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI1IDEwQzE5LjQ3NzIgMTAgMTUgMTQuNDc3MiAxNSAyMEMxNSAyNS41MjI4IDE5LjQ3NzIgMzAgMjUgMzBDMzAuNTIyOCAzMCAzNSAyNS41MjI4IDM1IDIwQzM1IDE0LjQ3NzIgMzAuNTIyOCAxMCAyNSAxMFoiIGZpbGw9IiM0Mjg1RjQiLz4KPC9zdmc+"/>
              
              <!-- VPN connection line -->
              <line x1="62" y1="150" x2="78" y2="130" stroke="#9aa0a6" stroke-width="2" stroke-dasharray="3,3"/>
              
              <!-- Multi-cloud connections -->
              <circle cx="220" cy="60" r="20" fill="#ea4335" stroke="white" stroke-width="2"/>
              <text x="220" y="66" text-anchor="middle" class="node-label">AWS</text>
              
              <circle cx="220" cy="140" r="20" fill="#0078d4" stroke="white" stroke-width="2"/>
              <text x="220" y="146" text-anchor="middle" class="node-label">Azure</text>
              
              <!-- Connection lines -->
              <line x1="200" y1="100" x2="240" y2="80" stroke="#9aa0a6" stroke-width="2"/>
              <line x1="200" y1="100" x2="240" y2="120" stroke="#9aa0a6" stroke-width="2"/>
            </svg>
          </div>
          <div class="solution-content">
            <h3>Distributed Application</h3>
            <p>Build a cross cloud network, a foundation for distributed application across on-premise or other cloud platforms</p>
            <div class="solution-actions">
              <a href="#" class="documentation-link">Documentation ↗</a>
              <div class="action-buttons">
                <button mat-stroked-button class="preview-btn">Preview solution</button>
                <button mat-raised-button color="primary" class="get-started-btn" routerLink="/distributed-application">Get started</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Global Front End -->
        <div class="solution-card">
          <div class="solution-header">
            <span class="by-google-badge">By Google</span>
          </div>
          <div class="solution-diagram">
            <svg viewBox="0 0 280 200" class="global-frontend-diagram">
              <!-- Global cloud representation -->
              <ellipse cx="140" cy="100" rx="120" ry="60" fill="#e8f0fe" stroke="#4285f4" stroke-width="2"/>
              <image x="115" y="75" width="50" height="50" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI1IDEwQzE5LjQ3NzIgMTAgMTUgMTQuNDc3MiAxNSAyMEMxNSAyNS41MjI4IDE5LjQ3NzIgMzAgMjUgMzBDMzAuNTIyOCAzMCAzNSAyNS41MjI4IDM1IDIwQzM1IDE0LjQ3NzIgMzAuNTIyOCAxMCAyNSAxMFoiIGZpbGw9IiM0Mjg1RjQiLz4KPC9zdmc+"/>
              
              <!-- Regional endpoints -->
              <circle cx="60" cy="50" r="18" fill="#34a853" stroke="white" stroke-width="2"/>
              <text x="60" y="56" text-anchor="middle" class="node-label-small">Web & Mobile</text>
              
              <circle cx="220" cy="50" r="18" fill="#34a853" stroke="white" stroke-width="2"/>
              <text x="220" y="56" text-anchor="middle" class="node-label-small">Web & Mobile</text>
              
              <circle cx="60" cy="150" r="18" fill="#34a853" stroke="white" stroke-width="2"/>
              <text x="60" y="156" text-anchor="middle" class="node-label-small">Web Apps</text>
              
              <circle cx="220" cy="150" r="18" fill="#34a853" stroke="white" stroke-width="2"/>
              <text x="220" y="156" text-anchor="middle" class="node-label-small">Web Apps</text>
              
              <!-- Connection lines to cloud -->
              <line x1="78" y1="60" x2="110" y2="85" stroke="#4285f4" stroke-width="2"/>
              <line x1="202" y1="60" x2="170" y2="85" stroke="#4285f4" stroke-width="2"/>
              <line x1="78" y1="140" x2="110" y2="115" stroke="#4285f4" stroke-width="2"/>
              <line x1="202" y1="140" x2="170" y2="115" stroke="#4285f4" stroke-width="2"/>
              
              <!-- Internet and DNS indicators -->
              <circle cx="140" cy="30" r="8" fill="#fbbc04"/>
              <text x="140" y="25" text-anchor="middle" class="small-label">Internet</text>
              <circle cx="140" cy="170" r="8" fill="#fbbc04"/>
              <text x="140" y="185" text-anchor="middle" class="small-label">DNS Load</text>
            </svg>
          </div>
          <div class="solution-content">
            <h3>Global Front End</h3>
            <p>Build a fast, secure, and reliable connectivity for applications anywhere in the world</p>
            <div class="solution-actions">
              <a href="#" class="documentation-link">Documentation ↗</a>
              <div class="action-buttons">
                <button mat-stroked-button class="preview-btn">Preview solution</button>
                <button mat-raised-button color="primary" class="get-started-btn">Get started</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Google Wide Area Network -->
        <div class="solution-card">
          <div class="solution-header">
            <span class="by-google-badge">By Google</span>
          </div>
          <div class="solution-diagram">
            <svg viewBox="0 0 280 200" class="wan-diagram">
              <!-- Central cloud -->
              <ellipse cx="140" cy="100" rx="50" ry="30" fill="#e8f0fe" stroke="#4285f4" stroke-width="2"/>
              <image x="115" y="85" width="50" height="30" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA1MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI1IDVDMTkuNDc3MiA1IDE1IDkuNDc3MiAxNSAxNUMxNSAyMC41MjI4IDE5LjQ3NzIgMjUgMjUgMjVDMzAuNTIyOCAyNSAzNSAyMC41MjI4IDM1IDE1QzM1IDkuNDc3MiAzMC41MjI4IDUgMjUgNVoiIGZpbGw9IiM0Mjg1RjQiLz4KPC9zdmc+"/>
              
              <!-- Data centers around -->
              <rect x="20" y="40" width="40" height="25" fill="#f3e5f5" stroke="#9c27b0" stroke-width="2" rx="4"/>
              <text x="40" y="57" text-anchor="middle" class="node-label-small">Private Apps</text>
              
              <rect x="220" y="40" width="40" height="25" fill="#f3e5f5" stroke="#9c27b0" stroke-width="2" rx="4"/>
              <text x="240" y="57" text-anchor="middle" class="node-label-small">Public workloads</text>
              
              <rect x="20" y="135" width="40" height="25" fill="#e8f5e8" stroke="#4caf50" stroke-width="2" rx="4"/>
              <text x="40" y="152" text-anchor="middle" class="node-label-small">On-prem</text>
              
              <rect x="220" y="135" width="40" height="25" fill="#e8f5e8" stroke="#4caf50" stroke-width="2" rx="4"/>
              <text x="240" y="152" text-anchor="middle" class="node-label-small">Multiple workloads</text>
              
              <!-- Network connections -->
              <line x1="60" y1="52" x2="90" y2="85" stroke="#1976d2" stroke-width="3"/>
              <line x1="220" y1="52" x2="190" y2="85" stroke="#1976d2" stroke-width="3"/>
              <line x1="60" y1="147" x2="90" y2="115" stroke="#1976d2" stroke-width="3"/>
              <line x1="220" y1="147" x2="190" y2="115" stroke="#1976d2" stroke-width="3"/>
              
              <!-- Internet connection indicators -->
              <circle cx="140" cy="30" r="6" fill="#fbbc04"/>
              <circle cx="140" cy="170" r="6" fill="#fbbc04"/>
              <line x1="140" y1="36" x2="140" y2="70" stroke="#9aa0a6" stroke-width="2" stroke-dasharray="2,2"/>
              <line x1="140" y1="130" x2="140" y2="164" stroke="#9aa0a6" stroke-width="2" stroke-dasharray="2,2"/>
            </svg>
          </div>
          <div class="solution-content">
            <h3>Google Wide Area Network</h3>
            <p>Connects other data centers & your on-premise locations</p>
            <div class="solution-actions">
              <a href="#" class="documentation-link">Documentation ↗</a>
              <a href="#" class="github-link">View on GitHub ↗</a>
              <div class="action-buttons">
                <button mat-stroked-button class="preview-btn">Preview solution</button>
                <button mat-raised-button color="primary" class="get-started-btn">Get started</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Future Solutions -->
        <div class="solution-card future-card">
          <div class="solution-header">
            <span class="by-google-badge">By Google</span>
          </div>
          <div class="solution-diagram">
            <svg viewBox="0 0 280 200" class="future-diagram">
              <!-- Coming soon illustration -->
              <defs>
                <linearGradient id="futureGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#e8f0fe;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#f8f9fa;stop-opacity:1" />
                </linearGradient>
              </defs>
              <rect width="280" height="200" fill="url(#futureGradient)"/>
              
              <!-- Abstract network nodes -->
              <circle cx="70" cy="80" r="20" fill="#e3f2fd" stroke="#2196f3" stroke-width="2" stroke-dasharray="5,5"/>
              <circle cx="210" cy="80" r="20" fill="#e3f2fd" stroke="#2196f3" stroke-width="2" stroke-dasharray="5,5"/>
              <circle cx="140" cy="140" r="25" fill="#e3f2fd" stroke="#2196f3" stroke-width="2" stroke-dasharray="5,5"/>
              
              <!-- Dotted connections -->
              <line x1="90" y1="90" x2="115" y2="125" stroke="#9aa0a6" stroke-width="2" stroke-dasharray="3,3" opacity="0.6"/>
              <line x1="190" y1="90" x2="165" y2="125" stroke="#9aa0a6" stroke-width="2" stroke-dasharray="3,3" opacity="0.6"/>
              
              <!-- Future indicator -->
              <text x="140" y="50" text-anchor="middle" class="future-label">Future Solutions</text>
              <text x="140" y="180" text-anchor="middle" class="coming-soon">Coming Soon...</text>
            </svg>
          </div>
          <div class="solution-content">
            <h3>[TBD] Future solutions</h3>
            <p>Future solutions...</p>
            <div class="solution-actions">
              <a href="#" class="documentation-link">Documentation ↗</a>
              <div class="action-buttons">
                <button mat-stroked-button class="preview-btn" disabled>Preview solution</button>
                <button mat-raised-button color="primary" class="get-started-btn" disabled>Get started</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom section with Gemini -->
      <div class="bottom-section">
        <div class="gemini-section">
          <svg viewBox="0 0 100 100" class="gemini-icon">
            <!-- Simplified Gemini AI icon -->
            <circle cx="50" cy="30" r="15" fill="#4285f4" opacity="0.8"/>
            <path d="M35 45 Q50 35 65 45 Q50 55 35 45" fill="#34a853" opacity="0.8"/>
            <path d="M40 65 Q50 55 60 65 Q50 75 40 65" fill="#fbbc04" opacity="0.8"/>
          </svg>
          <div class="gemini-content">
            <p>Answer some questions and use <strong>Gemini</strong> about your use case to find and customize a solution for your needs</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .network-solutions-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
      background-color: #ffffff;
      font-family: 'Google Sans', Roboto, sans-serif;
    }

    .header-section {
      margin-bottom: 48px;
    }

    .header-section h1 {
      font-size: 28px;
      font-weight: 400;
      color: #202124;
      margin: 0 0 16px 0;
    }

    .header-description {
      font-size: 14px;
      line-height: 1.6;
      color: #5f6368;
      margin: 0;
      max-width: 800px;
    }

    .learn-more-link {
      color: #1a73e8;
      text-decoration: none;
      margin-left: 4px;
    }

    .learn-more-link:hover {
      text-decoration: underline;
    }

    .steps-section {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 48px;
      margin-bottom: 48px;
      align-items: center;
    }

    .steps-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .step-number {
      background-color: #1a73e8;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .step-content h3 {
      font-size: 16px;
      font-weight: 500;
      color: #202124;
      margin: 0 0 8px 0;
    }

    .step-content p {
      font-size: 14px;
      color: #5f6368;
      margin: 0;
      line-height: 1.5;
    }

    .illustration-container {
      width: 400px;
      height: 300px;
    }

    .steps-illustration {
      width: 100%;
      height: 100%;
    }

    .solutions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }

    .solution-card {
      border: 1px solid #dadce0;
      border-radius: 8px;
      padding: 24px;
      background-color: white;
      transition: box-shadow 0.2s ease;
    }

    .solution-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .solution-card.future-card {
      opacity: 0.7;
    }

    .solution-header {
      margin-bottom: 16px;
    }

    .by-google-badge {
      background-color: #e8f0fe;
      color: #1a73e8;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .solution-diagram {
      height: 200px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .solution-diagram svg {
      width: 100%;
      height: 100%;
      max-width: 280px;
    }

    .diagram-label {
      font-size: 10px;
      fill: #5f6368;
      font-weight: 500;
    }

    .node-label {
      font-size: 8px;
      fill: white;
      font-weight: 500;
    }

    .node-label-small {
      font-size: 6px;
      fill: white;
      font-weight: 500;
    }

    .small-label {
      font-size: 6px;
      fill: #5f6368;
    }

    .future-label {
      font-size: 14px;
      fill: #1a73e8;
      font-weight: 500;
    }

    .coming-soon {
      font-size: 10px;
      fill: #9aa0a6;
      font-style: italic;
    }

    .solution-content h3 {
      font-size: 18px;
      font-weight: 500;
      color: #202124;
      margin: 0 0 8px 0;
    }

    .solution-content p {
      font-size: 14px;
      color: #5f6368;
      line-height: 1.5;
      margin: 0 0 16px 0;
    }

    .solution-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .documentation-link,
    .github-link {
      color: #1a73e8;
      text-decoration: none;
      font-size: 14px;
    }

    .documentation-link:hover,
    .github-link:hover {
      text-decoration: underline;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
    }

    .preview-btn,
    .get-started-btn {
      flex: 1;
      min-height: 36px;
      font-size: 14px;
    }

    .preview-btn {
      border-color: #dadce0;
      color: #5f6368;
    }

    .get-started-btn {
      background-color: #1a73e8;
    }

    .bottom-section {
      border-top: 1px solid #dadce0;
      padding-top: 32px;
    }

    .gemini-section {
      display: flex;
      align-items: center;
      gap: 16px;
      justify-content: center;
      max-width: 600px;
      margin: 0 auto;
    }

    .gemini-icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    .gemini-content p {
      font-size: 14px;
      color: #5f6368;
      margin: 0;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .steps-section {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .illustration-container {
        width: 100%;
        height: 200px;
      }

      .solutions-grid {
        grid-template-columns: 1fr;
      }

      .action-buttons {
        flex-direction: column;
      }

      .gemini-section {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class NetworkSolutionsComponent {
} 