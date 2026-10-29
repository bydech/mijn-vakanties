<!-- pages/login.vue -->
<script setup lang="ts">
  import * as z from 'zod'
  import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

  definePageMeta({
    layout: false
  })

  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()
  const loading = ref(false)

  const fields: AuthFormField[] = [
    {
      name: 'email',
      type: 'email',
      label: 'E-mailadres',
      placeholder: 'Voer je e-mailadres in',
      required: true
    },
    {
      name: 'password',
      label: 'Wachtwoord',
      type: 'password',
      placeholder: 'Voer je wachtwoord in',
      required: true
    },
    {
      name: 'remember',
      label: 'Onthoud mij',
      type: 'checkbox'
    }
  ]

  // Nederlands geconfigureerd validatieschema
  const schema = z.object({
    email: z
      .email('Voer een geldig e-mailadres in')
      .min(1, 'Vul een e-mailadres in'),
    password: z
      .string('Vul een wachtwoord in')
      .min(1, 'Vul een wachtwoord in')
      .min(6, 'Wachtwoord moet minimaal 6 tekens lang zijn')
  })

  type Schema = z.output<typeof schema>

  async function onSubmit(payload: FormSubmitEvent<Schema>) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.data.email,
        password: payload.data.password
      })

      if (error) {
        toast.add({
          title: 'Inloggen mislukt',
          description: error.message,
          color: 'error'
        })
        return
      }

      toast.add({
        title: 'Succesvol ingelogd',
        description: `Welkom terug, ${data.user?.email}!`,
        color: 'success'
      })

      await navigateTo('/reizen')

    } catch (err: any) {
      toast.add({
        title: 'Foutmelding',
        description: err.message || 'Er is iets misgegaan',
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

  watch(
    user,
    (newUser) => {
      if (newUser) {
        navigateTo('/overzicht')
      }
    },
    { immediate: true }
  )
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm :schema="schema" :fields="fields" :loading="loading" :submit="{ label: 'Inloggen' }" title="Inloggen"
        description="Voer je gegevens in om toegang te krijgen" icon="i-lucide-user" @submit="onSubmit" />
      <div class="text-center text-sm text-neutral-500 mt-4">
        Nog geen account?
        <NuxtLink to="/register" class="text-primary font-medium hover:underline">
          Registreer hier
        </NuxtLink>
      </div>
    </UPageCard>
  </div>
</template>