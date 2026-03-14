/**
 * Misleading Names Test Fixture
 *
 * These functions have names that DON'T match their actual behavior.
 * Moral-Lint should flag each of these.
 */

// Says "fetch" but never makes a network call
function fetchUserData(userId) {
  // Just returns hardcoded data - misleading name!
  return {
    id: userId,
    name: 'Default User',
    email: 'default@example.com',
  };
}

// Says "validate" but never returns a result
function validatePassword(password) {
  console.log('Checking password...');
  // Does nothing useful, never returns true/false
}

// Says "save" but doesn't persist anything
function saveUserProfile(profile) {
  console.log('Profile:', profile.name);
  // Nothing is actually saved!
}

// Says "sanitize" but doesn't clean or return anything
function sanitizeInput(input) {
  console.log('Input received:', input);
  // No sanitization happens
}

// Says "delete" but doesn't actually delete
function deleteAccount(accountId) {
  console.log(`Account ${accountId} marked for review`);
  // Account is NOT deleted
}

// Says "calculate" but doesn't return a result
function calculateDiscount(price, code) {
  const discount = price * 0.1;
  console.log(`Discount would be: ${discount}`);
  // Never returns the calculated value!
}

// Empty function with a meaningful name
function processPayment(amount, cardInfo) {
  // TODO: implement
}

module.exports = {
  fetchUserData,
  validatePassword,
  saveUserProfile,
  sanitizeInput,
  deleteAccount,
  calculateDiscount,
  processPayment,
};
