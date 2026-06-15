import { a as attr_class, s as stringify } from "./index.js";
function Spinner($$renderer, $$props) {
  let { size = "md", class: cls = "" } = $$props;
  const sizes = { sm: "size-3.5", md: "size-5", lg: "size-6" };
  $$renderer.push(`<svg${attr_class(`animate-spin ${stringify(sizes[size])} ${stringify(cls)}`)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`);
}
export {
  Spinner as S
};
