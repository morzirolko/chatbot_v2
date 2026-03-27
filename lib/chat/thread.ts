const THREAD_TITLE_MAX_LENGTH = 72;
const THREAD_PREVIEW_MAX_LENGTH = 120;
const MARKDOWN_LINK_TARGET_PATTERN = /\((?:[^()]|\([^()]*\))*\)/;

function normalizeThreadText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripMarkdownForPreview(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(
      new RegExp(`!\\[([^\\]]*)\\]${MARKDOWN_LINK_TARGET_PATTERN.source}`, "g"),
      "$1",
    )
    .replace(
      new RegExp(`\\[([^\\]]+)\\]${MARKDOWN_LINK_TARGET_PATTERN.source}`, "g"),
      "$1",
    )
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+\[.\]\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function buildThreadTitle(value: string) {
  const normalizedValue = normalizeThreadText(value);

  if (!normalizedValue) {
    return "New chat";
  }

  return truncateText(normalizedValue, THREAD_TITLE_MAX_LENGTH);
}

export function buildThreadPreview(value: string) {
  const normalizedValue = normalizeThreadText(stripMarkdownForPreview(value));

  if (!normalizedValue) {
    return "No messages yet.";
  }

  return truncateText(normalizedValue, THREAD_PREVIEW_MAX_LENGTH);
}
