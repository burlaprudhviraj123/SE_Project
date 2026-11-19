/**
 * Validation and sanitization utilities for user inputs across ResolveDesk.
 * Handles edge cases like trailing/leading spaces, phone country codes (+91),
 * hyphens, email trimming, and roll number sanitization.
 */

/**
 * Normalizes and sanitizes a phone number.
 * Removes spaces, hyphens, parentheses, dots, and common country code prefixes (+91, 91, 0)
 * when followed by 10 digits.
 *
 * @param {string|number} raw - Raw phone input
 * @returns {string} Sanitized 10-digit string or stripped digits
 */
export function cleanPhoneNumber(raw) {
  if (raw === null || raw === undefined) return '';
  const str = String(raw).trim();
  if (!str) return '';

  // Remove common punctuation and whitespace
  let digits = str.replace(/[\s\-\(\)\.\+]/g, '');

  // Handle Indian country codes: +91 or 91 followed by 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // Leading trunk prefix 0
    digits = digits.slice(1);
  }

  // Strip any remaining non-digit characters
  return digits.replace(/\D/g, '');
}

/**
 * Validates a mobile phone number.
 *
 * @param {string} raw - Raw phone input
 * @returns {{ isValid: boolean, value: string, error: string | null }}
 */
export function validatePhoneNumber(raw) {
  const cleaned = cleanPhoneNumber(raw);
  if (!cleaned) {
    return { isValid: false, value: '', error: 'Mobile number is required' };
  }

  // Standard Indian 10-digit mobile number check
  if (cleaned.length !== 10) {
    return {
      isValid: false,
      value: cleaned,
      error: `Phone number must be exactly 10 digits (received ${cleaned.length})`
    };
  }

  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return {
      isValid: false,
      value: cleaned,
      error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9'
    };
  }

  return { isValid: true, value: cleaned, error: null };
}

/**
 * Cleans and normalizes email addresses.
 *
 * @param {string} raw
 * @returns {string}
 */
export function cleanEmail(raw) {
  if (!raw) return '';
  return String(raw).trim().toLowerCase();
}

/**
 * Validates college student registration email.
 *
 * @param {string} raw
 * @param {string} requiredDomain - Optional domain restriction (defaults to '@anits.edu.in')
 * @returns {{ isValid: boolean, value: string, error: string | null }}
 */
export function validateCollegeEmail(raw, requiredDomain = '@anits.edu.in') {
  const cleaned = cleanEmail(raw);
  if (!cleaned) {
    return { isValid: false, value: '', error: 'College email address is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    return { isValid: false, value: cleaned, error: 'Please enter a valid email address format' };
  }

  if (requiredDomain && !cleaned.endsWith(requiredDomain.toLowerCase())) {
    return {
      isValid: false,
      value: cleaned,
      error: `Registration is restricted to official campus emails (${requiredDomain})`
    };
  }

  return { isValid: true, value: cleaned, error: null };
}

/**
 * Cleans and trims general text.
 *
 * @param {string} raw
 * @returns {string}
 */
export function cleanText(raw) {
  if (raw === null || raw === undefined) return '';
  return String(raw).trim();
}

/**
 * Validates a person's first or last name.
 *
 * @param {string} raw
 * @param {string} fieldLabel
 * @returns {{ isValid: boolean, value: string, error: string | null }}
 */
export function validateName(raw, fieldLabel = 'Name') {
  const cleaned = cleanText(raw);
  if (!cleaned) {
    return { isValid: false, value: '', error: `${fieldLabel} is required` };
  }
  if (cleaned.length < 2) {
    return { isValid: false, value: cleaned, error: `${fieldLabel} must be at least 2 characters long` };
  }
  if (cleaned.length > 50) {
    return { isValid: false, value: cleaned, error: `${fieldLabel} must not exceed 50 characters` };
  }
  return { isValid: true, value: cleaned, error: null };
}

/**
 * Validates student roll number / username.
 *
 * @param {string} raw
 * @returns {{ isValid: boolean, value: string, error: string | null }}
 */
export function validateUsername(raw) {
  const cleaned = cleanText(raw);
  if (!cleaned) {
    return { isValid: false, value: '', error: 'Student Roll Number / Username is required' };
  }
  if (cleaned.length < 3) {
    return { isValid: false, value: cleaned, error: 'Student Roll Number / Username must be at least 3 characters' };
  }
  if (cleaned.length > 50) {
    return { isValid: false, value: cleaned, error: 'Username must not exceed 50 characters' };
  }
  return { isValid: true, value: cleaned, error: null };
}

/**
 * Validates password strength and match.
 *
 * @param {string} password
 * @param {string|null} confirmPassword
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validatePassword(password, confirmPassword = null) {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  if (confirmPassword !== null && password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  return { isValid: true, error: null };
}
