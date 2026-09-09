'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Plus, Printer, Trash2 } from 'lucide-react'
import { track } from '@vercel/analytics/react'
import styles from './error-log-template.module.css'

type MistakeRow = {
  id: number
  reference: string
  skill: string
  cause: string
  lesson: string
  reviewDate: string
}

function emptyRow(id: number): MistakeRow {
  return { id, reference: '', skill: '', cause: '', lesson: '', reviewDate: '' }
}

export function ErrorLogTemplate() {
  const [rows, setRows] = React.useState<MistakeRow[]>([emptyRow(1), emptyRow(2), emptyRow(3)])
  const nextId = React.useRef(4)

  function updateRow(id: number, field: keyof Omit<MistakeRow, 'id'>, value: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row))
  }

  function addRow() {
    setRows((current) => [...current, emptyRow(nextId.current++)])
    track('Error Log Row Added')
  }

  function removeRow(id: number) {
    setRows((current) => current.length > 1 ? current.filter((row) => row.id !== id) : current)
  }

  function printLog() {
    track('Error Log Printed')
    window.print()
  }

  return (
    <section className={styles.wrapper} aria-labelledby="error-log-title">
      <div className={styles.intro}>
        <div><span>Private by default</span><h2 id="error-log-title">Your working error log</h2><p>Entries stay in this browser tab and are not sent to SaturnPath. Do not copy full copyrighted questions; use a short source reference instead.</p></div>
        <button type="button" onClick={printLog}><Printer /> Print or save PDF</button>
      </div>

      <div className={styles.rows}>
        {rows.map((row, index) => (
          <article key={row.id}>
            <header><strong>Mistake {index + 1}</strong><button type="button" onClick={() => removeRow(row.id)} disabled={rows.length === 1} aria-label={`Remove mistake ${index + 1}`}><Trash2 /></button></header>
            <div className={styles.fields}>
              <label><span>Source / question reference</span><input value={row.reference} onChange={(event) => updateRow(row.id, 'reference', event.target.value)} placeholder="Bluebook Test 3 · Math M1 · #12" /></label>
              <label><span>Section and skill</span><input value={row.skill} onChange={(event) => updateRow(row.id, 'skill', event.target.value)} placeholder="Math · Advanced Math" /></label>
              <label><span>Mistake cause</span><select value={row.cause} onChange={(event) => updateRow(row.id, 'cause', event.target.value)}><option value="">Choose a cause</option><option>Concept gap</option><option>Setup or strategy</option><option>Careless execution</option><option>Timing</option><option>Guess</option></select></label>
              <label><span>Review date</span><input type="date" value={row.reviewDate} onChange={(event) => updateRow(row.id, 'reviewDate', event.target.value)} /></label>
              <label className={styles.lesson}><span>Reusable lesson</span><textarea value={row.lesson} onChange={(event) => updateRow(row.id, 'lesson', event.target.value)} placeholder="Next time, I will…" /></label>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className={styles.addButton} onClick={addRow}><Plus /> Add another mistake</button>

      <aside className={styles.cta}>
        <div><span>Make review automatic</span><h2>Let mistakes change what comes next.</h2><p>A free SaturnPath account connects your error patterns, review queue, calendar, and progress.</p></div>
        <Link href="/signup?next=%2Fonboarding&utm_source=error_log_tool&utm_medium=organic_tool&utm_campaign=save_error_log" onClick={() => track('Error Log Signup Clicked')}>Start free <ArrowRight /></Link>
      </aside>
    </section>
  )
}
