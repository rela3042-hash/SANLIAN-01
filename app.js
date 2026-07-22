
async function checkBackendVersion(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await fetch(API_URL,{method:"GET",cache:"no-store",signal:controller.signal});
    const json=await response.json();
    const version=json?.data?.version||"unknown";
    const el=document.querySelector("#backendVersion");
    if(el)el.textContent="Backend: "+version;
    return version;
  }catch(err){
    const el=document.querySelector("#backendVersion");
    if(el)el.textContent=err?.name==="AbortError"?"Backend: timeout":"Backend: connection error";
    return "error";
  }finally{
    clearTimeout(timer);
  }
}

window.SANLIAN_BUILD="7.1.4";console.log("SANLIAN BUILD 7.1.4 MANUAL AUTO BARCODE SKU loaded");

async function removeOldServiceWorkersAndCaches(){
  try{
    if("serviceWorker" in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    if("caches" in window){
      const names=await caches.keys();
      await Promise.all(names.map(n=>caches.delete(n)));
    }
  }catch(err){
    console.warn("Cache cleanup skipped:",err);
  }
}


/* ==================== v6.8.5 Stable: Lao only ==================== */
const LANG_KEY="sanlian_language";
let currentLanguage="lo";
function translateString(text){ return text; }
function applyLanguage(language="lo"){
  currentLanguage=language||"lo";
  localStorage.setItem(LANG_KEY,currentLanguage);
  document.documentElement.lang=currentLanguage;
}
function setupLanguageSwitcher(){ applyLanguage(currentLanguage); }
function initLanguage(){
  currentLanguage=localStorage.getItem(LANG_KEY)||"lo";
  applyLanguage(currentLanguage);
  setupLanguageSwitcher();
}
function t(text){ return text; }
/* ========================================================================== */


// v4.2.2 migration: remove all custom-logo data left by v4.3.
(function removeLegacyCustomLogo(){
  const legacyKeys=[
    "sanlian_custom_logo",
    "signshop_custom_logo",
    "custom_logo",
    "system_logo"
  ];
  legacyKeys.forEach(key=>localStorage.removeItem(key));
})();


let deferredInstallPrompt = null;
let serviceWorkerRegistration = null;

function isStandaloneMode(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function updateNetworkStatus(){
  const online=navigator.onLine,banner=$("#networkBanner");
  document.body.classList.toggle("is-offline",!online);
  if(!banner)return;
  banner.classList.remove("hidden","online");
  banner.textContent=online?"✅ Online — ເຊື່ອມຕໍ່ Internet ແລ້ວ":"⚠️ Offline — ຂໍ້ມູນ Google Sheets ຍັງບໍ່ສາມາດບັນທຶກ";
  if(online){
    banner.classList.add("online");
    setTimeout(()=>banner.classList.add("hidden"),2500);
  }
  const status=$("#pwaStatus");
  if(status)status.textContent=`Mode: ${isStandaloneMode()?"Installed App":"Browser"} | Network: ${online?"Online":"Offline"} | Service Worker: ${"serviceWorker" in navigator?"Supported":"Not supported"}`;
}
async function promptInstall(){
  if(isStandaloneMode()){toast("Application ຖືກຕິດຕັ້ງແລ້ວ");return}
  if(!deferredInstallPrompt){
    toast("ໃຊ້ Browser menu → Add to Home screen / Install app");
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
  $("#installAppBtn")?.classList.add("hidden");
}
async function registerPwa(){
  await removeOldServiceWorkersAndCaches();
  serviceWorkerRegistration=null;
}
async function clearOfflineCache(){
  if(!("caches" in window)){toast("Cache API not supported");return}
  const keys=await caches.keys();
  await Promise.all(keys.map(k=>caches.delete(k)));
  toast("Offline cache cleared");
}

const API_URL=(window.SIGNSHOP_CONFIG?.API_URL||"").trim();
let sessionToken=localStorage.getItem("signshop_session")||"";
const USER_CACHE_KEY="signshop_current_user";
let currentUser=(()=>{try{return JSON.parse(localStorage.getItem(USER_CACHE_KEY)||"null")}catch(_){return null}})();
let dashboardCharts={};
let html5QrScanner=null;
let activeScanTarget=null;
let availableCameras=[];
let activeCameraIndex=0;
let torchEnabled=false;
let usbScanBuffer='';
let usbScanTimer=null;
let state={products:[],categories:[],stockIn:[],stockOut:[],movements:[],users:[],auditLogs:[],backups:[]};
let auditPage=1;
let auditPageSize=10;
let categoryPage=1;
let categoryPageSize=10;
let movementPage=1;
let stockInPage=1;
let stockOutPage=1;
let stockInPageSize=10,stockOutPageSize=10;
// Pagination defaults. Product and Report rows can be changed by the user.
const PAGE_SIZE=10;
let productPage=1;
let productPageSize=10;
let reportPage=1;
let reportPageSize=10;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];


function normalizePrice(value){
  const n=Number(String(value ?? "").replace(/,/g,""));
  return Number.isFinite(n) && n>=0 ? n : 0;
}
function formatPrice(value){
  return normalizePrice(value).toLocaleString(undefined,{maximumFractionDigits:2});
}


function upsertLocalProduct(product){
  if(!product)return;
  const list=state.products||[];
  const i=list.findIndex(x=>String(x.product_id)===String(product.product_id));
  if(i>=0)list[i]={...list[i],...product};
  else list.unshift(product);
  state.products=list;
}
function renderProductRelated(){
  renderProducts();
  metrics();
  renderReport();
  if(typeof renderCharts==="function")renderCharts();
  else if(typeof renderDashboardCharts==="function")renderDashboardCharts();
}
function setFormSaving(form,isSaving){
  if(!form)return;
  const btn=form.querySelector('button[type="submit"]');
  if(btn){
    btn.disabled=!!isSaving;
    if(isSaving){
      btn.dataset.oldText=btn.textContent;
      btn.textContent="ກຳລັງບັນທຶກ...";
    }else if(btn.dataset.oldText){
      btn.textContent=btn.dataset.oldText;
      delete btn.dataset.oldText;
    }
  }
}

function safeValue(value,fallback="-"){
  return value===undefined||value===null||String(value).trim()===""?fallback:value;
}
function firstValue(obj,keys,fallback=""){
  for(const key of keys){
    const value=obj?.[key];
    if(value!==undefined&&value!==null&&String(value).trim()!=="")return value;
  }
  return fallback;
}
function normalizeDateTime(value){
  const raw=safeValue(value,"");
  if(!raw)return "-";
  const d=new Date(raw);
  if(Number.isNaN(d.getTime()))return String(raw);
  return d.toLocaleString();
}
function normalizeBootstrap(raw){
  const next=raw||{};
  const products=(next.products||[]).map(p=>({
    ...p,
    product_id:firstValue(p,["product_id","id"]),
    barcode:String(firstValue(p,["barcode","bar_code"],"")),
    sku:String(firstValue(p,["sku","product_code"],"")),
    product_name:firstValue(p,["product_name","name","item_name"],"Unnamed"),
    category_id:firstValue(p,["category_id","category"],""),
    unit:firstValue(p,["unit"],""),
    note:firstValue(p,["note","remark","description"],""),
    stock_qty:Number(firstValue(p,["stock_qty","stock","quantity"],0)||0),
    minimum_stock:Number(firstValue(p,["minimum_stock","min_stock"],0)||0)
  }));
  const byId=new Map(products.map(p=>[String(p.product_id),p]));
  const byCode=new Map();
  products.forEach(p=>{
    if(p.barcode)byCode.set(String(p.barcode),p);
    if(p.sku)byCode.set(String(p.sku),p);
  });
  const normalizeTxn=(r,type="")=>{
    const productId=String(firstValue(r,["product_id","item_id"],""));
    const product=byId.get(productId)||byCode.get(String(firstValue(r,["barcode","sku"],"")));
    return {
      ...r,
      product_id:productId||product?.product_id||"",
      barcode:firstValue(r,["barcode"],product?.barcode||""),
      sku:firstValue(r,["sku"],product?.sku||""),
      category_id:firstValue(r,["category_id"],product?.category_id||""),
      transaction_time:firstValue(r,["transaction_time","created_at","date","timestamp"],""),
      movement_type:firstValue(r,["movement_type","type"],type),
      quantity:Number(firstValue(r,["quantity","qty"],0)||0),
      note:firstValue(r,["note","remark","description"],"")
    };
  };
  return {
    ...next,
    products,
    categories:(next.categories||[]).map(c=>({
      ...c,
      category_id:firstValue(c,["category_id","id"]),
      category_name:firstValue(c,["category_name","name"],"Unnamed")
    })),
    stockIn:(next.stockIn||[]).map(r=>normalizeTxn(r,"IN")),
    stockOut:(next.stockOut||[]).map(r=>normalizeTxn(r,"OUT")),
    movements:(next.movements||[]).map(r=>normalizeTxn(r,firstValue(r,["movement_type","type"],""))),
    users:next.users||[],
    auditLogs:next.auditLogs||[],
    backups:next.backups||[]
  };
}

function setText(selector,value){
  const el=typeof selector==="string"?$(selector):selector;
  if(el) el.textContent=value==null?"":String(value);
  return el;
}

function toast(m){const t=$("#toast");if(!t){console.warn("Toast element missing:",m);return}setText(t,m);t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function statusOf(p){if(Number(p.stock_qty)<=0)return"out";if(Number(p.stock_qty)<=Number(p.minimum_stock))return"low";return"normal"}
async function api(action,data={}){
 if(!API_URL||API_URL.includes("PASTE_"))throw new Error("ກະລຸນາໃສ່ API_URL ໃນ config.js");
 let res;
 try{
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),12000);
   try{
     res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,token:sessionToken,...data}),signal:controller.signal});
   }finally{
     clearTimeout(timer);
   }
 }catch(err){
   throw new Error(err?.name==="AbortError"?"Server ຕອບຊ້າເກີນ 12 ວິນາທີ":"ບໍ່ສາມາດເຊື່ອມຕໍ່ Server: "+err.message);
 }
 let json;
 try{json=await res.json()}catch(err){throw new Error("Server ສົ່ງຂໍ້ມູນບໍ່ຖືກຕ້ອງ")}
 if(!json.ok)throw new Error(json.error||"API error");
 return json.data;
}
function hideBoot(){
 const boot=$("#bootView");
 if(boot)boot.classList.add("hidden");
}
function setAuthView(mode){
  hideBoot();
  const login=$("#loginView");
  const appView=$("#appView");
  const showAppView=mode==="app";

  document.body.classList.remove("auth-pending","auth-login","auth-app");
  document.body.classList.add(showAppView?"auth-app":"auth-login");

  if(login){
    login.hidden=showAppView;
    login.setAttribute("aria-hidden",showAppView?"true":"false");
    login.classList.toggle("hidden",showAppView);
    login.style.setProperty("display",showAppView?"none":"grid","important");
  }

  if(appView){
    appView.hidden=!showAppView;
    appView.setAttribute("aria-hidden",showAppView?"false":"true");
    appView.classList.toggle("hidden",!showAppView);
    appView.style.setProperty("display",showAppView?"grid":"none","important");
  }

  // Final defensive check after layout/style recalculation.
  requestAnimationFrame(()=>{
    if(login)login.style.setProperty("display",showAppView?"none":"grid","important");
    if(appView)appView.style.setProperty("display",showAppView?"grid":"none","important");
  });
}

