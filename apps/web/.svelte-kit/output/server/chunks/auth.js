import { d as derived, w as writable } from "./index2.js";
const authStore = writable({
  user: null,
  token: null
});
derived(authStore, ($a) => !!$a.token);
