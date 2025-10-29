/**
 * Klariqo Voice AI Widget
 * Embeddable voice chat widget for any website
 * Connects to Supabase Edge Function backend
 *
 * Usage: <script src="https://[YOUR-DOMAIN]/klariqo-widget.js?client_id=YOUR_CLIENT_ID"></script>
 */

(function() {
  'use strict';

  // Get client_id from script tag
  const currentScript = document.currentScript || document.querySelector('script[src*="klariqo-widget.js"]');
  const scriptSrc = currentScript ? currentScript.src : '';
  const urlParams = new URLSearchParams(scriptSrc.split('?')[1] || '');
  const CLIENT_ID = urlParams.get('client_id');

  if (!CLIENT_ID) {
    console.error('[Klariqo Widget] Error: client_id parameter is required');
    return;
  }

  // Configuration
  const WEBSOCKET_URL = 'wss://btqccksigmohyjdxgrrj.supabase.co/functions/v1/chat-websocket';
  const SUPABASE_URL = 'https://btqccksigmohyjdxgrrj.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0cWNja3NpZ21vaHlqZHhncnJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxMzM3NjYsImV4cCI6MjA0MzcwOTc2Nn0.a1qiSqSw3VuIaqRiP9bqX-0d8XlU1WA5nzz4c8_bkM8';

  console.log(`[Klariqo Widget] Initializing for client: ${CLIENT_ID}`);

  // Fetch widget configuration from database
  let widgetConfig = {
    primary_color: '#ef4444',
    secondary_color: '#1a1a1a',
    text_color: '#ffffff',
    position: 'bottom-right',
    widget_size: 'medium',
    greeting_message: 'Hi! How can I help you today?'
  };

  async function fetchWidgetConfig() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/widget_config?client_id=eq.${CLIENT_ID}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          widgetConfig = {
            primary_color: data[0].primary_color || widgetConfig.primary_color,
            secondary_color: data[0].secondary_color || widgetConfig.secondary_color,
            text_color: data[0].text_color || widgetConfig.text_color,
            position: data[0].position || widgetConfig.position,
            widget_size: data[0].widget_size || widgetConfig.widget_size,
            greeting_message: data[0].greeting_message || widgetConfig.greeting_message
          };
          console.log('[Klariqo Widget] Configuration loaded:', widgetConfig);
        }
      }
    } catch (error) {
      console.warn('[Klariqo Widget] Could not load config, using defaults:', error);
    }
  }

  // ===========================================
  // STYLES (Generated dynamically from config)
  // ===========================================
  function generateStyles() {
    // Position mapping
    const positions = {
      'bottom-right': 'bottom: 24px; right: 24px;',
      'bottom-left': 'bottom: 24px; left: 24px;',
      'top-right': 'top: 24px; right: 24px;',
      'top-left': 'top: 24px; left: 24px;'
    };

    // Size mapping (button size)
    const sizes = {
      'small': '48px',
      'medium': '64px',
      'large': '80px'
    };

    const buttonSize = sizes[widgetConfig.widget_size] || '64px';
    const positionCSS = positions[widgetConfig.position] || positions['bottom-right'];

    return `
    .klariqo-widget-container {
      position: fixed;
      ${positionCSS}
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .klariqo-tooltip {
      position: absolute;
      bottom: 50%;
      right: calc(100% + 16px);
      transform: translateY(50%);
      background: #1f2937;
      color: white;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .klariqo-tooltip::after {
      content: '';
      position: absolute;
      top: 50%;
      right: -8px;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid #1f2937;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
    }

    .klariqo-fab:hover .klariqo-tooltip {
      opacity: 1;
      right: calc(100% + 12px);
    }

    .klariqo-widget-panel.klariqo-open ~ .klariqo-fab .klariqo-tooltip {
      opacity: 0 !important;
    }

    .klariqo-fab {
      width: ${buttonSize};
      height: ${buttonSize};
      border-radius: 50%;
      background: ${widgetConfig.primary_color};
      border: none;
      box-shadow: 0 8px 24px ${widgetConfig.primary_color}40;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: visible;
    }

    .klariqo-fab:hover {
      transform: scale(1.05);
      box-shadow: 0 12px 32px ${widgetConfig.primary_color}66;
    }

    .klariqo-fab:active {
      transform: scale(0.95);
    }

    .klariqo-fab-icon {
      width: 28px;
      height: 28px;
      fill: white;
      transition: all 0.3s ease;
    }

    .klariqo-fab.klariqo-open .klariqo-fab-icon {
      transform: rotate(180deg);
    }

    .klariqo-widget-panel {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 380px;
      max-width: calc(100vw - 48px);
      height: 600px;
      max-height: calc(100vh - 150px);
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .klariqo-widget-panel.klariqo-open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: all;
    }

    .klariqo-widget-header {
      background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }

    .klariqo-widget-header h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .klariqo-widget-header p {
      font-size: 13px;
      margin: 0;
      opacity: 0.9;
    }

    .klariqo-widget-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #f9fafb;
      overflow-y: auto;
      padding: 20px;
    }

    .klariqo-voice-button {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
      border: none;
      box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: auto;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .klariqo-voice-button:hover {
      transform: scale(1.05);
    }

    .klariqo-voice-button.klariqo-listening {
      animation: klariqo-pulse 1.5s infinite;
    }

    @keyframes klariqo-pulse {
      0%, 100% { box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3); }
      50% { box-shadow: 0 8px 40px rgba(239, 68, 68, 0.6); }
    }

    .klariqo-ripple {
      position: absolute;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 2px solid #ef4444;
      opacity: 0;
    }

    .klariqo-voice-button.klariqo-listening .klariqo-ripple {
      animation: klariqo-ripple-animation 1.5s infinite;
    }

    .klariqo-voice-button.klariqo-listening .klariqo-ripple:nth-child(2) {
      animation-delay: 0.5s;
    }

    .klariqo-voice-button.klariqo-listening .klariqo-ripple:nth-child(3) {
      animation-delay: 1s;
    }

    @keyframes klariqo-ripple-animation {
      0% {
        transform: scale(1);
        opacity: 0.6;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }

    .klariqo-status-text {
      text-align: center;
      margin-top: 16px;
      font-size: 14px;
      color: #6b7280;
    }

    .klariqo-status-text.klariqo-listening-text {
      color: ${widgetConfig.primary_color};
      font-weight: 600;
    }
  `;
  }

  // Inject styles (will be called after config is loaded)
  function injectStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = generateStyles();
    document.head.appendChild(styleSheet);
  }

  // ===========================================
  // AUDIO RECORDER CLASS
  // ===========================================
  class AudioRecorder {
    constructor(onAudioData) {
      this.stream = null;
      this.audioContext = null;
      this.processor = null;
      this.source = null;
      this.onAudioData = onAudioData;
    }

    async start() {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000,
        });

        // Resume AudioContext for iOS
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        this.source = this.audioContext.createMediaStreamSource(this.stream);
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = this.floatTo16BitPCM(inputData);
          const base64Audio = this.arrayBufferToBase64(pcm16.buffer);
          this.onAudioData(base64Audio);
        };

        this.source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);

        console.log('[Klariqo] Recording started');
      } catch (error) {
        console.error('[Klariqo] Microphone error:', error);
        throw error;
      }
    }

    floatTo16BitPCM(float32Array) {
      const int16Array = new Int16Array(float32Array.length);
      for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return int16Array;
    }

    arrayBufferToBase64(buffer) {
      const uint8Array = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 0x8000;

      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }

      return btoa(binary);
    }

    stop() {
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      console.log('[Klariqo] Recording stopped');
    }
  }

  // ===========================================
  // AUDIO PLAYER CLASS
  // ===========================================
  class AudioPlayer {
    constructor() {
      this.chunkBuffer = {};
      this.nextChunkToPlay = 0;
      this.isPlaying = false;
      this.audioQueue = [];
    }

    async addChunk(audioBase64, chunkIndex) {
      this.chunkBuffer[chunkIndex] = audioBase64;
      await this.tryPlayNext();
    }

    async tryPlayNext() {
      if (this.isPlaying) return;

      while (this.chunkBuffer[this.nextChunkToPlay] !== undefined) {
        const audioData = this.chunkBuffer[this.nextChunkToPlay];
        delete this.chunkBuffer[this.nextChunkToPlay];
        this.nextChunkToPlay++;

        await this.playAudioChunk(audioData);
      }
    }

    async playAudioChunk(audioBase64) {
      return new Promise((resolve) => {
        this.isPlaying = true;

        try {
          const audio = new Audio('data:audio/mp3;base64,' + audioBase64);

          audio.onended = () => {
            this.isPlaying = false;
            resolve();
          };

          audio.onerror = (e) => {
            console.error('[Klariqo] Audio playback error:', e);
            this.isPlaying = false;
            resolve();
          };

          audio.play().catch(e => {
            console.error('[Klariqo] Play error:', e);
            this.isPlaying = false;
            resolve();
          });
        } catch (error) {
          console.error('[Klariqo] Audio chunk error:', error);
          this.isPlaying = false;
          resolve();
        }
      });
    }

    reset() {
      this.chunkBuffer = {};
      this.nextChunkToPlay = 0;
      this.isPlaying = false;
    }
  }

  // ===========================================
  // WIDGET CLASS
  // ===========================================
  class KlariqoWidget {
    constructor() {
      this.isOpen = false;
      this.isListening = false;
      this.ws = null;
      this.audioRecorder = null;
      this.audioPlayer = new AudioPlayer();

      this.initWidget();
    }

    initWidget() {
      // Create widget HTML
      const widgetHTML = `
        <div class="klariqo-widget-container">
          <div class="klariqo-widget-panel" id="klariqoPanel">
            <div class="klariqo-widget-header">
              <h2>AI Voice Assistant</h2>
              <p>Click the microphone to start talking</p>
            </div>
            <div class="klariqo-widget-content">
              <button class="klariqo-voice-button" id="klariqoVoiceBtn">
                <div class="klariqo-ripple"></div>
                <div class="klariqo-ripple"></div>
                <div class="klariqo-ripple"></div>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>
              <div class="klariqo-status-text" id="klariqoStatus">Tap to speak</div>
            </div>
          </div>

          <button class="klariqo-fab" id="klariqoFab">
            <div class="klariqo-tooltip">Need help? Talk to us!</div>
            <svg class="klariqo-fab-icon" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', widgetHTML);

      // Bind events
      document.getElementById('klariqoFab').addEventListener('click', () => this.toggleWidget());
      document.getElementById('klariqoVoiceBtn').addEventListener('click', () => this.toggleListening());
    }

    toggleWidget() {
      this.isOpen = !this.isOpen;
      const fab = document.getElementById('klariqoFab');
      const panel = document.getElementById('klariqoPanel');

      if (this.isOpen) {
        fab.classList.add('klariqo-open');
        panel.classList.add('klariqo-open');
        this.connectWebSocket();
      } else {
        fab.classList.remove('klariqo-open');
        panel.classList.remove('klariqo-open');
        if (this.isListening) {
          this.toggleListening();
        }
        this.disconnectWebSocket();
      }
    }

    async toggleListening() {
      this.isListening = !this.isListening;
      const btn = document.getElementById('klariqoVoiceBtn');
      const status = document.getElementById('klariqoStatus');

      if (this.isListening) {
        btn.classList.add('klariqo-listening');
        status.textContent = 'Listening... speak now';
        status.classList.add('klariqo-listening-text');

        // Start recording
        this.audioRecorder = new AudioRecorder((audioData) => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'audio.chunk',
              audio: audioData
            }));
          }
        });

        try {
          await this.audioRecorder.start();
        } catch (error) {
          alert('Microphone access denied. Please allow microphone access to use voice chat.');
          this.isListening = false;
          btn.classList.remove('klariqo-listening');
          status.textContent = 'Tap to speak';
          status.classList.remove('klariqo-listening-text');
        }
      } else {
        btn.classList.remove('klariqo-listening');
        status.textContent = 'Processing...';
        status.classList.remove('klariqo-listening-text');

        // Stop recording
        if (this.audioRecorder) {
          this.audioRecorder.stop();
          this.audioRecorder = null;
        }

        setTimeout(() => {
          status.textContent = 'Tap to speak';
        }, 1000);
      }
    }

    connectWebSocket() {
      const wsUrl = `${WEBSOCKET_URL}?client_id=${CLIENT_ID}`;
      console.log('[Klariqo] Connecting to:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Klariqo] WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('[Klariqo] Message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Klariqo] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('[Klariqo] WebSocket disconnected');
      };
    }

    disconnectWebSocket() {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.audioPlayer.reset();
    }

    handleWebSocketMessage(data) {
      switch (data.type) {
        case 'connection.established':
          console.log('[Klariqo] Connection established');
          break;

        case 'transcript.user':
          console.log('[Klariqo] User:', data.text);
          break;

        case 'text.chunk':
          console.log('[Klariqo] AI:', data.text);
          break;

        case 'audio.chunk':
          this.audioPlayer.addChunk(data.audio, data.chunk_index);
          break;

        case 'audio.complete':
          console.log('[Klariqo] Audio complete');
          break;

        case 'error':
          console.error('[Klariqo] Server error:', data.message);
          break;

        default:
          console.log('[Klariqo] Unknown message:', data.type);
      }
    }
  }

  // ===========================================
  // INITIALIZE WIDGET
  // ===========================================
  async function initializeWidget() {
    // Fetch config from database first
    await fetchWidgetConfig();

    // Inject styles with loaded config
    injectStyles();

    // Create widget
    new KlariqoWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWidget);
  } else {
    initializeWidget();
  }

})();
