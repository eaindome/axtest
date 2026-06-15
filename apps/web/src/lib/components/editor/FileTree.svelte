<script lang="ts">
  import Spinner from '$lib/components/ui/Spinner.svelte'
  import {
    buildFileTree,
    folderHasContents,
    folderNameFromPath,
    isDefaultFolder,
    isFolderAncestor,
    parentFolderPath,
  } from '$lib/editor/file-tree'
  import type { FileStatusInfo } from '$lib/editor/editor-panels'
  import type { TreeNode } from '$lib/editor/types'
  import type { TestFile } from '$lib/api'

  type DragItem =
    | { kind: 'file'; fileId: string; path: string }
    | { kind: 'folder'; path: string }

  type ContextTarget =
    | { kind: 'file'; file: TestFile }
    | { kind: 'folder'; path: string }
    | { kind: 'root' }

  interface Props {
    files: TestFile[]
    folders: string[]
    activeFileId: string | null
    loading: boolean
    width: number
    fileStatuses: Record<string, FileStatusInfo>
    onSelect: (file: TestFile) => void
    onCreateFile: (name: string, folder: string | null) => void | Promise<void>
    onCreateFolder: (path: string) => void | Promise<void>
    onDeleteFile: (fileId: string) => void | Promise<void>
    onRenameFile: (fileId: string, name: string) => void | Promise<void>
    onMoveFile: (fileId: string, folder: string | null) => void | Promise<void>
    onDeleteFolder: (path: string) => void | Promise<void>
    onRenameFolder: (path: string, name: string) => void | Promise<void>
    onMoveFolder: (path: string, targetFolder: string | null) => void | Promise<void>
  }

  let {
    files,
    folders,
    activeFileId,
    loading,
    width,
    fileStatuses,
    onSelect,
    onCreateFile,
    onCreateFolder,
    onDeleteFile,
    onRenameFile,
    onMoveFile,
    onDeleteFolder,
    onRenameFolder,
    onMoveFolder,
  }: Props = $props()

  let expanded = $state<Set<string>>(new Set(['auth', 'modules']))
  let selectedFolder = $state<string | null>(null)
  let menuOpen = $state(false)
  let creating = $state<'file' | 'folder' | null>(null)
  let createName = $state('')
  let createInput = $state<HTMLInputElement | null>(null)

  let contextMenu = $state<{ x: number; y: number; target: ContextTarget } | null>(null)
  let renaming = $state<{ kind: 'file' | 'folder'; id: string; name: string } | null>(null)
  let renameInput = $state<HTMLInputElement | null>(null)
  let dragging = $state<DragItem | null>(null)
  let dropTarget = $state<string | null>(null)

  let tree = $derived(buildFileTree(files, folders))

  function toggleFolder(path: string) {
    const next = new Set(expanded)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    expanded = next
  }

  function selectFolder(path: string) {
    selectedFolder = selectedFolder === path ? null : path
    if (!expanded.has(path)) {
      const next = new Set(expanded)
      next.add(path)
      expanded = next
    }
  }

  function selectFile(node: TreeNode) {
    const f = files.find(file => file.id === node.file?.id)
    if (f) onSelect(f)
  }

  function statusDot(fileId: string | undefined): string | null {
    if (!fileId) return null
    const s = fileStatuses[fileId]
    if (s?.dirty) return 'dirty'
    if (s?.runStatus === 'failed') return 'failed'
    if (s?.runStatus === 'passed') return 'passed'
    if (s?.runStatus === 'partial') return 'partial'
    return null
  }

  function folderIcon(open: boolean) {
    return open
      ? 'M3.75 9.776c0-1.168.95-2.118 2.118-2.118h1.5V6.75A2.25 2.25 0 0110.5 4.5h4.125c.621 0 1.125.504 1.125 1.125v1.008h1.5c1.168 0 2.118.95 2.118 2.118v7.404c0 1.168-.95 2.118-2.118 2.118H5.868c-1.168 0-2.118-.95-2.118-2.118V9.776z'
      : 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z'
  }

  function startCreate(kind: 'file' | 'folder') {
    menuOpen = false
    closeContextMenu()
    creating = kind
    createName = ''
    setTimeout(() => createInput?.focus(), 30)
  }

  function cancelCreate() {
    creating = null
    createName = ''
  }

  async function confirmCreate() {
    const name = createName.trim()
    if (!name) { cancelCreate(); return }
    if (creating === 'file') {
      await onCreateFile(name, selectedFolder)
    } else if (creating === 'folder') {
      const path = selectedFolder ? `${selectedFolder}/${name}` : name
      await onCreateFolder(path)
      expanded = new Set([...expanded, path.split('/')[0], path])
    }
    cancelCreate()
  }

  function closeContextMenu() {
    contextMenu = null
  }

  function openContextMenu(e: MouseEvent, target: ContextTarget) {
    e.preventDefault()
    e.stopPropagation()
    menuOpen = false
    contextMenu = { x: e.clientX, y: e.clientY, target }
  }

  function contextFolder(): string | null {
    if (!contextMenu) return null
    if (contextMenu.target.kind === 'folder') return contextMenu.target.path
    if (contextMenu.target.kind === 'file') return parentFolderPath(contextMenu.target.file.path)
    return null
  }

  function canDeleteFolder(path: string): boolean {
    if (isDefaultFolder(path) && !folderHasContents(path, files)) return false
    return true
  }

  function startRenameFromContext() {
    if (!contextMenu) return
    if (contextMenu.target.kind === 'file') {
      renaming = { kind: 'file', id: contextMenu.target.file.id, name: contextMenu.target.file.name }
    } else if (contextMenu.target.kind === 'folder') {
      renaming = {
        kind: 'folder',
        id: contextMenu.target.path,
        name: folderNameFromPath(contextMenu.target.path),
      }
    }
    closeContextMenu()
    setTimeout(() => renameInput?.focus(), 30)
  }

  function cancelRename() {
    renaming = null
  }

  async function confirmRename() {
    if (!renaming) return
    const name = renaming.name.trim()
    if (!name) { cancelRename(); return }
    if (renaming.kind === 'file') await onRenameFile(renaming.id, name)
    else await onRenameFolder(renaming.id, name)
    cancelRename()
  }

  async function deleteFromContext() {
    if (!contextMenu) return
    if (contextMenu.target.kind === 'file') {
      if (!confirm(`Delete "${contextMenu.target.file.name}"?`)) return
      await onDeleteFile(contextMenu.target.file.id)
    } else if (contextMenu.target.kind === 'folder') {
      const path = contextMenu.target.path
      if (!canDeleteFolder(path)) return
      const hasContents = folderHasContents(path, files)
      const msg = hasContents
        ? `Delete folder "${folderNameFromPath(path)}" and all files inside?`
        : `Delete folder "${folderNameFromPath(path)}"?`
      if (!confirm(msg)) return
      await onDeleteFolder(path)
    }
    closeContextMenu()
  }

  function createInContextFolder(kind: 'file' | 'folder') {
    selectedFolder = contextFolder()
    closeContextMenu()
    startCreate(kind)
  }

  function onDragStart(e: DragEvent, item: DragItem) {
    dragging = item
    e.dataTransfer?.setData('text/plain', item.kind)
    e.dataTransfer!.effectAllowed = 'move'
  }

  function onDragEnd() {
    dragging = null
    dropTarget = null
  }

  function canDropOn(targetFolder: string | null): boolean {
    if (!dragging) return false
    const target = targetFolder ?? ''
    if (dragging.kind === 'file') {
      const currentParent = parentFolderPath(dragging.path) ?? ''
      return currentParent !== target
    }
    const dragPath = dragging.path
    if (target === dragPath) return false
    if (target && isFolderAncestor(dragPath, target)) return false
    const parent = parentFolderPath(dragPath) ?? ''
    return parent !== target
  }

  function onDragOverFolder(e: DragEvent, folderPath: string | null) {
    if (!dragging || !canDropOn(folderPath)) return
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'move'
    dropTarget = folderPath ?? ''
  }

  function onDragLeaveFolder(e: DragEvent, folderPath: string | null) {
    const related = e.relatedTarget as Node | null
    if (related && (e.currentTarget as HTMLElement).contains(related)) return
    const key = folderPath ?? ''
    if (dropTarget === key) dropTarget = null
  }

  async function onDropOnFolder(e: DragEvent, folderPath: string | null) {
    e.preventDefault()
    if (!dragging || !canDropOn(folderPath)) {
      onDragEnd()
      return
    }
    const target = folderPath || null
    if (dragging.kind === 'file') await onMoveFile(dragging.fileId, target)
    else await onMoveFolder(dragging.path, target)
    if (target) expanded = new Set([...expanded, target])
    onDragEnd()
  }

  function onDocClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('[data-explorer-menu]')) menuOpen = false
    if (!(e.target as HTMLElement).closest('[data-explorer-ctx]')) closeContextMenu()
  }

  function dropHighlight(folderPath: string | null): boolean {
    const key = folderPath ?? ''
    return dropTarget === key && !!dragging && canDropOn(folderPath)
  }
