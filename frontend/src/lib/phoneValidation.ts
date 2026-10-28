export type PhoneFieldKind = "mobile" | "phone";

export function getPhoneFieldKind(name: string, label: string): PhoneFieldKind | null {
  const fieldIdentity = `${name} ${label}`;
  if (/mobile/i.test(fieldIdentity)) return "mobile";
  if (/phone/i.test(fieldIdentity)) return "phone";
  return null;
}

export function sanitizePhoneValue(value: string, kind: PhoneFieldKind): string {
  const maxDigits = kind === "mobile" ? 10 : 20;
  return value.replace(/\D/g, "").slice(0, maxDigits);
}

export function getPhoneValidationMessage(
  value: string,
  kind: PhoneFieldKind,
  required = false,
  label = "Phone"
): string | null {
  if (kind === "mobile") {
    return /^\d{10}$/.test(value) ? null : "Mobile number must be exactly 10 digits.";
  }

  if (!value) return required ? `${label} is required.` : null;
  return /^\d{1,20}$/.test(value)
    ? null
    : "Phone number must contain digits only and no more than 20 digits.";
}
