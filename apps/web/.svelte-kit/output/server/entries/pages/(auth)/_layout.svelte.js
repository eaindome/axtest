import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
import { S as Spinner } from "../../../chunks/Spinner.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">`);
      Spinner($$renderer2, { size: "lg", class: "text-amber-500" });
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _layout as default
};