function showLogin(){
  setAuthView("login");
}

function showApp(){
  setAuthView("app");
}
function applyRole(){
 const role=currentUser?.role||"Viewer";
 $$("[data-roles]").forEach(el=>{const allowed=el.dataset.roles.split(",");el.classList.toggle("hidden",!allowed.includes(role))});
 setText("#currentUserName",currentUser?.display_name||currentUser?.username||"User");
 setText("#currentUserRole",role);setText("#avatar",(currentUser?.display_name||"U").slice(0,2).toUpperCase());
}
async function login(username,password){
 const data=await api("login",{username,password});
 sessionToken=data.token;
 currentUser=data.user;
 localStorage.setItem("signshop_session",sessionToken);
 localStorage.setItem(USER_CACHE_KEY,JSON.stringify(currentUser));
 applyRole();
 showApp();
 try{
   await refreshAll();
 }catch(err){
   console.error("Initial refresh after login failed:",err);
   setText("#syncStatus","● Offline");
   toast("Login ສຳເລັດ ແຕ່ການ Sync ຂໍ້ມູນມີບັນຫາ");
 }
}
function isAuthenticationError(error){
 const message=String(error?.message||error||'').toLowerCase();
 return message.includes('not authenticated')||message.includes('session expired')||message.includes('user not found');
}
async function restoreSession(){
 if(!sessionToken){showLogin();return;}
 if(currentUser){
   applyRole();
   showApp();
 }
 try{
   const verifiedUser=await api("me");
   if(verifiedUser){
     currentUser=verifiedUser;
     localStorage.setItem(USER_CACHE_KEY,JSON.stringify(currentUser));
   }
   applyRole();
   showApp();
   await refreshAll();
 }catch(e){
   console.warn("Session restore failed:",e);
   if(isAuthenticationError(e)){
     localStorage.removeItem("signshop_session");
     localStorage.removeItem(USER_CACHE_KEY);
     sessionToken="";
     currentUser=null;
     showLogin();
   }else if(currentUser && sessionToken){
     // Do not force logout for temporary API/network errors or unsupported `me`.
     applyRole();
     showApp();
     setText("#syncStatus","● Offline");
     toast("ຍັງຮັກສາການ Login ໄວ້ — ກະລຸນາກົດ Refresh ຂໍ້ມູນອີກຄັ້ງ");
   }else{
     showLogin();
     setText("#loginError","Server connection error. Please login again.");
   }
 }
}
async function refreshAll(){
 setText("#syncStatus","● Syncing");
 const d=await api("bootstrap");
 state=normalizeBootstrap(d);renderAll();setText("#syncStatus","● Online")
}
function openPage(id){$$(".page").forEach(p=>p.classList.toggle("active",p.id===id));$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===id));window.scrollTo({top:0,behavior:"smooth"})}
function categoryName(id){return state.categories.find(c=>c.category_id===id)?.category_name||id}
function fillSelects(){
 const cats=state.categories.filter(c=>String(c.is_active)!=="false");
 ["productCategoryFilter","reportCategory"].forEach(id=>{const e=$("#"+id),v=e?.value||"";if(e){e.innerHTML='<option value="">ທຸກໝວດໝູ່</option>'+cats.map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join("");e.value=v}});
 {
   const productCategory=$("#productForm [name=category_id]");
   if(productCategory){
     if(!productCategory.dataset.categoryBound){productCategory.addEventListener("change",()=>productCategory.dataset.selectedCategory=productCategory.value);productCategory.dataset.categoryBound="1"}
     const selectedCategory=productCategory.value||productCategory.dataset.selectedCategory||"";
     productCategory.innerHTML=cats.map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join("");
     if(selectedCategory && cats.some(c=>String(c.category_id)===String(selectedCategory))){
       productCategory.value=selectedCategory;
       productCategory.dataset.selectedCategory=selectedCategory;
     }
   }
 }
 ["stockInForm","stockOutForm"].forEach(fid=>{
   const f=$("#"+fid);
   if(!f)return;

   const remembered=String(
     f.elements.category.value||
     f.elements.category.dataset.selectedCategory||
     ""
   );

   f.elements.category.innerHTML=
     '<option value="">ກະລຸນາເລືອກໝວດໝູ່</option>'+
     cats.map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join("");

   if(remembered&&cats.some(c=>String(c.category_id)===remembered)){
     f.elements.category.value=remembered;
     f.elements.category.dataset.selectedCategory=remembered;
   }else{
     f.elements.category.value="";
     f.elements.category.dataset.selectedCategory="";
   }

   fillProducts(fid,true);
 })
}
function fillProducts(fid,preserveProduct=false){
 const f=$("#"+fid);
 if(!f)return;

 const cat=String(f.elements.category.value||"");
 const rememberedProduct=preserveProduct
   ? String(f.elements.productId.value||f.elements.productId.dataset.selectedProduct||"")
   : "";

 const list=cat
   ? state.products.filter(
       p=>String(p.category_id)===cat&&String(p.is_active)!=="false"
     )
   : [];

 f.elements.productId.innerHTML=
   '<option value="">ກະລຸນາເລືອກອຸປະກອນ</option>'+
   list.map(p=>`<option value="${p.product_id}">${p.product_name}</option>`).join("");

 if(rememberedProduct&&list.some(p=>String(p.product_id)===rememberedProduct)){
   f.elements.productId.value=rememberedProduct;
   f.elements.productId.dataset.selectedProduct=rememberedProduct;
 }else{
   f.elements.productId.value="";
   f.elements.productId.dataset.selectedProduct="";
 }

 syncForm(fid);
}

function ean13CheckDigit(base12){const d=String(base12).replace(/\D/g,"").padStart(12,"0").slice(-12).split("").map(Number);const sum=d.reduce((t,n,i)=>t+n*(i%2===0?1:3),0);return(10-sum%10)%10}
function generateLocalBarcode(){
  const used=new Set((state.products||[]).map(p=>String(p.barcode||"").trim()));
  for(let attempt=0;attempt<100;attempt++){
    const timePart=String(Date.now()).slice(-7);
    const randomPart=String(Math.floor(Math.random()*100)).padStart(2,"0");
    const counterPart=String(attempt%10);
    const base=("200"+timePart+randomPart+counterPart).slice(0,12);
    const barcode=base+ean13CheckDigit(base);
    if(!used.has(barcode))return barcode;
  }
  // Extremely unlikely fallback.
  const base=("299"+String(Date.now())+String(Math.floor(Math.random()*1000000))).slice(-12);
  return base+ean13CheckDigit(base);
}

function generateLocalSku(){
  const used=new Set(state.products.map(p=>String(p.sku||"").toUpperCase()));
  let max=0;
  state.products.forEach(p=>{
    const m=String(p.sku||"").toUpperCase().match(/^SAN-(\d{6})$/);
    if(m)max=Math.max(max,Number(m[1]));
  });
  let sku;
  do{
    max++;
    sku=`SAN-${String(max).padStart(6,"0")}`;
  }while(used.has(sku));
  return sku;
}


function syncForm(fid){
 const f=$("#"+fid);
 const p=state.products.find(x=>String(x.product_id)===String(f.elements.productId.value));
 f.elements.sku.value=p?.sku||"";
 const b=$("#"+(fid==="stockInForm"?"inBarcode":"outBarcode"));
 if(b)b.value=p?.barcode||"";
}
function metrics(){
 const total=state.products.reduce((s,p)=>s+Number(p.stock_qty||0),0),low=state.products.filter(p=>statusOf(p)==="low").length,out=state.products.filter(p=>statusOf(p)==="out").length,today=new Date().toISOString().slice(0,10);
 const ti=state.stockIn.filter(r=>String(r.transaction_time).slice(0,10)===today).reduce((s,r)=>s+Number(r.quantity||0),0),to=state.stockOut.filter(r=>String(r.transaction_time).slice(0,10)===today).reduce((s,r)=>s+Number(r.quantity||0),0);
 const items=[["ອຸປະກອນ",state.products.length],["Stock ລວມ",total],["ໃກ້ໝົດ",low],["ໝົດ",out],["Stock In/Out ມື້ນີ້",`${ti} / ${to}`]];
 $("#dashboardMetrics").innerHTML=items.map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 $("#productMetrics").innerHTML=items.slice(0,4).map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("")
}
function filteredProducts(report=false){const q=report?"":$("#productSearch").value.toLowerCase(),cat=$(report?"#reportCategory":"#productCategoryFilter").value,status=$(report?"#reportStatus":"#productStatusFilter").value;return state.products.filter(p=>(!q||`${p.barcode} ${p.sku} ${p.product_name}`.toLowerCase().includes(q))&&(!cat||p.category_id===cat)&&(!status||statusOf(p)===status))}
function renderProducts(){
 const list=filteredProducts();
 const totalPages=Math.max(1,Math.ceil(list.length/productPageSize));
 productPage=Math.min(Math.max(1,productPage),totalPages);
 const startIndex=(productPage-1)*productPageSize;
 const pageRows=list.slice(startIndex,startIndex+productPageSize);

 $("#productBody").innerHTML=pageRows.length?pageRows.map((p,i)=>`<tr>
 <td>${startIndex+i+1}</td><td>${safeValue(p.barcode)}</td><td>${safeValue(categoryName(p.category_id))}</td>
 <td>${safeValue(p.product_name)}</td><td>${safeValue(p.sku)}</td>
 <td>${safeValue(p.note)}</td><td>${safeValue(p.unit)}</td>
 <td><strong>${Number(p.stock_qty||0)}</strong></td><td>${Number(p.minimum_stock||0)}</td>
 <td><span class="badge ${statusOf(p)}">${statusOf(p)==="out"?"ໝົດ":statusOf(p)==="low"?"ໃກ້ໝົດ":"ປົກກະຕິ"}</span></td>
 <td><button class="mini qr-button" data-show-qr="${p.product_id}">QR</button></td>
 <td>${currentUser?.role==="Admin"||currentUser?.role==="Manager"?`<div class="action-row"><button class="mini" data-edit-product="${p.product_id}">Edit</button><button class="mini" data-delete-product="${p.product_id}">Delete</button></div>`:"-"}</td></tr>`).join(""):'<tr><td colspan="12" class="empty-cell">ບໍ່ພົບຂໍ້ມູນ</td></tr>';

 paintPagination("product",productPage,list.length,productPageSize);
}


