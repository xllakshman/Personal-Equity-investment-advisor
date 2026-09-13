export const MIN_PASSWORD_LENGTH = 12;

export function passwordTooShort(password: string): boolean {
  return password.length < MIN_PASSWORD_LENGTH;
}

export function passwordLengthError(password: string): string | null {
  if (!password) return "Enter a password.";
  if (passwordTooShort(password)) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}
