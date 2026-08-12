const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export const siteBasePath =
  configuredBasePath === "/" ? "" : configuredBasePath.replace(/\/$/, "")

export function withBasePath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${siteBasePath}${normalizedPath}`
}

export function getSiteUrl() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://aether-timer.com")
}
