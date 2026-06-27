"use client"

import { useState, useTransition, useCallback, useMemo } from "react"
import {
  RefreshCw, Search, Copy, Check, Package, Truck,
  XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp,
  Dna, CheckCircle2, ChevronLeft, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getOrderRows, getOrders, type Order, type OrderRow, type OrderStatus, type SampleStatus } from "@/actions/orders"
import { registerDnaKit } from "@/actions/dna-kit"
import { CreateOrderDialog } from "./create-order-dialog"
import { EditOrderDialog } from "./edit-order-dialog"

// ─── Status configs ───────────────────────────────────────────────────────────

const ORDER_STATUS: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  received:      { label: "Received",       color: "text-blue-700",  bg: "bg-blue-50 border-blue-200",   icon: Clock        },
  submitted:     { label: "Submitted",      color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock        },
  shipped:       { label: "Shipped",        color: "text-green-700", bg: "bg-green-50 border-green-200", icon: Truck        },
  cancelled:     { label: "Cancelled",      color: "text-gray-500",  bg: "bg-gray-50 border-gray-200",   icon: XCircle      },
  payment_failed:{ label: "Payment Failed", color: "text-red-700",   bg: "bg-red-50 border-red-200",     icon: AlertTriangle},
  error:         { label: "Error",          color: "text-red-700",   bg: "bg-red-50 border-red-200",     icon: AlertTriangle},
}

