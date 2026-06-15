import { a as attr_class, s as stringify } from "./index.js";
function Card($$renderer, $$props) {
  let { class: cls = "", children } = $$props;
  $$renderer.push(`<div${attr_class(`bg-white rounded-xl border border-zinc-200 shadow-sm ${stringify(cls)}`)}>`);
  children?.($$renderer);
  $$renderer.push(`<!----></div>`);
}
export {
  Card as C
};
