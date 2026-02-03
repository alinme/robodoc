/**
 * Phone number validator and formatter for Romanian numbers
 * Formats phone numbers for WhatsApp (country code without +, no leading 0)
 */

/**
 * Validates and formats a Romanian phone number for WhatsApp
 * Rules:
 * - 9 digits (no leading 0) → add 40 → 11 digits total
 * - 10 digits (with leading 0) → remove 0, add 40 → 11 digits total
 * - Already has 40 prefix → leave as is (must be 11 digits)
 * @param {string} phoneNumber - Raw phone number from input
 * @returns {object} - { valid: boolean, formatted: string, error: string }
 */
export function validateAndFormatPhone(phoneNumber) {
  if (!phoneNumber) {
    return {
      valid: false,
      formatted: '',
      error: 'Phone number is required'
    };
  }

  // Remove all non-digit characters except +
  let cleaned = phoneNumber.toString().trim().replace(/[^\d+]/g, '');

  if (!cleaned) {
    return {
      valid: false,
      formatted: '',
      error: 'Phone number cannot be empty'
    };
  }

  // Remove + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Check if it already has country code 40 in front
  if (cleaned.startsWith('40')) {
    // Already has 40 prefix, validate it's 11 digits total
    if (cleaned.length === 11) {
      return {
        valid: true,
        formatted: cleaned,
        error: null
      };
    } else if (cleaned.length < 11) {
      return {
        valid: false,
        formatted: cleaned,
        error: `Phone number too short. Expected 11 digits (40 + 9 digits), got ${cleaned.length}`
      };
    } else {
      return {
        valid: false,
        formatted: cleaned,
        error: `Phone number too long. Expected 11 digits (40 + 9 digits), got ${cleaned.length}`
      };
    }
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // 10 digits starting with 0 → remove 0, add 40 → 11 digits
    const withoutZero = cleaned.substring(1);
    return {
      valid: true,
      formatted: '40' + withoutZero,
      error: null
    };
  } else if (cleaned.length === 9) {
    // 9 digits (no leading 0) → add 40 → 11 digits
    return {
      valid: true,
      formatted: '40' + cleaned,
      error: null
    };
  } else if (cleaned.length < 9) {
    return {
      valid: false,
      formatted: cleaned,
      error: `Phone number too short. Expected 9 digits (without country code) or 10 digits (with leading 0), got ${cleaned.length}`
    };
  } else if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    return {
      valid: false,
      formatted: cleaned,
      error: 'Invalid format. Expected 9 digits (without country code) or 10 digits starting with 0'
    };
  } else {
    return {
      valid: false,
      formatted: cleaned,
      error: `Phone number too long. Expected 9 digits (without country code), 10 digits (with leading 0), or 11 digits (with 40 prefix), got ${cleaned.length}`
    };
  }
}

/**
 * Formats phone number for display (adds + and spaces for readability)
 * @param {string} phoneNumber - Phone number in WhatsApp format (40XXXXXXXXX)
 * @returns {string} - Formatted phone number (+40 XXX XXX XXX)
 */
export function formatPhoneForDisplay(phoneNumber) {
  if (!phoneNumber) return '';
  
  // Remove all non-digits
  const cleaned = phoneNumber.toString().replace(/[^\d]/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('40')) {
    // Format as +40 XXX XXX XXX
    const countryCode = cleaned.substring(0, 2);
    const number = cleaned.substring(2);
    return `+${countryCode} ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
  }
  
  return phoneNumber;
}

/**
 * Validates phone number format (basic validation)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid format
 */
export function isValidPhoneFormat(phoneNumber) {
  const result = validateAndFormatPhone(phoneNumber);
  return result.valid;
}