function stockHistoryFiltered(type){
 const list=type==="IN"?(state.stockIn||[]):(state.stockOut||[]);
 const prefix=type==="IN"?"stockIn":"stockOut";
 const q=String($("#"+prefix+"Search")?.value||"").trim().toLowerCase();
 if(!q)return list;
 return list.filter(r=>{
   const p=state.products.find(x=>String(x.product_id)===String(r.product_id));
   return [r.barcode,p?.barcode,r.sku,p?.sku,r.product_name,p?.product_name,r.note,r.transaction_time].some(v=>String(v||"").toLowerCase().includes(q));
 });
}
function renderStock(){
 const row=(r,type)=>{
   const p=state.products.find(x=>String(x.product_id)===String(r.product_id));
   const id=safeValue(r[type==="IN"?"stock_in_id":"stock_out_id"]);
   return`<tr><td>${id}</td><td>${normalizeDateTime(r.transaction_time)}</td><td>${safeValue(r.barcode||p?.barcode)}</td><td>${safeValue(p?.product_name||r.product_name||r.product_id)}</td><td>${safeValue(r.sku||p?.sku)}</td><td>${Number(r.quantity||0)}</td><td>${safeValue(r.note)}</td><td>${["Admin","Manager"].includes(currentUser?.role)?`<button class="mini" data-delete-stock="${type}:${id}">Delete</button>`:"-"}</td></tr>`;
 };
 const inList=stockHistoryFiltered("IN"),outList=stockHistoryFiltered("OUT");
 const inPages=Math.max(1,Math.ceil(inList.length/stockInPageSize)),outPages=Math.max(1,Math.ceil(outList.length/stockOutPageSize));
 stockInPage=Math.min(Math.max(1,stockInPage),inPages);stockOutPage=Math.min(Math.max(1,stockOutPage),outPages);
 const inRows=inList.slice((stockInPage-1)*stockInPageSize,stockInPage*stockInPageSize);
 const outRows=outList.slice((stockOutPage-1)*stockOutPageSize,stockOutPage*stockOutPageSize);
 $("#stockInBody").innerHTML=inRows.length?inRows.map(r=>row(r,"IN")).join(""):'<tr><td colspan="8" class="empty-cell">ບໍ່ພົບຂໍ້ມູນ</td></tr>';
 $("#stockOutBody").innerHTML=outRows.length?outRows.map(r=>row(r,"OUT")).join(""):'<tr><td colspan="8" class="empty-cell">ບໍ່ພົບຂໍ້ມູນ</td></tr>';
 paintPagination("stockIn",stockInPage,inList.length,stockInPageSize);paintPagination("stockOut",stockOutPage,outList.length,stockOutPageSize);
}
function renderCategories(){
 const list=state.categories||[];
 const totalPages=Math.max(1,Math.ceil(list.length/categoryPageSize));
 categoryPage=Math.min(Math.max(1,categoryPage),totalPages);
 const startIndex=(categoryPage-1)*categoryPageSize;
 const pageRows=list.slice(startIndex,startIndex+categoryPageSize);
 $("#categoryBody").innerHTML=pageRows.length?pageRows.map((c,i)=>`<tr><td>${startIndex+i+1}</td><td>${c.category_id}</td><td>${c.category_name}</td><td>${state.products.filter(p=>p.category_id===c.category_id).length}</td><td><div class="action-row"><button class="mini" data-edit-category="${c.category_id}">Edit</button><button class="mini" data-delete-category="${c.category_id}">Delete</button></div></td></tr>`).join(""):'<tr><td colspan="5" class="empty-cell">ບໍ່ພົບຂໍ້ມູນ</td></tr>';
 paintPagination("category",categoryPage,list.length,categoryPageSize);
}
function buildPaginationNumbers(current,totalPages){
 const pages=[];
 if(totalPages<=7){for(let i=1;i<=totalPages;i++)pages.push(i)}
 else{
   pages.push(1);
   if(current>4)pages.push("...");
   const from=Math.max(2,current-1),to=Math.min(totalPages-1,current+1);
   for(let i=from;i<=to;i++)pages.push(i);
   if(current<totalPages-3)pages.push("...");
   pages.push(totalPages);
 }
 return pages;
}
function paintPagination(prefix,current,totalItems,pageSize=PAGE_SIZE){
 const size=Math.max(1,Number(pageSize)||PAGE_SIZE);
 const totalPages=Math.max(1,Math.ceil(totalItems/size));
 const start=totalItems?(current-1)*size+1:0;
 const end=Math.min(current*size,totalItems);
 const summary=$("#"+prefix+"PageSummary"),numbers=$("#"+prefix+"PageNumbers");
 if(summary)summary.textContent=totalItems?`ສະແດງ ${start}-${end} ຈາກ ${totalItems} ລາຍການ`:'ບໍ່ພົບລາຍການ';
 if(numbers){
   numbers.innerHTML=buildPaginationNumbers(current,totalPages).map(x=>x==='...'?'<span class="pagination-dots">…</span>':`<button class="pagination-number ${x===current?'active':''}" data-page="${x}">${x}</button>`).join('');
 }
 const first=$("#"+prefix+"FirstBtn"),prev=$("#"+prefix+"PrevBtn"),next=$("#"+prefix+"NextBtn"),last=$("#"+prefix+"LastBtn");
 if(first)first.disabled=current<=1;if(prev)prev.disabled=current<=1;if(next)next.disabled=current>=totalPages;if(last)last.disabled=current>=totalPages;
 return totalPages;
}
function renderReport(){
 const list=filteredProducts(true),ins=state.stockIn.filter(r=>reportPeriodMatch(r.transaction_time)),outs=state.stockOut.filter(r=>reportPeriodMatch(r.transaction_time)),sum=(rows,id)=>rows.filter(r=>String(r.product_id)===String(id)).reduce((s,r)=>s+Number(r.quantity||0),0);
 const totalPages=Math.max(1,Math.ceil(list.length/reportPageSize));reportPage=Math.min(Math.max(1,reportPage),totalPages);
 const pageRows=list.slice((reportPage-1)*reportPageSize,reportPage*reportPageSize);
 $("#reportBody").innerHTML=pageRows.length?pageRows.map(p=>`<tr><td>${safeValue(p.barcode)}</td><td>${safeValue(categoryName(p.category_id))}</td><td>${safeValue(p.product_name)}</td><td>${safeValue(p.sku)}</td><td>${safeValue(p.note)}</td><td>${safeValue(p.unit)}</td><td>${Number(p.stock_qty||0)}</td><td>${Number(p.minimum_stock||0)}</td><td>${sum(ins,p.product_id)}</td><td>${sum(outs,p.product_id)}</td><td><span class="badge ${statusOf(p)}">${statusOf(p)==="out"?"ໝົດ":statusOf(p)==="low"?"ໃກ້ໝົດ":"ປົກກະຕິ"}</span></td></tr>`).join(""):'<tr><td colspan="11" class="empty-cell">ບໍ່ພົບຂໍ້ມູນ</td></tr>';
 paintPagination('report',reportPage,list.length,reportPageSize);
 const stock=list.reduce((s,p)=>s+Number(p.stock_qty||0),0);
 const tin=ins.reduce((s,r)=>s+Number(r.quantity||0),0);
 const tout=outs.reduce((s,r)=>s+Number(r.quantity||0),0);
 $("#reportCards").innerHTML=[["ລາຍການ",list.length],["Stock ລວມ",stock],["Stock In",tin],["Stock Out",tout]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 setText("#reportSummary",`ລວມ ${list.length} ລາຍການ | Stock ${stock} | ນຳເຂົ້າ ${tin} | ເບີກອອກ ${tout}`)
}
function renderUsers(){
 const body=$("#userBody"); if(!body)return;
 body.innerHTML=(state.users||[]).map(u=>{
   const active=String(u.is_active).toLowerCase()!=="false";
   return `<tr><td>${u.user_id||""}</td><td>${u.username||""}</td><td>${u.display_name||""}</td><td>${u.role||""}</td><td>${active?"Active":"Disabled"}</td><td class="row-actions"><button class="secondary" data-edit-user="${u.user_id}">Edit</button><button class="secondary" data-reset-user="${u.user_id}">Password</button><button class="${active?"danger":"primary"}" data-toggle-user="${u.user_id}" data-active="${active?"false":"true"}">${active?"Disable":"Enable"}</button></td></tr>`;
 }).join("");
}
function renderAll(){
 const jobs=[
  ["fillSelects",fillSelects],["metrics",metrics],["renderProducts",renderProducts],
  ["renderStock",renderStock],
  ["renderCategories",renderCategories],["renderReport",renderReport],
  ["renderUsers",renderUsers],
  ["renderDashboardCharts",renderDashboardCharts],
  ["renderAudit",renderAudit],
  ["renderBackups",renderBackups],["applyRole",applyRole]
 ];
 jobs.forEach(([name,fn])=>{try{fn()}catch(err){console.error("Render error:",name,err)}});
 setTimeout(()=>applyLanguage(currentLanguage),0);
}


function findProductByCode(value){
 const code=String(value||"").trim();
 return state.products.find(p=>String(p.barcode)===code||String(p.sku)===code||String(p.product_id)===code);
}

let scanAudioContext=null;

function playScanSound(success=true){
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx)return;

    if(!scanAudioContext)scanAudioContext=new AudioCtx();
    if(scanAudioContext.state==="suspended")scanAudioContext.resume();

    const now=scanAudioContext.currentTime;
    const gain=scanAudioContext.createGain();
    gain.connect(scanAudioContext.destination);

    gain.gain.setValueAtTime(0.0001,now);
    gain.gain.exponentialRampToValueAtTime(0.22,now+0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001,now+(success?0.16:0.28));

    const osc=scanAudioContext.createOscillator();
    osc.type=success?"sine":"square";
    osc.frequency.setValueAtTime(success?1150:300,now);

    if(success){
      osc.frequency.exponentialRampToValueAtTime(1650,now+0.12);
    }else{
      osc.frequency.setValueAtTime(300,now);
      osc.frequency.setValueAtTime(220,now+0.14);
    }

    osc.connect(gain);
    osc.start(now);
    osc.stop(now+(success?0.17:0.29));

    if(navigator.vibrate){
      navigator.vibrate(success?45:[70,45,70]);
    }
  }catch(err){
    console.warn("Scanner sound unavailable:",err);
  }
}

// Unlock mobile audio after the first user interaction.
["pointerdown","touchstart","keydown"].forEach(eventName=>{
  document.addEventListener(eventName,()=>{
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)return;
      if(!scanAudioContext)scanAudioContext=new AudioCtx();
      if(scanAudioContext.state==="suspended")scanAudioContext.resume();
    }catch(_){}
  },{once:true,passive:true});
});

