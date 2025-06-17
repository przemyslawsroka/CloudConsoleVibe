import { Component } from '@angular/core';

@Component({
  selector: 'app-network-solutions',
  template: `
    <div class="network-solutions-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <h1>Network Solutions Overview</h1>
          <p class="header-description">
            Build out a network solution to create a cross-cloud network architecture to scale for your high demand AI / ML workloads or distributed applications across multiple clouds and on-prem
            <a href="#" class="learn-more-link">Learn more in Cloud Architecture Center</a>
          </p>
        </div>
        <div class="header-visual">
          <svg viewBox="0 0 500 200" class="header-illustration">
            <!-- Modern network topology illustration -->
            <defs>
              <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#4285f4;stop-opacity:0.2"/>
                <stop offset="100%" style="stop-color:#4285f4;stop-opacity:0.05"/>
              </linearGradient>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#4285f4;stop-opacity:0.8"/>
                <stop offset="50%" style="stop-color:#34a853;stop-opacity:0.8"/>
                <stop offset="100%" style="stop-color:#fbbc04;stop-opacity:0.8"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <!-- Background pattern -->
            <pattern id="dots" patternUnits="userSpaceOnUse" width="20" height="20">
              <circle cx="10" cy="10" r="1" fill="var(--text-secondary-color)" opacity="0.1"/>
            </pattern>
            <rect width="500" height="200" fill="url(#dots)"/>
            
            <!-- Central cloud hub -->
            <circle cx="250" cy="100" r="40" fill="url(#cloudGradient)" stroke="#4285f4" stroke-width="2"/>
            <circle cx="250" cy="100" r="25" fill="#4285f4" opacity="0.8"/>
            <text x="250" y="107" text-anchor="middle" class="hub-label">Cloud Hub</text>
            
            <!-- Regional nodes -->
            <circle cx="100" cy="50" r="20" fill="#34a853" opacity="0.9"/>
            <text x="100" y="56" text-anchor="middle" class="node-text">US</text>
            
            <circle cx="400" cy="50" r="20" fill="#ea4335" opacity="0.9"/>
            <text x="400" y="56" text-anchor="middle" class="node-text">EU</text>
            
            <circle cx="100" cy="150" r="20" fill="#fbbc04" opacity="0.9"/>
            <text x="100" y="156" text-anchor="middle" class="node-text">ASIA</text>
            
            <circle cx="400" cy="150" r="20" fill="#9c27b0" opacity="0.9"/>
            <text x="400" y="156" text-anchor="middle" class="node-text">On-Prem</text>
            
            <!-- Animated connection lines -->
            <path d="M 120 60 Q 185 80 210 90" fill="none" stroke="url(#connectionGradient)" stroke-width="3" opacity="0.8">
              <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="3s" repeatCount="indefinite"/>
            </path>
            <path d="M 380 60 Q 315 80 290 90" fill="none" stroke="url(#connectionGradient)" stroke-width="3" opacity="0.8">
              <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="3s" begin="0.5s" repeatCount="indefinite"/>
            </path>
            <path d="M 120 140 Q 185 120 210 110" fill="none" stroke="url(#connectionGradient)" stroke-width="3" opacity="0.8">
              <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="3s" begin="1s" repeatCount="indefinite"/>
            </path>
            <path d="M 380 140 Q 315 120 290 110" fill="none" stroke="url(#connectionGradient)" stroke-width="3" opacity="0.8">
              <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="3s" begin="1.5s" repeatCount="indefinite"/>
            </path>
            
            <!-- Data flow indicators -->
            <circle cx="180" cy="70" r="3" fill="#4285f4">
              <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="320" cy="130" r="3" fill="#34a853">
              <animate attributeName="r" values="2;5;2" dur="2s" begin="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
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
            <defs>
              <linearGradient id="stepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#4285f4;stop-opacity:0.1"/>
                <stop offset="100%" style="stop-color:#34a853;stop-opacity:0.1"/>
              </linearGradient>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <!-- Modern background pattern -->
            <circle cx="80" cy="80" r="60" fill="url(#stepGradient)" opacity="0.3"/>
            <circle cx="320" cy="220" r="50" fill="url(#stepGradient)" opacity="0.2"/>
            
            <!-- Step 1: Selection -->
            <g transform="translate(50, 50)">
              <circle cx="0" cy="0" r="30" fill="#4285f4" opacity="0.2"/>
              <path d="M-15,-10 L-5,0 L15,-20 M-5,0 L15,20" stroke="#4285f4" stroke-width="3" stroke-linecap="round" fill="none"/>
              <text x="0" y="45" text-anchor="middle" class="step-label">Select</text>
            </g>
            
            <!-- Step 2: Configure -->
            <g transform="translate(200, 120)">
              <circle cx="0" cy="0" r="35" fill="#34a853" opacity="0.2"/>
              <rect x="-15" y="-15" width="30" height="30" fill="none" stroke="#34a853" stroke-width="3" rx="3"/>
              <circle cx="-8" cy="-8" r="2" fill="#34a853"/>
              <circle cx="8" cy="-8" r="2" fill="#34a853"/>
              <circle cx="0" cy="8" r="2" fill="#34a853"/>
              <text x="0" y="55" text-anchor="middle" class="step-label">Configure</text>
            </g>
            
            <!-- Step 3: Deploy -->
            <g transform="translate(320, 80)">
              <circle cx="0" cy="0" r="30" fill="#fbbc04" opacity="0.2"/>
              <path d="M-10,-5 L0,10 L10,-5 M0,10 L0,-15" stroke="#fbbc04" stroke-width="3" stroke-linecap="round" fill="none"/>
              <text x="0" y="45" text-anchor="middle" class="step-label">Deploy</text>
            </g>
            
            <!-- Flowing connection arrows -->
            <path d="M 80 80 Q 140 100 165 120" fill="none" stroke="#4285f4" stroke-width="2" stroke-dasharray="5,5" opacity="0.7" marker-end="url(#arrowhead)">
              <animate attributeName="stroke-dashoffset" values="0;-10" dur="2s" repeatCount="indefinite"/>
            </path>
            <path d="M 235 120 Q 280 100 290 80" fill="none" stroke="#34a853" stroke-width="2" stroke-dasharray="5,5" opacity="0.7" marker-end="url(#arrowhead)">
              <animate attributeName="stroke-dashoffset" values="0;-10" dur="2s" begin="0.5s" repeatCount="indefinite"/>
            </path>
            
            <!-- Arrow marker definition -->
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" opacity="0.7"/>
              </marker>
            </defs>
            
            <!-- Floating elements for visual interest -->
            <circle cx="150" cy="200" r="4" fill="#ea4335" opacity="0.6">
              <animate attributeName="cy" values="200;190;200" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="250" cy="50" r="3" fill="#9c27b0" opacity="0.6">
              <animate attributeName="cy" values="50;40;50" dur="4s" repeatCount="indefinite"/>
            </circle>
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
              <defs>
                <linearGradient id="onPremGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#673ab7;stop-opacity:0.1"/>
                  <stop offset="100%" style="stop-color:#673ab7;stop-opacity:0.05"/>
                </linearGradient>
                <linearGradient id="cloudGradientDistrib" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#4285f4;stop-opacity:0.15"/>
                  <stop offset="100%" style="stop-color:#4285f4;stop-opacity:0.05"/>
                </linearGradient>
                <filter id="dropShadow">
                  <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.2"/>
                </filter>
              </defs>
              
              <!-- On-premises section with modern design -->
              <rect x="10" y="20" width="80" height="160" fill="url(#onPremGradient)" stroke="#673ab7" stroke-width="2" rx="12" filter="url(#dropShadow)"/>
              <text x="50" y="15" text-anchor="middle" class="diagram-label">On-premises</text>
              
              <!-- Modern database representation -->
              <g transform="translate(50, 50)">
                <circle r="18" fill="#4285f4" opacity="0.9"/>
                <rect x="-12" y="-3" width="24" height="2" fill="white" opacity="0.9"/>
                <rect x="-12" y="0" width="24" height="2" fill="white" opacity="0.7"/>
                <rect x="-12" y="3" width="24" height="2" fill="white" opacity="0.5"/>
                <text y="6" text-anchor="middle" class="node-label">DB</text>
              </g>
              
              <!-- Application containers -->
              <g transform="translate(30, 100)">
                <rect x="-10" y="-10" width="20" height="20" fill="#34a853" rx="4" opacity="0.9"/>
                <circle cx="0" cy="0" r="3" fill="white"/>
                <text y="18" text-anchor="middle" class="node-label-tiny">App</text>
              </g>
              <g transform="translate(70, 100)">
                <rect x="-10" y="-10" width="20" height="20" fill="#34a853" rx="4" opacity="0.9"/>
                <circle cx="0" cy="0" r="3" fill="white"/>
                <text y="18" text-anchor="middle" class="node-label-tiny">App</text>
              </g>
              
              <!-- VPN Gateway with shield icon -->
              <g transform="translate(50, 150)">
                <circle r="15" fill="#fbbc04" opacity="0.9"/>
                <path d="M-6,-8 L0,-12 L6,-8 L6,4 C6,8 0,10 0,10 C0,10 -6,8 -6,4 Z" fill="white"/>
                <text y="22" text-anchor="middle" class="node-label-tiny">VPN</text>
              </g>
              
              <!-- Central cloud hub with modern styling -->
              <ellipse cx="140" cy="100" rx="65" ry="85" fill="url(#cloudGradientDistrib)" stroke="#4285f4" stroke-width="2" filter="url(#dropShadow)"/>
              <!-- Cloud icon -->
              <g transform="translate(140, 100)">
                <path d="M-20,-10 C-25,-15 -15,-20 -10,-15 C-5,-20 5,-20 10,-15 C15,-20 25,-15 20,-10 L20,5 C20,10 15,15 10,15 L-15,15 C-20,15 -25,10 -20,5 Z" fill="#4285f4" opacity="0.8"/>
                <text y="25" text-anchor="middle" class="cloud-label">Google Cloud</text>
              </g>
              
              <!-- Encrypted VPN connection -->
              <path d="M 65 150 Q 85 140 105 120" fill="none" stroke="#fbbc04" stroke-width="3" stroke-dasharray="6,4" opacity="0.8">
                <animate attributeName="stroke-dashoffset" values="0;-10" dur="2s" repeatCount="indefinite"/>
              </path>
              
              <!-- Multi-cloud connections with modern styling -->
              <g transform="translate(220, 60)">
                <circle r="22" fill="#ff9800" opacity="0.9" filter="url(#dropShadow)"/>
                <text text-anchor="middle" class="node-label" y="5">AWS</text>
                <text text-anchor="middle" class="node-label-tiny" y="-30">Multi-Cloud</text>
              </g>
              
              <g transform="translate(220, 140)">
                <circle r="22" fill="#0078d4" opacity="0.9" filter="url(#dropShadow)"/>
                <text text-anchor="middle" class="node-label" y="5">Azure</text>
              </g>
              
              <!-- High-speed interconnections -->
              <path d="M 205 100 L 242 82" stroke="#4285f4" stroke-width="3" opacity="0.7">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite"/>
              </path>
              <path d="M 205 100 L 242 118" stroke="#4285f4" stroke-width="3" opacity="0.7">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" begin="0.5s" repeatCount="indefinite"/>
              </path>
            </svg>
          </div>
          <div class="solution-content">
            <h3>Distributed Application</h3>
            <p>Build a cross cloud network, a foundation for distributed application across on-premise or other cloud platforms</p>
            <div class="solution-actions">
              <a href="#" class="documentation-link">Documentation ↗</a>
              <div class="action-buttons">
                <button mat-stroked-button class="preview-btn">Preview solution</button>
                <button mat-raised-button color="primary" class="get-started-btn" routerLink="/distributed-application/wizard">Get started</button>
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
              <defs>
                <radialGradient id="globalCloudGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" style="stop-color:#4285f4;stop-opacity:0.2"/>
                  <stop offset="70%" style="stop-color:#4285f4;stop-opacity:0.1"/>
                  <stop offset="100%" style="stop-color:#4285f4;stop-opacity:0.05"/>
                </radialGradient>
                <linearGradient id="endpointGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#34a853;stop-opacity:1"/>
                  <stop offset="100%" style="stop-color:#34a853;stop-opacity:0.7"/>
                </linearGradient>
                <filter id="globalGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <!-- Global cloud network representation -->
              <ellipse cx="140" cy="100" rx="130" ry="70" fill="url(#globalCloudGradient)" stroke="#4285f4" stroke-width="2" filter="url(#globalGlow)"/>
              
              <!-- Central cloud icon with CDN representation -->
              <g transform="translate(140, 100)">
                <!-- Cloud shape -->
                <path d="M-25,-12 C-30,-18 -20,-25 -15,-20 C-10,-25 0,-25 5,-20 C10,-25 20,-20 15,-12 L15,8 C15,13 10,18 5,18 L-20,18 C-25,18 -30,13 -25,8 Z" fill="#4285f4" opacity="0.9"/>
                <!-- CDN nodes -->
                <circle cx="-15" cy="-5" r="2" fill="white"/>
                <circle cx="0" cy="-8" r="2" fill="white"/>
                <circle cx="12" cy="-3" r="2" fill="white"/>
                <circle cx="-8" cy="5" r="2" fill="white"/>
                <circle cx="8" cy="8" r="2" fill="white"/>
                <!-- Connections between nodes -->
                <path d="M-15,-5 L0,-8 L12,-3 M0,-8 L-8,5 M-8,5 L8,8 M12,-3 L8,8" stroke="white" stroke-width="1" opacity="0.7"/>
                <text y="30" text-anchor="middle" class="cloud-label">Global CDN</text>
              </g>
              
              <!-- Regional endpoints with modern styling -->
              <!-- North America -->
              <g transform="translate(60, 50)">
                <circle r="20" fill="url(#endpointGradient)" filter="url(#globalGlow)"/>
                <rect x="-8" y="-8" width="16" height="16" fill="white" rx="2" opacity="0.9"/>
                <circle cx="0" cy="0" r="3" fill="#34a853"/>
                <text y="30" text-anchor="middle" class="region-label">Americas</text>
                <text y="42" text-anchor="middle" class="node-label-tiny">Web & Mobile</text>
              </g>
              
              <!-- Europe -->
              <g transform="translate(220, 50)">
                <circle r="20" fill="url(#endpointGradient)" filter="url(#globalGlow)"/>
                <rect x="-8" y="-8" width="16" height="16" fill="white" rx="2" opacity="0.9"/>
                <circle cx="0" cy="0" r="3" fill="#34a853"/>
                <text y="30" text-anchor="middle" class="region-label">Europe</text>
                <text y="42" text-anchor="middle" class="node-label-tiny">Web & Mobile</text>
              </g>
              
              <!-- Asia Pacific -->
              <g transform="translate(60, 150)">
                <circle r="20" fill="url(#endpointGradient)" filter="url(#globalGlow)"/>
                <rect x="-8" y="-8" width="16" height="16" fill="white" rx="2" opacity="0.9"/>
                <circle cx="0" cy="0" r="3" fill="#34a853"/>
                <text y="30" text-anchor="middle" class="region-label">Asia Pacific</text>
                <text y="42" text-anchor="middle" class="node-label-tiny">Web Apps</text>
              </g>
              
              <!-- Multi-region -->
              <g transform="translate(220, 150)">
                <circle r="20" fill="url(#endpointGradient)" filter="url(#globalGlow)"/>
                <rect x="-8" y="-8" width="16" height="16" fill="white" rx="2" opacity="0.9"/>
                <circle cx="0" cy="0" r="3" fill="#34a853"/>
                <text y="30" text-anchor="middle" class="region-label">Multi-Region</text>
                <text y="42" text-anchor="middle" class="node-label-tiny">Web Apps</text>
              </g>
              
              <!-- High-speed global connections with data flow animation -->
              <path d="M 80 60 Q 110 80 120 90" fill="none" stroke="#4285f4" stroke-width="3" opacity="0.6">
                <animate attributeName="stroke-dasharray" values="0,50;25,25;50,0" dur="2s" repeatCount="indefinite"/>
              </path>
              <path d="M 200 60 Q 170 80 160 90" fill="none" stroke="#4285f4" stroke-width="3" opacity="0.6">
                <animate attributeName="stroke-dasharray" values="0,50;25,25;50,0" dur="2s" begin="0.3s" repeatCount="indefinite"/>
              </path>
              <path d="M 80 140 Q 110 120 120 110" fill="none" stroke="#4285f4" stroke-width="3" opacity="0.6">
                <animate attributeName="stroke-dasharray" values="0,50;25,25;50,0" dur="2s" begin="0.6s" repeatCount="indefinite"/>
              </path>
              <path d="M 200 140 Q 170 120 160 110" fill="none" stroke="#4285f4" stroke-width="3" opacity="0.6">
                <animate attributeName="stroke-dasharray" values="0,50;25,25;50,0" dur="2s" begin="0.9s" repeatCount="indefinite"/>
              </path>
              
              <!-- Global internet backbone indicators -->
              <g transform="translate(140, 25)">
                <circle r="6" fill="#fbbc04" opacity="0.8"/>
                <path d="M-3,-2 L-1,-2 L1,0 L3,0 M-1,2 L1,2 L3,4" stroke="white" stroke-width="1"/>
                <text y="-12" text-anchor="middle" class="small-label">Internet Backbone</text>
              </g>
              
              <g transform="translate(140, 175)">
                <circle r="6" fill="#fbbc04" opacity="0.8"/>
                <circle r="3" fill="white"/>
                <text y="18" text-anchor="middle" class="small-label">Global DNS</text>
              </g>
            </svg>
          </div>
          <div class="solution-content">
            <h3>Global Front End</h3>
            <p>Build a fast, secure, and reliable connectivity for applications anywhere in the world</p>
            <div class="solution-actions">
              <a href="#" class="documentation-link">Documentation ↗</a>
              <div class="action-buttons">
                <button mat-stroked-button class="preview-btn">Preview solution</button>
                <button mat-raised-button color="primary" class="get-started-btn" routerLink="/global-frontend-wizard">Get started</button>
                <button mat-raised-button color="accent" class="get-started-btn-v2" routerLink="/global-frontend-wizard-v2">Get started - version 2</button>
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
              <defs>
                <radialGradient id="nccGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" style="stop-color:#4285f4;stop-opacity:0.3"/>
                  <stop offset="70%" style="stop-color:#4285f4;stop-opacity:0.15"/>
                  <stop offset="100%" style="stop-color:#4285f4;stop-opacity:0.05"/>
                </radialGradient>
                <linearGradient id="spokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#9c27b0;stop-opacity:0.8"/>
                  <stop offset="100%" style="stop-color:#9c27b0;stop-opacity:0.6"/>
                </linearGradient>
                <linearGradient id="onPremGradientWan" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#4caf50;stop-opacity:0.8"/>
                  <stop offset="100%" style="stop-color:#4caf50;stop-opacity:0.6"/>
                </linearGradient>
                <filter id="nccGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <!-- Network Connectivity Center Hub -->
              <circle cx="140" cy="100" r="45" fill="url(#nccGradient)" stroke="#4285f4" stroke-width="3" filter="url(#nccGlow)"/>
              
              <!-- NCC Hub icon -->
              <g transform="translate(140, 100)">
                <circle r="20" fill="#4285f4" opacity="0.9"/>
                <!-- Hub pattern -->
                <circle r="6" fill="white"/>
                <circle cx="0" cy="-12" r="3" fill="white" opacity="0.8"/>
                <circle cx="10" cy="-6" r="3" fill="white" opacity="0.8"/>
                <circle cx="10" cy="6" r="3" fill="white" opacity="0.8"/>
                <circle cx="0" cy="12" r="3" fill="white" opacity="0.8"/>
                <circle cx="-10" cy="6" r="3" fill="white" opacity="0.8"/>
                <circle cx="-10" cy="-6" r="3" fill="white" opacity="0.8"/>
                <!-- Connections -->
                <path d="M0,-6 L0,-9 M6,-3 L8,-5 M6,3 L8,5 M0,6 L0,9 M-6,3 L-8,5 M-6,-3 L-8,-5" stroke="white" stroke-width="2"/>
                <text y="30" text-anchor="middle" class="cloud-label">NCC Hub</text>
              </g>
              
              <!-- VPC Spokes with modern design -->
              <!-- Private workloads spoke -->
              <g transform="translate(40, 52)">
                <rect x="-20" y="-12" width="40" height="24" fill="url(#spokeGradient)" stroke="#9c27b0" stroke-width="2" rx="8" filter="url(#nccGlow)"/>
                <circle cx="-10" cy="0" r="3" fill="white"/>
                <circle cx="0" cy="0" r="3" fill="white"/>
                <circle cx="10" cy="0" r="3" fill="white"/>
                <text y="20" text-anchor="middle" class="spoke-label">Private VPCs</text>
                <text y="32" text-anchor="middle" class="node-label-tiny">Workloads</text>
              </g>
              
              <!-- Public workloads spoke -->
              <g transform="translate(240, 52)">
                <rect x="-20" y="-12" width="40" height="24" fill="url(#spokeGradient)" stroke="#9c27b0" stroke-width="2" rx="8" filter="url(#nccGlow)"/>
                <circle cx="-10" cy="0" r="3" fill="white"/>
                <circle cx="0" cy="0" r="3" fill="white"/>
                <circle cx="10" cy="0" r="3" fill="white"/>
                <text y="20" text-anchor="middle" class="spoke-label">Public VPCs</text>
                <text y="32" text-anchor="middle" class="node-label-tiny">Applications</text>
              </g>
              
              <!-- On-premises spokes -->
              <g transform="translate(40, 148)">
                <rect x="-20" y="-12" width="40" height="24" fill="url(#onPremGradientWan)" stroke="#4caf50" stroke-width="2" rx="8" filter="url(#nccGlow)"/>
                <rect x="-12" y="-6" width="8" height="12" fill="white" rx="1"/>
                <rect x="-2" y="-6" width="8" height="12" fill="white" rx="1"/>
                <rect x="8" y="-6" width="8" height="12" fill="white" rx="1"/>
                <text y="20" text-anchor="middle" class="spoke-label">On-Premises</text>
                <text y="32" text-anchor="middle" class="node-label-tiny">Data Centers</text>
              </g>
              
              <g transform="translate(240, 148)">
                <rect x="-20" y="-12" width="40" height="24" fill="url(#onPremGradientWan)" stroke="#4caf50" stroke-width="2" rx="8" filter="url(#nccGlow)"/>
                <rect x="-12" y="-6" width="8" height="12" fill="white" rx="1"/>
                <rect x="-2" y="-6" width="8" height="12" fill="white" rx="1"/>
                <rect x="8" y="-6" width="8" height="12" fill="white" rx="1"/>
                <text y="20" text-anchor="middle" class="spoke-label">Branch Offices</text>
                <text y="32" text-anchor="middle" class="node-label-tiny">Remote Sites</text>
              </g>
              
              <!-- High-bandwidth network connections with flow animation -->
              <path d="M 60 52 Q 100 76 95 100" fill="none" stroke="#4285f4" stroke-width="4" opacity="0.7">
                <animate attributeName="stroke-dasharray" values="0,30;15,15;30,0" dur="2s" repeatCount="indefinite"/>
              </path>
              <path d="M 220 52 Q 180 76 185 100" fill="none" stroke="#4285f4" stroke-width="4" opacity="0.7">
                <animate attributeName="stroke-dasharray" values="0,30;15,15;30,0" dur="2s" begin="0.5s" repeatCount="indefinite"/>
              </path>
              <path d="M 60 148 Q 100 124 95 100" fill="none" stroke="#4285f4" stroke-width="4" opacity="0.7">
                <animate attributeName="stroke-dasharray" values="0,30;15,15;30,0" dur="2s" begin="1s" repeatCount="indefinite"/>
              </path>
              <path d="M 220 148 Q 180 124 185 100" fill="none" stroke="#4285f4" stroke-width="4" opacity="0.7">
                <animate attributeName="stroke-dasharray" values="0,30;15,15;30,0" dur="2s" begin="1.5s" repeatCount="indefinite"/>
              </path>
              
              <!-- Internet and peering indicators -->
              <g transform="translate(140, 25)">
                <circle r="8" fill="#fbbc04" opacity="0.9"/>
                <path d="M-4,-3 L-2,-3 L0,-1 L2,-1 M-2,1 L0,1 L2,3 L4,3" stroke="white" stroke-width="1.5"/>
                <text y="-15" text-anchor="middle" class="small-label">Internet Gateway</text>
              </g>
              
              <g transform="translate(140, 175)">
                <circle r="8" fill="#ff9800" opacity="0.9"/>
                <rect x="-4" y="-4" width="8" height="8" fill="white" rx="1"/>
                <circle cx="0" cy="0" r="2" fill="#ff9800"/>
                <text y="20" text-anchor="middle" class="small-label">Peering Hub</text>
              </g>
              
              <!-- Connection indicators -->
              <path d="M 140 33 L 140 55" stroke="#fbbc04" stroke-width="2" stroke-dasharray="3,3" opacity="0.7"/>
              <path d="M 140 145 L 140 167" stroke="#ff9800" stroke-width="2" stroke-dasharray="3,3" opacity="0.7"/>
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
                <button mat-raised-button color="primary" class="get-started-btn" routerLink="/google-wan-wizard">Get started</button>
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
      padding: 32px;
      background-color: var(--background-color);
      font-family: 'Google Sans', Roboto, sans-serif;
      color: var(--text-color);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .header-section {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 48px;
      align-items: center;
      margin-bottom: 64px;
      background: linear-gradient(135deg, var(--background-color) 0%, var(--hover-color) 100%);
      border-radius: 16px;
      padding: 32px;
      position: relative;
      overflow: hidden;
    }

    .header-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%234285f4" fill-opacity="0.03"><circle cx="30" cy="30" r="2"/></g></svg>');
      opacity: 0.4;
    }

    .header-content {
      position: relative;
      z-index: 1;
    }

    .header-section h1 {
      font-size: 36px;
      font-weight: 400;
      color: var(--text-color);
      margin: 0 0 20px 0;
      background: linear-gradient(135deg, #4285f4, #34a853);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-description {
      font-size: 16px;
      line-height: 1.7;
      color: var(--text-secondary-color);
      margin: 0;
      max-width: 600px;
    }

    .header-visual {
      width: 500px;
      height: 200px;
      position: relative;
      z-index: 1;
    }

    .header-illustration {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 4px 12px rgba(66, 133, 244, 0.15));
    }

    .learn-more-link {
      color: var(--primary-color);
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
      background-color: var(--primary-color);
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
      color: var(--text-color);
      margin: 0 0 8px 0;
    }

    .step-content p {
      font-size: 14px;
      color: var(--text-secondary-color);
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
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 32px;
      margin-bottom: 64px;
    }

    .solution-card {
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 32px;
      background: linear-gradient(135deg, var(--surface-color) 0%, var(--hover-color) 100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .solution-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(66, 133, 244, 0.05) 0%, rgba(52, 168, 83, 0.05) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .solution-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 16px 32px rgba(0,0,0,0.1), 0 8px 16px rgba(66, 133, 244, 0.2);
      border-color: var(--primary-color);
    }

    .solution-card:hover::before {
      opacity: 1;
    }

    .solution-header {
      margin-bottom: 16px;
    }

    .by-google-badge {
      background-color: rgba(66, 133, 244, 0.12);
      color: var(--primary-color);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .solution-diagram {
      height: 220px;
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(66, 133, 244, 0.02) 0%, rgba(52, 168, 83, 0.02) 100%);
      border-radius: 12px;
      position: relative;
      z-index: 1;
    }

    .solution-diagram svg {
      width: 100%;
      height: 100%;
      max-width: 280px;
    }

    .diagram-label {
      font-size: 11px;
      fill: var(--text-secondary-color);
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
    }

    .node-label {
      font-size: 9px;
      fill: white;
      font-weight: 600;
      font-family: 'Google Sans', sans-serif;
    }

    .node-label-small {
      font-size: 7px;
      fill: white;
      font-weight: 600;
      font-family: 'Google Sans', sans-serif;
    }

    .node-label-tiny {
      font-size: 6px;
      fill: white;
      font-weight: 600;
      font-family: 'Google Sans', sans-serif;
    }

    .cloud-label {
      font-size: 8px;
      fill: white;
      font-weight: 600;
      font-family: 'Google Sans', sans-serif;
    }

    .region-label {
      font-size: 9px;
      fill: var(--text-color);
      font-weight: 600;
      font-family: 'Google Sans', sans-serif;
    }

    .spoke-label {
      font-size: 8px;
      fill: var(--text-color);
      font-weight: 600;
      font-family: 'Google Sans', sans-serif;
    }

    .step-label {
      font-size: 10px;
      fill: var(--text-color);
      font-weight: 600;
      font-family: 'Google Sans', sans-serif;
    }

    .hub-label {
      font-size: 7px;
      fill: white;
      font-weight: 600;
      font-family: 'Google Sans', sans-serif;
    }

    .small-label {
      font-size: 7px;
      fill: var(--text-secondary-color);
      font-weight: 500;
      font-family: 'Google Sans', sans-serif;
    }

    .solution-content {
      position: relative;
      z-index: 1;
    }

    .solution-content h3 {
      font-size: 20px;
      font-weight: 500;
      color: var(--text-color);
      margin: 0 0 12px 0;
      background: linear-gradient(135deg, #1a73e8, #137333);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .solution-content p {
      font-size: 15px;
      color: var(--text-secondary-color);
      line-height: 1.6;
      margin: 0 0 24px 0;
    }

    .solution-actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      z-index: 1;
    }

    .documentation-link,
    .github-link {
      color: var(--primary-color);
      text-decoration: none;
      font-size: 14px;
    }

    .documentation-link:hover,
    .github-link:hover {
      text-decoration: underline;
    }

    .action-buttons {
      display: flex;
      gap: 16px;
    }

    .preview-btn,
    .get-started-btn {
      flex: 1;
      min-height: 44px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 24px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .preview-btn {
      border-color: var(--primary-color);
      color: var(--primary-color);
      background: transparent;
    }

    .preview-btn:hover {
      background: rgba(66, 133, 244, 0.08);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
    }

    .get-started-btn {
      background: linear-gradient(135deg, #4285f4, #1a73e8);
      color: white;
      border: none;
    }

    .get-started-btn:hover {
      background: linear-gradient(135deg, #1a73e8, #1557b0);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(66, 133, 244, 0.3);
    }

    .get-started-btn-v2 {
      background: linear-gradient(135deg, #ff5722, #f44336);
      color: white;
      border: none;
      flex: 1;
      min-height: 44px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 24px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .get-started-btn-v2:hover {
      background: linear-gradient(135deg, #f44336, #d32f2f);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(255, 87, 34, 0.3);
    }

    .bottom-section {
      border-top: 1px solid var(--border-color);
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
      color: var(--text-secondary-color);
      margin: 0;
      line-height: 1.5;
    }

    /* Dark theme specific adjustments */
    :host-context(.dark-theme) {
      .solution-card {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .solution-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }
    }

    /* Material component overrides for dark theme */
    :host-context(.dark-theme) ::ng-deep {
      .mat-mdc-button {
        color: var(--text-color);
      }

      .mat-mdc-outlined-button {
        border-color: var(--border-color);
        color: var(--text-secondary-color);
      }

      .mat-mdc-outlined-button:not([disabled]):hover {
        background-color: var(--hover-color);
      }

      .mat-mdc-raised-button.mat-primary {
        background-color: var(--primary-color) !important;
        color: white !important;
      }

      .mat-mdc-raised-button.mat-primary:hover {
        background-color: var(--primary-hover-color) !important;
      }

      .mat-mdc-raised-button[disabled] {
        background-color: var(--hover-color) !important;
        color: var(--text-secondary-color) !important;
      }

      .mat-mdc-outlined-button[disabled] {
        border-color: var(--divider-color) !important;
        color: var(--text-secondary-color) !important;
      }
    }

    /* Standard overrides (for light theme compatibility) */
    ::ng-deep .mat-mdc-outlined-button {
      border-color: var(--border-color);
      color: var(--text-secondary-color);
    }

    ::ng-deep .mat-mdc-outlined-button:not([disabled]):hover {
      background-color: var(--hover-color);
    }

    ::ng-deep .mat-mdc-raised-button.mat-primary {
      background-color: var(--primary-color);
      color: white;
    }

    @media (max-width: 768px) {
      .network-solutions-container {
        padding: 16px;
      }

      .header-section {
        grid-template-columns: 1fr;
        gap: 24px;
        padding: 24px;
        margin-bottom: 48px;
      }

      .header-section h1 {
        font-size: 28px;
      }

      .header-description {
        font-size: 14px;
      }

      .header-visual {
        width: 100%;
        height: 150px;
      }

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
        gap: 24px;
      }

      .solution-card {
        padding: 24px;
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