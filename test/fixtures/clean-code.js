/**
 * Clean Code Example
 *
 * This file contains well-written code where function names
 * accurately reflect their behavior. Moral-Lint should find
 * no issues here.
 */

// Pure function - name matches behavior
function calculateTax(amount, rate) {
  return amount * rate;
}

// Format function that actually formats
function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

// Validation function that returns a boolean
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// String utility - does what it says
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Array helper - name matches behavior
function sortByDate(items) {
  return [...items].sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Simple class with honest methods
class MathUtils {
  static add(a, b) {
    return a + b;
  }

  static multiply(a, b) {
    return a * b;
  }

  static isEven(n) {
    return n % 2 === 0;
  }
}

module.exports = { calculateTax, formatCurrency, validateEmail, capitalizeFirst, sortByDate, MathUtils };