function applyScannedCode(value,targetId){
 const input=$("#"+targetId);
 if(!input)return;
 input.value=String(value||"").trim();
 const p=findProductByCode(input.value);
 if(!p){playScanSound(false);toast("ບໍ່ພົບ Barcode / QR Code ນີ້");return}
 playScanSound(true);
 const formId=targetId==="inBarcode"?"stockInForm":"stockOutForm";
 const f=$("#"+formId);
 f.elements.category.value=p.category_id;
 fillProducts(formId);
 f.elements.productId.value=p.product_id;
 syncForm(formId);
 toast(`ພົບ: ${p.product_name}`);
}
async function openScanner(targetId){
 activeScanTarget=targetId;
 $("#scannerModal").classList.add("open");
 setText("#scannerHint","ກຳລັງເປີດກ້ອງ...");
 try{
   availableCameras=await Html5Qrcode.getCameras();
   if(!availableCameras.length)throw new Error("ບໍ່ພົບກ້ອງ");
   const select=$("#cameraSelect");
   select.innerHTML=availableCameras.map((c,i)=>`<option value="${i}">${c.label||`Camera ${i+1}`}</option>`).join("");
   activeCameraIndex=Math.min(activeCameraIndex,availableCameras.length-1);
   select.value=String(activeCameraIndex);
   await startScannerCamera();
 }catch(err){
   setText("#scannerHint","ບໍ່ສາມາດເປີດກ້ອງ: "+err.message);
 }
}
async function startScannerCamera(){
 if(html5QrScanner){
   try{await html5QrScanner.stop()}catch(e){}
   try{await html5QrScanner.clear()}catch(e){}
 }
 html5QrScanner=new Html5Qrcode("qrReader");
 const camera=availableCameras[activeCameraIndex]?.id;
 if(!camera)return;
 setText("#scannerHint","ຈັດວາງ Barcode ຫຼື QR Code ໃຫ້ຢູ່ກາງກ້ອງ");
 await html5QrScanner.start(
   camera,
   {fps:10,qrbox:{width:280,height:180},aspectRatio:1.777778},
   async decodedText=>{
     applyScannedCode(decodedText,activeScanTarget);
     await closeScanner();
   },
   ()=>{}
 );
}
async function closeScanner(){
 if(html5QrScanner){
   try{await html5QrScanner.stop()}catch(e){}
   try{await html5QrScanner.clear()}catch(e){}
   html5QrScanner=null;
 }
 $("#scannerModal").classList.remove("open");
 activeScanTarget=null;
}
async function toggleTorch(){
 if(!html5QrScanner)return;
 torchEnabled=!torchEnabled;
 try{
   await html5QrScanner.applyVideoConstraints({advanced:[{torch:torchEnabled}]});
   setText("#torchBtn",torchEnabled?"🔦 Flash ON":"🔦 Flash");
 }catch(e){toast("ກ້ອງນີ້ບໍ່ຮອງຮັບ Flash")}
}
function setupUsbScanner(){
 document.addEventListener("keydown",e=>{
   const tag=document.activeElement?.tagName;
   const editable=["INPUT","TEXTAREA","SELECT"].includes(tag);
   if(editable)return;
   if(e.key==="Enter"){
     if(usbScanBuffer.length>=4){
       const page=$(".page.active")?.id;
       const target=page==="stock-out"?"outBarcode":"inBarcode";
       applyScannedCode(usbScanBuffer,target);
       openPage(page==="stock-out"?"stock-out":"stock-in");
     }
     usbScanBuffer="";
     return;
   }
   if(typeof e.key==="string" && e.key.length===1){
     usbScanBuffer+=e.key;
     clearTimeout(usbScanTimer);
     usbScanTimer=setTimeout(()=>usbScanBuffer="",120);
   }
 });
}
function showProductQr(productId){
 const p=state.products.find(x=>x.product_id===productId);if(!p)return;
 const payload=p.barcode||p.sku||p.product_id;
 $("#qrPreview").innerHTML="";
 const img=document.createElement("img");
 img.alt="QR Code";
 img.src=`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}`;
 $("#qrPreview").appendChild(img);
 $("#qrProductInfo").innerHTML=`<strong>${p.product_name}</strong><br>Barcode: ${p.barcode}<br>SKU: ${p.sku}<br>Category: ${categoryName(p.category_id)}`;
 $("#qrModal").dataset.productId=p.product_id;
 $("#qrModal").classList.add("open");
}