const SAMPLE_STATUS: Record<SampleStatus, { label: string; color: string; dot: string; terminal: boolean }> = {
  shipped:             { label: "Shipped",          color: "text-sky-700",    dot: "bg-sky-400",                 terminal: false },
  registered:          { label: "Registered",       color: "text-blue-700",   dot: "bg-blue-400 animate-pulse",  terminal: false },
  received_by_lab:     { label: "Received by Lab",  color: "text-violet-700", dot: "bg-violet-400 animate-pulse",terminal: false },
  analyzed_by_lab:     { label: "Analyzed by Lab",  color: "text-indigo-700", dot: "bg-indigo-400 animate-pulse",terminal: false },
  waiting_reanalysis:  { label: "Waiting Reanalysis",color:"text-amber-700",  dot: "bg-amber-400 animate-pulse", terminal: false },
  processing_dna_file: { label: "Processing File",  color: "text-amber-700",  dot: "bg-amber-400 animate-pulse", terminal: false },
  completed:           { label: "Completed",        color: "text-green-700",  dot: "bg-green-500",               terminal: true  },
  failed:              { label: "Failed",           color: "text-red-700",    dot: "bg-red-500",                 terminal: true  },
  cancelled:           { label: "Cancelled",        color: "text-gray-500",   dot: "bg-gray-400",                terminal: true  },
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      title="Copy sample ID"
      className="p-1 rounded hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

// ─── Register button ──────────────────────────────────────────────────────────

function RegisterButton({ sampleId, profileId, onRegistered }: {
  sampleId: string
  profileId: string
  onRegistered: (sampleId: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [done, setDone]       = useState(false)

  async function handle() {
    setLoading(true)
    setError(null)
    try {
      await registerDnaKit(profileId, sampleId)
      setDone(true)
      onRegistered(sampleId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" /> Registered
    </span>
  )

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" onClick={handle} disabled={loading} className="h-7 gap-1.5 text-xs">
        {loading ? <><RefreshCw className="w-3 h-3 animate-spin" />Registering…</> : <><Dna className="w-3 h-3" />Register</>}
      </Button>
      {error && <p className="text-xs text-red-600 max-w-[140px] text-right">{error}</p>}
    </div>
  )
}

// ─── Kit type badge ───────────────────────────────────────────────────────────

function KitTypeBadge({ kitType }: { kitType: string }) {
  const upper = kitType.toUpperCase()
  const isWGS = upper.includes("WGS")
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
      isWGS
        ? "bg-violet-50 border-violet-200 text-violet-700"
        : "bg-sky-50 border-sky-200 text-sky-700"
    }`}>
      {isWGS ? "WGS" : "GSA"}
    </span>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────

function OrderTableRow({ row, order, profileId, onRegistered, onOrderUpdated }: {
  row: OrderRow
  order: Order | undefined
  profileId: string
  onRegistered: (sampleId: string) => void
  onOrderUpdated: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const orderCfg  = ORDER_STATUS[row.orderStatus] ?? ORDER_STATUS.error
  const sampleCfg = row.sampleStatus ? SAMPLE_STATUS[row.sampleStatus] : null
  const OrderIcon = orderCfg.icon

  const hasSample      = row.sampleId !== "—"
  const isRegistered   = !!row.profileId
  const canRegister    = hasSample && !isRegistered && row.orderStatus === "shipped"

  const kitTypes = order?.line_items.map(li => li.kit_type).filter(Boolean) ?? []

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/30 transition-colors">
        {/* Ship to name + kit type */}
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-sm font-medium text-foreground">{row.shipToName}</p>
          {kitTypes.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              {kitTypes.map((kt, i) => <KitTypeBadge key={i} kitType={kt} />)}
            </div>
          )}
        </td>

        {/* Sample ID */}
        <td className="px-4 py-3">
          {hasSample ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border">
                {row.sampleId}
              </span>
              <CopyButton text={row.sampleId} />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No samples yet</span>
          )}
        </td>

        {/* Sample status */}
        <td className="px-4 py-3">
          {sampleCfg ? (
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${sampleCfg.dot}`} />
              <span className={`text-xs font-medium ${sampleCfg.color}`}>{sampleCfg.label}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>

        {/* Order status */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${orderCfg.bg} ${orderCfg.color}`}>
            <OrderIcon className="w-3 h-3" />
            {orderCfg.label}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {canRegister && (
              <RegisterButton
                sampleId={row.sampleId}
                profileId={profileId}
                onRegistered={onRegistered}
              />
            )}
            {isRegistered && hasSample && (
              <span className="text-xs text-muted-foreground">Registered</span>
            )}
            {row.orderStatus === "error" && order && (
              <EditOrderDialog order={order} onOrderUpdated={onOrderUpdated} />
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={5} className="px-4 py-4">
            <div className="space-y-3 text-xs">

              {/* Row 1: order meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
                <div>
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-mono break-all mt-0.5">{row.orderId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ordered</p>
                  <p className="mt-0.5">{fmt(row.orderCreatedAt)}</p>
                </div>
                {order?.shipment_method && (
                  <div>
                    <p className="text-muted-foreground">Shipment Method</p>
                    <p className="mt-0.5">{order.shipment_method}</p>
                  </div>
                )}
                {row.trackingNumber && (
                  <div>
                    <p className="text-muted-foreground">Tracking</p>
                    <p className="font-mono mt-0.5">{row.trackingNumber}</p>
                  </div>
                )}
              </div>

              {/* Row 2: shipping address */}
              {order && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 pt-2 border-t border-border">
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Ship To</p>
                    <p className="mt-0.5">{order.ship_to_address}{order.ship_to_address1 ? `, ${order.ship_to_address1}` : ""}</p>
                    <p>{order.ship_to_city}{order.ship_to_state ? `, ${order.ship_to_state}` : ""} {order.ship_to_postal_code}</p>
                    <p>{order.ship_to_country}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="mt-0.5 break-all">{order.ship_to_email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="mt-0.5">{[order.phone_country_code, order.phone_number].filter(Boolean).join(" ") || "—"}</p>
                  </div>
                </div>
              )}

              {/* Row 3: line items */}
              {order && order.line_items.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground mb-1">Line Items</p>
                  <div className="flex flex-wrap gap-2">
                    {order.line_items.map(li => (
                      <span key={li.id} className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1">
                        <KitTypeBadge kitType={li.kit_type} />
                        <span className="text-foreground font-mono">{li.item}</span>
                        <span className="text-muted-foreground">× {li.quantity}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {order?.error && (
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground">Order Error</p>
                  <p className="text-red-700 mt-0.5">{order.error}</p>
                </div>
              )}
              {row.sampleError && (
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground">Sample Error</p>
                  <p className="text-red-700 mt-0.5">{row.sampleError}</p>
                </div>
              )}

            </div>
          </td>
        </tr>
      )}
    </>
  )
}

const PAGE_SIZE = 10

// ─── Main panel ───────────────────────────────────────────────────────────────

export function OrdersPanel({
  profileId,
  initialRows,
  initialOrders,
}: {
  profileId: string
  initialRows: OrderRow[]
  initialOrders: Order[]
}) {
  const [rows, setRows]           = useState<OrderRow[]>(initialRows)
  const [orders, setOrders]       = useState<Order[]>(initialOrders)
  const [search, setSearch]       = useState("")
  const [page, setPage]           = useState(1)
  const [isPending, startTransition] = useTransition()
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())

  const orderMap = useMemo(
    () => new Map(orders.map(o => [o.id, o])),
    [orders]
  )

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const [freshRows, freshOrders] = await Promise.all([getOrderRows(), getOrders()])
        setRows(freshRows)
        setOrders(freshOrders)
        setLastRefresh(new Date())
      } catch { /* silent */ }
    })
  }, [])

  function handleRegistered(sampleId: string) {
    setRegisteredIds(prev => new Set([...prev, sampleId]))
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? rows.filter(r =>
        r.shipToName.toLowerCase().includes(q) ||
        r.sampleId.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q) ||
        (r.sampleStatus ?? "").toLowerCase().includes(q) ||
        r.orderStatus.toLowerCase().includes(q)
      )
    : rows

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const pageStart  = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const pageEnd    = Math.min(safePage * PAGE_SIZE, filtered.length)

  const shipped   = rows.filter(r => r.orderStatus === "shipped").length
  const pending   = rows.filter(r => r.orderStatus === "received" || r.orderStatus === "submitted").length
  const unregistered = rows.filter(r => r.sampleId !== "—" && !r.profileId).length

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Orders</h3>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
            <span>{rows.length} order{rows.length !== 1 ? "s" : ""}</span>
            {shipped     > 0 && <span className="text-green-700">{shipped} shipped</span>}
            {pending     > 0 && <span className="text-amber-700">{pending} pending</span>}
            {unregistered > 0 && (
              <span className="text-blue-700 flex items-center gap-1">
                <Dna className="w-3 h-3" /> {unregistered} unregistered sample{unregistered !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search orders…"
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground leading-none text-base">
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refresh} disabled={isPending} className="h-8 px-2 gap-1.5 text-xs shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Button>
          
          <CreateOrderDialog onOrderCreated={refresh} />
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Package className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No orders yet</p>
          <p className="text-xs text-muted-foreground mt-1">Orders placed for this account will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Recipient</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Sample ID</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Sample Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Order Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No orders match "{search}"
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <OrderTableRow
                    key={`${row.orderId}-${row.sampleId}-${i}`}
                    row={row}
                    order={orderMap.get(row.orderId)}
                    profileId={profileId}
                    onRegistered={handleRegistered}
                    onOrderUpdated={refresh}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {pageStart}–{pageEnd} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              className="h-7 w-7 p-0"
              disabled={safePage === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">{safePage} / {totalPages}</span>
            <Button
              variant="outline" size="sm"
              className="h-7 w-7 p-0"
              disabled={safePage === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}