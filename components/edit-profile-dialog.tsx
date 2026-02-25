"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { updateProfile } from "@/actions/profile"
import { ETHNICITIES } from "@/lib/ethnicities"

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

const formSchema = z.object({
  name:                z.string().min(1, "Name is required").max(256),
  email:               z.string().email("Invalid email").or(z.literal("")),
  sex:                 z.enum(["Male", "Female"]),
  birth_year:          z.string().min(1, "Birth year is required"),
  height:              z.string(),
  weight:              z.string(),
  ethnicity:           z.string(),
  secondary_ethnicity: z.string(),
})

type FormValues = z.infer<typeof formSchema>

export function EditProfileDialog({ profile }: { profile: any }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name:                profile.name        ?? "",
      email:               profile.email       ?? "",
      sex:                 profile.sex         ?? "Male",
      birth_year:          profile.birth_year  ? String(profile.birth_year) : "",
      height:              profile.height      ? String(profile.height)     : "",
      weight:              profile.weight      ? String(profile.weight)     : "",
      ethnicity:           profile.ethnicity           ?? "",
      secondary_ethnicity: profile.secondary_ethnicity ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        name:       values.name,
        sex:        values.sex,
        birth_year: parseInt(values.birth_year, 10),
      }
      if (values.email)               payload.email               = values.email
      if (values.height)              payload.height              = parseFloat(values.height)
      if (values.weight)              payload.weight              = parseFloat(values.weight)
      if (values.ethnicity)           payload.ethnicity           = values.ethnicity
      if (values.secondary_ethnicity) payload.secondary_ethnicity = values.secondary_ethnicity

      await updateProfile(profile.id, payload)
      setOpen(false)
    } catch (error) {
      console.error(error)
      alert("Failed to update profile. Check console for details.")
    } finally {
      setLoading(false)
    }
  }

  const primaryEthnicity = form.watch("ethnicity")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
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
                  <FormControl><Input {...field} /></FormControl>
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
                      <Input type="number" {...field} />
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

            <FormField
              control={form.control}
              name="ethnicity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Ethnicity (Optional)</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val)
                      // Clear secondary if it now matches primary
                      if (form.getValues("secondary_ethnicity") === val) {
                        form.setValue("secondary_ethnicity", "")
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ethnicity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ETHNICITIES.map(e => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondary_ethnicity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Ethnicity (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!primaryEthnicity}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select secondary ethnicity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ETHNICITIES.filter(e => e !== primaryEthnicity).map(e => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}