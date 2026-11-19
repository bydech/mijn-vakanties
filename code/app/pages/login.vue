<!-- pages/login.vue -->
<script setup lang="ts">
  import * as z from 'zod'
  import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

  definePageMeta({
    layout: false,
  })

  const authStore = useAuthStore()
  const toast = useToast()
  const route = useRoute()
  const loading = ref(false)

  const fields: AuthFormField[] = [
    {
      name: 'email',
      type: 'email',
      label: 'E-mailadres',
      placeholder: 'naam@voorbeeld.nl',
      required: true
    },
    {
      name: 'password',
      type: 'password',
      label: 'Wachtwoord',
      placeholder: '••••••••',
      required: true
    }
  ]

  const schema = z.object({
    email: z.string().email('Ongeldig e-mailadres'),
    password: z.string().min(1, 'Vul je wachtwoord in')
  })

  type Schema = z.output<typeof schema>

  async function onSubmit(payload: FormSubmitEvent<Schema>) {
    loading.value = true
    try {
      await authStore.login(payload.data.email, payload.data.password)

      toast.add({
        title: 'Welkom terug!',
        color: 'success'
      })

      const redirectPath =
        typeof route.query.redirect === 'string' &&
          route.query.redirect.startsWith('/') &&
          !route.query.redirect.startsWith('//') &&
          route.query.redirect !== '/login' &&
          route.query.redirect !== '/register'
          ? route.query.redirect
          : '/reizen';

      await navigateTo(redirectPath);

    } catch (err: any) {
      toast.add({
        title: 'Inloggen mislukt',
        description: 'Controleer je e-mailadres en wachtwoord.',
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <div class="auth-layout">
    <UPageCard class="auth-layout__card">
      <UAuthForm :schema="schema" :fields="fields" :loading="loading" title="Mijn Vakanties"
        description="Log in om je reizen en uitgaven te bekijken." icon="i-lucide-parasol" @submit="onSubmit">
        <template #footer>
          <div class="auth-layout__footer">
            Nog geen account?
            <NuxtLink to="/register" class="auth-layout__link">
              Account aanmaken
            </NuxtLink>
          </div>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
