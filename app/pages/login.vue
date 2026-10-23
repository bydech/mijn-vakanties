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
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'Enter your email',
      required: true
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Enter your password',
      required: true
    },
    {
      name: 'remember',
      label: 'Remember me',
      type: 'checkbox'
    }
  ]

  const schema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Must be at least 6 characters')
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
          title: 'Login Failed',
          description: error.message,
          color: 'error'
        })
        return
      }

      toast.add({
        title: 'Success',
        description: `Welcome back, ${data.user?.email}!`,
        color: 'success'
      })

    } catch (err: any) {
      toast.add({
        title: 'Error',
        description: err.message || 'Something went wrong',
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
      <UAuthForm :schema="schema" :fields="fields" :loading="loading" title="Login"
        description="Enter your credentials to access your account." icon="i-lucide-user" @submit="onSubmit" />
      <div class="text-center text-sm text-neutral-500 mt-4">
        Nog geen account?
        <NuxtLink to="/register" class="text-primary font-medium hover:underline">
          Registreer hier
        </NuxtLink>
      </div>
    </UPageCard>

  </div>

</template>