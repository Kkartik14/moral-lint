/**
 * Privacy Violation Test Fixture
 *
 * These patterns show privacy-violating code that collects,
 * logs, or transmits sensitive user data improperly.
 */

// Logging credentials to console
function loginUser(username, password) {
  console.log('Login attempt - password:', password);
  return authenticate(username, password);
}

// Tracking without consent check
function initAnalytics() {
  const trackingData = {
    userId: getUserId(),
    page: window.location.href,
    timestamp: Date.now(),
  };
  analyticsTracker.send(trackingData);
  navigator.sendBeacon('/analytics', JSON.stringify(trackingData));
}

// Canvas fingerprinting
function getDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);
  return canvas.toDataURL();
}

// Excessive device data collection
function collectDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
  };
}

// PII in analytics
function trackPurchase(order) {
  const data = {
    email: order.userEmail,
    phone: order.userPhone,
  };
  analyticsTracker.send(data);
}

// Logging sensitive user data
function debugUserSession(session) {
  console.log('User data:', session.userData);
  console.log('Sensitive personal data:', session.personalInfo);
}

// GOOD: Tracking with consent
function trackWithConsent(event) {
  if (userHasOptedIn() && !navigator.doNotTrack) {
    analytics.send(event);
  }
}

// Logging credit card info (severe!)
function processOrder(order) {
  console.log('Processing credit card number:', order.cardNumber);
  console.log('CVV:', order.cvv);
  return chargeCard(order);
}

module.exports = {
  loginUser,
  initAnalytics,
  getDeviceFingerprint,
  collectDeviceInfo,
  trackPurchase,
  debugUserSession,
  trackWithConsent,
  processOrder,
};
