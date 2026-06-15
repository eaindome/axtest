import { a as attr_class, b as attr, e as escape_html, f as bind_props, g as derived, s as stringify } from "./index.js";
function Input($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      label,
      error,
      hint,
      id,
      type = "text",
      placeholder,
      value = "",
      required = false,
      disabled = false,
      autocomplete,
      class: cls = ""
    } = $$props;
    let inputId = derived(() => id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : void 0));
    $$renderer2.push(`<div${attr_class(`flex flex-col gap-1.5 ${stringify(cls)}`)}>`);
    if (label) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<label${attr("for", inputId())} class="text-sm font-medium text-zinc-700 dark:text-zinc-300">${escape_html(label)}`);
      if (required) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="text-red-500 ml-0.5">*</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></label>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <input${attr("type", type)}${attr("id", inputId())}${attr("value", value)}${attr("placeholder", placeholder)}${attr("required", required, true)}${attr("disabled", disabled, true)}${attr("autocomplete", autocomplete)}${attr_class(`h-9 w-full rounded-lg border px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 bg-white dark:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-zinc-50 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed ${error ? "border-red-400 bg-red-50 dark:bg-red-900/20" : "border-zinc-300 dark:border-zinc-600"}`)}/> `);
    if (error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-xs text-red-600 dark:text-red-400">${escape_html(error)}</p>`);
    } else if (hint) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<p class="text-xs text-zinc-500 dark:text-zinc-400">${escape_html(hint)}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { value });
  });
}
export {
  Input as I
};
