"""Exercise real process timeout, persistence after restart, interrupted-run recovery, and production bypass guard.
Requires the API build, core build, configured PostgreSQL, and fixture server. Owns only its API process on port 5199.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.error
import uuid
import backend_smoke as api

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "apps/api"
DLL = APP / "bin/Debug/net9.0/Axtest.Api.dll"
api.BASE = "http://127.0.0.1:5199"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--browser", help="Optional existing Chromium executable; otherwise use Playwright's installed browser")
    args = parser.parse_args()
    process = None
    log = tempfile.TemporaryFile(mode="w+")
    projects = []
    def stop():
        nonlocal process
        if process and process.poll() is None:
            process.terminate()
            process.wait(timeout=15)
        process = None
    def start():
        nonlocal process
        command = ["dotnet", str(DLL), "--environment", "Development", "--urls", api.BASE,
            "--Runner:TimeoutSeconds", "5", "--Logging:LogLevel:Default", "Warning"]
        if args.browser:
            command.extend(["--Runner:BrowserExecutablePath", args.browser])
        process = subprocess.Popen(command, cwd=APP, stdout=log, stderr=log,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        deadline = time.time() + 90
        while time.time() < deadline:
            if process.poll() is not None:
                raise AssertionError("Lifecycle API exited before readiness.")
            try:
                api.request("GET", "/health")
                return
            except (OSError, urllib.error.URLError):
                time.sleep(.5)
        raise AssertionError("Lifecycle API did not become ready.")
    try:
        start()
        api.request('GET', '/api/dev/session', expected=404)
        api.request('GET', '/api/workspaces', expected=401)
        api.authenticate()
        print('PASS removed bypass returns 404 and anonymous workspace access is denied', flush=True)
        workspace = api.request("GET", "/api/workspaces")[0]["id"]
        project = api.request("POST", f"/api/workspaces/{workspace}/projects", {"name": "Lifecycle verification " + uuid.uuid4().hex[:8], "baseUrl": "http://127.0.0.1:4321"}, 201)
        pid = project["id"]
        projects.append((workspace, pid))
        file = api.request("POST", f"/api/projects/{pid}/files", {"name": "timeout", "folder": "modules"})
        content = 'TEST "Timeout recovery"\nID timeout-test\nSTEPS\n navigate to /\n wait for "Never appears" to appear\nASSERT\n assert "Never appears" is_visible'
        api.request("PUT", f'/api/projects/{pid}/files/{file["id"]}', {"content": content})
        payload = {"fileId": file["id"], "content": content, "environment": "production"}
        result = api.request("POST", f"/api/projects/{pid}/runs/file", payload)
        assert result["status"] == "failed" and result["failedTests"] == 1 and result["errorMessage"], result
        assert len(result["results"]) == 1 and result["results"][0]["errorMessage"], result
        run_id = result["id"]
        stop()
        start()
        persisted = api.request("GET", f"/api/projects/{pid}/runs/{run_id}")
        assert persisted["errorMessage"] == result["errorMessage"] and persisted["results"][0]["testId"] == "timeout-test"
        assert next(f for f in api.request("GET", f"/api/projects/{pid}/explorer")["files"] if f["id"] == file["id"])["content"] == content
        print("PASS timeout is persisted as a visible failure; files and results survive restart", flush=True)
        queued = api.request("POST", f"/api/projects/{pid}/runs/file?wait=false", payload, 202)
        deadline = time.time() + 30
        while time.time() < deadline:
            current = api.request("GET", f'/api/projects/{pid}/runs/{queued["id"]}')
            if current["status"] == "running":
                break
            time.sleep(.2)
        else:
            raise AssertionError("Run never entered running state.")
        stop()
        start()
        recovered = api.request("GET", f'/api/projects/{pid}/runs/{queued["id"]}')
        assert recovered["status"] == "failed" and "restart" in recovered["errorMessage"], recovered
        print("PASS interrupted run marked failed without automatic replay", flush=True)
    finally:
        if process and process.poll() is None:
            for workspace, pid in projects:
                api.request("POST", f"/api/workspaces/{workspace}/projects/{pid}/archive", expected=204)
                api.request("DELETE", f"/api/workspaces/{workspace}/projects/{pid}", expected=204)
        stop()
        log.close()

if __name__ == "__main__":
    main()
