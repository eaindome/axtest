import { redirect } from '@sveltejs/kit'

export function load({ url }: { url: URL }) {
  const project = Number(url.searchParams.get('project'))
  const destination = Number.isSafeInteger(project) && project > 0 ? `/projects/${project}/suites` : '/projects'
  const mode = url.searchParams.get('mode')
  redirect(307, destination + (mode === 'mock' || mode === 'api' ? `?mode=${mode}` : ''))
}
