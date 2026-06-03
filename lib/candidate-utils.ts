// Helper to check if an email is a placeholder/not-available
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  return (
    email.includes("placeholder") ||
    email.includes("not-available") ||
    email.includes("imported-") ||
    email.endsWith(".profile")
  );
}

// Get display email (returns null for placeholders)
export function getDisplayEmail(email: string | null | undefined): string | null {
  if (!email || isPlaceholderEmail(email)) return null;
  return email;
}