function parseDateKey(v){const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10)}
function countInactiveProducts(days){const limit=Date.now()-days*86400000,ids=new Set(state.movements.filter(m=>new Date(m.transaction_time).getTime()>=limit).map(m=>m.product_id));return state.products.filter(p=>!ids.has(p.product_id)).length}
function destroyChart(n){if(dashboardCharts[n]){dashboardCharts[n].destroy();delete dashboardCharts[n]}}
function makeChart(n,id,c){destroyChart(n);const el=$("#"+id);if(el&&window.Chart)dashboardCharts[n]=new Chart(el,c)}
function renderDashboardCharts(){
 if(!window.Chart)return;const days=Number($("#dashboardPeriod")?.value||30),end=new Date();end.setHours(0,0,0,0);const start=new Date(end);start.setDate(start.getDate()-days+1);
 const labels=[],ins={},outs={};for(let i=0;i<days;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=d.toISOString().slice(0,10);labels.push(k);ins[k]=0;outs[k]=0}
 state.stockIn.forEach(r=>{const k=parseDateKey(r.transaction_time);if(k in ins)ins[k]+=Number(r.quantity||0)});state.stockOut.forEach(r=>{const k=parseDateKey(r.transaction_time);if(k in outs)outs[k]+=Number(r.quantity||0)});
 makeChart("trend","movementTrendChart",{type:"line",data:{labels,datasets:[{label:"Stock In",data:labels.map(k=>ins[k]),tension:.25},{label:"Stock Out",data:labels.map(k=>outs[k]),tension:.25}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}});
 const cl=state.categories.map(c=>c.category_name),cv=state.categories.map(c=>state.products.filter(p=>p.category_id===c.category_id).reduce((s,p)=>s+Number(p.stock_qty||0),0));
 makeChart("category","categoryStockChart",{type:"doughnut",data:{labels:cl,datasets:[{data:cv}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}});
 const agg=rows=>{const m={};rows.forEach(r=>m[r.product_id]=(m[r.product_id]||0)+Number(r.quantity||0));return Object.entries(m).map(([id,qty])=>({name:state.products.find(p=>p.product_id===id)?.product_name||id,qty})).sort((a,b)=>b.qty-a.qty).slice(0,10)};
 const a=agg(state.stockOut),b=agg(state.stockIn);
 makeChart("topout","topOutChart",{type:"bar",data:{labels:a.map(x=>x.name),datasets:[{data:a.map(x=>x.qty)}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
 makeChart("topin","topInChart",{type:"bar",data:{labels:b.map(x=>x.name),datasets:[{data:b.map(x=>x.qty)}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
}
function reportPeriodMatch(t){
 const type=$("#reportRangeType")?.value||"all";if(type==="all")return true;const d=new Date(t);if(Number.isNaN(d.getTime()))return false;
 if(type==="day"){const v=$("#reportDate").value;return !v||d.toISOString().slice(0,10)===v}
 if(type==="month"){const v=$("#reportMonth").value;return !v||d.toISOString().slice(0,7)===v}
 if(type==="year"){const v=$("#reportYear").value;return !v||String(d.getFullYear())===String(v)}
 return true
}

function auditFiltered(){
 const q=($("#auditSearch")?.value||"").toLowerCase(),act=$("#auditActionFilter")?.value||"",usr=$("#auditUserFilter")?.value||"",from=$("#auditDateFrom")?.value||"",to=$("#auditDateTo")?.value||"";
 return (state.auditLogs||[]).filter(x=>{
   const text=`${x.username} ${x.action} ${x.entity_type} ${x.entity_id} ${x.details}`.toLowerCase();
   const date=String(x.created_at||"").slice(0,10);
   return (!q||text.includes(q))&&(!act||x.action===act)&&(!usr||x.username===usr)&&(!from||date>=from)&&(!to||date<=to);
 });
}
function scrollPageTop(pageId){
 const panel=$("#"+pageId)?.querySelector(".panel");
 if(panel)panel.scrollIntoView({behavior:"smooth",block:"start"});
}
function parseAuditDetails(raw){
 if(raw==null||raw==="")return {};
 if(typeof raw==="object")return raw;
 try{return JSON.parse(raw)}catch(e){return {message:String(raw)}}
}
function auditDetailsText(x){
 const d=parseAuditDetails(x.details),parts=[];
 const labels={quantity:"ຈຳນວນ",balance:"ຍອດຄົງເຫຼືອ",barcode:"Barcode",sku:"SKU",product_name:"ອຸປະກອນ",note:"ໝາຍເຫດ",message:"ຂໍ້ຄວາມ",old_value:"ຄ່າເກົ່າ",new_value:"ຄ່າໃໝ່"};
 Object.entries(d).forEach(([k,v])=>{if(v!==""&&v!=null)parts.push(`${labels[k]||k}: ${typeof v==="object"?JSON.stringify(v):v}`)});
 if(parts.length)return parts.join(" • ");
 const action=String(x.action||"").toUpperCase();
 if(action==="LOGIN")return "ເຂົ້າລະບົບສຳເລັດ";
 if(action==="LOGOUT")return "ອອກຈາກລະບົບ";
 if(action.includes("CREATE"))return "ສ້າງລາຍການໃໝ່";
 if(action.includes("UPDATE"))return "ແກ້ໄຂຂໍ້ມູນ";
 if(action.includes("DELETE"))return "ລຶບລາຍການ";
 return "-";
}
function auditBadgeClass(action){const a=String(action||"").toUpperCase();if(a.includes("STOCK_IN")||a.includes("CREATE"))return"success";if(a.includes("STOCK_OUT")||a.includes("DELETE"))return"danger";if(a.includes("LOGIN"))return"info";if(a.includes("UPDATE"))return"warning";return""}
function openAuditDetail(index){
 const x=(window.__auditPageRows||[])[Number(index)];if(!x)return;
 const d=parseAuditDetails(x.details);
 const product=(state.products||[]).find(p=>
   String(p.product_id||"")===String(x.entity_id||d.product_id||"") ||
   (d.barcode&&String(p.barcode||"")===String(d.barcode)) ||
   (d.sku&&String(p.sku||"")===String(d.sku))
 );
 const category=(state.categories||[]).find(c=>String(c.category_id||"")===String(d.category_id||product?.category_id||""));
 const labels={
   category_id:"ໝວດໝູ່",product_id:"ລະຫັດອຸປະກອນ",product_name:"ອຸປະກອນ",
   barcode:"Barcode",sku:"SKU",quantity:"ຈຳນວນ",balance:"ຍອດຄົງເຫຼືອ",
   old_value:"ຄ່າເກົ່າ",new_value:"ຄ່າໃໝ່",note:"ໝາຍເຫດ",message:"ຂໍ້ຄວາມ"
 };
 const detailRows=[
   ["ເວລາ",x.created_at],["User",x.username],["Role",x.role],["Action",x.action],
   ["Entity",x.entity_type],["Record ID",x.entity_id],
   ["ໝວດໝູ່",d.category_name||category?.category_name||"-"],
   ["ອຸປະກອນ",d.product_name||product?.product_name||d.name||"-"],
   ["Barcode",d.barcode||product?.barcode||"-"],["SKU",d.sku||product?.sku||"-"]
 ];
 const skip=new Set(["category_name","product_name","name","barcode","sku"]);
 Object.entries(d).forEach(([k,v])=>{if(!skip.has(k))detailRows.push([labels[k]||k,typeof v==="object"?JSON.stringify(v,null,2):v])});
 $("#auditDetailContent").innerHTML=detailRows.map(([k,v])=>`<div class="audit-detail-row"><span>${safeValue(k)}</span><strong>${safeValue(v??"-")}</strong></div>`).join("");
 const modal=$("#auditDetailModal");modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");
}
function renderAudit(){
 if(String(currentUser?.role||"")!=="Admin"){
   if($("#auditBody")) $("#auditBody").innerHTML='<tr><td colspan="7" class="empty-cell">Admin only</td></tr>';
   return;
 }
 const rows=state.auditLogs||[],actions=[...new Set(rows.map(x=>x.action).filter(Boolean))],users=[...new Set(rows.map(x=>x.username).filter(Boolean))];
 if($("#auditActionFilter")){const v=$("#auditActionFilter").value;$("#auditActionFilter").innerHTML='<option value="">ທຸກ Action</option>'+actions.map(x=>`<option>${x}</option>`).join("");$("#auditActionFilter").value=v}
 if($("#auditUserFilter")){const v=$("#auditUserFilter").value;$("#auditUserFilter").innerHTML='<option value="">ທຸກ User</option>'+users.map(x=>`<option>${x}</option>`).join("");$("#auditUserFilter").value=v}
 const list=auditFiltered(),totalPages=Math.max(1,Math.ceil(list.length/auditPageSize));
 if(auditPage>totalPages)auditPage=totalPages;if(auditPage<1)auditPage=1;
 const pageRows=list.slice((auditPage-1)*auditPageSize,auditPage*auditPageSize);
 window.__auditPageRows=pageRows;
 if($("#auditBody"))$("#auditBody").innerHTML=pageRows.length?pageRows.map((x,i)=>`<tr class="audit-clickable" data-audit-index="${i}"><td>${safeValue(x.created_at)}</td><td>${safeValue(x.username)}</td><td>${safeValue(x.role)}</td><td><span class="badge ${auditBadgeClass(x.action)}">${safeValue(x.action)}</span></td><td>${safeValue(x.entity_type)}</td><td>${safeValue(x.entity_id||"-")}</td><td class="audit-detail-summary">${safeValue(auditDetailsText(x))}</td></tr>`).join(""):'<tr><td colspan="7" class="empty-cell">ບໍ່ພົບຂໍ້ມູນ</td></tr>';
 paintPagination('audit',auditPage,list.length,auditPageSize);
 if($("#auditMetrics"))$("#auditMetrics").innerHTML=[["Log ທັງໝົດ",rows.length],["Login",rows.filter(x=>x.action==="LOGIN").length],["ການແກ້ໄຂ",rows.filter(x=>String(x.action).includes("UPDATE")).length],["ການລຶບ",rows.filter(x=>String(x.action).includes("DELETE")).length]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
}
function renderBackups(){
 const rows=state.backups||[];
 if($("#backupBody"))$("#backupBody").innerHTML=rows.map(b=>`<tr><td>${b.backup_id}</td><td>${b.created_at}</td><td>${b.file_name}</td><td><span class="badge">${b.status}</span></td><td>${b.created_by}</td><td>${b.drive_file_id||"-"}</td></tr>`).join("");
 if($("#backupMetrics"))$("#backupMetrics").innerHTML=[["Backup ທັງໝົດ",rows.length],["ສຳເລັດ",rows.filter(x=>x.status==="SUCCESS").length],["ລົ້ມເຫຼວ",rows.filter(x=>x.status==="FAILED").length],["ລ່າສຸດ",rows[0]?.created_at||"-"]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
}

async function clearAuditLogsAsAdmin(){
  const role=String(currentUser?.role||currentUser?.user?.role||"").toLowerCase();
  if(role!=="admin"){
    toast("ສະເພາະ Admin ເທົ່ານັ້ນ");
    return;
  }

  const first=confirm("⚠️ ຈະລ້າງ Audit Log ທັງໝົດບໍ? ຂໍ້ມູນຈະບໍ່ສາມາດກູ້ຄືນໄດ້.");
  if(!first)return;

  const text=prompt('ພິມຄຳວ່າ DELETE ເພື່ອຢືນຢັນ');
  if(text!=="DELETE"){
    toast("ຍົກເລີກ: ຄຳຢືນຢັນບໍ່ຖືກຕ້ອງ");
    return;
  }

  const button=$("#clearAuditBtn");
  if(button)button.disabled=true;
  try{
    await api("clearAuditLogs",{confirm:"DELETE"});
    state.auditLogs=[];
    auditPage=1;
    renderAudit();
    toast("ລ້າງ Audit Log ສຳເລັດ");
    await refreshAll().catch(()=>{});
  }catch(err){
    toast(err.message||"ລ້າງ Audit Log ບໍ່ສຳເລັດ");
  }finally{
    if(button)button.disabled=false;
  }
}

function exportAuditCsv(){
 const list=auditFiltered(),rows=[["created_at","username","role","action","entity_type","entity_id","details"],...list.map(x=>[x.created_at,x.username,x.role,x.action,x.entity_type,x.entity_id,x.details])];
 const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="audit-log.csv";a.click()
}
async function archiveMonthlyTransactions(){
  const role=String(currentUser?.role||currentUser?.user?.role||"").toLowerCase();
  if(role!=="admin"){
    toast("ສະເພາະ Admin ເທົ່ານັ້ນ");
    return;
  }
  const ok=confirm(
    "📦 Archive ຂໍ້ມູນ Stock In / Stock Out / Movements ຂອງເດືອນທີ່ຜ່ານມາ?\n\n"+
    "• ລະບົບຈະ Backup Spreadsheet ກ່ອນ\n"+
    "• ຂໍ້ມູນເດືອນປັດຈຸບັນຈະບໍ່ຖືກລຶບ\n"+
    "• ຍອດ Products.stock_qty ຈະບໍ່ປ່ຽນ"
  );
  if(!ok)return;
  const button=$("#archiveMonthlyBtn");
  if(button)button.disabled=true;
  try{
    toast("ກຳລັງ Backup ແລະ Archive...");
    const result=await api("archiveMonthlyTransactions",{confirm:"ARCHIVE"});
    await refreshAll();
    const total=Number(result?.total_archived||0);
    toast(`Archive ສຳເລັດ ${total} ລາຍການ`);
  }catch(err){
    toast(err?.message||"Archive ບໍ່ສຳເລັດ");
  }finally{
    if(button)button.disabled=false;
  }
}

function downloadSnapshot(){
 const data={exported_at:new Date().toISOString(),products:state.products,categories:state.categories,stockIn:state.stockIn,stockOut:state.stockOut,movements:state.movements};
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download=`signshop-snapshot-${new Date().toISOString().slice(0,10)}.json`;a.click()
}

function exportDashboardSummary(){
 const rows=[["Metric","Value"],["Total Products",state.products.length],["Total Stock",state.products.reduce((s,p)=>s+Number(p.stock_qty||0),0)],["Low Stock",state.products.filter(p=>statusOf(p)==="low").length],["Out of Stock",state.products.filter(p=>statusOf(p)==="out").length],["Inactive >30 days",countInactiveProducts(30)]];
 const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="dashboard-summary.csv";a.click()
}

function exportCsv(list,name){const rows=[["Barcode","Category","Equipment","SKU","Unit","Stock","Minimum","Status"],...list.map(p=>[p.barcode,categoryName(p.category_id),p.product_name,p.sku,p.unit,p.stock_qty,p.minimum_stock,statusOf(p)])];const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=name;a.click()}
$("#loginForm").onsubmit=async e=>{e.preventDefault();setText("#loginError","");try{const d=Object.fromEntries(new FormData(e.target));await login(d.username,d.password)}catch(err){console.error(err);setText("#loginError",err?.message||"Login error")}}
$("#logoutBtn").onclick=async()=>{
 if(!confirm("ຢືນຢັນອອກຈາກລະບົບ?"))return;
 try{await api("logout")}catch(e){}
 localStorage.removeItem("signshop_session");localStorage.removeItem(USER_CACHE_KEY);sessionStorage.clear();sessionToken="";currentUser=null;
 const f=$("#loginForm");if(f){f.reset();f.querySelectorAll("input").forEach(i=>{i.value="";i.setAttribute("value","")})}
 setText("#loginError","");showLogin();setTimeout(()=>{const u=f?.elements?.username;if(u){u.value="";u.focus()}const p=f?.elements?.password;if(p)p.value=""},80);
}
document.addEventListener("click",async e=>{const n=e.target.closest("[data-page]");if(n)openPage(n.dataset.page);const l=e.target.closest("[data-page-link]");if(l)openPage(l.dataset.pageLink);
 const closeModalBtn=e.target.closest("[data-close-modal]");
 if(closeModalBtn){
   const modal=$("#productModal");
   const f=$("#productForm");
   if(f){
     f.dataset.saving="0";
     const saveBtn=f.querySelector('button[type="submit"],button.primary:not([type])');
     if(saveBtn){
       saveBtn.disabled=false;
       saveBtn.textContent=saveBtn.dataset.defaultText||"ບັນທຶກ";
     }
   }
   modal?.classList.remove("open");
 }
 const addProductButton=e.target.closest("#addProductBtn");
 if(addProductButton){
   e.preventDefault();
   const f=$("#productForm");
   if(!f){toast("ບໍ່ພົບຟອມເພີ່ມອຸປະກອນ");return}
   f.reset();
   f.dataset.mode="create";
   f.dataset.editingProductId="";
   f.dataset.saving="0";
   const saveBtn=f.querySelector('button[type="submit"],button.primary:not([type])');
   if(saveBtn){
     saveBtn.disabled=false;
     saveBtn.dataset.defaultText=saveBtn.dataset.defaultText||saveBtn.textContent||"ບັນທຶກ";
     saveBtn.textContent=saveBtn.dataset.defaultText;
   }
   if(f.elements.product_id)f.elements.product_id.value="";
   if(f.elements.barcode)f.elements.barcode.value=generateLocalBarcode();
   if(f.elements.sku)f.elements.sku.value=generateLocalSku();
   const productModal=$("#productModal");
   productModal?.classList.add("open");
   productModal?.setAttribute("aria-hidden","false");
   setTimeout(()=>applyLanguage(currentLanguage),0);
 }
 const ep=e.target.closest("[data-edit-product]");
 if(ep){
   const productId=String(ep.dataset.editProduct||"");
   const p=(state.products||[]).find(x=>String(x.product_id)===productId);
   if(!p){toast("ບໍ່ພົບລາຍການອຸປະກອນ");return}
   const f=$("#productForm");
   f.reset();
   f.dataset.mode="edit";
   f.dataset.editingProductId=productId;
   Object.entries(p).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v??""});
   f.elements.product_id.value=productId;
   $("#productModal").classList.add("open");
 }
 const dp=e.target.closest("[data-delete-product]");if(dp&&confirm("ລຶບອຸປະກອນ?")){try{await api("deleteProduct",{product_id:dp.dataset.deleteProduct});await refreshAll()}catch(err){toast(err.message)}}
 const ec=e.target.closest("[data-edit-category]");if(ec){const c=state.categories.find(x=>x.category_id===ec.dataset.editCategory),name=prompt("ຊື່ໃໝ່",c.category_name);if(name)try{await api("updateCategory",{category_id:c.category_id,category_name:name});await refreshAll()}catch(err){toast(err.message)}}
 const dc=e.target.closest("[data-delete-category]");if(dc&&confirm("ລຶບໝວດໝູ່?"))try{await api("deleteCategory",{category_id:dc.dataset.deleteCategory});await refreshAll()}catch(err){toast(err.message)}
 const qr=e.target.closest("[data-show-qr]");if(qr)showProductQr(qr.dataset.showQr);
 const scanBtn=e.target.closest("[data-scan-target]");if(scanBtn)openScanner(scanBtn.dataset.scanTarget);
 const ds=e.target.closest("[data-delete-stock]");if(ds&&confirm("ລຶບ Transaction ແລະປັບ Stock ຄືນ?")){const [type,id]=ds.dataset.deleteStock.split(":");try{await api("deleteStockTransaction",{type,id});await refreshAll()}catch(err){toast(err.message)}}})
$("#generateBarcodeBtn").onclick=()=>{$("#productForm [name=barcode]").value=generateLocalBarcode();toast(t("ສ້າງ Barcode ໃໝ່ແລ້ວ"))};
$("#generateSkuBtn").onclick=()=>{$("#productForm [name=sku]").value=generateLocalSku();toast(t("ສ້າງ SKU ໃໝ່ແລ້ວ"))};
$("#productForm").onsubmit=async e=>{
  e.preventDefault();

  const form=e.currentTarget;
  if(form.dataset.saving==="1")return;

  const submitButton=form.querySelector('button[type="submit"],button.primary:not([type])');
  const originalButtonText=submitButton?.textContent||"ບັນທຶກ";

  const d=Object.fromEntries(new FormData(form));
  const editingId=String(form.dataset.editingProductId||"").trim();

  if(form.dataset.mode==="edit"&&editingId)d.product_id=editingId;
  else d.product_id="";

  if(!String(d.category_id||"").trim()){
    toast("ກະລຸນາເລືອກໝວດໝູ່");
    form.elements.category_id?.focus();
    return;
  }
  if(!String(d.product_name||"").trim()){
    toast("ກະລຸນາໃສ່ຊື່ອຸປະກອນ");
    form.elements.product_name?.focus();
    return;
  }

  if(!d.barcode)d.barcode=generateLocalBarcode();
  if(!d.sku)d.sku=generateLocalSku();

  const action=editingId?"updateProduct":"createProduct";
  const submittedData={...d};
  let previous=null;

  if(d.product_id){
    const i=(state.products||[]).findIndex(
      x=>String(x.product_id)===String(d.product_id)
    );
    if(i>=0)previous={...state.products[i]};
  }

  form.dataset.saving="1";
  if(submitButton){
    submitButton.disabled=true;
    submitButton.textContent="ກຳລັງບັນທຶກ...";
  }

  try{
    const saved=await api(action,{
      product:d,
      request_id:"REQ-"+Date.now()+"-"+Math.random().toString(36).slice(2,10)
    });

    if(saved&&typeof saved==="object"){
      upsertLocalProduct(saved);
    }else if(previous){
      upsertLocalProduct({...previous,...submittedData});
    }else{
      upsertLocalProduct({...submittedData});
    }

    // Backend save succeeded: close and clear the form immediately.
    closeProductModalAfterSave();

    // Force the browser to paint the closed modal before refresh/render work.
    await new Promise(resolve=>requestAnimationFrame(()=>resolve()));

    toast("ບັນທຶກອຸປະກອນສຳເລັດ");

    try{
      renderProductRelated();
    }catch(renderErr){
      console.warn("Product saved, local render failed:",renderErr);
    }

    try{
      await refreshAll();
    }catch(refreshErr){
      console.warn("Product saved, refresh failed:",refreshErr);
      toast("ບັນທຶກແລ້ວ — ກະລຸນາກົດ Refresh ຂໍ້ມູນ");
    }
  }catch(err){
    console.error("Product save failed:",err);
    toast("ບັນທຶກບໍ່ສຳເລັດ: "+(err?.message||err));
  }finally{
    form.dataset.saving="0";
    if(submitButton){
      submitButton.disabled=false;
      submitButton.textContent=submitButton.dataset.defaultText||originalButtonText;
    }
  }
}


const PRODUCT_ENTRY_MODES={barcode:"auto",sku:"auto"};

function applyProductEntryMode(target,mode,{generate=true}={}){
  const form=$("#productForm");
  if(!form)return;
  const input=form.elements[target];
  const autoButton=target==="barcode"?$("#generateBarcodeBtn"):$("#generateSkuBtn");
  const hint=target==="barcode"?$("#barcodeModeHint"):$("#skuModeHint");
  const row=input?.closest(".barcode-auto-row");
  const normalized=mode==="manual"?"manual":"auto";
  PRODUCT_ENTRY_MODES[target]=normalized;

  form.querySelectorAll(`[data-entry-target="${target}"]`).forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.entryMode===normalized);
  });

  const manual=normalized==="manual";
  input.readOnly=!manual;
  input.classList.toggle("manual-entry",manual);
  row?.classList.toggle("mode-manual",manual);
  if(autoButton){autoButton.hidden=manual;autoButton.disabled=manual;}

  if(manual){
    input.value="";
    input.placeholder=target==="barcode"?"ປ້ອນ Barcode ດ້ວຍຕົນເອງ":"ປ້ອນ SKU ດ້ວຍຕົນເອງ";
    if(hint)hint.textContent=target==="barcode"?"ໂໝດປ້ອນເອງ: ສູງສຸດ 13 ຫຼັກ":"ໂໝດປ້ອນເອງ: ກຳນົດ SKU ໄດ້ເອງ";
    setTimeout(()=>input.focus(),0);
  }else{
    input.placeholder="";
    if(hint)hint.textContent=target==="barcode"?"ໂໝດ Auto: ລະບົບສ້າງ Barcode 13 ຫຼັກ":"ໂໝດ Auto: ລະບົບສ້າງ SKU ອັດຕະໂນມັດ";
    if(generate){
      if(target==="barcode")generateBarcode();
      else generateSku();
    }
  }
}

function resetProductEntryModes(){
  applyProductEntryMode("barcode","auto",{generate:false});
  applyProductEntryMode("sku","auto",{generate:false});
}

document.addEventListener("click",e=>{
  const btn=e.target.closest("[data-entry-mode][data-entry-target]");
  if(btn)applyProductEntryMode(btn.dataset.entryTarget,btn.dataset.entryMode);
});

function closeProductModalAfterSave(){
  const modal=$("#productModal");
  const form=$("#productForm");

  if(form){
    form.reset();
    resetProductEntryModes();
    form.dataset.mode="";
    form.dataset.editingProductId="";
    form.dataset.saving="0";

    const saveButton=form.querySelector('button[type="submit"],button.primary:not([type])');
    if(saveButton){
      saveButton.disabled=false;
      saveButton.textContent=saveButton.dataset.defaultText||"ບັນທຶກ";
    }
  }

  if(modal){
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    modal.style.removeProperty("display");
  }

  document.body.classList.remove("modal-open");
}

function resetStockForm(fid){
 const f=$("#"+fid);
 if(!f)return;
 f.reset();
 f.elements.category.value="";
 f.elements.category.dataset.selectedCategory="";
 f.elements.productId.innerHTML='<option value="">ກະລຸນາເລືອກອຸປະກອນ</option>';
 f.elements.productId.value="";
 f.elements.productId.dataset.selectedProduct="";
 f.elements.sku.value="";
 f.elements.qty.value="";
 f.elements.note.value="";
 const barcode=$("#"+(fid==="stockInForm"?"inBarcode":"outBarcode"));
 if(barcode)barcode.value="";
}

function validateStockForm(fid){
 const f=$("#"+fid);
 const category=String(f.elements.category.value||"").trim();
 const productId=String(f.elements.productId.value||"").trim();
 const qty=Number(f.elements.qty.value);

 if(!category){
   toast("ກະລຸນາເລືອກໝວດໝູ່");
   f.elements.category.focus();
   return null;
 }
 if(!productId){
   toast("ກະລຸນາເລືອກອຸປະກອນ");
   f.elements.productId.focus();
   return null;
 }
 if(!Number.isFinite(qty)||qty<=0){
   toast("ກະລຸນາປ້ອນຈຳນວນທີ່ຫຼາຍກວ່າ 0");
   f.elements.qty.focus();
   return null;
 }

 return{
   product_id:productId,
   quantity:qty,
   note:String(f.elements.note.value||"").trim()
 };
}

$("#stockInForm").onsubmit=async e=>{
 e.preventDefault();
 const payload=validateStockForm("stockInForm");
 if(!payload)return;

 const snapshot={
   category:e.target.elements.category.value,
   productId:e.target.elements.productId.value,
   sku:e.target.elements.sku.value,
   qty:e.target.elements.qty.value,
   note:e.target.elements.note.value,
   barcode:$("#inBarcode")?.value||""
 };

 resetStockForm("stockInForm");
 toast("ກຳລັງບັນທຶກ Stock In...");

 try{
   await api("stockIn",payload);
   toast("Stock In ສຳເລັດ");
   refreshAll().catch(err=>console.warn("Stock In refresh failed:",err));
   setTimeout(()=>$("#inBarcode")?.focus(),100);
 }catch(err){
   toast("Stock In ບໍ່ສຳເລັດ: "+err.message);
   const f=e.target;
   f.elements.category.value=snapshot.category;
   fillProducts("stockInForm");
   f.elements.productId.value=snapshot.productId;
   syncForm("stockInForm");
   f.elements.qty.value=snapshot.qty;
   f.elements.note.value=snapshot.note;
   if($("#inBarcode"))$("#inBarcode").value=snapshot.barcode;
 }
}
$("#stockOutForm").onsubmit=async e=>{
 e.preventDefault();
 const payload=validateStockForm("stockOutForm");
 if(!payload)return;

 const snapshot={
   category:e.target.elements.category.value,
   productId:e.target.elements.productId.value,
   sku:e.target.elements.sku.value,
   qty:e.target.elements.qty.value,
   note:e.target.elements.note.value,
   barcode:$("#outBarcode")?.value||""
 };

 resetStockForm("stockOutForm");
 toast("ກຳລັງບັນທຶກ Stock Out...");

 try{
   await api("stockOut",payload);
   toast("Stock Out ສຳເລັດ");
   refreshAll().catch(err=>console.warn("Stock Out refresh failed:",err));
   setTimeout(()=>$("#outBarcode")?.focus(),100);
 }catch(err){
   toast("Stock Out ບໍ່ສຳເລັດ: "+err.message);
   const f=e.target;
   f.elements.category.value=snapshot.category;
   fillProducts("stockOutForm");
   f.elements.productId.value=snapshot.productId;
   syncForm("stockOutForm");
   f.elements.qty.value=snapshot.qty;
   f.elements.note.value=snapshot.note;
   if($("#outBarcode"))$("#outBarcode").value=snapshot.barcode;
 }
}
["stockInForm","stockOutForm"].forEach(fid=>{
 const f=$("#"+fid);
 if(!f)return;

 f.elements.category.onchange=()=>{
   const selected=String(f.elements.category.value||"");
   f.elements.category.dataset.selectedCategory=selected;
   f.elements.productId.dataset.selectedProduct="";
   fillProducts(fid,false);
 };

 f.elements.productId.onchange=()=>{
   f.elements.productId.dataset.selectedProduct=
     String(f.elements.productId.value||"");
   syncForm(fid);
 };

 const resetButton=f.querySelector('button[type="reset"]');
 if(resetButton){
   resetButton.onclick=e=>{
     e.preventDefault();
     resetStockForm(fid);
   };
 }
})
$("#inBarcode").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();const code=String(e.target.value||"").trim();const p=state.products.find(x=>String(x.barcode)===code||String(x.sku)===code);if(p){playScanSound(true);const f=$("#stockInForm");f.elements.category.value=p.category_id;f.elements.category.dataset.selectedCategory=String(p.category_id);fillProducts("stockInForm");f.elements.productId.value=p.product_id;f.elements.productId.dataset.selectedProduct=String(p.product_id);syncForm("stockInForm")}else{playScanSound(false);toast(t("ບໍ່ພົບ Barcode"))}}}
$("#outBarcode").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();const code=String(e.target.value||"").trim();const p=state.products.find(x=>String(x.barcode)===code||String(x.sku)===code);if(p){playScanSound(true);const f=$("#stockOutForm");f.elements.category.value=p.category_id;f.elements.category.dataset.selectedCategory=String(p.category_id);fillProducts("stockOutForm");f.elements.productId.value=p.product_id;f.elements.productId.dataset.selectedProduct=String(p.product_id);syncForm("stockOutForm")}else{playScanSound(false);toast(t("ບໍ່ພົບ Barcode"))}}}
const userModal=$("#userModal"), userForm=$("#userForm"), addUserBtn=$("#addUserBtn");
function closeUserModal(){
  if(!userModal)return;
  userModal.classList.remove("open");
  document.body.classList.remove("modal-open");
}
function openUserModal(user){
  if(!userModal||!userForm)return;
  if(!user && currentUser?.role!=="Admin"){toast("ສະເພາະ Admin ເທົ່ານັ້ນທີ່ສາມາດເພີ່ມຜູ້ໃຊ້ໄດ້");return;}
  userForm.reset();
  const editing=Boolean(user);
  userForm.elements.user_id.value=editing?user.user_id:"";
  userForm.elements.username.disabled=editing;
  userForm.elements.username.value=editing?(user.username||""):"";
  userForm.elements.display_name.value=editing?(user.display_name||""):"";
  const roleSelect=userForm.elements.role;
  [...roleSelect.options].forEach(option=>{option.disabled=currentUser?.role==="Manager"&&option.value==="Admin"});
  roleSelect.value=editing?(user.role||"Viewer"):"Viewer";
  userForm.elements.password.value="";
  userForm.elements.password.required=!editing;
  setText("#userModalTitle",editing?"ແກ້ໄຂ User":"ເພີ່ມ User");
  userModal.classList.add("open");
  document.body.classList.add("modal-open");
  setTimeout(()=>editing?userForm.elements.display_name.focus():userForm.elements.username.focus(),0);
}
if(addUserBtn)addUserBtn.addEventListener("click",()=>{
  if(currentUser?.role!=="Admin"){toast("ສະເພາະ Admin ເທົ່ານັ້ນທີ່ສາມາດເພີ່ມຜູ້ໃຊ້ໄດ້");return;}
  openUserModal(null);
});
if(userModal){
  userModal.addEventListener("click",e=>{
    if(e.target===userModal||e.target.closest("[data-close-user-modal]"))closeUserModal();
  });
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&userModal?.classList.contains("open"))closeUserModal()});
document.addEventListener("click",async e=>{
 const edit=e.target.closest("[data-edit-user]");
 if(edit){
   e.preventDefault();
   const u=state.users.find(x=>String(x.user_id)===String(edit.dataset.editUser));
   if(!u){toast("ບໍ່ພົບ User");return;}
   openUserModal(u);
   return;
 }
 const reset=e.target.closest("[data-reset-user]");
 if(reset){
   e.preventDefault();
   const pw=prompt("Password ໃໝ່ (ຢ່າງໜ້ອຍ 6 ຕົວ)");
   if(!pw)return;
   try{await api("resetUserPassword",{user_id:reset.dataset.resetUser,password:pw});toast("ປ່ຽນ Password ສຳເລັດ")}catch(err){toast(err.message)}
   return;
 }
 const toggle=e.target.closest("[data-toggle-user]");
 if(toggle){
   e.preventDefault();
   if(!confirm("ຢືນຢັນການປ່ຽນສະຖານະ User?"))return;
   try{await api("setUserActive",{user_id:toggle.dataset.toggleUser,is_active:toggle.dataset.active==="true"});await refreshAll();toast("ອັບເດດ User ສຳເລັດ")}catch(err){toast(err.message)}
 }
});
if(userForm)userForm.addEventListener("submit",async e=>{
 e.preventDefault();
 const submitButton=userForm.querySelector('button[type="submit"],button.primary:not([type])');
 if(userForm.dataset.saving==="1")return;
 userForm.dataset.saving="1";
 if(submitButton){submitButton.disabled=true;submitButton.dataset.originalText=submitButton.textContent;submitButton.textContent="ກຳລັງບັນທຶກ...";}
 const d=Object.fromEntries(new FormData(userForm));
 if(userForm.elements.username.disabled)d.username=userForm.elements.username.value;
 // Creating another account must never replace the logged-in Manager/Admin session.
 const activeToken=sessionToken;
 const activeUser=currentUser?{...currentUser}:null;
 try{
   if(d.user_id){
     await api("updateUser",{user:{user_id:d.user_id,display_name:d.display_name,role:d.role}});
     if(d.password)await api("resetUserPassword",{user_id:d.user_id,password:d.password});
   }else{
     if(currentUser?.role!=="Admin")throw new Error("ສະເພາະ Admin ເທົ່ານັ້ນທີ່ສາມາດເພີ່ມຜູ້ໃຊ້ໄດ້");
     await api("createUser",{user:d});
   }
   if(sessionToken!==activeToken){
     sessionToken=activeToken;
     localStorage.setItem("signshop_session",activeToken);
   }
   currentUser=activeUser;
   applyRole();
   closeUserModal();
   await refreshAll();
   openPage("users");
   toast("ບັນທຶກ User ສຳເລັດ");
 }catch(err){
   sessionToken=activeToken;
   if(activeToken)localStorage.setItem("signshop_session",activeToken);
   currentUser=activeUser;
   applyRole();
   toast(err.message);
 }finally{
   userForm.dataset.saving="0";
   if(submitButton){submitButton.disabled=false;submitButton.textContent=submitButton.dataset.originalText||"ບັນທຶກ";}
 }
});
$("#addCategoryBtn").onclick=async()=>{const name=prompt("ຊື່ໝວດໝູ່");if(name)try{await api("createCategory",{category_name:name});await refreshAll()}catch(err){toast(err.message)}}
$("#productSearch").oninput=()=>{productPage=1;renderProducts()};$("#productCategoryFilter").onchange=()=>{productPage=1;renderProducts()};$("#productStatusFilter").onchange=()=>{productPage=1;renderProducts()};$("#reportCategory").onchange=()=>{reportPage=1;renderReport()};$("#reportStatus").onchange=()=>{reportPage=1;renderReport()}
$("#exportProducts").onclick=()=>exportCsv(filteredProducts(),"products.csv");$("#exportReport").onclick=()=>exportCsv(filteredProducts(true),"stock-report.csv");
function setPrintOrientation(orientation){
  let style=document.getElementById("printPageOrientation");
  if(!style){
    style=document.createElement("style");
    style.id="printPageOrientation";
    document.head.appendChild(style);
  }
  const value=orientation==="landscape"?"landscape":"portrait";
  style.textContent=`@media print{@page{size:A4 ${value};margin:10mm}}`;
  localStorage.setItem("sanlian_print_orientation",value);
  return value;
}

function printSection(mode,orientation="portrait"){
  const selected=setPrintOrientation(orientation);
  document.body.classList.remove("print-products","print-report","print-qr","print-portrait","print-landscape");
  document.body.classList.add(mode,selected==="landscape"?"print-landscape":"print-portrait");

  const cleanup=()=>{
    document.body.classList.remove("print-products","print-report","print-qr","print-portrait","print-landscape");
    const f=$("#productForm");
    if(f){
      f.dataset.saving="0";
      const b=f.querySelector('button[type="submit"]');
      if(b){b.disabled=false;b.textContent=b.dataset.defaultText||"ບັນທຶກ";}
    }
  };

  window.addEventListener("afterprint",cleanup,{once:true});
  setTimeout(()=>window.print(),80);
}
$("#printProductsPortrait")?.addEventListener("click",()=>printSection("print-products","portrait"));
$("#printProductsLandscape")?.addEventListener("click",()=>printSection("print-products","landscape"));
$("#printReportPortrait")?.addEventListener("click",()=>printSection("print-report","portrait"));
$("#printReportLandscape")?.addEventListener("click",()=>printSection("print-report","landscape"))
$("#syncBtn").onclick=()=>refreshAll().catch(e=>toast(e.message));$("#themeBtn").onclick=()=>document.body.classList.toggle("dark");$("#globalSearch").oninput=e=>{openPage("products");$("#productSearch").value=e.target.value;renderProducts()}
setInterval(()=>{if(sessionToken)refreshAll().catch(()=>{})},(window.SIGNSHOP_CONFIG?.POLL_SECONDS||15)*1000);

$("#dashboardPeriod").onchange=renderDashboardCharts;
$("#refreshDashboard").onclick=()=>refreshAll().catch(e=>toast(e.message));
$("#exportDashboard").onclick=exportDashboardSummary;
$("#reportRangeType").onchange=e=>{const t=e.target.value;$("#reportDate").classList.toggle("hidden",t!=="day");$("#reportMonth").classList.toggle("hidden",t!=="month");$("#reportYear").classList.toggle("hidden",t!=="year");reportPage=1;renderReport()};
["reportDate","reportMonth","reportYear"].forEach(id=>$("#"+id).onchange=()=>{reportPage=1;renderReport()});
$("#exportReportPdf").onclick=()=>printSection("print-report",localStorage.getItem("sanlian_print_orientation")||"portrait");

$("#closeScannerBtn").onclick=closeScanner;
$("#cameraSelect").onchange=async e=>{activeCameraIndex=Number(e.target.value);await startScannerCamera()};
$("#switchCameraBtn").onclick=async()=>{if(!availableCameras.length)return;activeCameraIndex=(activeCameraIndex+1)%availableCameras.length;$("#cameraSelect").value=String(activeCameraIndex);await startScannerCamera()};
$("#torchBtn").onclick=toggleTorch;
$("#applyManualScan").onclick=async()=>{const v=$("#manualScanValue").value.trim();if(v&&activeScanTarget){applyScannedCode(v,activeScanTarget);await closeScanner()}};
$("#closeQrBtn").onclick=()=>$("#qrModal").classList.remove("open");
$("#printQrBtn").onclick=()=>printSection("print-qr","portrait");
setupUsbScanner();

["auditSearch","auditActionFilter","auditUserFilter","auditDateFrom","auditDateTo"].forEach(id=>{
 const e=$("#"+id);
 if(e){
   const handler=()=>{auditPage=1;renderAudit()};
   e.oninput=handler;
   e.onchange=handler;
 }
});

function bindHistoryPagination(prefix,getPage,setPage,getTotal,render){
 const first=$("#"+prefix+"FirstBtn"),prev=$("#"+prefix+"PrevBtn"),next=$("#"+prefix+"NextBtn"),last=$("#"+prefix+"LastBtn"),numbers=$("#"+prefix+"PageNumbers");
 if(first)first.onclick=()=>{setPage(1);render();scrollPageTop(prefix)};
 if(prev)prev.onclick=()=>{if(getPage()>1){setPage(getPage()-1);render();scrollPageTop(prefix)}};
 if(next)next.onclick=()=>{
   const size=prefix==="stockIn"?stockInPageSize:prefix==="stockOut"?stockOutPageSize:PAGE_SIZE;
   const pages=Math.max(1,Math.ceil(getTotal()/size));
   const target=Math.min(pages,getPage()+1);
   if(target!==getPage()){setPage(target);render();scrollPageTop(prefix)}
 };
 if(last)last.onclick=()=>{
   const size=prefix==="stockIn"?stockInPageSize:prefix==="stockOut"?stockOutPageSize:PAGE_SIZE;
   const pages=Math.max(1,Math.ceil(getTotal()/size));
   setPage(pages);render();scrollPageTop(prefix)
 };
 if(numbers)numbers.addEventListener("click",e=>{
   const b=e.target.closest("[data-page]");
   if(!b)return;
   const size=prefix==="stockIn"?stockInPageSize:prefix==="stockOut"?stockOutPageSize:PAGE_SIZE;
   const pages=Math.max(1,Math.ceil(getTotal()/size));
   const target=Math.min(pages,Math.max(1,Number(b.dataset.page)||1));
   setPage(target);render();scrollPageTop(prefix)
 });
}
bindHistoryPagination("stockIn",()=>stockInPage,v=>stockInPage=v,()=>stockHistoryFiltered("IN").length,renderStock);
bindHistoryPagination("stockOut",()=>stockOutPage,v=>stockOutPage=v,()=>stockHistoryFiltered("OUT").length,renderStock);


// Category pagination
if($("#categoryFirstBtn"))$("#categoryFirstBtn").onclick=()=>{categoryPage=1;renderCategories();scrollPageTop("categories")};
if($("#categoryPrevBtn"))$("#categoryPrevBtn").onclick=()=>{if(categoryPage>1){categoryPage--;renderCategories();scrollPageTop("categories")}};
if($("#categoryNextBtn"))$("#categoryNextBtn").onclick=()=>{const pages=Math.max(1,Math.ceil((state.categories||[]).length/categoryPageSize));if(categoryPage<pages){categoryPage++;renderCategories();scrollPageTop("categories")}};
if($("#categoryLastBtn"))$("#categoryLastBtn").onclick=()=>{categoryPage=Math.max(1,Math.ceil((state.categories||[]).length/categoryPageSize));renderCategories();scrollPageTop("categories")};
$("#categoryPageNumbers")?.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){categoryPage=Number(b.dataset.page);renderCategories();scrollPageTop("categories")}});
if($("#categoryPageSize"))$("#categoryPageSize").onchange=e=>{categoryPageSize=Math.max(1,Number(e.target.value)||10);categoryPage=1;localStorage.setItem("sanlian_category_page_size",String(categoryPageSize));renderCategories()};
if($("#auditPageSize"))$("#auditPageSize").onchange=e=>{auditPageSize=Math.max(1,Number(e.target.value)||10);auditPage=1;localStorage.setItem("sanlian_audit_page_size",String(auditPageSize));renderAudit()};
["stockIn","stockOut"].forEach(prefix=>{
 const search=$("#"+prefix+"Search"),size=$("#"+prefix+"PageSize"),refresh=$("#"+prefix+"RefreshBtn");
 if(search)search.oninput=()=>{if(prefix==="stockIn")stockInPage=1;else stockOutPage=1;renderStock()};
 if(size)size.onchange=e=>{const v=Math.max(1,Number(e.target.value)||10);if(prefix==="stockIn"){stockInPageSize=v;stockInPage=1}else{stockOutPageSize=v;stockOutPage=1}localStorage.setItem("sanlian_"+prefix+"_page_size",String(v));renderStock()};
 if(refresh)refresh.onclick=()=>refreshAll().catch(e=>toast(e.message));
});
$("#auditBody")?.addEventListener("click",e=>{const tr=e.target.closest("[data-audit-index]");if(tr)openAuditDetail(tr.dataset.auditIndex)});
const closeAudit=()=>{const modal=$("#auditDetailModal");modal?.classList.remove("open");modal?.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open")};
$("#closeAuditDetail")?.addEventListener("click",closeAudit);
$("#closeAuditDetailBottom")?.addEventListener("click",closeAudit);
$("#auditDetailModal")?.addEventListener("click",e=>{if(e.target===$("#auditDetailModal"))closeAudit()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#auditDetailModal")?.classList.contains("open"))closeAudit()});
document.addEventListener("click",e=>{if(e.target.closest("#closeAuditDetail,#closeAuditDetailBottom"))closeAudit()});


if($("#auditFirstBtn"))$("#auditFirstBtn").onclick=()=>{auditPage=1;renderAudit();scrollPageTop("audit")};
if($("#auditPrevBtn"))$("#auditPrevBtn").onclick=()=>{if(auditPage>1){auditPage--;renderAudit();scrollPageTop("audit")}};
if($("#auditNextBtn"))$("#auditNextBtn").onclick=()=>{const pages=Math.max(1,Math.ceil(auditFiltered().length/auditPageSize));if(auditPage<pages){auditPage++;renderAudit();scrollPageTop("audit")}};
if($("#auditLastBtn"))$("#auditLastBtn").onclick=()=>{auditPage=Math.max(1,Math.ceil(auditFiltered().length/auditPageSize));renderAudit();scrollPageTop("audit")};
$("#auditPageNumbers")?.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){auditPage=Number(b.dataset.page);renderAudit();scrollPageTop("audit")}});
$("#productPageNumbers")?.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){productPage=Number(b.dataset.page);renderProducts();scrollPageTop("products")}});
if($("#productFirstBtn"))$("#productFirstBtn").onclick=()=>{productPage=1;renderProducts();scrollPageTop("products")};
if($("#productPrevBtn"))$("#productPrevBtn").onclick=()=>{if(productPage>1){productPage--;renderProducts();scrollPageTop("products")}};
if($("#productNextBtn"))$("#productNextBtn").onclick=()=>{const pages=Math.max(1,Math.ceil(filteredProducts().length/productPageSize));if(productPage<pages){productPage++;renderProducts();scrollPageTop("products")}};
if($("#productLastBtn"))$("#productLastBtn").onclick=()=>{productPage=Math.max(1,Math.ceil(filteredProducts().length/productPageSize));renderProducts();scrollPageTop("products")};
if($("#productPageSize"))$("#productPageSize").onchange=e=>{productPageSize=Math.max(1,Number(e.target.value)||10);productPage=1;localStorage.setItem("sanlian_product_page_size",String(productPageSize));renderProducts()};
if($("#reportPageSize"))$("#reportPageSize").onchange=e=>{reportPageSize=Math.max(1,Number(e.target.value)||10);reportPage=1;localStorage.setItem("sanlian_report_page_size",String(reportPageSize));renderReport()};
$("#reportPageNumbers")?.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){reportPage=Number(b.dataset.page);renderReport();scrollPageTop("reports")}});
if($("#reportFirstBtn"))$("#reportFirstBtn").onclick=()=>{reportPage=1;renderReport();scrollPageTop("reports")};
if($("#reportPrevBtn"))$("#reportPrevBtn").onclick=()=>{if(reportPage>1){reportPage--;renderReport();scrollPageTop("reports")}};
if($("#reportNextBtn"))$("#reportNextBtn").onclick=()=>{const pages=Math.max(1,Math.ceil(filteredProducts(true).length/reportPageSize));if(reportPage<pages){reportPage++;renderReport();scrollPageTop("reports")}};
if($("#reportLastBtn"))$("#reportLastBtn").onclick=()=>{reportPage=Math.max(1,Math.ceil(filteredProducts(true).length/reportPageSize));renderReport();scrollPageTop("reports")};
$("#exportAuditBtn").onclick=exportAuditCsv;
$("#clearAuditBtn")?.addEventListener("click",clearAuditLogsAsAdmin);
$("#refreshAuditBtn").onclick=()=>{auditPage=1;refreshAll().catch(e=>toast(e.message))};
$("#archiveMonthlyBtn")?.addEventListener("click",archiveMonthlyTransactions);
$("#createBackupBtn").onclick=async()=>{if(!confirm("Create Google Drive backup now?"))return;try{toast("Creating backup...");await api("createBackup");await refreshAll();toast("Backup completed")}catch(err){toast(err.message)}};
$("#downloadSnapshotBtn").onclick=downloadSnapshot;

