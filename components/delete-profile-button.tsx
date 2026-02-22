// components/delete-profile-button.tsx
"use client"

import { useState } from "react"
import { deleteProfile } from "@/actions/profile"
import { Button } from "@/components/ui/button"

export function DeleteProfileButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this profile?")) return

    setLoading(true)
    try {
      await deleteProfile(id)
    } catch (error) {
      console.error("Failed to delete", error)
      alert("Failed to delete profile.")
      setLoading(false) // Only reset if failed, successful delete will unmount the row
    }
  }

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      onClick={handleDelete} 
      disabled={loading}
    >
      {loading ? "..." : "Delete"}
    </Button>
  )
}