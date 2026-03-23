"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface TocItem {
  id: string
  title: string
}

interface ArticleClientShellProps {
  tocItems: TocItem[]
  areaLabel?: string
}

export function ArticleClientShell({ tocItems, areaLabel }: ArticleClientShellProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: "-10% 0px -70% 0px" }
    )

    tocItems.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [tocItems])

  return (
    <div className="sticky top-6 space-y-6">
      {/* Table of Contents */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Content</h3>
        <nav className="space-y-0">
          {tocItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })
              }}
              className={`block py-2 text-sm border-b border-border last:border-0 transition-colors ${
                activeId === item.id
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.title}
            </a>
          ))}
        </nav>
      </div>

      {/* Browse more in category */}
      {areaLabel && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            More {areaLabel.replace(/\b\w/g, (c) => c.toUpperCase())} Blogs
          </h3>
          <Link
            href={`/articles?area=${encodeURIComponent(areaLabel)}`}
            className="text-sm text-primary hover:underline"
          >
            Browse all {areaLabel} articles →
          </Link>
        </div>
      )}
    </div>
  )
}