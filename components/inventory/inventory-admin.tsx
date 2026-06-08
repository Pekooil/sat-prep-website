'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, Pencil, Trash2, Upload, FileJson, FileText, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  bulkImportInventory,
  getInventoryWithStats,
} from '@/actions/question-inventory'
import type { InventoryItemWithStats } from '@/actions/question-inventory'
import type { QuestionInventory } from '@/types'

const SECTIONS = ['Reading and Writing', 'Math'] as const
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

type FormState = {
  section: 'Reading and Writing' | 'Math'
  domain: string
  skill: string
  difficulty: 'easy' | 'medium' | 'hard'
  available_count: string
}

const EMPTY_FORM: FormState = {
  section: 'Math',
  domain: '',
  skill: '',
  difficulty: 'easy',
  available_count: '',
}

interface Props {
  items: InventoryItemWithStats[]
  onUpdate: (items: InventoryItemWithStats[]) => void
}

export function InventoryAdmin({ items, onUpdate }: Props) {
  const [pending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [importMode, setImportMode] = useState<'json' | 'csv'>('csv')
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importSuccess, setImportSuccess] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    const res = await getInventoryWithStats()
    if (res.data) onUpdate(res.data)
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setFormError('')
    setEditingId(null)
    setShowAddDialog(true)
  }

  function openEdit(item: QuestionInventory) {
    setForm({
      section: item.section,
      domain: item.domain,
      skill: item.skill,
      difficulty: item.difficulty,
      available_count: String(item.available_count),
    })
    setFormError('')
    setEditingId(item.id)
    setShowAddDialog(true)
  }

  function validateForm(): string {
    if (!form.domain.trim()) return 'Domain is required'
    if (!form.skill.trim()) return 'Skill is required'
    const n = Number(form.available_count)
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return 'Available count must be a non-negative integer'
    return ''
  }

  function submitForm() {
    const err = validateForm()
    if (err) { setFormError(err); return }

    const data = {
      section: form.section,
      domain: form.domain.trim(),
      skill: form.skill.trim(),
      difficulty: form.difficulty,
      available_count: parseInt(form.available_count, 10),
    }

    startTransition(async () => {
      const res = editingId
        ? await updateInventoryItem(editingId, data)
        : await createInventoryItem(data)

      if (res.error) { setFormError(res.error); return }
      setShowAddDialog(false)
      await refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteInventoryItem(id)
      if (res.error) return
      setDeleteId(null)
      await refresh()
    })
  }

  function parseImport(): Array<{ section: string; domain: string; skill: string; difficulty: string; available_count: number }> {
    if (importMode === 'json') {
      const parsed = JSON.parse(importText)
      return Array.isArray(parsed) ? parsed : []
    }
    // CSV: section,domain,skill,difficulty,available_count
    const lines = importText.trim().split('\n')
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim())
      const obj: Record<string, string> = {}
      header.forEach((h, i) => { obj[h] = cols[i] ?? '' })
      return {
        section: obj.section ?? '',
        domain: obj.domain ?? '',
        skill: obj.skill ?? '',
        difficulty: obj.difficulty ?? '',
        available_count: parseInt(obj.available_count ?? '0', 10),
      }
    })
  }

  function handleImport() {
    setImportErrors([])
    setImportSuccess(null)

    let rows
    try {
      rows = parseImport()
    } catch {
      setImportErrors(['Invalid format — check JSON/CSV syntax'])
      return
    }

    startTransition(async () => {
      const res = await bulkImportInventory(rows)
      setImportErrors(res.errors)
      if (res.imported > 0) {
        setImportSuccess(res.imported)
        await refresh()
      }
    })
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const mode = file.name.endsWith('.json') ? 'json' : 'csv'
    setImportMode(mode)
    const reader = new FileReader()
    reader.onload = ev => setImportText((ev.target?.result as string) ?? '')
    reader.readAsText(file)
  }

  const sortedItems = [...items].sort((a, b) =>
    a.section.localeCompare(b.section) || a.domain.localeCompare(b.domain) || a.skill.localeCompare(b.skill)
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={openAdd} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="h-4 w-4" />
          Add category
        </Button>
        <Button variant="outline" onClick={() => { setShowImportDialog(true); setImportText(''); setImportErrors([]); setImportSuccess(null) }} className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk import
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-[var(--card)] border-[var(--border)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">All Categories ({items.length})</CardTitle>
          <CardDescription className="text-xs">Edit counts or delete categories. Changes affect planner limits immediately.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  {['Section', 'Domain', 'Skill', 'Difficulty', 'Available', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sortedItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-[var(--muted-foreground)] font-medium">
                      {item.section === 'Reading and Writing' ? 'R&W' : 'Math'}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{item.domain}</td>
                    <td className="px-3 py-2.5 text-[var(--muted-foreground)]">{item.skill}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
                        item.difficulty === 'easy'   ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                        item.difficulty === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      )}>
                        {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums font-semibold">{item.available_count}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-[var(--muted-foreground)] hover:text-violet-600"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-[var(--muted-foreground)] hover:text-red-600"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Select value={form.section} onValueChange={v => setForm(f => ({ ...f, section: v as typeof form.section }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v as typeof form.difficulty }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Domain</Label>
              <Input
                placeholder="e.g. Algebra"
                value={form.domain}
                onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Skill</Label>
              <Input
                placeholder="e.g. Linear equations in one variable"
                value={form.skill}
                onChange={e => setForm(f => ({ ...f, skill: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Available Count</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={form.available_count}
                onChange={e => setForm(f => ({ ...f, available_count: e.target.value }))}
              />
            </div>
            {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={submitForm} disabled={pending} className="bg-violet-600 hover:bg-violet-700 text-white">
              {pending ? 'Saving…' : editingId ? 'Save changes' : 'Add category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            This will permanently remove this inventory entry. The planner will no longer have a cap for this skill.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              {pending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk import dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Format toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={importMode === 'csv' ? 'default' : 'outline'}
                className={cn('gap-1.5', importMode === 'csv' && 'bg-violet-600 hover:bg-violet-700 text-white')}
                onClick={() => setImportMode('csv')}
              >
                <FileText className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button
                size="sm"
                variant={importMode === 'json' ? 'default' : 'outline'}
                className={cn('gap-1.5', importMode === 'json' && 'bg-violet-600 hover:bg-violet-700 text-white')}
                onClick={() => setImportMode('json')}
              >
                <FileJson className="h-3.5 w-3.5" />
                JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 ml-auto"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload file
              </Button>
              <input ref={fileRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFileUpload} />
            </div>

            {/* Format hint */}
            <p className="text-xs text-[var(--muted-foreground)]">
              {importMode === 'csv'
                ? 'CSV columns: section, domain, skill, difficulty, available_count'
                : 'JSON: array of objects with keys section, domain, skill, difficulty, available_count'}
            </p>

            <textarea
              className="w-full h-48 rounded-lg border border-[var(--border)] bg-slate-50 dark:bg-slate-800/60 p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder={importMode === 'csv'
                ? 'section,domain,skill,difficulty,available_count\nMath,Algebra,Linear equations in one variable,easy,80'
                : '[{"section":"Math","domain":"Algebra","skill":"Linear equations in one variable","difficulty":"easy","available_count":80}]'
              }
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />

            {/* Feedback */}
            {importSuccess !== null && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                {importSuccess} row{importSuccess !== 1 ? 's' : ''} imported successfully
              </div>
            )}
            {importErrors.length > 0 && (
              <div className="space-y-1">
                {importErrors.map((e, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <X className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {e}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Close</Button>
            <Button
              disabled={pending || !importText.trim()}
              onClick={handleImport}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {pending ? 'Importing…' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