</script>

<svelte:window onclick={onDocClick} />

{#snippet treeNode(node: TreeNode, depth: number)}
  {#if node.type === 'folder'}
    {@const open = expanded.has(node.path)}
    {@const selected = selectedFolder === node.path}
    {@const isDrop = dropHighlight(node.path)}
    {@const isRenaming = renaming?.kind === 'folder' && renaming.id === node.path}
    <div>
      <div
        class="flex items-center group rounded-md mx-0.5 transition-colors
               {isDrop ? 'bg-amber-100/80 dark:bg-amber-900/30 ring-1 ring-amber-400/60' : ''}"
        style="padding-left: {8 + depth * 12}px"
        draggable={!isRenaming}
        ondragstart={(e) => onDragStart(e, { kind: 'folder', path: node.path })}
        ondragend={onDragEnd}
        ondragover={(e) => onDragOverFolder(e, node.path)}
        ondragleave={(e) => onDragLeaveFolder(e, node.path)}
        ondrop={(e) => onDropOnFolder(e, node.path)}
        oncontextmenu={(e) => openContextMenu(e, { kind: 'folder', path: node.path })}
        role="treeitem"
        aria-expanded={open}
        tabindex="-1"
      >
        <button
          type="button"
          onclick={() => toggleFolder(node.path)}
          class="size-6 shrink-0 flex items-center justify-center text-zinc-400 hover:text-zinc-600"
          aria-label={open ? 'Collapse folder' : 'Expand folder'}
        >
          <svg class="size-3 transition-transform {open ? 'rotate-90' : ''}" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        {#if isRenaming}
          <input
            bind:this={renameInput}
            bind:value={renaming!.name}
            onkeydown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') cancelRename() }}
            onblur={confirmRename}
            class="flex-1 text-xs bg-white dark:bg-zinc-800 border border-amber-400 rounded px-1.5 py-1 outline-none min-w-0 mr-2"
          />
        {:else}
          <button
            type="button"
            onclick={() => selectFolder(node.path)}
            class="flex-1 flex items-center gap-1.5 py-1.5 pr-2 text-left text-xs rounded-md min-w-0 transition-colors
                   {selected
                     ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'
                     : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60'}"
          >
            <svg class="size-3.5 shrink-0 text-amber-500/70" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d={folderIcon(open)} />
            </svg>
            <span class="truncate font-medium">{node.name}</span>
          </button>
          <button
            type="button"
            onclick={() => { selectedFolder = node.path; startCreate('file') }}
            class="size-6 shrink-0 mr-1 flex items-center justify-center rounded text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-amber-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="New file in {node.name}"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" class="size-3.5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
          </button>
        {/if}
      </div>
      {#if open && node.children}
        {#each node.children as child}
          {@render treeNode(child, depth + 1)}
        {/each}
      {/if}
    </div>
  {:else}
    {@const active = activeFileId === node.file?.id}
    {@const dot = statusDot(node.file?.id)}
    {@const file = files.find(f => f.id === node.file?.id)}
    {@const isRenaming = renaming?.kind === 'file' && renaming.id === node.file?.id}
  {#if file}
    <div
      class="mx-0.5 rounded-md transition-colors {dropHighlight(null) ? '' : ''}"
      draggable={!isRenaming}
      ondragstart={(e) => onDragStart(e, { kind: 'file', fileId: file.id, path: file.path })}
      ondragend={onDragEnd}
      oncontextmenu={(e) => openContextMenu(e, { kind: 'file', file })}
      role="treeitem"
      tabindex="-1"
    >
      {#if isRenaming}
        <div style="padding-left: {32 + depth * 12}px; padding-right: 8px" class="py-1">
          <input
            bind:this={renameInput}
            bind:value={renaming!.name}
            onkeydown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') cancelRename() }}
            onblur={confirmRename}
            class="w-full text-xs bg-white dark:bg-zinc-800 border border-amber-400 rounded px-1.5 py-1 outline-none"
          />
        </div>
      {:else}
        <button
          type="button"
          onclick={() => selectFile(node)}
          class="w-full flex items-center gap-1.5 py-1.5 text-left text-xs transition-colors rounded-md
                 {active
                   ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                   : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}"
          style="padding-left: {32 + depth * 12}px; padding-right: 8px"
        >
          {#if dot === 'dirty'}
            <span class="size-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes"></span>
          {:else if dot === 'failed'}
            <span class="size-1.5 rounded-full bg-red-500 shrink-0" title="Last run had failures"></span>
          {:else if dot === 'partial'}
            <span class="size-1.5 rounded-full bg-amber-500 shrink-0" title="Some tests failed"></span>
          {:else if dot === 'passed'}
            <span class="size-1.5 rounded-full bg-emerald-500 shrink-0" title="All tests passed"></span>
          {:else if active}
            <span class="size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0"></span>
          {:else}
            <span class="size-1.5 shrink-0"></span>
          {/if}
          <svg class="size-3.5 shrink-0 {active ? 'text-amber-500' : 'text-zinc-400'}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span class="truncate flex-1">{node.name}</span>
        </button>
      {/if}
    </div>
  {/if}
  {/if}
{/snippet}

<aside
  class="shrink-0 flex flex-col border-r border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden"
  style="width: {width}px"
>
  <div class="px-3 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0">
    <p class="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Explorer</p>
    <div class="relative" data-explorer-menu>
      <button
        type="button"
        onclick={() => (menuOpen = !menuOpen)}
        class="size-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        title="New file or folder"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
      </button>
      {#if menuOpen}
        <div class="absolute right-0 top-full mt-1 z-50 min-w-[148px] py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
          <button type="button" onclick={() => startCreate('file')} class="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            New file…
          </button>
          <button type="button" onclick={() => startCreate('folder')} class="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            New folder…
          </button>
        </div>
      {/if}
    </div>
  </div>

  {#if creating}
    <div class="px-3 py-2 border-b border-zinc-200/80 dark:border-zinc-800 bg-amber-50/40 dark:bg-amber-900/10 shrink-0">
      <p class="text-xs text-zinc-500 mb-1">
        {creating === 'file' ? 'New file' : 'New folder'}
        {#if selectedFolder}<span class="text-zinc-400"> in {selectedFolder}/</span>{:else}<span class="text-zinc-400"> at root</span>{/if}
      </p>
      <div class="flex items-center gap-1">
        <input
          bind:this={createInput}
          bind:value={createName}
          onkeydown={(e) => { if (e.key === 'Enter') confirmCreate(); if (e.key === 'Escape') cancelCreate() }}
          placeholder={creating === 'file' ? 'name.axtest' : 'folder-name'}
          class="flex-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-400"
        />
        <button type="button" onclick={confirmCreate} class="text-xs font-medium text-amber-600 hover:text-amber-700 px-1">Add</button>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-10">
      <Spinner size="sm" class="text-amber-500" />
    </div>
  {:else}
    <div
      class="flex-1 overflow-y-auto py-1 px-1 panel-scroll min-h-0 transition-colors
             {dropHighlight(null) ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}"
      oncontextmenu={(e) => openContextMenu(e, { kind: 'root' })}
      ondragover={(e) => onDragOverFolder(e, null)}
      ondragleave={(e) => onDragLeaveFolder(e, null)}
      ondrop={(e) => onDropOnFolder(e, null)}
      role="tree"
    >
      {#each tree as node}
        {@render treeNode(node, 0)}
      {/each}
    </div>
  {/if}
</aside>

{#if contextMenu}
  {@const target = contextMenu.target}
  <div
    data-explorer-ctx
    class="fixed z-[100] min-w-[160px] py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl"
    style="left: {contextMenu.x}px; top: {contextMenu.y}px"
  >
    {#if target.kind === 'file'}
      <button type="button" onclick={() => { onSelect(target.file); closeContextMenu() }} class="ctx-item">Open</button>
      <button type="button" onclick={startRenameFromContext} class="ctx-item">Rename</button>
      <button type="button" onclick={deleteFromContext} class="ctx-item text-red-600 dark:text-red-400">Delete</button>
    {:else if target.kind === 'folder'}
      <button type="button" onclick={() => createInContextFolder('file')} class="ctx-item">New file</button>
      <button type="button" onclick={() => createInContextFolder('folder')} class="ctx-item">New folder</button>
      <div class="my-1 border-t border-zinc-100 dark:border-zinc-800"></div>
      <button type="button" onclick={startRenameFromContext} class="ctx-item">Rename</button>
      {#if canDeleteFolder(target.path)}
        <button type="button" onclick={deleteFromContext} class="ctx-item text-red-600 dark:text-red-400">Delete</button>
      {/if}
    {:else}
      <button type="button" onclick={() => { selectedFolder = null; createInContextFolder('file') }} class="ctx-item">New file</button>
      <button type="button" onclick={() => { selectedFolder = null; createInContextFolder('folder') }} class="ctx-item">New folder</button>
    {/if}
  </div>
{/if}

<style>
  .panel-scroll { scrollbar-width: thin; scrollbar-color: rgb(212 212 216 / 0.5) transparent; }
  .panel-scroll::-webkit-scrollbar { width: 4px; }
  .panel-scroll::-webkit-scrollbar-thumb { background: rgb(212 212 216 / 0.5); border-radius: 9999px; }
  :global(.dark) .panel-scroll { scrollbar-color: rgb(63 63 70 / 0.5) transparent; }
  :global(.dark) .panel-scroll::-webkit-scrollbar-thumb { background: rgb(63 63 70 / 0.5); }

  :global(.ctx-item) {
    display: block;
    width: 100%;
    padding: 0.375rem 0.75rem;
    text-align: left;
    font-size: 0.75rem;
    line-height: 1rem;
    color: rgb(63 63 70);
  }
  :global(.dark .ctx-item) { color: rgb(212 212 216); }
  :global(.ctx-item:hover) { background: rgb(250 250 250); }
  :global(.dark .ctx-item:hover) { background: rgb(39 39 42); }
</style>
