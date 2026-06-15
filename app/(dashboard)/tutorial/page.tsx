import { unstable_noStore as noStore } from 'next/cache'
import { TutorialClient } from '@/components/tutorial/tutorial-client'
import { getUserInventoryMode } from '@/actions/question-inventory'

export const metadata = {
  title: 'QB Tutorial — SaturnPath',
  description: 'Step-by-step guide to using the College Board Question Bank with your SAT study plan.',
}

export default async function TutorialPage() {
  noStore()
  const { mode } = await getUserInventoryMode()
  return <TutorialClient inventoryMode={mode} />
}
