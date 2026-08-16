"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createOrder, type CreateOrderPayload, type OrderLineItemInput } from "@/actions/orders"
import { Plus, Loader2, X } from "lucide-react"
import { Country, State } from "country-state-city"

const KIT_OPTIONS = [
  { value: "dna-kit-unbranded-eu", label: "Unbranded DNA Kit (GSA)" },
  { value: "dna-kit-wgs-unbranded", label: "Unbranded DNA Kit (WGS)" },
]

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

const EMPTY_LINE_ITEMS: OrderLineItemInput[] = [{ item: KIT_OPTIONS[0].value, quantity: 1 }]

export function CreateOrderDialog({ onOrderCreated }: { onOrderCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default to US (isoCode: "US")
  const [selectedCountryCode, setSelectedCountryCode] = useState("US")

  // One row per kit type — all shipped together to the address below
  const [lineItems, setLineItems] = useState<OrderLineItemInput[]>(EMPTY_LINE_ITEMS)

  function updateLineItem(index: number, patch: Partial<OrderLineItemInput>) {
    setLineItems(items => items.map((li, i) => (i === index ? { ...li, ...patch } : li)))
  }

  const totalKits = lineItems.reduce((sum, li) => sum + (li.quantity || 0), 0)

  // Get all countries for the dropdown
  const countries = useMemo(() => Country.getAllCountries(), [])
  
  // Get states for the currently selected country
  const availableStates = useMemo(() => State.getStatesOfCountry(selectedCountryCode), [selectedCountryCode])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    
    // We need the full country name for the API (e.g., "United States"), but we used the isoCode for the select value.
    const countryName = Country.getCountryByCode(selectedCountryCode)?.name || ""
    const state = fd.get("ship_to_state") as string
    const phone = fd.get("phone_number") as string

    // Validate US specific rules as per docs
    if (selectedCountryCode === "US") {
      if (state.length !== 2) {
        setError("US orders require a 2-letter state code (e.g., CA).")
        setLoading(false)
        return
      }
      const digitsOnly = phone.replace(/\D/g, "")
      if (digitsOnly.length !== 10) {
        setError("US orders require exactly a 10-digit phone number.")
        setLoading(false)
        return
      }
    } else if (phone.length > 15) {
      setError("International phone numbers allow a maximum of 15 characters.")
      setLoading(false)
      return
    }

    if (lineItems.some(li => !Number.isInteger(li.quantity) || li.quantity < 1)) {
      setError("Every kit line must have a quantity of at least 1.")
      setLoading(false)
      return
    }

    // Collapse repeated kit types into a single line item so the API gets one entry per item
    const mergedLineItems = Object.values(
      lineItems.reduce<Record<string, OrderLineItemInput>>((acc, li) => {
        acc[li.item] = { item: li.item, quantity: (acc[li.item]?.quantity ?? 0) + li.quantity }
        return acc
      }, {})
    )

    const payload: CreateOrderPayload = {
      ship_to_name: fd.get("ship_to_name") as string,
      ship_to_email: fd.get("ship_to_email") as string,
      phone_number: fd.get("phone_number") as string,
      ship_to_address: fd.get("ship_to_address") as string,
      ship_to_city: fd.get("ship_to_city") as string,
      ship_to_state: state, // This will naturally be the 2-letter code if selected from our dropdown
      ship_to_postal_code: fd.get("ship_to_postal_code") as string,
      ship_to_country: countryName, // API expects the full name
      line_items: mergedLineItems,
    }

    try {
      await createOrder(payload)
      setOpen(false)
      // Reset form state on successful close
      setSelectedCountryCode("US")
      setLineItems(EMPTY_LINE_ITEMS)
      if (onOrderCreated) onOrderCreated()
    } catch (err: any) {
      setError(err.message || "Failed to create order")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Order DNA Kit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Place New Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ship_to_name">Full Name</Label>
              <Input id="ship_to_name" name="ship_to_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ship_to_email">Email</Label>
              <Input id="ship_to_email" name="ship_to_email" type="email" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ship_to_country">Country</Label>
              <select 
                id="ship_to_country" 
                value={selectedCountryCode}
                onChange={(e) => setSelectedCountryCode(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" 
                required
              >
                {countries.map((country) => (
                  <option key={country.isoCode} value={country.isoCode}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input id="phone_number" name="phone_number" required placeholder={selectedCountryCode === "US" ? "10-digit number" : "Max 15 chars"} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ship_to_address">Address</Label>
            <Input id="ship_to_address" name="ship_to_address" required />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ship_to_city">City</Label>
              <Input id="ship_to_city" name="ship_to_city" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ship_to_state">State / Province</Label>
              {availableStates.length > 0 ? (
                <select 
                  id="ship_to_state" 
                  name="ship_to_state"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" 
                  required
                >
                  <option value="">Select State</option>
                  {availableStates.map((state) => (
                    <option key={state.isoCode} value={state.isoCode}>
                      {state.name} ({state.isoCode})
                    </option>
                  ))}
                </select>
              ) : (
                <Input id="ship_to_state" name="ship_to_state" required placeholder="State/Region" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ship_to_postal_code">Postal Code</Label>
              <Input id="ship_to_postal_code" name="ship_to_postal_code" required />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Kits</Label>
              <span className="text-xs text-muted-foreground">
                {totalKits} kit{totalKits === 1 ? "" : "s"} in this order
              </span>
            </div>

            {lineItems.map((li, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  {index === 0 && <Label htmlFor={`item-${index}`} className="text-xs text-muted-foreground">Kit Type</Label>}
                  <select
                    id={`item-${index}`}
                    value={li.item}
                    onChange={e => updateLineItem(index, { item: e.target.value })}
                    className={SELECT_CLASS}
                    required
                  >
                    {KIT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24 space-y-2">
                  {index === 0 && <Label htmlFor={`quantity-${index}`} className="text-xs text-muted-foreground">Quantity</Label>}
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min={1}
                    step={1}
                    value={Number.isNaN(li.quantity) ? "" : li.quantity}
                    onChange={e => updateLineItem(index, { quantity: e.target.valueAsNumber })}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label="Remove kit line"
                  disabled={lineItems.length === 1}
                  onClick={() => setLineItems(items => items.filter((_, i) => i !== index))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setLineItems(items => [...items, { item: KIT_OPTIONS[0].value, quantity: 1 }])}
            >
              <Plus className="w-3.5 h-3.5" /> Add kit type
            </Button>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Place Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}