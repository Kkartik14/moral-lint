/**
 * Dark Patterns Test Fixture
 *
 * These code patterns implement common dark patterns that
 * trick or mislead users. Moral-Lint should flag them.
 */

// Forced continuity: auto-renewal without notification
function createSubscription(plan) {
  return {
    plan,
    autoRenewal: true,
    startDate: new Date(),
    // No notification mechanism!
  };
}

// Hidden unsubscribe button
function renderFooter() {
  return `
    <footer>
      <p>Contact us | Privacy Policy</p>
      <a href="/unsubscribe" style="display: none; font-size: 1px; color: white;">
        Unsubscribe
      </a>
    </footer>
  `;
}

// Pre-selected paid add-on
function renderCheckoutForm(cart) {
  const addons = {
    insuranceAddon: { checked: true, price: 9.99 },  // pre-selected!
    premiumSupport: { selected: true, price: 14.99 }, // pre-selected!
  };
  return { cart, addons };
}

// Artificial urgency / fake countdown
function showDealBanner() {
  const countdown = {
    offer: '50% OFF',
    expiresIn: 300, // seconds
    // This countdown resets on every page load!
  };

  setInterval(() => {
    countdown.expiresIn--;
    if (countdown.expiresIn <= 0) {
      countdown.expiresIn = 300; // Fake! It resets!
    }
    updateTimerDisplay(countdown);
  }, 1000);
}

// Confusing double-negative opt-out
function renderEmailPreferences() {
  return `
    <label>
      <input type="checkbox" name="dontOptOut" />
      Uncheck to not opt-out of marketing emails
    </label>
  `;
}

// Privacy defaults to public
function createUserProfile(name) {
  return {
    name,
    privacySetting: 'public',      // Should default to private!
    shareByDefault: true,           // Shares data by default!
    defaultPrivacy: 'everyone',     // Visible to everyone!
  };
}

module.exports = {
  createSubscription,
  renderFooter,
  renderCheckoutForm,
  showDealBanner,
  renderEmailPreferences,
  createUserProfile,
};
