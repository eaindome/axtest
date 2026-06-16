<script lang="ts">
  type Size = 'sm' | 'md' | 'lg'

  interface Props {
    size?: Size
    tagline?: string | null
    align?: 'start' | 'center'
    stacked?: boolean
    class?: string
  }

  let { size = 'md', tagline = null, align = 'start', stacked = false, class: className = '' }: Props = $props()

  const sizeClass: Record<Size, string> = {
    sm: 'logo--sm',
    md: 'logo--md',
    lg: 'logo--lg'
  }
</script>

<span class="logo {sizeClass[size]} logo--{align} {stacked ? 'logo--stacked' : ''} {className}">
  <span class="logo-wordmark" aria-label="axtest">
    <span class="logo-ax">ax</span><span class="logo-test">{stacked ? ' test' : 'test'}</span>
  </span>
  {#if tagline}
    <span class="logo-tagline">{tagline}</span>
  {/if}
</span>

<style>
  .logo {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }

  .logo-wordmark {
    display: inline-flex;
    align-items: baseline;
    line-height: 1;
    white-space: nowrap;
  }

  .logo--stacked .logo-wordmark {
    flex-direction: column;
    align-items: center;
    line-height: 0.95;
  }

  .logo--stacked .logo-test {
    margin-top: -0.15rem;
  }

  .logo-ax {
    font-family: 'Chakra Petch', system-ui, sans-serif;
    font-weight: 700;
    letter-spacing: -0.04em;
    text-transform: lowercase;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 45%, #d97706 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 1px 0 rgb(217 119 6 / 0.15));
  }

  .logo-test {
    font-family: 'Chakra Petch', system-ui, sans-serif;
    font-weight: 600;
    letter-spacing: -0.02em;
    text-transform: lowercase;
    color: rgb(63 63 70);
  }

  :global(.dark) .logo-test {
    color: rgb(212 212 216);
  }

  .logo--center {
    align-items: center;
    text-align: center;
  }

  .logo--center .logo-tagline {
    text-align: center;
  }

  .logo-tagline {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.625rem;
    line-height: 1.2;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: rgb(161 161 170);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  :global(.dark) .logo-tagline {
    color: rgb(113 113 122);
  }

  .logo--sm .logo-ax,
  .logo--sm .logo-test {
    font-size: 1.25rem;
  }

  .logo--md .logo-ax,
  .logo--md .logo-test {
    font-size: 1.5rem;
  }

  .logo--lg .logo-ax,
  .logo--lg .logo-test {
    font-size: 2.5rem;
  }

  .logo--lg .logo-tagline {
    margin-top: 0.45rem;
    font-size: 0.875rem;
  }
</style>
