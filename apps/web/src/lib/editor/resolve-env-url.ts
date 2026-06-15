import type { Project, ProjectEnvironment, EnvironmentName } from '$lib/api'

export function isOverridableEnv(name: string): name is 'staging' | 'local' {
  return name === 'staging' || name === 'local'
}

export function resolveEffectiveUrl(
  environment: EnvironmentName,
  project: Project | null,
  envs: ProjectEnvironment[],
): string {
  const production = project?.baseUrl ?? ''
  if (environment === 'production') return production

  const env = envs.find(e => e.name === environment)
  if (!env) return production
  if (env.useProductionFallback || !env.baseUrl) return production
  return env.baseUrl
}

/** True when user has never been prompted / saved a choice for this env. */
export function needsEnvironmentSetup(
  environment: EnvironmentName,
  envs: ProjectEnvironment[],
): boolean {
  if (environment === 'production') return false
  const env = envs.find(e => e.name === environment)
  return !env?.configured
}

export function envLabel(name: EnvironmentName): string {
  return { production: 'Production', staging: 'Staging', local: 'Local' }[name]
}

export function defaultLocalUrl(): string {
  return 'http://localhost:3000'
}

export function suggestStagingUrl(productionUrl: string): string {
  if (!productionUrl) return ''
  try {
    const u = new URL(productionUrl)
    if (u.hostname.startsWith('staging.')) return productionUrl
    return `${u.protocol}//staging.${u.host}${u.pathname === '/' ? '' : u.pathname}`
  } catch {
    return productionUrl.replace('://', '://staging.')
  }
}
