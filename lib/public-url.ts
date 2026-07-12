/** Base path for GitHub Pages (e.g. `/terraria-companion`). Empty in local/dev. */
export function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || ''
}

/** Prefix a root-relative public asset path with the deploy basePath. */
export function publicUrl(path: string): string {
  const base = basePath()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
