import { writable } from 'svelte/store'
import type { Project } from '$lib/api'

export const globalProjects = writable<Project[]>([])