const installAppBtn=$("#installAppBtn"); if(installAppBtn) installAppBtn.onclick=promptInstall;
const clearCache=$("#clearCacheBtn");if(clearCache)clearCache.onclick=clearOfflineCache;
const applyUpdate=$("#applyUpdateBtn");if(applyUpdate)applyUpdate.onclick=()=>{
  if(serviceWorkerRegistration?.waiting)serviceWorkerRegistration.waiting.postMessage("SKIP_WAITING");
};
// PWA disabled in clean deployment to prevent stale cache freezes.
window.addEventListener("DOMContentLoaded",async()=>{
  productPageSize=Math.max(1,Number(localStorage.getItem("sanlian_product_page_size"))||10);
  reportPageSize=Math.max(1,Number(localStorage.getItem("sanlian_report_page_size"))||10);
  categoryPageSize=Math.max(1,Number(localStorage.getItem("sanlian_category_page_size"))||10);
  auditPageSize=Math.max(1,Number(localStorage.getItem("sanlian_audit_page_size"))||10);
  stockInPageSize=Math.max(1,Number(localStorage.getItem("sanlian_stockIn_page_size"))||10);
  stockOutPageSize=Math.max(1,Number(localStorage.getItem("sanlian_stockOut_page_size"))||10);
  if($("#productPageSize"))$("#productPageSize").value=String(productPageSize);
  if($("#reportPageSize"))$("#reportPageSize").value=String(reportPageSize);
  if($("#categoryPageSize"))$("#categoryPageSize").value=String(categoryPageSize);
  if($("#auditPageSize"))$("#auditPageSize").value=String(auditPageSize);
  if($("#stockInPageSize"))$("#stockInPageSize").value=String(stockInPageSize);
  if($("#stockOutPageSize"))$("#stockOutPageSize").value=String(stockOutPageSize);
  initLanguage();
  // Keep the authenticated view visible during refresh when a cached session exists.
  if(sessionToken && currentUser){
    applyRole();
    showApp();
  }else{
    showLogin();
  }
  const backendEl=document.querySelector("#backendVersion");
  if(backendEl) backendEl.textContent=API_URL ? "Backend: ready" : "Backend: config.js required";
  window.setTimeout(()=>{
    restoreSession().catch(err=>{
      console.error("Session restore failed:",err);
      if(sessionToken && currentUser){
        applyRole();
        showApp();
        setText("#syncStatus","● Offline");
      }else{
        showLogin();
        setText("#loginError",err?.message||"Session restore error");
      }
    });
  },0);
});
