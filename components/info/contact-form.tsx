'use client'

import * as React from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const subjects = [
  'General feedback',
  'Bug report',
  'Feature request',
  'Data / privacy question',
  'Other',
]

export function ContactForm() {
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    // Simulate sending (replace with your preferred contact method — email API, etc.)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    setSent(true)
  }

  return (
    <section>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
              <Send className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </span>
            Contact Us
          </CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">
            Have a question, found a bug, or want to share feedback? We&apos;d love to hear from you.
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-2xl">✅</p>
              <p className="font-medium">Message sent!</p>
              <p className="text-sm text-[var(--muted-foreground)]">Thanks for reaching out. We&apos;ll get back to you shortly.</p>
              <button
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline mt-2"
                onClick={() => setSent(false)}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input id="contact-name" name="name" placeholder="Your name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input id="contact-email" name="email" type="email" placeholder="you@example.com" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Select name="subject">
                  <SelectTrigger>
                    <SelectValue placeholder="What's this about?" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  placeholder="Tell us what you're thinking…"
                  className="h-32"
                  required
                />
              </div>

              <Button type="submit" className="gap-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="h-4 w-4" /> Send Message</>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
