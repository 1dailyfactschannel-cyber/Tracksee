(function(global) {
  'use strict';

  const TRACKSEE_RECORDER_VERSION = '1.0.0';

  class SessionRecorder {
    constructor(config) {
      this.apiKey = config.apiKey;
      this.apiUrl = config.apiUrl || '/api/sessions';
      this.eventsApiUrl = config.eventsApiUrl || '/api/sessions/events';
      this.sessionId = this.generateSessionId();
      this.userId = config.userId || null;
      this.enabled = config.enabled !== false;
      this.batchSize = config.batchSize || 50;
      this.batchTimeout = config.batchTimeout || 2000;
      this.eventsBuffer = [];
      this.sessionStartTime = Date.now();
      this.initialized = false;
      this.recordingId = null;
      this.eventsCount = 0;
      this.isRecording = true;

      this.eventTypes = [
        'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout',
        'keydown', 'keyup', 'keypress',
        'focus', 'blur', 'change', 'input', 'submit', 'reset', 'select',
        'scroll', 'resize', 'wheel',
        'touchstart', 'touchend', 'touchmove', 'touchcancel',
        'load', 'DOMContentLoaded', 'beforeunload', 'unload', 'error', 'hashchange', 'popstate'
      ];

      if (this.enabled) {
        this.init();
      }
    }

    generateSessionId() {
      return 'sr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    async init() {
      if (this.initialized || typeof document === 'undefined') return;
      this.initialized = true;

      this.setupEventListeners();
      await this.startSession();
      this.startBatchProcessor();
      this.setupUnloadHandler();
    }

    setupEventListeners() {
      this.eventTypes.forEach(eventType => {
        if (eventType === 'DOMContentLoaded' || eventType === 'load') {
          if (document.readyState === 'loading') {
            document.addEventListener(eventType, (e) => this.recordEvent(eventType, this.extractEventData(e)));
          } else {
            this.recordEvent(eventType, { timestamp: 0, loaded: true });
          }
          return;
        }

        document.addEventListener(eventType, (e) => {
          if (!this.isRecording) return;
          this.recordEvent(eventType, this.extractEventData(e));
        }, { passive: true, capture: true });
      });

      if (typeof MutationObserver !== 'undefined') {
        this.setupMutationObserver();
      }

      if (typeof PerformanceObserver !== 'undefined') {
        this.setupPerformanceObserver();
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => this.recordEvent('network', { status: 'online' }));
        window.addEventListener('offline', () => this.recordEvent('network', { status: 'offline' }));
      }
    }

    setupMutationObserver() {
      let mutationTimeout;

      const observer = new MutationObserver((mutations) => {
        if (!this.isRecording) return;

        clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(() => {
          const processedMutations = this.processMutations(mutations);
          if (processedMutations.length > 0) {
            this.recordEvent('mutation', {
              mutations: processedMutations,
              html: document.documentElement?.outerHTML?.slice(0, 5000) || ''
            });
          }
        }, 100);
      });

      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
        attributeOldValue: true,
        characterDataOldValue: true
      });
    }

    setupPerformanceObserver() {
      if (typeof PerformanceObserver === 'undefined') return;

      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.recordEvent('lcp', {
                startTime: entry.startTime,
                size: entry.size,
                id: entry.id
              });
            }
          }
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {}
    }

    processMutations(mutations) {
      return mutations.slice(0, 20).map(mutation => ({
        type: mutation.type,
        target: this.getSelector(mutation.target),
        addedNodes: mutation.addedNodes?.length || 0,
        removedNodes: mutation.removedNodes?.length || 0,
        attributeName: mutation.attributeName,
        oldValue: mutation.oldValue?.slice(0, 200) || null
      }));
    }

    getSelector(element) {
      if (!element || element === document.documentElement || element === document.body) {
        return element?.tagName?.toLowerCase() || 'unknown';
      }

      if (element.id) {
        return '#' + element.id;
      }

      let path = element.tagName.toLowerCase();
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).slice(0, 3).join('.');
        if (classes) path += '.' + classes;
      }

      let parent = element.parentElement;
      let depth = 0;
      while (parent && depth < 3) {
        const index = Array.from(parent.children).indexOf(element) + 1;
        path = parent.tagName.toLowerCase() + ':nth-child(' + index + ') > ' + path;
        element = parent;
        parent = element.parentElement;
        depth++;
      }

      return path;
    }

    extractEventData(e) {
      const data = {
        timestamp: Date.now() - this.sessionStartTime
      };

      if (e.type === 'scroll') {
        data.scrollX = window.scrollX;
        data.scrollY = window.scrollY;
        data.scrollHeight = document.documentElement.scrollHeight;
        data.clientHeight = document.documentElement.clientHeight;
      }

      if (e.type === 'resize') {
        data.width = window.innerWidth;
        data.height = window.innerHeight;
      }

      if (e.type === 'click' || e.type.startsWith('mouse')) {
        data.x = e.clientX;
        data.y = e.clientY;
        data.target = this.getSelector(e.target);
        data.targetText = e.target.textContent?.slice(0, 100) || '';
        if (e.type === 'click') {
          data.tagName = e.target.tagName;
          data.href = e.target.href;
          data.inputType = e.target.type;
        }
      }

      if (e.type === 'keydown' || e.type === 'keyup' || e.type === 'keypress') {
        data.key = e.key;
        data.code = e.code;
        data.keyCode = e.keyCode;
        data.target = this.getSelector(e.target);
      }

      if (e.type === 'input' || e.type === 'change') {
        data.target = this.getSelector(e.target);
        data.value = e.target?.value?.slice(0, 100) || '';
        data.inputType = e.target?.type || '';
        data.tagName = e.target?.tagName;
      }

      if (e.type === 'focus' || e.type === 'blur') {
        data.target = this.getSelector(e.target);
      }

      if (e.type === 'error' || e.type === 'load') {
        data.message = e.message || '';
        data.source = e.filename;
        data.lineno = e.lineno;
      }

      if (typeof e === 'object' && e !== null) {
        data.type = e.constructor?.name || 'Event';
      }

      return data;
    }

    async startSession() {
      if (!this.enabled) return;

      const payload = {
        session_id: this.sessionId,
        user_id: this.userId,
        browser: this.getBrowser(),
        os: this.getOS(),
        device_type: this.getDeviceType(),
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        url: window.location.href,
        referrer: document.referrer,
        metadata: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled
        }
      };

      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.recording_id) {
          this.recordingId = data.recording_id;
        }
      } catch (err) {
        console.warn('SessionRecorder: Failed to start session', err);
      }
    }

    recordEvent(eventType, data) {
      if (!this.enabled || !this.isRecording) return;

      this.eventsBuffer.push({
        event_type: eventType,
        timestamp: data.timestamp || Math.round(performance.now()),
        data: data
      });

      this.eventsCount++;

      if (this.eventsBuffer.length >= this.batchSize) {
        this.flushEvents();
      }
    }

    startBatchProcessor() {
      setInterval(() => {
        this.flushEvents();
      }, this.batchTimeout);
    }

    setupUnloadHandler() {
      if (typeof window === 'undefined') return;

      const sendRemaining = () => {
        this.flushEvents();
        if (this.recordingId) {
          const endPayload = {
            session_id: this.sessionId,
            metadata: {
              events_count: this.eventsCount,
              ended_at: Date.now()
            }
          };

          const blob = new Blob([JSON.stringify(endPayload)], { type: 'application/json' });
          navigator.sendBeacon(this.apiUrl + '?key=' + this.apiKey, blob);
        }
      };

      window.addEventListener('beforeunload', sendRemaining);
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushEvents();
        }
      });
    }

    async flushEvents() {
      if (this.eventsBuffer.length === 0) return;

      const events = this.eventsBuffer.splice(0, this.batchSize);

      if (!this.recordingId) {
        await this.startSession();
        if (!this.recordingId) return;
      }

      try {
        await fetch(this.eventsApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          },
          body: JSON.stringify({
            recording_id: this.recordingId,
            session_id: this.sessionId,
            events: events
          }),
          keepalive: true
        });
      } catch (err) {
        this.eventsBuffer.unshift(...events);
      }
    }

    getDeviceType() {
      const width = window.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    }

    getBrowser() {
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'unknown';
    }

    getOS() {
      const ua = navigator.userAgent;
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'macOS';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
      return 'unknown';
    }

    updateUserId(userId) {
      this.userId = userId;
    }

    pauseRecording() {
      this.isRecording = false;
      this.recordEvent('recorder', { action: 'pause' });
    }

    resumeRecording() {
      this.isRecording = true;
      this.recordEvent('recorder', { action: 'resume' });
    }

    stopRecording() {
      this.isRecording = false;
      this.recordEvent('recorder', { action: 'stop' });
      this.flushEvents();
    }

    destroy() {
      this.enabled = false;
      this.initialized = false;
      this.stopRecording();
    }
  }

  global.SessionRecorder = SessionRecorder;

  global.trackseeSessionRecorder = function(config) {
    return new SessionRecorder(config);
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SessionRecorder, trackseeSessionRecorder: global.trackseeSessionRecorder };
  }

})(typeof window !== 'undefined' ? window : global);
