const THREAD_TITLE_MAX_LENGTH = 72;
const THREAD_PREVIEW_MAX_LENGTH = 120;

function normalizeThreadText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildThreadTitle(value: string) {
  const normalizedValue = normalizeThreadText(value);

  if (!normalizedValue) {
    return "New chat";
  }

  return truncateText(normalizedValue, THREAD_TITLE_MAX_LENGTH);
}

export function buildThreadPreview(value: string) {
  const normalizedValue = normalizeThreadText(value);

  if (!normalizedValue) {
    return "No messages yet.";
  }

  return truncateText(normalizedValue, THREAD_PREVIEW_MAX_LENGTH);
}

