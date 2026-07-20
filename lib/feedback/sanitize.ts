/** Strip control characters (except common whitespace) from user/tool text. */
export function stripControlCharacters(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function sanitizeSuggestionText(value: string, maxLength: number) {
  return stripControlCharacters(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeSuggestionBody(value: string, maxLength = 5000) {
  return stripControlCharacters(value)
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}
