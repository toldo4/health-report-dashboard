"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { patchOrder, type Order, type PatchOrderPayload } from "@/actions/orders"
import { Pencil, Loader2, AlertTriangle } from "lucide-react"
import { Country, State } from "country-state-city"

export function EditOrderDialog({ order, onOrderUpdated }: {
  order: Order
  onOrderUpdated?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const countries = useMemo(() => Country.getAllCountries(), [])

  const initialCountryCode = useMemo(() => {
    const found = countries.find(c => c.name === order.ship_to_country)
    return found?.isoCode || "US"
  }, [countries, order.ship_to_country])

  const [selectedCountryCode, setSelectedCountryCode] = useState(initialCountryCode)
  const availableStates = useMemo(() => State.getStatesOfCountry(selectedCountryCode), [selectedCountryCode])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      // Reset to current order's country when re-opening
      setSelectedCountryCode(initialCountryCode)
      setError(null)
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const countryName = Country.getCountryByCode(selectedCountryCode)?.name || ""
    const state = fd.get("ship_to_state") as string
    const phone = fd.get("phone_number") as string

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

    const payload: PatchOrderPayload = {
      ship_to_name:        fd.get("ship_to_name") as string,
      ship_to_email:       fd.get("ship_to_email") as string || undefined,
      phone_number:        phone,
      ship_to_address:     fd.get("ship_to_address") as string,
      ship_to_address1:    (fd.get("ship_to_address1") as string) || undefined,
      ship_to_city:        fd.get("ship_to_city") as string,
      ship_to_state:       state,
      ship_to_postal_code: fd.get("ship_to_postal_code") as string,
      ship_to_country:     countryName,
    }

    try {
      await patchOrder(order.id, payload)
      setOpen(false)
      if (onOrderUpdated) onOrderUpdated()
    } catch (err: any) {
      setError(err.message || "Failed to update order")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
          <Pencil className="w-3 h-3" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
        </DialogHeader>

        {order.error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{order.error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_ship_to_name">Full Name</Label>
              <Input id="edit_ship_to_name" name="ship_to_name" required defaultValue={order.ship_to_name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_ship_to_email">Email</Label>
              <Input id="edit_ship_to_email" name="ship_to_email" type="email" defaultValue={order.ship_to_email} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_ship_to_country">Country</Label>
              <select
                id="edit_ship_to_country"
                value={selectedCountryCode}
                onChange={e => setSelectedCountryCode(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                {countries.map(c => (
                  <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone_number">Phone Number</Label>
              <Input
                id="edit_phone_number"
                name="phone_number"
                required
                defaultValue={order.phone_number}
                placeholder={selectedCountryCode === "US" ? "10-digit number" : "Max 15 chars"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_ship_to_address">Address</Label>
            <Input id="edit_ship_to_address" name="ship_to_address" required defaultValue={order.ship_to_address} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_ship_to_address1">Address Line 2 <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="edit_ship_to_address1" name="ship_to_address1" defaultValue={order.ship_to_address1 ?? ""} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_ship_to_city">City</Label>
              <Input id="edit_ship_to_city" name="ship_to_city" required defaultValue={order.ship_to_city} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_ship_to_state">State / Province</Label>
              {availableStates.length > 0 ? (
                <select
                  id="edit_ship_to_state"
                  name="ship_to_state"
                  defaultValue={order.ship_to_state}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                >
                  <option value="">Select State</option>
                  {availableStates.map(s => (
                    <option key={s.isoCode} value={s.isoCode}>{s.name} ({s.isoCode})</option>
                  ))}
                </select>
              ) : (
                <Input id="edit_ship_to_state" name="ship_to_state" required defaultValue={order.ship_to_state} placeholder="State/Region" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_ship_to_postal_code">Postal Code</Label>
              <Input id="edit_ship_to_postal_code" name="ship_to_postal_code" required defaultValue={order.ship_to_postal_code} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save &amp; Retry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
