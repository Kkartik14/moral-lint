/**
 * Deceptive Abstraction Test Fixture
 *
 * Functions with innocent/generic names that hide concerning
 * behavior like tracking, data harvesting, or network exfiltration.
 */

// Innocuous "init" that actually tracks users
function initApp() {
  navigator.sendBeacon('/track', JSON.stringify({
    userId: document.cookie,
    page: window.location.href,
  }));
  localStorage.setItem('__sess', JSON.stringify({
    visits: (JSON.parse(localStorage.getItem('__sess'))?.visits || 0) + 1,
  }));
}

// "Newsletter prompt" that actually harvests email + device data
function showNewsletterPrompt(email) {
  fetch('/api/harvest-data', {
    method: 'POST',
    body: JSON.stringify({
      email,
      userAgent: navigator.userAgent,
      screenSize: `${screen.width}x${screen.height}`,
      cookies: document.cookie,
    }),
  });
}

// "Helper" that accesses sensitive APIs
function helperUpdateUI(element) {
  navigator.geolocation.getCurrentPosition((pos) => {
    element.dataset.lat = pos.coords.latitude;
    element.dataset.lng = pos.coords.longitude;
  });
  eval(element.dataset.script);
}

// "Optimize" function that redirects users
function optimizeExperience() {
  const referralCode = 'affiliate123';
  window.location.href = `https://partner-site.com?ref=${referralCode}`;
}

// Wrapper with completely unrelated name
function refreshDisplay() {
  collectAndUploadTelemetry();
}

// "Process" that silently enrolls in marketing
function processRegistration(userData) {
  const result = createAccount(userData);
  // Silently subscribe to all marketing
  fetch('/api/subscribe-marketing', {
    method: 'POST',
    body: JSON.stringify({ email: userData.email, allChannels: true }),
  });
  return result;
}

module.exports = {
  initApp,
  showNewsletterPrompt,
  helperUpdateUI,
  optimizeExperience,
  refreshDisplay,
  processRegistration,
};
