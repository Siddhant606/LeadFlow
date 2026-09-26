/**
 * Normalizes email address by trimming and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes phone number, with specific handling for German (+49) and E.164 formats.
 * Example inputs:
 *  - "+49 (0) 170 1234567" -> "+491701234567"
 *  - "0170/123-4567"       -> "+491701234567"
 *  - "0049 170 1234567"    -> "+491701234567"
 *  - "+1 (555) 019-2834"   -> "+15550192834"
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.trim();

  // Remove spaces, dashes, slashes, dots, parentheses
  cleaned = cleaned.replace(/[\s\-\/\.\(\)]/g, '');

  // Replace leading 00 with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Handle German domestic formatting where 0 precedes area code, e.g., 0170... -> +49170...
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '+49' + cleaned.slice(1);
  }

  // Handle +49(0) leftovers e.g. +490170... -> +49170...
  if (cleaned.startsWith('+490')) {
    cleaned = '+49' + cleaned.slice(4);
  }

  // If no plus sign but valid digits, prepend + if it looks international, or keep as is
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}
