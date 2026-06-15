<script lang="ts">
  interface Props {
    label?: string
    error?: string
    hint?: string
    id?: string
    type?: string
    placeholder?: string
    value?: string
    required?: boolean
    disabled?: boolean
    autocomplete?: string
    class?: string
  }

  let {
    label,
    error,
    hint,
    id,
    type = 'text',
    placeholder,
    value = $bindable(''),
    required = false,
    disabled = false,
    autocomplete,
    class: cls = ''
  }: Props = $props()

  let inputId = $derived(id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined))
</script>

<div class="flex flex-col gap-1.5 {cls}">
  {#if label}
    <label for={inputId} class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}{#if required}<span class="text-red-500 ml-0.5">*</span>{/if}
    </label>
  {/if}
  <input
    {type}
    id={inputId}
    bind:value
    {placeholder}
    {required}
    {disabled}
    autocomplete={autocomplete as never}
    class="h-9 w-full rounded-lg border px-3 text-sm
           text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
           bg-white dark:bg-zinc-800 transition-colors
           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
           disabled:bg-zinc-50 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed
           {error ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-zinc-300 dark:border-zinc-600'}"
  />
  {#if error}
    <p class="text-xs text-red-600 dark:text-red-400">{error}</p>
  {:else if hint}
    <p class="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
  {/if}
</div>
