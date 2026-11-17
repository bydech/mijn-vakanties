<!-- pages/index.vue -->
<script setup lang="ts">
  definePageMeta({
    middleware: [
      () => {
        const { $pb } = useNuxtApp()

        if ($pb.authStore.isValid) {
          return navigateTo('/reizen')
        }

        return navigateTo('/login')
      }
    ]
  })
</script>

<template>
  <div />
</template>