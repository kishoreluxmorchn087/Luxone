export const PHONE_NUMBER_MAX_LENGTH = 20;
export const MOBILE_NUMBER_LENGTH = 10;

export function sanitizePhoneNumber(value: string, maxLength = PHONE_NUMBER_MAX_LENGTH): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function isValidPhoneNumber(value: string): boolean {
  return /^\d{0,20}$/.test(value);
}

export function isValidMobileNumber(value: string): boolean {
  return /^\d{10}$/.test(value);
}
