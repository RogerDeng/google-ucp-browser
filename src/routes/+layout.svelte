<script lang="ts">
  import '../app.css';
  
  interface Props {
    children?: import('svelte').Snippet;
  }
  
  let { children }: Props = $props();
</script>

<svelte:head>
  <title>UCP Browser v2.0</title>
  <meta name="description" content="Universal Commerce Protocol debugging tool and BAP implementation" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

<div class="app">
  {@render children?.()}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
  }

  :global(code), :global(pre), :global(.json-viewer) {
    font-family: 'JetBrains Mono', monospace;
  }
</style>
