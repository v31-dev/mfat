<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { Button } from "@/components/ui/button";
import { useColorMode } from "@vueuse/core";

const mode = useColorMode();
</script>

<template>
  <header
    class="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur"
  >
    <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">MFAT</h1>
        <p class="text-sm text-muted-foreground">Mutual Fund Analysis Tool</p>
      </div>
      <Button
        variant="outline"
        size="icon"
        @click="mode = mode === 'light' ? 'dark' : 'light'"
      >
        <Icon
          icon="radix-icons:moon"
          class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
        />
        <Icon
          icon="radix-icons:sun"
          class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
        />
      </Button>
    </div>
  </header>
</template>
