// Field checks that mirror the server's rules. Each returns a friendly message, or "" when the value is fine.
// (The server still validates everything; these only give instant, specific feedback.)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value) {
  const email = (value || "").trim();

  if (!email) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email, like name@example.com.";
  if (email.length > 254) return "That email is too long. Use 254 characters or fewer.";

  return "";
}

export function validateName(value) {
  const name = (value || "").trim();

  if (!name) return "Enter your name.";
  if (name.length < 2) return "Your name needs at least 2 characters.";
  if (name.length > 100) return "Your name can be at most 100 characters.";

  return "";
}

// New passwords: at least 8 characters, and no more than 72 bytes (a limit of the hashing method).
export function validateNewPassword(value) {
  const password = value || "";

  if (!password) return "Enter a password.";
  if (password.length < 8) return "Use at least 8 characters.";
  if (new TextEncoder().encode(password).length > 72) return "That password is too long. Use 72 bytes or fewer.";

  return "";
}

export function validateRequired(value, message) {
  return (value || "").toString().trim() ? "" : message;
}

export function validateMatch(first, second) {
  if (!second) return "Enter the password again to confirm it.";

  return first === second ? "" : "The passwords do not match.";
}

export function validateLength(value, label, min, max) {
  const text = (value || "").trim();

  if (text.length < min) return min <= 1 ? `${label} is required.` : `${label} needs at least ${min} characters.`;
  if (text.length > max) return `${label} can be at most ${max} characters.`;

  return "";
}

// A number that must be greater than zero. Pass the noun in lower case, for example "an amount" or "the target".
export function validatePositiveNumber(value, label) {
  if (value === "" || value === null || value === undefined) return `Enter ${label}.`;

  const number = Number(value);
  const sentence = label.charAt(0).toUpperCase() + label.slice(1);

  if (!Number.isFinite(number)) return `${sentence} must be a number.`;
  if (number <= 0) return `${sentence} must be greater than zero.`;

  return "";
}

// A link that must start with http:// or https://, or be empty when optional.
export function validateHttpLink(value, { required = false, label = "The link" } = {}) {
  const link = (value || "").trim();

  if (!link) return required ? `${label} is required.` : "";

  try {
    const { protocol } = new URL(link);

    return protocol === "http:" || protocol === "https:" ? "" : `${label} must start with http:// or https://.`;
  } catch {
    return `${label} must start with http:// or https://.`;
  }
}

// Returns the first key that has a message, so a form can focus the first problem.
export function firstErrorKey(errors) {
  return Object.keys(errors).find((key) => errors[key]);
}

export function hasErrors(errors) {
  return Boolean(firstErrorKey(errors));
}
