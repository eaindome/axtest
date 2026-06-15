import "../../../../chunks/data.js";
import "../../../../chunks/auth.js";
import { S as Spinner } from "../../../../chunks/Spinner.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center h-full">`);
      Spinner($$renderer2, { size: "lg", class: "text-amber-500" });
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
