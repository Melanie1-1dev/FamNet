// Resolve ?returnTo= to a safe same-origin path, else "/".
// A same-origin check alone is not enough: values like /.//evil.com or /\evil.com
// normalise to a protocol-relative //evil.com (an open redirect), so require exactly
// one leading slash and no backslash.
export function safeReturnTo() {
  const raw = new URLSearchParams(window.location.search).get("returnTo");
  if (!raw) return "/";
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    const path = url.pathname + url.search;
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/";
    return path;
  } catch {
    return "/";
  }
}
