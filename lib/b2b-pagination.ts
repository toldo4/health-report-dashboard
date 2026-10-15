const PAGE_SIZE = 100
const MAX_PAGES = 500

/**
 * Fetches every page of a SelfDecode B2B list endpoint.
 * Pages are capped at 100 items; we stop when a page returns fewer than that.
 * Throws on a non-OK response so callers keep their existing error handling.
 */
export async function fetchAllPages<T>(url: string, init: RequestInit): Promise<T[]> {
  const all: T[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const pageUrl = new URL(url)
    pageUrl.searchParams.set("page", String(page))
    pageUrl.searchParams.set("page_size", String(PAGE_SIZE))

    const res = await fetch(pageUrl, init)
    if (!res.ok) throw new Error(`GET ${pageUrl} → ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const items: T[] = Array.isArray(data) ? data : (data.results ?? [])
    all.push(...items)
    if (items.length < PAGE_SIZE) break
  }
  return all
}
