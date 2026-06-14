'use client'

import * as React from 'react'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle,
  DialogDescription, DialogTrigger, DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { deleteAccount } from '@/actions/account'

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'digest' in err &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}

export function DeleteAccount() {
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState('')
  const [pending, setPending] = React.useState(false)

  async function handleDelete() {
    setPending(true)
    try {
      const result = await deleteAccount()
      // On success the action redirects (throws NEXT_REDIRECT); reaching here
      // with a result means it returned an error instead.
      if (result?.error) {
        toast({ title: 'Could not delete account', description: result.error, variant: 'destructive' })
        setPending(false)
      }
    } catch (err) {
      if (isRedirectError(err)) throw err
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Please try again in a moment.',
        variant: 'destructive',
      })
      setPending(false)
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20 p-5">
      <h2 className="text-base font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Delete account
      </h2>
      <p className="mt-1 text-sm text-red-700/90 dark:text-red-400/90">
        Permanently delete your account and all of your study data — your plan, calendar tasks,
        sessions, error log, scores, and analytics. This cannot be undone.
      </p>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setConfirmText(''); setPending(false) } }}>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete my account
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account and all associated study data. This action cannot be
              undone. Type <strong>DELETE</strong> below to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete">Confirmation</Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              autoComplete="off"
              disabled={pending}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending || confirmText !== 'DELETE'}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pending ? 'Deleting…' : 'Delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
