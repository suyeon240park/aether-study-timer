export function normalizeBasePath(basePath: string) {
  if (!basePath || basePath === "/") return ""

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`
  return withLeadingSlash.replace(/\/+$/, "")
}

const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export const siteBasePath = normalizeBasePath(configuredBasePath)

export function withBasePath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${siteBasePath}${normalizedPath}`
}

export function getSiteUrl() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://aether-timer.com")
}
