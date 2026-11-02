"""Real HTTP/PostgreSQL/Playwright smoke test. Run with the API and fixture server already running.
Creates a dedicated random verification account and removes only its verification projects afterward.
"""
import json
import sys
import time
import urllib.request
import urllib.error
import uuid
import http.cookiejar
import secrets

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5198"
COOKIES = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(COOKIES))
CSRF = None

def authenticate():
    request('GET', '/api/auth/session')
    request('POST', '/api/auth/register', {'name': 'Smoke verification', 'username': 'authcheck_' + secrets.token_hex(6), 'password': secrets.token_urlsafe(18)})

def request(method, path, body=None, expected=200):
    global CSRF
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if CSRF: headers['X-CSRF-TOKEN'] = CSRF
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    try:
        with OPENER.open(req, timeout=160) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    assert status == expected, f"{method} {path}: expected {expected}, received {status}: {raw.decode()[:400]}"
    if not raw:
        return None
    try:
        result = json.loads(raw)
        if isinstance(result, dict) and 'csrfToken' in result: CSRF = result['csrfToken']
        return result
    except json.JSONDecodeError:
        return raw.decode()

def main():
    request("GET", "/health")
    authenticate()
    workspace = request("GET", "/api/workspaces")[0]["id"]
    projects = []
    def project(name):
        item = request("POST", f"/api/workspaces/{workspace}/projects", {"name": f"API verification {uuid.uuid4().hex[:8]} {name}", "baseUrl": "http://127.0.0.1:4321"}, 201)
        projects.append(item["id"])
        assert "runCount" in item and "systemCount" in item
        return item["id"]
    try:
        pid, other = project("main"), project("other")
        path = f"/api/projects/{pid}"
        assert set(request("GET", path + "/explorer")["folders"]) >= {"auth", "modules"}
        request("POST", path + "/folders", {"path": "scratch/nested"})
        file = request("POST", path + "/files", {"name": "draft", "folder": "scratch/nested"})
        fid = file["id"]
        request("PATCH", path + f"/files/{fid}/rename", {"name": "renamed"})
        request("PATCH", path + "/folders/rename", {"path": "scratch/nested", "name": "renamed"})
        request("PATCH", path + "/folders/move", {"path": "scratch/renamed", "targetFolder": "modules"})
        assert any(f["id"] == fid and f["path"] == "modules/renamed/renamed.axtest" for f in request("GET", path + "/explorer")["files"])
        request("POST", path + "/files", {"name": "renamed", "folder": "modules/renamed"}, 409)
        request("POST", path + "/folders", {"path": "../escape"}, 400)
        request("PATCH", path + "/folders/move", {"path": "modules/renamed", "targetFolder": "modules/renamed/child"}, 400)
        request("PUT", f"/api/projects/{other}/files/{fid}", {"content": "wrong project"}, 404)
        request("PUT", path + "/environments/staging", {"baseUrl": "http://127.0.0.1:4321", "useProductionFallback": False})
        assert any(e["name"] == "staging" and e["effectiveUrl"] == "http://127.0.0.1:4321" for e in request("GET", path + "/environments"))
        print("PASS persistent explorer operations, collisions, paths, project scoping, environments", flush=True)
        auth = request("POST", path + "/files", {"name": "standard-login", "folder": "auth"})
        login = 'AUTH standard-login\nSTEPS\n  navigate to /#/login\n  type "admin@test.com" in "Email address"\n  type "test123" in "Password"\n  click "Sign In"\nASSERT\n  assert url contains "#/budgets"'
        request("PUT", path + f'/files/{auth["id"]}', {"content": login})
        content = '---\ntitle: Backend verification\n---\nAUTH standard-login\nTEST "Baseline"\n ID baseline\n STEPS\n  navigate to /#/budgets\n ASSERT\n  assert "FY 2024 Budget" is_visible\nTEST "Intentional failure"\n ID failure\n DEPENDS ON "Baseline"\n ASSERT\n  assert "This element does not exist" is_visible'
        request("PUT", path + f"/files/{fid}", {"content": content})
        assert next(f for f in request("GET", path + "/explorer")["files"] if f["id"] == fid)["content"] == content
        payload = {"fileId": fid, "fileName": "ignored-client-name", "content": content, "environment": "staging", "testNames": ["Baseline"]}
        result = request("POST", path + "/runs/file", payload)
        assert result["status"] == "passed" and result["passedTests"] == 1, result
        assert any("Sign In" in step["raw"] for step in result["results"][0]["steps"]), "Application login did not execute"
        passed_id = result["id"]
        payload["testNames"] = ["Intentional failure"]
        result = request("POST", path + "/runs/file?wait=false", payload, 202)
        deadline = time.time() + 140
        while result["status"] in ["pending", "running"] and time.time() < deadline:
            time.sleep(1)
            result = request("GET", path + f'/runs/{result["id"]}')
        assert result["status"] == "failed" and result["passedTests"] == 1 and result["failedTests"] == 1, result
        failure = next(r for r in result["results"] if r["status"] == "failed")
        assert failure["errorMessage"] and failure["screenshotUrl"], failure
        with OPENER.open(BASE + failure["screenshotUrl"]) as response:
            assert response.read(8) == b"\x89PNG\r\n\x1a\n"
        assert request("GET", path + f"/runs/{passed_id}")["status"] == "passed"
        assert len(request("GET", path + "/runs")) == 2
        request("GET", f'/api/projects/{other}/runs/{passed_id}', expected=404)
        payload["content"] = 'TEST "Invalid"\nSTEPS\nmagic "Unknown"'
        request("POST", path + "/runs/file", payload, 400)
        print("PASS real application login, pass/fail execution, dependency inclusion, async polling, screenshots, persisted history", flush=True)
        seed = '---\ntitle: Generate\n---\nRULES\n field "Email address" is required\nTEST "Seed"\n ID stable-seed\n TAG seed\n STEPS\n  type "admin@test.com" in "Email address"\n ASSERT\n  assert "Save" is_visible'
        generated = request("POST", path + "/generate-tests", {"fileId": fid, "content": seed, "seedTestId": "stable-seed"})
        assert generated["generatedCount"] > 0 and 'type ""' in generated["content"]
        again = request("POST", path + "/generate-tests", {"fileId": fid, "content": generated["content"], "seedTestId": "stable-seed"})
        assert again["generatedCount"] == 0
        request("POST", path + "/tutorial/reset-lesson", {"lessonId": "tutorial-1-create-file"}, 400)
        before = request("GET", f"/api/workspaces/{workspace}/projects")
        if not any(p["name"] == "TaskFlow Tutorial (Sandbox)" for p in before):
            sandbox = request("POST", f"/api/workspaces/{workspace}/tutorial-sandbox")["project"]
            projects.append(sandbox["id"])
            assert request("POST", f"/api/workspaces/{workspace}/tutorial-sandbox")["project"]["id"] == sandbox["id"]
            reset = request("POST", f'/api/projects/{sandbox["id"]}/tutorial/reset-lesson', {"lessonId": "tutorial-4-generate"})
            assert 'TAG seed' in reset["content"] and reset["path"] == "modules/todos/add-task.axtest"
            request("POST", f'/api/projects/{sandbox["id"]}/tutorial/reset-lesson', {"lessonId": "unknown"}, 400)
        print("PASS generation mutates inputs, repeat generation is idempotent, tutorial fork and reset", flush=True)
        request("DELETE", path + "/folders", {"path": "modules/renamed"})
        assert all(f["id"] != fid for f in request("GET", path + "/explorer")["files"])
        print("PASS folder deletion", flush=True)
    finally:
        for pid in reversed(projects):
            request("POST", f"/api/workspaces/{workspace}/projects/{pid}/archive", expected=204)
            request("DELETE", f"/api/workspaces/{workspace}/projects/{pid}", expected=204)

if __name__ == "__main__":
    main()
