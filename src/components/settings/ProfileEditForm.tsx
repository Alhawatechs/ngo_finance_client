'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, User as UserIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile } from '@/lib/api/auth'
import type { User } from '@/lib/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/components/ui/use-toast'
import { UserAvatar } from '@/components/layout/UserAvatar'
import { getInitials } from '@/lib/utils'

const profileSchema = z.object({
  name: z.string().min(2, 'Enter your display name').max(255),
  phone: z.string().max(50),
})

type ProfileForm = z.infer<typeof profileSchema>

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

const inputFieldClass =
  'border-input bg-background text-foreground placeholder:text-muted-foreground'

export function ProfileEditForm({ user }: { user: User }) {
  const setUser = useAuthStore((s) => s.setUser)
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone ?? '',
    },
  })

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Choose an image (PNG, JPG, or WebP).', variant: 'destructive' })
      return
    }
    if (f.size > MAX_AVATAR_BYTES) {
      toast({ title: 'File too large', description: 'Maximum size is 2 MB.', variant: 'destructive' })
      return
    }
    setAvatarFile(f)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
  }

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      let updated: User
      if (avatarFile) {
        const fd = new FormData()
        fd.append('name', data.name)
        fd.append('phone', data.phone || '')
        fd.append('avatar', avatarFile)
        updated = await updateProfile(fd)
      } else {
        updated = await updateProfile({ name: data.name, phone: data.phone || undefined })
      }
      setUser(updated)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('user', JSON.stringify(updated))
        } catch {
          /* ignore */
        }
      }
      setAvatarFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      if (fileRef.current) fileRef.current.value = ''
      toast({ title: 'Profile saved', description: 'Your details have been updated.' })
    } catch {
      toast({ title: 'Save failed', description: 'Could not update profile. Try again.', variant: 'destructive' })
    }
  })

  const displayAvatar = previewUrl || user.avatar_url || undefined

  return (
    <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-md">
      <CardHeader className="border-b border-border bg-muted/40 pb-4">
        <div className="flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-primary" aria-hidden />
          <CardTitle className="text-lg text-foreground">Edit your profile</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="bg-card pt-6">
        <form onSubmit={onSubmit} className="space-y-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
            <div className="flex flex-col items-center gap-3 lg:w-[200px] shrink-0">
              <div className="rounded-2xl border border-border bg-background p-2 shadow-inner">
                <UserAvatar
                  name={form.watch('name') || user.name}
                  initials={user.initials || getInitials(form.watch('name') || user.name)}
                  avatarUrl={displayAvatar}
                  size="lg"
                  variant="default"
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onPickFile}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileRef.current?.click()}
                title="PNG, JPG, or WebP · max 2 MB"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Change photo
              </Button>
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="profile-name" className="text-foreground">
                    Display name
                  </Label>
                  <Input
                    id="profile-name"
                    className={inputFieldClass}
                    {...form.register('name')}
                    autoComplete="name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="profile-phone" className="text-foreground">
                    Phone
                  </Label>
                  <Input
                    id="profile-phone"
                    type="tel"
                    className={inputFieldClass}
                    {...form.register('phone')}
                    autoComplete="tel"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="profile-email" className="text-foreground">
                    Email
                  </Label>
                  <p id="profile-email-note" className="sr-only">
                    Email is managed by your administrator.
                  </p>
                  <Input
                    id="profile-email"
                    value={user.email}
                    disabled
                    className={`${inputFieldClass} bg-muted text-muted-foreground opacity-90`}
                    readOnly
                    aria-describedby="profile-email-note"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
