/** @type {import('next').NextConfig} */
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  (process.env.GITHUB_ACTIONS && repoName ? `/${repoName}` : '')

const nextConfig = {
  output: 'export',
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath || '',
    NEXT_PUBLIC_GITHUB_REPO:
      process.env.NEXT_PUBLIC_GITHUB_REPO ||
      process.env.GITHUB_REPOSITORY ||
      'nezumi0627/terraria-companion',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
