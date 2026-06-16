export interface DocGroup {
  id: string
  title: string
  description: string
}

export const DOC_GROUPS: DocGroup[] = [
  {
    id: 'start',
    title: 'Start here',
    description: 'What axtest is and how the training app works',
  },
  {
    id: 'tutorial',
    title: 'Todo app tutorial',
    description: 'Hands-on walkthrough using TaskFlow Todo',
  },
  {
    id: 'reference',
    title: 'Syntax reference',
    description: 'Steps, rules, assertions, and file format',
  },
  {
    id: 'workflows',
    title: 'Day-to-day workflows',
    description: 'Editor, generation, runs, and file organization',
  },
]
