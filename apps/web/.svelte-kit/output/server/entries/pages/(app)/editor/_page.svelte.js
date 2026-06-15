import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
import "../../../../chunks/data.js";
import { a as attr_class, s as stringify, b as attr, e as escape_html, c as store_get, d as ensure_array_like, u as unsubscribe_stores } from "../../../../chunks/index.js";
import { B as Button } from "../../../../chunks/Button.js";
import { w as writable } from "../../../../chunks/index2.js";
import { S as Spinner } from "../../../../chunks/Spinner.js";
import { Compartment } from "@codemirror/state";
import { ViewPlugin, Decoration } from "@codemirror/view";
import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
const stored = false;
const darkMode = writable(stored);
function Badge($$renderer, $$props) {
  let { variant = "neutral", class: cls = "", children } = $$props;
  const variants = {
    pass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    fail: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    running: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
    neutral: "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
  };
  $$renderer.push(`<span${attr_class(`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stringify(variants[variant])} ${stringify(cls)}`)}>`);
  children?.($$renderer);
  $$renderer.push(`<!----></span>`);
}
function makeStep(type = "click") {
  return { id: crypto.randomUUID(), type, target: "", value: "", context: "", assertion: "" };
}
function parseStep(line) {
  const s = makeStep();
  if (line.startsWith("navigate to ")) return { ...s, type: "navigate", target: line.slice(12).trim() };
  if (line.startsWith("click ")) {
    const rest = line.slice(6);
    const inRow = rest.match(/^"(.+)" in row "(.+)"$/);
    if (inRow) return { ...s, type: "click", target: inRow[1], context: inRow[2] };
    const inCtx = rest.match(/^"(.+)" in "(.+)"$/);
    if (inCtx) return { ...s, type: "click", target: inCtx[1], context: inCtx[2] };
    const simple = rest.match(/^"(.+)"$/);
    if (simple) return { ...s, type: "click", target: simple[1] };
    return { ...s, type: "click", target: rest };
  }
  if (line.startsWith("type ")) {
    const m = line.slice(5).match(/^"(.+)" in "(.+)"$/);
    if (m) return { ...s, type: "type", value: m[1], target: m[2] };
    return { ...s, type: "type", value: line.slice(5) };
  }
  if (line.startsWith("select ")) {
    const m = line.slice(7).match(/^"(.+)" in "(.+)"$/);
    if (m) return { ...s, type: "select", value: m[1], target: m[2] };
    return { ...s, type: "select", value: line.slice(7) };
  }
  if (line.startsWith("clear ")) return { ...s, type: "clear", target: line.slice(6).replace(/^"|"$/g, "") };
  if (line.startsWith("assert ")) return { ...s, type: "assert", assertion: line.slice(7) };
  return { ...s, type: "navigate", target: line };
}
function parseAxtest(content) {
  const result = { title: "", baseUrl: "", auth: "", tests: [] };
  const lines = content.split("\n");
  let i = 0;
  if (lines[i]?.trim() === "---") {
    i++;
    while (i < lines.length && lines[i].trim() !== "---") {
      const t = lines[i].trim();
      if (t.startsWith("title:")) result.title = t.slice(6).trim();
      if (t.startsWith("base_url:")) result.baseUrl = t.slice(9).trim();
      i++;
    }
    i++;
  }
  let cur = null;
  let section = null;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t.startsWith("AUTH ")) result.auth = t.slice(5).trim();
    else if (t.startsWith("TEST ")) {
      cur = { id: crypto.randomUUID(), name: t.slice(5).replace(/^"|"$/g, ""), dependsOn: "", steps: [], asserts: [] };
      result.tests.push(cur);
      section = null;
    } else if (t === "STEPS") {
      section = "steps";
    } else if (t === "ASSERT") {
      section = "asserts";
    } else if (t.startsWith("DEPENDS ON ") && cur) cur.dependsOn = t.slice(11).replace(/^"|"$/g, "");
    else if (t && cur && section) cur[section].push(parseStep(t));
    i++;
  }
  return result;
}
function EditorToolbar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let {
      projects,
      saving,
      running,
      environment,
      onSave,
      onRun,
      onEnvironmentChange
    } = $$props;
    const environments = ["staging", "production", "local"];
    $$renderer2.push(`<header class="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-sm"><div class="flex items-center gap-1.5 min-w-0 text-sm"><div class="relative"><button${attr("disabled", projects.length <= 1, true)} class="flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:cursor-default truncate max-w-[160px]"><span class="truncate">${escape_html("Editor")}</span> `);
    if (projects.length > 1) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<svg class="size-3 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"></path></svg>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></button> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="flex-1"></div> <button aria-label="Toggle dark mode" class="size-7 rounded-md flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">`);
    if (store_get($$store_subs ??= {}, "$darkMode", darkMode)) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"></path></svg>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"></path></svg>`);
    }
    $$renderer2.push(`<!--]--></button> `);
    $$renderer2.select(
      {
        value: environment,
        onchange: (e) => onEnvironmentChange(e.target.value),
        class: "h-7 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(environments);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let env = each_array_1[$$index_1];
          $$renderer3.option({ value: env }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(env)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(` <div class="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-white dark:bg-zinc-800"><button${attr_class(`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${"bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"}`)}>Code</button> <button${attr_class(`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${"text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"}`)}>Visual</button></div> `);
    Button($$renderer2, {
      variant: "secondary",
      size: "sm",
      onclick: onSave,
      loading: saving,
      disabled: true,
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->Save`);
      }
    });
    $$renderer2.push(`<!----> `);
    Button($$renderer2, {
      size: "sm",
      onclick: onRun,
      loading: running,
      children: ($$renderer3) => {
        $$renderer3.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg> Run`);
      }
    });
    $$renderer2.push(`<!----></header>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function FileTree($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<aside class="w-52 shrink-0 flex flex-col border-r border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden"><div class="px-3 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0"><p class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Explorer</p> <button class="size-6 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="New file"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-3.5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"></path></svg></button></div> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex items-center justify-center py-10">`);
      Spinner($$renderer2, { size: "sm", class: "text-amber-500" });
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]--></aside>`);
  });
}
const KEYWORDS = /* @__PURE__ */ new Set([
  "TEST",
  "STEPS",
  "ASSERT",
  "AUTH",
  "MODULE",
  "DEPENDS",
  "ON"
]);
const ACTIONS = /* @__PURE__ */ new Set([
  "navigate",
  "click",
  "type",
  "select",
  "clear",
  "assert",
  "check",
  "wait",
  "press",
  "upload",
  "confirm",
  "dismiss"
]);
const ASSERTIONS = /* @__PURE__ */ new Set([
  "is_visible",
  "is_not_visible",
  "is_enabled",
  "is_disabled",
  "contains",
  "equals",
  "does_not_equal",
  "shows"
]);
const STYLE_CLASSES = {
  keyword: "cm-ax-keyword",
  action: "cm-ax-action",
  string: "cm-ax-string",
  comment: "cm-ax-comment",
  meta: "cm-ax-meta",
  assertion: "cm-ax-assertion",
  separator: "cm-ax-separator"
};
function buildDecorations(view) {
  const decs = [];
  const doc = view.state.doc;
  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;
    if (text.trim() === "---") {
      decs.push(Decoration.mark({ class: STYLE_CLASSES.separator }).range(line.from, line.to));
      continue;
    }
    if (text.trim().startsWith("#")) {
      decs.push(Decoration.mark({ class: STYLE_CLASSES.comment }).range(line.from, line.to));
      continue;
    }
    const metaMatch = text.match(/^(title|base_url):\s*(.*)$/);
    if (metaMatch) {
      const keyEnd = line.from + metaMatch[1].length;
      decs.push(Decoration.mark({ class: STYLE_CLASSES.meta }).range(line.from, keyEnd));
      if (metaMatch[2]) {
        decs.push(Decoration.mark({ class: STYLE_CLASSES.string }).range(keyEnd + 2, line.to));
      }
      continue;
    }
    const tokens = [...text.matchAll(/\b([A-Z][A-Z_ ]*[A-Z]|[a-z_]+)\b|"[^"]*"|'[^']*'/g)];
    for (const m of tokens) {
      const start = line.from + m.index;
      const end = start + m[0].length;
      const tok = m[1] ?? m[0];
      if (m[0].startsWith('"') || m[0].startsWith("'")) {
        decs.push(Decoration.mark({ class: STYLE_CLASSES.string }).range(start, end));
      } else if (KEYWORDS.has(tok) || tok === "DEPENDS" && text.includes("DEPENDS ON")) {
        decs.push(Decoration.mark({ class: STYLE_CLASSES.keyword }).range(start, end));
      } else if (ACTIONS.has(tok)) {
        decs.push(Decoration.mark({ class: STYLE_CLASSES.action }).range(start, end));
      } else if (ASSERTIONS.has(tok) || tok.includes("_")) {
        decs.push(Decoration.mark({ class: STYLE_CLASSES.assertion }).range(start, end));
      }
    }
  }
  return Decoration.set(decs, true);
}
ViewPlugin.fromClass(
  class {
    decorations;
    constructor(view) {
      this.decorations = buildDecorations(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);
HighlightStyle.define([
  { tag: tags.keyword, color: "#7c3aed", fontWeight: "600" },
  { tag: tags.string, color: "#16a34a" },
  { tag: tags.comment, color: "#a1a1aa", fontStyle: "italic" }
]);
new Compartment();
function EditorOutline($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { parsed, runResult, selectedTestId } = $$props;
    function testStatus(testName) {
      return runResult?.results.find((r) => r.testName === testName);
    }
    function fmt(ms) {
      return ms < 1e3 ? `${ms}ms` : `${(ms / 1e3).toFixed(1)}s`;
    }
    $$renderer2.push(`<aside class="w-56 shrink-0 flex flex-col border-l border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden"><div class="px-3 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0"><p class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Outline</p></div> <div class="flex-1 overflow-y-auto panel-scroll svelte-1jmvm6t">`);
    if (!parsed || parsed.tests.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="px-3 py-6 text-xs text-zinc-400 text-center">No tests in file</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="py-1 px-1 space-y-0.5">`);
      if (parsed.title) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p class="px-2.5 py-1 text-[10px] text-zinc-400 truncate"${attr("title", parsed.title)}>${escape_html(parsed.title)}</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      const each_array = ensure_array_like(parsed.tests);
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        let test = each_array[i];
        const result = testStatus(test.name);
        $$renderer2.push(`<button${attr_class(`w-full flex items-start gap-2 px-2.5 py-2 rounded-md text-left transition-colors ${selectedTestId === test.id ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"}`)}><span class="text-[10px] font-mono text-zinc-400 mt-0.5 shrink-0 w-4">${escape_html(i + 1)}</span> <div class="flex-1 min-w-0"><p class="text-xs text-zinc-700 dark:text-zinc-300 leading-snug line-clamp-2">${escape_html(test.name)}</p> <p class="text-[10px] text-zinc-400 mt-0.5">${escape_html(test.steps.length)} steps · ${escape_html(test.asserts.length)} asserts</p></div> `);
        if (result) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span${attr_class(`size-2 rounded-full shrink-0 mt-1 ${result.status === "passed" ? "bg-emerald-500" : "bg-red-500"}`)}></span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="border-t border-zinc-200/80 dark:border-zinc-800 shrink-0"><div class="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800"><p class="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Last Run</p></div> <div class="px-3 py-3">`);
    if (runResult) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="space-y-2">`);
      Badge($$renderer2, {
        variant: runResult.status === "passed" ? "pass" : "fail",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->${escape_html(runResult.passedTests)}/${escape_html(runResult.totalTests)} passed`);
        }
      });
      $$renderer2.push(`<!----> <p class="text-[10px] text-zinc-400">${escape_html(fmt(runResult.durationMs))} · ${escape_html(runResult.environment)}</p> `);
      if (runResult.failedTests > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="space-y-1 mt-2"><!--[-->`);
        const each_array_1 = ensure_array_like(runResult.results.filter((r) => r.status === "failed").slice(0, 3));
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let r = each_array_1[$$index_1];
          $$renderer2.push(`<p class="text-[10px] text-red-600 dark:text-red-400 truncate"${attr("title", r.testName)}>${escape_html(r.testName)}</p>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<p class="text-xs text-zinc-400">No runs yet</p>`);
    }
    $$renderer2.push(`<!--]--></div></div></aside>`);
  });
}
function ResultsPanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let projects = [];
    let editorContent = "";
    let saving = false;
    let running = false;
    let runResult = null;
    let environment = "staging";
    let selectedTestId = null;
    async function saveFile() {
      return;
    }
    async function runTests() {
      return;
    }
    $$renderer2.push(`<div class="flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">`);
    EditorToolbar($$renderer2, {
      projects,
      saving,
      running,
      environment,
      onSave: saveFile,
      onRun: runTests,
      onEnvironmentChange: (env) => environment = env
    });
    $$renderer2.push(`<!----> <div class="flex flex-1 overflow-hidden min-h-0">`);
    FileTree($$renderer2);
    $$renderer2.push(`<!----> <div class="flex-1 flex flex-col min-w-0 overflow-hidden">`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="flex-1 flex items-center justify-center text-center p-8"><div><div class="size-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4"><svg class="size-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg></div> <p class="text-sm font-medium text-zinc-600 dark:text-zinc-400">Select a spec file to edit</p> <p class="text-xs text-zinc-400 mt-1">Choose from the explorer or create a new file</p></div></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    ResultsPanel($$renderer2);
    $$renderer2.push(`<!----></div> `);
    EditorOutline($$renderer2, {
      parsed: parseAxtest(editorContent),
      runResult,
      selectedTestId
    });
    $$renderer2.push(`<!----></div></div>`);
  });
}
export {
  _page as default
};
