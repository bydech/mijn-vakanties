// stores/auth.ts
import { defineStore } from "pinia";
import type { UserRecord } from "~/types/pocketbase.types";

export const useAuthStore = defineStore("auth", () => {
  const { $pb } = useNuxtApp();

  // Reactieve state geïnitialiseerd met de huidige status van PocketBase
  const user = ref<UserRecord | null>($pb.authStore.record as UserRecord | null);
  const token = ref<string>($pb.authStore.token);
  const isLoading = ref(false);

  // Reactieve status: geldig token én een geladen record
  const isAuthenticated = computed(() => $pb.authStore.isValid && !!user.value);

  // Luister direct naar wijzigingen in PocketBase (inloggen, token refresh, uitloggen)
  $pb.authStore.onChange((newToken, newRecord) => {
    token.value = newToken;
    user.value = (newRecord as UserRecord | null) ?? null;
  });

  /**
   * Inloggen met e-mail en wachtwoord
   */
  async function login(email: string, password: string) {
    isLoading.value = true;
    try {
      const authData = await $pb.collection("users").authWithPassword<UserRecord>(email, password);
      return authData;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Nieuwe gebruiker registreren en meteen inloggen
   */
  async function register(email: string, password: string, name?: string) {
    isLoading.value = true;
    try {
      await $pb.collection("users").create({
        email,
        password,
        passwordConfirm: password,
        name: name || "",
      });

      return await login(email, password);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Uitloggen en token wissen
   */
  async function logout() {
    $pb.authStore.clear();
    await navigateTo("/login");
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };
});
