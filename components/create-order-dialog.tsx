"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createOrder, type CreateOrderPayload } from "@/actions/orders"
import { Plus, Loader2 } from "lucide-react"
import { Country, State } from "country-state-city"

export function CreateOrderDialog({ onOrderCreated }: { onOrderCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default to US (isoCode: "US")
  const [selectedCountryCode, setSelectedCountryCode] = useState("US")
  
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

    const payload: CreateOrderPayload = {
      ship_to_name: fd.get("ship_to_name") as string,
      ship_to_email: fd.get("ship_to_email") as string,
      phone_number: fd.get("phone_number") as string,
      ship_to_address: fd.get("ship_to_address") as string,
      ship_to_city: fd.get("ship_to_city") as string,
      ship_to_state: state, // This will naturally be the 2-letter code if selected from our dropdown
      ship_to_postal_code: fd.get("ship_to_postal_code") as string,
      ship_to_country: countryName, // API expects the full name
      line_items: [
        {
          item: fd.get("item") as string,
          quantity: 1, 
        }
      ]
    }

    try {
      await createOrder(payload)
      setOpen(false)
      // Reset form state on successful close
      setSelectedCountryCode("US")
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
            <Label htmlFor="item">Kit Type</Label>
            <select id="item" name="item" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" required defaultValue="dna-kit-unbranded-us">
              <option value="dna-kit">Branded DNA Kit</option>
              <option value="dna-kit-unbranded-us">Unbranded DNA Kit (US)</option>
              <option value="dna-kit-unbranded-eu">Unbranded DNA Kit (EU)</option>
            </select>
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