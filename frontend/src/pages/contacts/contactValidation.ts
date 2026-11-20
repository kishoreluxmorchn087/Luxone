const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requiredEmailDomain = "gmail.com";

export function validateContactEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return null;

  const domain = email.split("@")[1] ?? "";
  if (!emailPattern.test(email)) {
    return "Please enter a valid email address ending in @gmail.com.";
  }
  if (domain.toLowerCase() !== requiredEmailDomain) {
    return "Email must end with @gmail.com.";
  }

  return null;
}
