import { e as escape_html, f as bind_props, c as store_get, u as unsubscribe_stores } from "../../../../chunks/index.js";
import { w as writable, g as get } from "../../../../chunks/index2.js";
import { D as DEV } from "../../../../chunks/uneval.js";
import { m as mockFiles, a as mockProjects, b as mockRunDetail, c as mockRuns, d as mockWorkspaces, e as mockUser, f as mockToken } from "../../../../chunks/data.js";
import { B as Button } from "../../../../chunks/Button.js";
import { I as Input } from "../../../../chunks/Input.js";
import { S as Spinner } from "../../../../chunks/Spinner.js";
const initial = DEV;
const useMock = writable(initial);
const BASE = "http://localhost:5000";
async function request(path, options) {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("axtest_token") : null;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...token ? { Authorization: `Bearer ${token}` } : {},
      ...options?.headers
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}
const login$1 = (data) => request("/api/auth/login", { method: "POST", body: JSON.stringify(data) });
const register$1 = (data) => request("/api/auth/register", { method: "POST", body: JSON.stringify(data) });
const getWorkspaces$1 = () => request("/api/workspaces");
const createWorkspace$1 = (name) => request("/api/workspaces", { method: "POST", body: JSON.stringify({ name }) });
const getProjects$1 = (workspaceId) => request(`/api/workspaces/${workspaceId}/projects`);
const createProject$1 = (workspaceId, data) => request(`/api/workspaces/${workspaceId}/projects`, {
  method: "POST",
  body: JSON.stringify(data)
});
const getRuns$1 = (projectId, page = 1) => request(`/api/projects/${projectId}/runs?page=${page}`);
const getRun$1 = (projectId, id) => request(`/api/projects/${projectId}/runs/${id}`);
const getFiles$1 = (projectId) => request(`/api/projects/${projectId}/files`);
const saveFile$1 = (projectId, file) => request(`/api/projects/${projectId}/files/${file.id}`, {
  method: "PUT",
  body: JSON.stringify(file)
});
const createFile$1 = (projectId, name) => request(`/api/projects/${projectId}/files`, {
  method: "POST",
  body: JSON.stringify({ name })
});
const real = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createFile: createFile$1,
  createProject: createProject$1,
  createWorkspace: createWorkspace$1,
  getFiles: getFiles$1,
  getProjects: getProjects$1,
  getRun: getRun$1,
  getRuns: getRuns$1,
  getWorkspaces: getWorkspaces$1,
  login: login$1,
  register: register$1,
  saveFile: saveFile$1
}, Symbol.toStringTag, { value: "Module" }));
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const login = async (_data) => {
  await delay();
  return { token: mockToken, user: mockUser };
};
const register = async (_data) => {
  await delay();
  return { token: mockToken, user: mockUser };
};
const getWorkspaces = async () => {
  await delay();
  return mockWorkspaces;
};
const createWorkspace = async (name) => {
  await delay();
  return { id: 99, name, memberCount: 1, projectCount: 0, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
};
const getProjects = async (_workspaceId) => {
  await delay();
  return mockProjects;
};
const createProject = async (_workspaceId, data) => {
  await delay();
  return {
    id: 99,
    name: data.name,
    baseUrl: data.baseUrl ?? null,
    description: data.description ?? null,
    runCount: 0,
    systemCount: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
};
const getRuns = async (_projectId, _page2 = 1) => {
  await delay();
  return mockRuns;
};
const getRun = async (_projectId, id) => {
  await delay();
  return id === mockRunDetail.id ? mockRunDetail : { ...mockRunDetail, id };
};
const getFiles = async (_projectId) => {
  await delay(150);
  return mockFiles;
};
const saveFile = async (_projectId, file) => {
  await delay(200);
  return { ...file, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
};
const createFile = async (_projectId, name) => {
  await delay(200);
  const safeName = name.endsWith(".axtest") ? name : `${name}.axtest`;
  return {
    id: `file-${Date.now()}`,
    name: safeName,
    path: `/${safeName}`,
    content: `# ${safeName}

navigate https://example.com
assert title contains "Example Domain"
`,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
};
const mock = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createFile,
  createProject,
  createWorkspace,
  getFiles,
  getProjects,
  getRun,
  getRuns,
  getWorkspaces,
  login,
  register,
  saveFile
}, Symbol.toStringTag, { value: "Module" }));
function api() {
  return get(useMock) ? mock : real;
}
const currentWorkspace = writable(null);
function SlidePanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { open = false, title = "", children } = $$props;
    if (open) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="fixed inset-0 bg-black/25 z-40" role="presentation"></div> <div class="fixed right-0 top-0 bottom-0 w-[400px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col"><div class="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0"><p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">${escape_html(title)}</p> <button aria-label="Close panel" class="size-7 rounded-md flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"><svg class="size-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button></div> <div class="flex-1 overflow-y-auto">`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { open });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let projects = [];
    let showPanel = false;
    let creating = false;
    let formError = "";
    let newName = "";
    let newUrl = "";
    let newDesc = "";
    async function createProject2() {
      const ws = store_get($$store_subs ??= {}, "$currentWorkspace", currentWorkspace);
      if (!ws || !newName.trim()) return;
      creating = true;
      formError = "";
      try {
        const p = await api().createProject(ws.id, {
          name: newName.trim(),
          baseUrl: newUrl.trim() || void 0,
          description: newDesc.trim() || void 0
        });
        projects = [p, ...projects];
        showPanel = false;
        newName = newUrl = newDesc = "";
      } catch (err) {
        formError = err instanceof Error ? err.message : "Failed to create project";
      } finally {
        creating = false;
      }
    }
    function closePanel() {
      showPanel = false;
      newName = newUrl = newDesc = formError = "";
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="flex-1 overflow-auto"><div class="px-5 py-4">`);
      {
        $$renderer3.push("<!--[0-->");
        $$renderer3.push(`<div class="flex items-center justify-center py-16">`);
        Spinner($$renderer3, { size: "lg", class: "text-amber-500" });
        $$renderer3.push(`<!----></div>`);
      }
      $$renderer3.push(`<!--]--></div></div> `);
      SlidePanel($$renderer3, {
        title: "New Project",
        get open() {
          return showPanel;
        },
        set open($$value) {
          showPanel = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<div class="p-5 space-y-4"><div class="space-y-3">`);
          Input($$renderer4, {
            label: "Project name",
            placeholder: "e.g. Students Portal",
            required: true,
            get value() {
              return newName;
            },
            set value($$value) {
              newName = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          Input($$renderer4, {
            label: "Base URL",
            placeholder: "https://portal.example.com",
            type: "url",
            get value() {
              return newUrl;
            },
            set value($$value) {
              newUrl = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----> `);
          Input($$renderer4, {
            label: "Description",
            placeholder: "What does this project test?",
            get value() {
              return newDesc;
            },
            set value($$value) {
              newDesc = $$value;
              $$settled = false;
            }
          });
          $$renderer4.push(`<!----></div> `);
          if (formError) {
            $$renderer4.push("<!--[0-->");
            $$renderer4.push(`<p class="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">${escape_html(formError)}</p>`);
          } else {
            $$renderer4.push("<!--[-1-->");
          }
          $$renderer4.push(`<!--]--> <div class="pt-2 border-t border-zinc-100 flex gap-2">`);
          Button($$renderer4, {
            onclick: createProject2,
            loading: creating,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Create Project`);
            }
          });
          $$renderer4.push(`<!----> `);
          Button($$renderer4, {
            variant: "secondary",
            onclick: closePanel,
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->Cancel`);
            }
          });
          $$renderer4.push(`<!----></div> <div class="rounded-lg bg-zinc-50 border border-zinc-200 p-4"><p class="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">What's a project?</p> <p class="text-xs text-zinc-500 leading-relaxed">A project maps to one web application. Inside each project you'll create test suites
        that run against the base URL you specify here.</p></div></div>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
