import{g as l}from"./95CQaKvR.js";import{u as p}from"./BbL1Nmtu.js";const m="http://localhost:5000";async function s(e,t){const i=typeof localStorage<"u"?localStorage.getItem("axtest_token"):null,n=await fetch(`${m}${e}`,{...t,headers:{"Content-Type":"application/json",...i?{Authorization:`Bearer ${i}`}:{},...t==null?void 0:t.headers}});if(!n.ok){const u=await n.text().catch(()=>n.statusText);throw new Error(u||`HTTP ${n.status}`)}return n.json()}const g=e=>s("/api/auth/login",{method:"POST",body:JSON.stringify(e)}),S=e=>s("/api/auth/register",{method:"POST",body:JSON.stringify(e)}),T=()=>s("/api/workspaces"),y=e=>s("/api/workspaces",{method:"POST",body:JSON.stringify({name:e})}),b=e=>s(`/api/workspaces/${e}/projects`),f=(e,t)=>s(`/api/workspaces/${e}/projects`,{method:"POST",body:JSON.stringify(t)}),v=(e,t=1)=>s(`/api/projects/${e}/runs?page=${t}`),w=(e,t)=>s(`/api/projects/${e}/runs/${t}`),A=e=>s(`/api/projects/${e}/files`),k=(e,t)=>s(`/api/projects/${e}/files/${t.id}`,{method:"PUT",body:JSON.stringify(t)}),E=(e,t)=>s(`/api/projects/${e}/files`,{method:"POST",body:JSON.stringify({name:t})}),h=Object.freeze(Object.defineProperty({__proto__:null,createFile:E,createProject:f,createWorkspace:y,getFiles:A,getProjects:b,getRun:w,getRuns:v,getWorkspaces:T,login:g,register:S,saveFile:k},Symbol.toStringTag,{value:"Module"})),r={id:1,name:"Ekow Indome",email:"ekow@ssmas.com"},d="mock_jwt_token_dev_only",R=[{id:1,name:"SSMAS",memberCount:3,projectCount:2,createdAt:"2025-01-10T08:00:00Z"}],_=[{id:1,name:"Students Portal",baseUrl:"https://portal.ssmas.com",description:"Student-facing portal for finance, discounts, and repayments",runCount:24,systemCount:5,createdAt:"2025-01-10T08:00:00Z",updatedAt:"2025-06-10T14:30:00Z"},{id:2,name:"Admin Dashboard",baseUrl:"https://admin.ssmas.com",description:"Internal admin panel for budget management and reporting",runCount:12,systemCount:3,createdAt:"2025-02-01T09:00:00Z",updatedAt:"2025-06-08T11:00:00Z"}],c=[{id:1,status:"passed",environment:"staging",totalTests:38,passedTests:38,failedTests:0,durationMs:27450,suiteName:"Full Regression",triggeredBy:"ekow@ssmas.com",startedAt:"2025-06-15T09:00:00Z",completedAt:"2025-06-15T09:00:27Z"},{id:2,status:"failed",environment:"staging",totalTests:38,passedTests:35,failedTests:3,durationMs:31200,suiteName:"Full Regression",triggeredBy:"ci/github-actions",startedAt:"2025-06-14T14:00:00Z",completedAt:"2025-06-14T14:00:31Z"},{id:3,status:"passed",environment:"production",totalTests:12,passedTests:12,failedTests:0,durationMs:8900,suiteName:"Module 05 — Budget Creation",triggeredBy:"ekow@ssmas.com",startedAt:"2025-06-13T16:30:00Z",completedAt:"2025-06-13T16:30:09Z"},{id:4,status:"failed",environment:"staging",totalTests:8,passedTests:5,failedTests:3,durationMs:12400,suiteName:"Module 31 — Student Discounts",triggeredBy:"ekow@ssmas.com",startedAt:"2025-06-12T10:00:00Z",completedAt:"2025-06-12T10:00:12Z"},{id:5,status:"passed",environment:"staging",totalTests:38,passedTests:37,failedTests:1,durationMs:29100,suiteName:"Full Regression",triggeredBy:"ci/github-actions",startedAt:"2025-06-11T09:00:00Z",completedAt:"2025-06-11T09:00:29Z"},{id:6,status:"passed",environment:"production",totalTests:38,passedTests:38,failedTests:0,durationMs:26800,suiteName:"Full Regression",triggeredBy:"ekow@ssmas.com",startedAt:"2025-06-10T16:00:00Z",completedAt:"2025-06-10T16:00:27Z"}],o={...c[1],results:[{id:1,testId:"mod05-tc01",testName:"Create standard budget",status:"passed",durationMs:1200,errorMessage:null,failedStep:null,order:1},{id:2,testId:"mod05-tc02",testName:"Create budget with sub-items",status:"passed",durationMs:1850,errorMessage:null,failedStep:null,order:2},{id:3,testId:"mod05-tc03",testName:"Edit existing budget line",status:"passed",durationMs:980,errorMessage:null,failedStep:null,order:3},{id:4,testId:"mod06-tc01",testName:"Submit budget for review",status:"passed",durationMs:1400,errorMessage:null,failedStep:null,order:4},{id:5,testId:"mod06-tc02",testName:"Approve budget as reviewer",status:"passed",durationMs:1100,errorMessage:null,failedStep:null,order:5},{id:6,testId:"mod06-tc03",testName:"Reject budget with comment",status:"passed",durationMs:1300,errorMessage:null,failedStep:null,order:6},{id:7,testId:"mod31-tc01",testName:"Apply discount to student account",status:"failed",durationMs:3200,errorMessage:'Element not found: "Apply Discount" button',failedStep:'click "Apply Discount"',order:7},{id:8,testId:"mod31-tc02",testName:"View discount history",status:"failed",durationMs:2100,errorMessage:"Expected modal to be visible but it was not",failedStep:'assert modal "Discount History" is_visible',order:8},{id:9,testId:"mod31-tc03",testName:"Remove applied discount",status:"failed",durationMs:1800,errorMessage:'Element not found: "Remove" in row "20% Early Payment"',failedStep:'click "Remove" in row "20% Early Payment"',order:9},{id:10,testId:"mod32-tc01",testName:"Record student repayment",status:"passed",durationMs:1600,errorMessage:null,failedStep:null,order:10},{id:11,testId:"mod32-tc02",testName:"View repayment schedule",status:"passed",durationMs:900,errorMessage:null,failedStep:null,order:11},{id:12,testId:"mod33-tc01",testName:"Process full refund",status:"passed",durationMs:2200,errorMessage:null,failedStep:null,order:12}]},M=[{id:"f0",name:"standard-login.axtest",path:"auth/standard-login.axtest",updatedAt:"2025-06-10T08:00:00Z",content:`AUTH standard-login

STEPS
  navigate to "/login"
  type "admin@example.com" in "Email"
  type "password123" in "Password"
  click "Login"

ASSERT
  assert "Dashboard" is_visible`},{id:"f1",name:"mod05-budget.axtest",path:"modules/mod05-budget.axtest",updatedAt:"2025-06-15T09:00:00Z",content:`---
title: Module 05 — Budget Creation
base_url: https://portal.ssmas.com
---

AUTH standard-login

TEST "Create standard budget"
  STEPS
    navigate to /budget
    click "New Budget"
    type "Annual Operating Budget 2025" in "Budget Name"
    select "Operating" in "Budget Type"
    click "Save"
  ASSERT
    assert "Budget saved successfully" is_visible
    assert url contains /budget/

TEST "Create budget with sub-items"
  STEPS
    navigate to /budget
    click "New Budget"
    type "Capital Expenditure Q1" in "Budget Name"
    click "Add Line Item"
    type "Office Equipment" in "Item Description"
    type "5000" in "Amount"
    click "Save"
  ASSERT
    assert "Budget saved successfully" is_visible
    assert "Office Equipment" is_visible

TEST "Edit existing budget line"
  STEPS
    navigate to /budget
    click "Annual Operating Budget 2025"
    click "Edit" in row "Office Supplies"
    clear "Amount"
    type "3500" in "Amount"
    click "Update"
  ASSERT
    assert "Budget updated" is_visible`},{id:"f2",name:"mod06-review.axtest",path:"modules/mod06-review.axtest",updatedAt:"2025-06-14T14:00:00Z",content:`---
title: Module 06 — Budget Review
base_url: https://portal.ssmas.com
---

AUTH standard-login

TEST "Submit budget for review"
  DEPENDS ON "Create standard budget"
  STEPS
    navigate to /budget
    click "Annual Operating Budget 2025" in row
    click "Submit for Review"
  ASSERT
    assert modal "Confirm Submission" is_visible
    assert "Submit" is_enabled

TEST "Approve budget as reviewer"
  STEPS
    navigate to /budget/review
    click "Annual Operating Budget 2025" in row
    click "Approve"
    type "Looks good, approved." in "Reviewer Comment"
    click "Confirm Approval"
  ASSERT
    assert "Budget approved" is_visible
    assert "Approved" is_visible in row "Annual Operating Budget 2025"

TEST "Reject budget with comment"
  STEPS
    navigate to /budget/review
    click "Capital Expenditure Q1" in row
    click "Reject"
    type "Amounts need revision before approval." in "Rejection Reason"
    click "Confirm Rejection"
  ASSERT
    assert "Budget rejected" is_visible`},{id:"f3",name:"mod31-discounts.axtest",path:"modules/mod31-discounts.axtest",updatedAt:"2025-06-12T10:00:00Z",content:`---
title: Module 31 — Student Discounts
base_url: https://portal.ssmas.com
---

AUTH admin-login

TEST "Apply discount to student account"
  STEPS
    navigate to /students
    type "S001" in "Search Students"
    click "Search"
    click "Apply Discount" in row "John Mensah"
    select "20% Early Payment" in "Discount Type"
    click "Apply"
  ASSERT
    assert "Discount applied successfully" is_visible

TEST "View discount history"
  STEPS
    navigate to /students
    click "John Mensah" in row
    click "Discount History"
  ASSERT
    assert modal "Discount History" is_visible
    assert "20% Early Payment" is_visible

TEST "Remove applied discount"
  STEPS
    navigate to /students
    click "John Mensah" in row
    click "Discount History"
    click "Remove" in row "20% Early Payment"
    click "Confirm"
  ASSERT
    assert "Discount removed" is_visible`},{id:"f4",name:"mod32-repayments.axtest",path:"modules/mod32-repayments.axtest",updatedAt:"2025-06-11T09:00:00Z",content:`---
title: Module 32 — Repayments
base_url: https://portal.ssmas.com
---

AUTH standard-login

TEST "Record student repayment"
  STEPS
    navigate to /repayments
    click "New Repayment"
    type "S001" in "Student ID"
    type "500" in "Amount"
    select "Bank Transfer" in "Payment Method"
    click "Record Payment"
  ASSERT
    assert "Repayment recorded" is_visible

TEST "View repayment schedule"
  STEPS
    navigate to /repayments
    click "S001" in row
  ASSERT
    assert "Repayment Schedule" is_visible
    assert "500.00" is_visible`}],a=(e=350)=>new Promise(t=>setTimeout(t,e)),P=async e=>(await a(),{token:d,user:r}),j=async e=>(await a(),{token:d,user:r}),N=async()=>(await a(),R),I=async e=>(await a(),{id:99,name:e,memberCount:1,projectCount:0,createdAt:new Date().toISOString()}),O=async e=>(await a(),_),$=async(e,t)=>(await a(),{id:99,name:t.name,baseUrl:t.baseUrl??null,description:t.description??null,runCount:0,systemCount:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}),B=async(e,t=1)=>(await a(),c),D=async(e,t)=>(await a(),t===o.id?o:{...o,id:t}),x=async e=>(await a(150),M),C=async(e,t)=>(await a(200),{...t,updatedAt:new Date().toISOString()}),Z=async(e,t)=>{await a(200);const i=t.endsWith(".axtest")?t:`${t}.axtest`;return{id:`file-${Date.now()}`,name:i,path:`/${i}`,content:`# ${i}

navigate https://example.com
assert title contains "Example Domain"
`,updatedAt:new Date().toISOString()}},F=Object.freeze(Object.defineProperty({__proto__:null,createFile:Z,createProject:$,createWorkspace:I,getFiles:x,getProjects:O,getRun:D,getRuns:B,getWorkspaces:N,login:P,register:j,saveFile:C},Symbol.toStringTag,{value:"Module"}));function J(){return l(p)?F:h}export{J as a};
