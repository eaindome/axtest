import { b as attr, a as attr_class, s as stringify } from "./index.js";
import { S as Spinner } from "./Spinner.js";
function Button($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      type = "button",
      class: cls = "",
      onclick,
      children
    } = $$props;
    const base = [
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed"
    ].join(" ");
    const variants = {
      primary: "bg-amber-600 text-white hover:bg-amber-700",
      secondary: "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700",
      ghost: "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
      danger: "bg-red-600 text-white hover:bg-red-700"
    };
    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-sm gap-2",
      lg: "h-10 px-5 text-sm gap-2"
    };
    $$renderer2.push(`<button${attr("type", type)}${attr("disabled", disabled || loading, true)}${attr_class(`${stringify(base)} ${stringify(variants[variant])} ${stringify(sizes[size])} ${stringify(cls)}`)}>`);
    if (loading) {
      $$renderer2.push("<!--[0-->");
      Spinner($$renderer2, { size: "sm" });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    children?.($$renderer2);
    $$renderer2.push(`<!----></button>`);
  });
}
export {
  Button as B
};
