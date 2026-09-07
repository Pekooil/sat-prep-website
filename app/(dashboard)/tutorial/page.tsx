import { redirect } from 'next/navigation'

export const metadata = {
  title: 'QB Tutorial — SaturnPath',
  description: 'Step-by-step guide to using the College Board Question Bank with your SAT study plan.',
}

export default function TutorialPage() {
  // Retired V1 compatibility URL. Never render the legacy tutorial UI.
  redirect('/home')
}
