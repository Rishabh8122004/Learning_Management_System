// A small label for a lesson link, worked out from the address only (never stored).
// Returns null when the text is not a valid http(s) URL.
export function linkTypeOf(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^www\./, "");

  if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(host)) return "Video";
  if (/(^|\.)github\.com$|(^|\.)gitlab\.com$/.test(host)) return "Code";
  if (/^docs\.|^developer\.|^learn\.|readthedocs|\.dev$|mdn/.test(host)) return "Docs";
  if (/medium\.com|dev\.to|substack\.com|hashnode|blog/.test(host)) return "Article";

  return "Link";
}
