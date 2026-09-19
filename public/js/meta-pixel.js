/**
 * Minoza Store - Meta Pixel & Attribution Stack Manager
 * Handles client-side tracking, UTM parameter capture, and Event ID generation for CAPI Deduplication
 */

(function () {
  window.MinozaTracking = {
    // Parse UTM Parameters from URL
    getUtmParameters: function () {
      const params = new URLSearchParams(window.location.search);
      return {
        source: params.get('utm_source') || 'meta_ads',
        medium: params.get('utm_medium') || 'cpc',
        campaign: params.get('utm_campaign') || 'launch_promo',
        content: params.get('utm_content') || '',
        term: params.get('utm_term') || '',
        fbclid: params.get('fbclid') || ''
      };
    },

    // Read or set Meta Browser Cookies (_fbp, _fbc)
    getFbpCookie: function () {
      const match = document.cookie.match(/(^|;)\s*_fbp=([^;]+)/);
      return match ? match[2] : `fb.1.${Date.now()}.${Math.floor(Math.random() * 1000000000)}`;
    },

    getFbcCookie: function () {
      const match = document.cookie.match(/(^|;)\s*_fbc=([^;]+)/);
      if (match) return match[2];
      const fbclid = new URLSearchParams(window.location.search).get('fbclid');
      return fbclid ? `fb.1.${Date.now()}.${fbclid}` : '';
    },

    // Generate unique event ID for Deduplication with Server-side CAPI
    generateEventId: function (prefix = 'evt') {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Dispatch Meta Event (Console fallback if Pixel not yet loaded)
    track: function (eventName, eventData = {}, eventId = null) {
      const finalEventId = eventId || this.generateEventId(eventName.toLowerCase());

      console.log(`[Meta Pixel Tracking] 📡 Event: ${eventName}`, {
        eventId: finalEventId,
        data: eventData,
        utm: this.getUtmParameters()
      });

      // If standard fbq is present
      if (typeof window.fbq === 'function') {
        window.fbq('track', eventName, eventData, { eventID: finalEventId });
      }

      return finalEventId;
    }
  };

  // Initial PageView
  window.addEventListener('DOMContentLoaded', () => {
    window.MinozaTracking.track('PageView');
  });
})();
