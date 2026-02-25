"use server"

const ENV_DOMAIN = process.env.SELFDECODE_ENV_DOMAIN || ""
const BASE_URL = `https://${ENV_DOMAIN}selfdecode.com`
const CLIENT_ID = process.env.SELFDECODE_CLIENT_ID
const CLIENT_SECRET = process.env.SELFDECODE_CLIENT_SECRET
const B2B = `${BASE_URL}/service/b2b-integrations`

async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `${BASE_URL}/service/health-analysis/accounts/user/openid/token/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    }
  )
  if (!res.ok) throw new Error("Failed to get access token")
  return (await res.json()).access_token
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "received"
  | "submitted"
  | "shipped"
  | "cancelled"
  | "payment_failed"
  | "error"

export type SampleStatus =
  | "shipped"
  | "registered"
  | "received_by_lab"
  | "analyzed_by_lab"
  | "waiting_reanalysis"
  | "processing_dna_file"
  | "completed"
  | "failed"
  | "cancelled"

export interface OrderSample {
  id: string
  sample_id: string
  status: SampleStatus
  profile_id: string | null
  error: string | null
}

export interface OrderPackage {
  id: string
  tracking_number: string
  supplier_order_number: string
  products: OrderSample[]
}

export interface Order {
  id: string
  status: OrderStatus
  created_at: string
  updated_at: string
  ship_to_name: string
  ship_to_email: string
  ship_to_address: string
  ship_to_city: string
  ship_to_state: string
  ship_to_country: string
  ship_to_postal_code: string
  phone_number: string
  shipment_method: string | null
  packages: OrderPackage[]
  line_items: Array<{ id: string; item: string; quantity: number }>
}

// Flattened row for the table — one row per sample
export interface OrderRow {
  orderId: string
  orderStatus: OrderStatus
  orderCreatedAt: string
  shipToName: string
  shipToCountry: string
  trackingNumber: string
  sampleId: string
  sampleStatus: SampleStatus | null
  profileId: string | null
  sampleError: string | null
}

// ─── Fetch orders ─────────────────────────────────────────────────────────────

export async function getOrders(): Promise<Order[]> {
  const token = await getAccessToken()
  const res = await fetch(`${B2B}/order/`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`)
  const data = await res.json()
  const arr: Order[] = Array.isArray(data) ? data : (data.results ?? [])
  return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// Flatten orders into per-sample rows for the table
export async function getOrderRows(): Promise<OrderRow[]> {
  const orders = await getOrders()
  const rows: OrderRow[] = []

  for (const order of orders) {
    const allProducts = order.packages.flatMap(pkg =>
      pkg.products.map(p => ({ ...p, trackingNumber: pkg.tracking_number }))
    )

    if (allProducts.length === 0) {
      // Order with no samples yet — still show it in the table
      rows.push({
        orderId:        order.id,
        orderStatus:    order.status,
        orderCreatedAt: order.created_at,
        shipToName:     order.ship_to_name,
        shipToCountry:  order.ship_to_country,
        trackingNumber: "",
        sampleId:       "—",
        sampleStatus:   null,
        profileId:      null,
        sampleError:    null,
      })
    } else {
      for (const product of allProducts) {
        rows.push({
          orderId:        order.id,
          orderStatus:    order.status,
          orderCreatedAt: order.created_at,
          shipToName:     order.ship_to_name,
          shipToCountry:  order.ship_to_country,
          trackingNumber: product.trackingNumber,
          sampleId:       product.sample_id,
          sampleStatus:   product.status,
          profileId:      product.profile_id,
          sampleError:    product.error,
        })
      }
    }
  }

  return rows
}