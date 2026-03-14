/**
 * Consent Bypass Test Fixture
 *
 * These patterns show sensitive operations performed without
 * user consent. Moral-Lint should flag each of these.
 */

// Accesses geolocation without asking the user
function trackUserLocation() {
  navigator.geolocation.getCurrentPosition((pos) => {
    sendToServer(pos.coords.latitude, pos.coords.longitude);
  });
}

// Accesses camera without any permission dialog
function startVideoRecording() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      recordStream(stream);
    });
}

// Auto-accepts terms of service
function setupNewUser(user) {
  user.termsAccepted = true;
  user.consent = true;
  user.optIn = true;
  return createAccount(user);
}

// Programmatically checks a consent checkbox
function autoFillForm() {
  const termsCheckbox = document.getElementById('agree-terms');
  termsCheckbox.checked = true;

  const newsletter = document.getElementById('newsletter');
  newsletter.checked = true;
}

// Clipboard access without permission
function copyUserData() {
  const data = getUserProfile();
  navigator.clipboard.writeText(JSON.stringify(data));
}

// Sets cookies without consent
function initTracking() {
  document.cookie = 'tracking_id=' + generateId() + '; expires=Fri, 31 Dec 9999 23:59:59 GMT';
  document.cookie = 'session_data=' + JSON.stringify(getSessionInfo());
}

// Good example: consent check before sensitive action
function requestLocationWithConsent() {
  if (window.confirm('Allow this app to access your location?')) {
    navigator.geolocation.getCurrentPosition((pos) => {
      showMap(pos.coords);
    });
  }
}

module.exports = {
  trackUserLocation,
  startVideoRecording,
  setupNewUser,
  autoFillForm,
  copyUserData,
  initTracking,
  requestLocationWithConsent,
};
