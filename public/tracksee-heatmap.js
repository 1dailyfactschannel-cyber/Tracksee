(function(global) {
  'use strict';

  const TRACKSEE_VERSION = '1.0.0';

  class TrackseeHeatmap {
    constructor(config) {
      this.apiKey = config.apiKey;
      this.apiUrl = config.apiUrl || '/api/ingest';
      this.sessionId = this.generateSessionId();
      this.userId = config.userId || null;
      this.enabled = config.enabled !== false;
      this.batchSize = config.batchSize || 10;
      this.batchTimeout = config.batchTimeout || 1000;
      this.clickBuffer = [];
      this.scrollBuffer = [];
      this.rageClickMap = new Map();
      this.rageClickThreshold = config.rageClickThreshold || 3;
      this.rageClickTimeWindow = config.rageClickTimeWindow || 1000;
      this.lastScrollY = 0;
      this.maxScrollDepth = 0;
      this.scrollThrottle = config.scrollThrottle || 500;
      this.lastScrollTime = 0;
      this.initialized = false;

      if (this.enabled) {
        this.init();
      }
    }

    generateSessionId() {
      return 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    init() {
      if (this.initialized) return;
      this.initialized = true;

      this.setupClickTracking();
      this.setupScrollTracking();
      this.setupRageClickDetection();
      this.setupSessionTracking();
      this.startBatchProcessor();

      window.addEventListener('beforeunload', () => {
        this.flushAll();
      });

      if (typeof window !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            this.flushAll();
          }
        });
      }
    }

    setupClickTracking() {
      if (typeof document === 'undefined') return;

      document.addEventListener('click', (e) => {
        const target = e.target;
        const rect = target.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);

        const selector = this.getElementSelector(target);
        const text = target.textContent?.slice(0, 200) || '';

        this.clickBuffer.push({
          event_type: 'heatmap_click',
          x: e.clientX,
          y: e.clientY,
          selector: selector,
          text: text,
          page_url: window.location.pathname + window.location.search,
          session_id: this.sessionId,
          user_id: this.userId
        });

        this.processRageClick(e.clientX, e.clientY, selector, text);
      }, true);
    }

    setupScrollTracking() {
      if (typeof window === 'undefined') return;

      const handleScroll = () => {
        const now = Date.now();
        if (now - this.lastScrollTime < this.scrollThrottle) return;
        this.lastScrollTime = now;

        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const depth = docHeight > 0 ? Math.round((scrollY / docHeight) * 100) : 0;

        if (depth > this.maxScrollDepth) {
          this.maxScrollDepth = depth;
        }

        this.scrollBuffer.push({
          event_type: 'heatmap_scroll',
          depth: depth,
          viewport_height: window.innerHeight,
          viewport_width: window.innerWidth,
          page_url: window.location.pathname + window.location.search,
          session_id: this.sessionId
        });
      };

      window.addEventListener('scroll', handleScroll, true);
      handleScroll();
    }

    setupRageClickDetection() {
      if (typeof window === 'undefined') return;

      window.addEventListener('click', (e) => {
        const key = `${Math.round(e.clientX)},${Math.round(e.clientY)}`;
        const now = Date.now();

        let clicks = this.rageClickMap.get(key) || [];
        clicks = clicks.filter(time => now - time < this.rageClickTimeWindow);
        clicks.push(now);
        this.rageClickMap.set(key, clicks);

        if (clicks.length >= this.rageClickThreshold) {
          const target = e.target;
          const selector = this.getElementSelector(target);
          const text = target.textContent?.slice(0, 200) || '';

          this.send({
            event_type: 'rage_click',
            x: Math.round(e.clientX),
            y: Math.round(e.clientY),
            selector: selector,
            text: text,
            click_count: clicks.length,
            page_url: window.location.pathname + window.location.search,
            session_id: this.sessionId,
            user_id: this.userId
          });

          this.rageClickMap.delete(key);
        }
      }, true);
    }

    setupSessionTracking() {
      if (typeof window === 'undefined') return;

      this.send({
        event_type: 'session_start',
        session_id: this.sessionId,
        user_id: this.userId,
        url: window.location.href,
        device_type: this.getDeviceType(),
        browser: this.getBrowser(),
        os: this.getOS(),
        screen_width: window.screen.width,
        screen_height: window.screen.height
      });
    }

    startBatchProcessor() {
      setInterval(() => {
        this.flushClickBuffer();
        this.flushScrollBuffer();
      }, this.batchTimeout);
    }

    flushClickBuffer() {
      if (this.clickBuffer.length === 0) return;

      const batch = this.clickBuffer.splice(0, this.batchSize);
      batch.forEach(item => this.send(item));
    }

    flushScrollBuffer() {
      if (this.scrollBuffer.length === 0) return;

      const uniqueDepths = new Map();
      this.scrollBuffer.forEach(item => {
        const key = `${item.depth}-${item.viewport_height}-${item.viewport_width}`;
        if (!uniqueDepths.has(key)) {
          uniqueDepths.set(key, item);
        }
      });
      this.scrollBuffer = [];

      uniqueDepths.forEach(item => this.send(item));
    }

    flushAll() {
      this.flushClickBuffer();
      this.flushScrollBuffer();
    }

    send(data) {
      if (!this.enabled) return;

      const payload = {
        ...data,
        apiKey: this.apiKey
      };

      if (typeof fetch !== 'undefined') {
        fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(err => console.error('Tracksee send error:', err));
      }
    }

    getElementSelector(element) {
      if (!element || element === document.body) return 'body';

      let selector = '';
      if (element.id) {
        return '#' + element.id;
      }

      if (element.className && typeof element.className === 'string' && element.className.trim()) {
        selector = '.' + element.className.trim().split(/\s+/).join('.');
      }

      if (selector) {
        const parent = element.parentElement;
        if (parent) {
          const index = this.getElementIndex(element);
          selector = parent.tagName.toLowerCase() + ':nth-child(' + index + ')' + ' > ' + selector;
        }
      } else {
        selector = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const index = this.getElementIndex(element);
          selector = parent.tagName.toLowerCase() + ':nth-child(' + index + ')' + ' > ' + selector;
        }
      }

      return selector;
    }

    getElementIndex(element) {
      let index = 1;
      let sibling = element.previousElementSibling;

      while (sibling) {
        if (sibling.tagName === element.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }

      return index;
    }

    getDeviceType() {
      if (typeof window === 'undefined') return 'unknown';
      const width = window.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    }

    getBrowser() {
      if (typeof navigator === 'undefined') return 'unknown';
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'unknown';
    }

    getOS() {
      if (typeof navigator === 'undefined') return 'unknown';
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

    enable() {
      this.enabled = true;
    }

    disable() {
      this.enabled = false;
    }

    destroy() {
      this.flushAll();
      this.enabled = false;
      this.initialized = false;
    }
  }

  global.TrackseeHeatmap = TrackseeHeatmap;

  global.trackseeHeatmap = function(config) {
    return new TrackseeHeatmap(config);
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrackseeHeatmap, trackseeHeatmap: global.trackseeHeatmap };
  }

})(typeof window !== 'undefined' ? window : global);
