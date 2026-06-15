import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/data.js";
import "../../../../chunks/auth.js";
import { C as Card } from "../../../../chunks/Card.js";
import { I as Input } from "../../../../chunks/Input.js";
import { B as Button } from "../../../../chunks/Button.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let name = "";
    let email = "";
    let password = "";
    let loading = false;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      Card($$renderer3, {
        class: "w-full max-w-sm p-8",
        children: ($$renderer4) => {
          $$renderer4.push(`<h2 class="text-xl font-semibold text-zinc-900 mb-1">Create account</h2> <p class="text-sm text-zinc-500 mb-6">Start testing in minutes</p> <form class="space-y-4">`);
          Input($$renderer4, {
            label: "Full name",
            placeholder: "Ekow Indome",
            required: true,
            autocomplete: "name",
            get value() {
              return name;
            },
            set value($$value) {
              name = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          Input($$renderer4, {
            label: "Email",
            type: "email",
            placeholder: "you@example.com",
            required: true,
            autocomplete: "email",
            get value() {
              return email;
            },
            set value($$value) {
              email = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          Input($$renderer4, {
            label: "Password",
            type: "password",
            placeholder: "Min 8 characters",
            required: true,
            autocomplete: "new-password",
            hint: "At least 8 characters",
            get value() {
              return password;
            },
            set value($$value) {
              password = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> `);
          Button($$renderer4, {
            type: "submit",
            loading,
            class: "w-full mt-2",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Create account`);
            }
          });
          $$renderer4.push(`<!----></form> <p class="text-sm text-zinc-500 text-center mt-6">Already have an account?  <a href="/login" class="text-amber-600 font-medium hover:text-amber-700">Sign in</a></p>`);
        }
      });
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  _page as default
};
