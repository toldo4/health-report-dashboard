"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createProfile } from "@/actions/profile"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// All fields are strings in the form — we convert numbers manually in onSubmit.
// This avoids the z.coerce / z.transform input↔output mismatch with zodResolver.
const formSchema = z.object({
  name:       z.string().min(1, "Name is required").max(256),
  email:      z.string().email("Invalid email").or(z.literal("")),
  sex:        z.enum(["Male", "Female"]),
  birth_year: z.string().min(1, "Birth year is required"),
  height:     z.string(),
  weight:     z.string(),
})

type FormValues = z.infer<typeof formSchema>

export function CreateProfileDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      sex: "Male",
      birth_year: "",
      height: "",
      weight: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        name: values.name,
        sex: values.sex,
        birth_year: parseInt(values.birth_year, 10),
      }
      if (values.email)  payload.email  = values.email
      if (values.height) payload.height = parseFloat(values.height)
      if (values.weight) payload.weight = parseFloat(values.weight)

      await createProfile(payload)
      setOpen(false)
      form.reset()
    } catch (error) {
      console.error(error)
      alert("Failed to create profile. Check console for details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birth_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1990" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="180" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="75" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? "Creating..." : "Save Profile"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}