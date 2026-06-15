import type { Project, ProjectEnvironment, UpsertEnvironmentRequest } from '../types'

type Override = { baseUrl: string | null; useProductionFallback: boolean }

const store: Record<number, Partial<Record<'staging' | 'local', Override>>> = {
  1: {
    staging: { baseUrl: 'https://staging.portal.ssmas.com', useProductionFallback: false },
  },
}

function productionUrl(project: Project) {
  return project.baseUrl ?? ''
}

export function buildEnvironmentList(project: Project): ProjectEnvironment[] {
  const overrides = store[project.id] ?? {}
  const prod = productionUrl(project)

  const staging = overrides.staging
  const local = overrides.local

  return [
    {
      name: 'production',
      baseUrl: prod || null,
      useProductionFallback: false,
      effectiveUrl: prod,
      configured: true,
    },
    {
      name: 'staging',
      baseUrl: staging?.baseUrl ?? null,
      useProductionFallback: staging?.useProductionFallback ?? false,
      effectiveUrl: staging && !staging.useProductionFallback && staging.baseUrl ? staging.baseUrl : prod,
      configured: !!staging,
    },
    {
      name: 'local',
      baseUrl: local?.baseUrl ?? null,
      useProductionFallback: local?.useProductionFallback ?? false,
      effectiveUrl: local && !local.useProductionFallback && local.baseUrl ? local.baseUrl : prod,
      configured: !!local,
    },
  ]
}

export async function mockGetEnvironments(project: Project): Promise<ProjectEnvironment[]> {
  return buildEnvironmentList(project)
}

export async function mockUpsertEnvironment(
  project: Project,
  name: 'staging' | 'local',
  req: UpsertEnvironmentRequest,
): Promise<ProjectEnvironment[]> {
  if (!store[project.id]) store[project.id] = {}
  store[project.id][name] = {
    baseUrl: req.useProductionFallback ? null : (req.baseUrl?.trim() ?? null),
    useProductionFallback: req.useProductionFallback,
  }
  return buildEnvironmentList(project)
}

export async function mockDeleteEnvironment(
  project: Project,
  name: 'staging' | 'local',
): Promise<ProjectEnvironment[]> {
  if (store[project.id]) delete store[project.id][name]
  return buildEnvironmentList(project)
}
