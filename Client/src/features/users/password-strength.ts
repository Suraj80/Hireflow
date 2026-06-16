export const MIN_PASSWORD_LENGTH = 6;

export const getPasswordStrength = (value: string) => {
  if (!value) {
    return {
      label: "No new password",
      hint: "Use 10+ characters with a mix of upper/lowercase, numbers, and symbols.",
      tone: "bg-muted text-muted-foreground",
      progress: 8,
    };
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 2) {
    return {
      label: "Needs work",
      hint: "Add length and more character variety before saving.",
      tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      progress: 28,
    };
  }

  if (score <= 4) {
    return {
      label: "Strong",
      hint: "Good baseline. A few extra characters will make it even better.",
      tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
      progress: 68,
    };
  }

  return {
    label: "Excellent",
    hint: "High-entropy password ready for production use.",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    progress: 100,
  };
};

export const getPasswordRequirementMessage = () =>
  `Password updates require your current password and at least ${MIN_PASSWORD_LENGTH} characters.`;

export const isPasswordValidForClient = (value: string) => value.length >= MIN_PASSWORD_LENGTH;
