"""Live saved-account isolation and atomic suite submission checks. Owns only verification projects."""
import http.cookiejar
import json
import secrets
import time
import urllib.error
import urllib.request

BASE='http://localhost:5000'
class Client:
    def __init__(self):
        self.jar=http.cookiejar.CookieJar()
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf=None
    def call(self,method,path,body=None,expected=200):
        headers={'Content-Type':'application/json'}
        if self.csrf: headers['X-CSRF-TOKEN']=self.csrf
        req=urllib.request.Request(BASE+path,method=method,headers=headers,data=None if body is None else json.dumps(body).encode())
        try: response=self.opener.open(req,timeout=180)
        except urllib.error.HTTPError as error: response=error
        data=response.read()
        assert response.code==expected,f'{method} {path}: expected {expected}, got {response.code}'
        try: result=json.loads(data)
        except ValueError: result=None
        if isinstance(result,dict) and 'csrfToken' in result: self.csrf=result['csrfToken']
        return result
    def register(self):
        self.username='authcheck_'+secrets.token_hex(6)
        self.password=secrets.token_urlsafe(18)
        self.call('GET','/api/auth/session')
        self.call('POST','/api/auth/register',{'name':'Suite verification','username':self.username,'password':self.password})

owner,outsider,viewer=Client(),Client(),Client()
for client in [owner,outsider,viewer]: client.register()
workspace=owner.call('GET','/api/workspaces')[0]['id']
projects=[]
try:
    for name in ['suite verification','other scope']:
        projects.append(owner.call('POST',f'/api/workspaces/{workspace}/projects',{'name':name+' '+secrets.token_hex(3),'baseUrl':'http://localhost:5173'},201)['id'])
    project,other=projects
    files=[]
    sources=[
      'TEST "Account inputs"\nSTEPS\n navigate to "/login?mode=api"\n wait for "Username" to appear\n type "{{AXTEST_USERNAME}}" in "Username"\n type "{{AXTEST_PASSWORD}}" in "Password"\nASSERT\n assert "Username" equals "{{AXTEST_USERNAME}}"',
      'TEST "Public page"\nSTEPS\n navigate to "/login?mode=api"\n wait for "Username" to appear\nASSERT\n assert "Username" is_visible',
      'TEST "Evidence control"\nSTEPS\n navigate to "/login?mode=api"\n wait for "Username" to appear\nASSERT\n assert "INTENTIONALLY MISSING SUITE CONTROL" is_visible'
    ]
    for index,content in enumerate(sources):
        file=owner.call('POST',f'/api/projects/{project}/files',{'name':f'suite-{index}','folder':'modules'})
        owner.call('PUT',f'/api/projects/{project}/files/{file["id"]}',{'content':content})
        files.append(file['id'])
    other_file=owner.call('POST',f'/api/projects/{other}/files',{'name':'other','folder':'modules'})['id']
    values={'AXTEST_USERNAME':'target-'+secrets.token_hex(6),'AXTEST_PASSWORD':secrets.token_urlsafe(24)}
    account=owner.call('POST',f'/api/projects/{project}/test-accounts',{'name':'QA saved account','environment':'production','variables':values})
    metadata=owner.call('GET',f'/api/projects/{project}/test-accounts')
    assert metadata[0]['variableNames']==['AXTEST_PASSWORD','AXTEST_USERNAME']
    assert all(value not in json.dumps(metadata) for value in values.values())
    for method,path,body in [('GET',f'/api/projects/{project}/test-accounts',None),('POST',f'/api/projects/{project}/test-accounts',{'name':'blocked','environment':'production','variables':values}),('POST',f'/api/projects/{project}/runs/batch',{'environment':'production','files':[{'fileId':files[0]}]})]:
        outsider.call(method,path,body,404)
    owner.call('POST',f'/api/workspaces/{workspace}/members',{'username':viewer.username,'role':'Viewer'})
    viewer.call('GET',f'/api/projects/{project}/test-accounts')
    viewer.call('DELETE',f'/api/projects/{project}/test-accounts/{account["id"]}',expected=404)
    viewer.call('POST',f'/api/projects/{project}/runs/batch',{'environment':'production','files':[{'fileId':files[0]}]},404)
    base={'environment':'production','accountId':account['id']}
    owner.call('POST',f'/api/projects/{project}/runs/batch',{**base,'files':[{'fileId':files[0]},{'fileId':other_file}]},404)
    assert owner.call('GET',f'/api/projects/{project}/runs')==[], 'Invalid selection must not leave partially queued work.'
    owner.call('PUT',f'/api/projects/{project}/environments/staging',{'baseUrl':'http://localhost:5173','useProductionFallback':False})
    owner.call('POST',f'/api/projects/{project}/runs/batch',{**base,'environment':'staging','files':[{'fileId':files[0]}]},400)
    owner.call('POST',f'/api/projects/{other}/runs/batch',{**base,'files':[{'fileId':other_file}]},400)
    owner.call('POST',f'/api/projects/{project}/test-accounts',{'name':'Invalid variable','environment':'production','variables':{'NODE_OPTIONS':'blocked'}},400)
    owner.call('PUT',f'/api/workspaces/{workspace}/projects/{project}',{'name':'URL binding verification','baseUrl':'http://localhost:5173/changed'})
    owner.call('POST',f'/api/projects/{project}/runs/batch',{**base,'files':[{'fileId':files[0]}]},400)
    owner.call('PUT',f'/api/workspaces/{workspace}/projects/{project}',{'name':'suite verification','baseUrl':'http://localhost:5173'})
    owner.call('POST','/api/auth/logout',{})
    owner.call('POST','/api/auth/login',{'username':owner.username,'password':owner.password})
    assert owner.call('GET',f'/api/projects/{project}/test-accounts')[0]['id']==account['id']
    queued=owner.call('POST',f'/api/projects/{project}/runs/batch',{**base,'files':[{'fileId':file} for file in files]},202)
    assert len(queued)==3
    deadline=time.time()+180
    while time.time()<deadline:
        results=[owner.call('GET',f'/api/projects/{project}/runs/{run["id"]}') for run in queued]
        if all(run['status'] in ['passed','failed'] for run in results): break
        time.sleep(.5)
    diagnostics=json.dumps([(run['status'],run.get('errorMessage'),[(result.get('errorMessage'),result.get('failedStep')) for result in run['results']]) for run in results])
    for value in values.values(): diagnostics=diagnostics.replace(value,'[redacted]')
    assert [run['status'] for run in results]==['passed','passed','failed'], diagnostics
    assert all(value not in json.dumps(results) for value in values.values())
    assert not results[0]['results'][0]['screenshotUrl']
    assert results[2]['results'][0]['screenshotUrl'], 'An unused saved account must not suppress public failure evidence.'
    owner.call('DELETE',f'/api/projects/{project}/test-accounts/{account["id"]}',expected=204)
    assert owner.call('GET',f'/api/projects/{project}/test-accounts')==[]
    print('PASS saved-account privacy and persistence, user/role/environment/URL isolation, atomic batches, actual credential execution and public failure evidence')
finally:
    for project in projects:
        try:
            owner.call('POST',f'/api/workspaces/{workspace}/projects/{project}/archive',expected=204)
            owner.call('DELETE',f'/api/workspaces/{workspace}/projects/{project}',expected=204)
        except AssertionError: print('Verification project retained while its runs finish:',project)
