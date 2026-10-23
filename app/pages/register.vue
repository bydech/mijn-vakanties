<!-- pages/register.vue -->
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

  watch(
    user,
    (newUser) => {
      if (newUser) {
        navigateTo('/overzicht')
      }
    },
    { immediate: true }
  )

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
      const { data, error } = await supabase.auth.signUp({
        email: payload.data.email,
        password: payload.data.password,
        options: {
          data: {
            full_name: payload.data.name
          }
        }
      })

      if (error) {
        toast.add({
          title: 'Registratie mislukt',
          description: error.message,
          color: 'error'
        })
        return
      }

      toast.add({
        title: 'Account aangemaakt!',
        description: `Welkom ${payload.data.name}. Je kunt direct aan de slag.`,
        color: 'success'
      })

      if (data.session) {
        await navigateTo('/overzicht')
      } else {
        navigateTo('/login')
      }
    } catch (err: any) {
      toast.add({
        title: 'Fout',
        description: err.message || 'Er is iets misgegaan',
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <div class="flex min-h-screen items-center justify-center p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm :schema="schema" :fields="fields" :loading="loading" title="Account Aanmaken"
        description="Registreer je om deel te nemen aan vakanties en kosten bij te houden." icon="i-lucide-user-plus"
        @submit="onSubmit">
        <template #footer>
          <div class="text-center text-sm text-neutral-500 mt-4">
            Al een account?
            <NuxtLink to="/login" class="text-primary font-medium hover:underline">
              Hier inloggen
            </NuxtLink>
          </div>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>