<!-- pages/register.vue -->
<script setup lang="ts">
  import * as z from 'zod'
  import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

  definePageMeta({
    layout: false,
  })


  const authStore = useAuthStore()
  const toast = useToast()
  const loading = ref(false)

  const fields: AuthFormField[] = [
    {
      name: 'name',
      type: 'text',
      label: 'Naam',
      placeholder: 'Je voor- en achternaam',
      required: true
    },
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
      placeholder: 'Minimaal 6 tekens',
      required: true
    }
  ]

  const schema = z.object({
    name: z.string().min(2, 'Naam moet minimaal 2 tekens zijn'),
    email: z.string().email('Ongeldig e-mailadres'),
    password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn')
  })

  type Schema = z.output<typeof schema>

  async function onSubmit(payload: FormSubmitEvent<Schema>) {
    loading.value = true
    try {
      await authStore.register(
        payload.data.email,
        payload.data.password,
        payload.data.name
      )

      toast.add({
        title: 'Account aangemaakt!',
        description: `Welkom ${payload.data.name}. Je kunt direct aan de slag.`,
        color: 'success'
      })

      await navigateTo('/reizen')
    } catch (err: any) {
      toast.add({
        title: 'Registratie mislukt',
        description: err.message || 'Er is iets misgegaan bij het registreren.',
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
      <UAuthForm :schema="schema" :fields="fields" :loading="loading" title="Account Aanmaken"
        description="Registreer je om deel te nemen aan vakanties en kosten bij te houden." icon="i-lucide-user-plus"
        @submit="onSubmit">
        <template #footer>
          <div class="auth-layout__footer">
            Al een account?
            <NuxtLink to="/login" class="auth-layout__link">
              Hier inloggen
            </NuxtLink>
          </div>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
