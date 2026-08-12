let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

const isGitHubPages = process.env.GITHUB_PAGES === 'true'
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') ?? ''
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const githubPagesBasePath = isGitHubPages
  ? configuredBasePath || (repositoryName ? `/${repositoryName}` : '')
  : ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isGitHubPages ? 'export' : undefined,
  trailingSlash: isGitHubPages ? true : undefined,
  basePath: githubPagesBasePath || undefined,
  assetPrefix: githubPagesBasePath ? `${githubPagesBasePath}/` : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Set workspace root to avoid lockfile detection issues
  turbopack: {
    root: process.cwd(),
  },
  ...(isGitHubPages
    ? {}
    : {
        // Security headers
        async headers() {
          return [
            {
              source: '/(.*)',
              headers: [
                {
                  key: 'X-Content-Type-Options',
                  value: 'nosniff',
                },
                {
                  key: 'X-Frame-Options',
                  value: 'SAMEORIGIN',
                },
                {
                  key: 'X-XSS-Protection',
                  value: '1; mode=block',
                },
                {
                  key: 'Referrer-Policy',
                  value: 'strict-origin-when-cross-origin',
                },
                {
                  key: 'Permissions-Policy',
                  value: 'camera=(), microphone=(), geolocation=()',
                },
              ],
            },
          ];
        },
      }),
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
