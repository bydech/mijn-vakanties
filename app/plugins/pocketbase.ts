// plugins/pocketbase.ts
import PocketBase from "pocketbase";

export default defineNuxtPlugin(() => {
  // PocketBase gebruikt in de browser automatisch localStorage voor pb.authStore
  const pb = new PocketBase("http://127.0.0.1:8092");

  return {
    provide: {
      pb,
    },
  };
});
