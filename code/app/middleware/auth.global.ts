// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const { $pb } = useNuxtApp();

  // Routes die voor iedereen zonder login toegankelijk moeten zijn
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.includes(to.path);
  const isAuthenticated = $pb.authStore.isValid;

  // 1. Gebruiker is NIET ingelogd en probeert een afgeschermde pagina te bezoeken
  if (!isAuthenticated && !isPublicRoute) {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }

  // 2. Gebruiker is AL WEL ingelogd en bezoekt /login of /register -> stuur direct door
  if (isAuthenticated && isPublicRoute) {
    return navigateTo("/reizen");
  }
});
