const STORAGE_KEY = "hmr_ui_sketch_v1";

const FIXED_API_URL = "https://hmr-proxy.darwin-gacuya081.workers.dev/";

const elDate = document.getElementById("date");
const elCP1 = document.getElementById("cp1");
const elCP2 = document.getElementById("cp2");
const elCP3 = document.getElementById("cp3");
const elCPSite = document.getElementById("cpSite");

const elScriptUrl = document.getElementById("scriptUrl");
// Force the textbox to the fixed URL (and lock it)
if (elScriptUrl) {
  elScriptUrl.value = FIXED_API_URL;
  elScriptUrl.readOnly = true;
}

const statusEl = document.getElementById("status");

const rowsHEO = document.getElementById("rows-HEO");
const rowsSpotter = document.getElementById("rows-Spotter");
const rowsHelper = document.getElementById("rows-Helper");
const rowsFlagman = document.getElementById("rows-Flagman");
const rowsEquip = document.getElementById("rows-Equipment");

const elDraftKey = document.getElementById("draftKey");
const btnSaveDraft = document.getElementById("saveDraft");
const btnLoadDraft = document.getElementById("loadDraft");

const draftMemoryCache = new Map(); // key -> draft data
let lastLoadedDraftKey = "";


function setStatus(msg, ok = true){
  statusEl.textContent = msg;
  statusEl.style.color = ok ? "#9fb0c7" : "#ff9aa3";
}

function num(v){
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function save(){
  // Save everything EXCEPT OT values
  const data = {
    header: {
      date: elDate.value || "",
      cp1: elCP1.value || "",
      cp2: elCP2.value || "",
      cp3: elCP3.value || "",
      cpSite: (elCPSite?.value || "CP2").trim(),
      draftKey: elDraftKey.value || ""
    },
    manpower: {
      HEO: serializeMan(rowsHEO),
      Spotter: serializeMan(rowsSpotter),
      Helper: serializeMan(rowsHelper),
      Flagman: serializeMan(rowsFlagman)
    },
    equipment: serializeEquip(rowsEquip)
  };

  // OT rule: blank OT before saving
  ["HEO","Spotter","Helper","Flagman"].forEach(role => {
    data.manpower[role] = data.manpower[role].map(r => ({...r, otHours:""}));
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  setStatus("Saved locally (OT will NOT restore after refresh).");
}

function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    // Defaults: 3 rows each like your sketch
    for(let i=0;i<3;i++) addManRow("HEO");
    for(let i=0;i<3;i++) addManRow("Spotter");
    for(let i=0;i<3;i++) addManRow("Helper");
    for(let i=0;i<3;i++) addManRow("Flagman");
    addEquipRow(); addEquipRow();
    return;
  }

  try{
    const data = JSON.parse(raw);
    elDate.value = data.header?.date || "";
    elCP1.value = data.header?.cp1 || "";
    elCP2.value = data.header?.cp2 || "";
    elCP3.value = data.header?.cp3 || "";
    elCPSite.value = data.header?.cpSite || "";
    elDraftKey.value = data.header?.draftKey || "";

    rowsHEO.innerHTML = "";
    rowsSpotter.innerHTML = "";
    rowsHelper.innerHTML = "";
    rowsFlagman.innerHTML = "";
    rowsEquip.innerHTML = "";

    (data.manpower?.HEO || []).forEach(r => addManRow("HEO", r));
    (data.manpower?.Spotter || []).forEach(r => addManRow("Spotter", r));
    (data.manpower?.Helper || []).forEach(r => addManRow("Helper", r));
    (data.manpower?.Flagman || []).forEach(r => addManRow("Flagman", r));

    (data.equipment || []).forEach(r => addEquipRow(r));

    // Ensure at least one row per section
    if(!rowsHEO.children.length) addManRow("HEO");
    if(!rowsSpotter.children.length) addManRow("Spotter");
    if(!rowsHelper.children.length) addManRow("Helper");
    if(!rowsFlagman.children.length) addManRow("Flagman");
    if(!rowsEquip.children.length) addEquipRow();

    setStatus("Loaded saved form (OT cleared by rule).");
  } catch(e){
    localStorage.removeItem(STORAGE_KEY);
  }
}

function makeInput(type, placeholder="", value=""){
  const i = document.createElement("input");
  i.type = type;
  i.placeholder = placeholder;
  i.value = value ?? "";
  return i;
}

function makeXBtn(onClick){
  const b = document.createElement("button");
  b.className = "xbtn";
  b.textContent = "X";
  b.addEventListener("click", onClick);
  return b;
}

// ---------- MANPOWER ----------
function makeCell(labelText, inputEl){
  const cell = document.createElement("div");
  cell.className = "cell";

  const lab = document.createElement("div");
  lab.className = "miniLabel";
  lab.textContent = labelText;

  cell.append(lab, inputEl);
  return cell;
}

// ---------- MANPOWER CONTAINER RESOLVER ----------
function getManContainer(role){
  if (role === "HEO") return rowsHEO;
  if (role === "Spotter") return rowsSpotter;
  if (role === "Helper") return rowsHelper;
  if (role === "Flagman") return rowsFlagman;
  return null;
}

function addManRow(role, data = {}){
  const wrap = document.createElement("div");
  wrap.className = "rowMan";

  const roleToDatalist = {
    HEO: "dl-heo",
    Spotter: "dl-spotter",
    Helper: "dl-helper",
    Flagman: "dl-flagman"
  };
  
  const name = makeInput("text","Name", data.name || "");
  name.setAttribute("list", roleToDatalist[role] || "dl-helper");

  const work = makeInput("number","Work Hours", data.workHours || "");
  work.step = "0.5";

  const ot = makeInput("number","OT Hours", data.otHours || "");
  ot.step = "0.5";

  const x = makeXBtn(() => { wrap.remove(); save(); });

  [name, work, ot].forEach(el => el.addEventListener("input", save));

  wrap.append(
    makeCell("Name", name),
    makeCell("Work Hours", work),
    makeCell("OT Hours", ot),
    x
  );

  getManContainer(role).appendChild(wrap);
}

// ---------- SERIALIZE MANPOWER ----------
function serializeMan(container){
  const rows = [];

  [...container.children].forEach(row => {
    const inputs = row.querySelectorAll("input");

    if (inputs.length < 3) return;

    rows.push({
      name: inputs[0].value || "",
      workHours: inputs[1].value || "",
      otHours: inputs[2].value || ""
    });
  });

  return rows;
}

// ---------- EQUIPMENT ----------
function addEquipRow(data = {}){
  const wrap = document.createElement("div");
  wrap.className = "rowEq";

  const eq = makeInput("text","Equipment Name", data.equipmentName || "");
  eq.setAttribute("list", "dl-equipment");

  const before = makeInput("number","Before", data.before || "");
  const after  = makeInput("number","After",  data.after || "");
  before.step = "0.01";
  after.step  = "0.01";

  const hmr = makeInput("number","HMR", data.hmr || "");
  hmr.step = "0.01";
  hmr.readOnly = true;
  hmr.classList.add("readonly");

  function compute(){
    const v = num(after.value) - num(before.value);
    hmr.value = (Number.isFinite(v) ? v : 0).toFixed(2);
  }

  before.addEventListener("input", () => { compute(); save(); });
  after.addEventListener("input", () => { compute(); save(); });
  eq.addEventListener("input", save);

  const x = makeXBtn(() => { wrap.remove(); save(); });

  wrap.append(
    makeCell("Equipment", eq),
    makeCell("Before", before),
    makeCell("After", after),
    makeCell("HMR", hmr),
    x
  );

  rowsEquip.appendChild(wrap);
  compute();
}

function serializeEquip(container){
  const rows = [];
  [...container.children].forEach(r => {
    const inputs = r.querySelectorAll("input");
    rows.push({
      equipmentName: inputs[0]?.value || "",
      before: inputs[1]?.value || "",
      after: inputs[2]?.value || "",
      hmr: inputs[3]?.value || ""
    });
  });
  return rows;
}

// ---------- Buttons ----------
document.querySelectorAll("[data-add]").forEach(btn => {
  btn.addEventListener("click", () => addManRow(btn.getAttribute("data-add")));
});

document.getElementById("addEquipment").addEventListener("click", () => addEquipRow());

document.getElementById("resetOt").addEventListener("click", () => {
  [rowsHEO, rowsSpotter, rowsHelper, rowsFlagman].forEach(container => {
    [...container.children].forEach(r => {
      const ot = r.querySelectorAll("input")[2];
      if(ot) ot.value = "";
    });
  });
  setStatus("OT cleared.");
});

document.getElementById("clearSaved").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

[elDate, elCP1, elCP2, elCP3, elScriptUrl].forEach(el => el.addEventListener("input", save));

// ---------- Submit ----------
function buildPayload() {
  const manpowerAll = [
    ...serializeMan(rowsHEO).map(r => ({ role: "HEO", ...r })),
    ...serializeMan(rowsSpotter).map(r => ({ role: "Spotter", ...r })),
    ...serializeMan(rowsHelper).map(r => ({ role: "Helper", ...r })),
    ...serializeMan(rowsFlagman).map(r => ({ role: "Flagman", ...r })),
  ];

  // ✅ Option A: submit manpower if name exists AND (work>0 OR ot>0)
  const manpowerFiltered = manpowerAll.filter(r => {
    const name = String(r.name || "").trim();
    if (!name) return false;

    const work = parseFloat(r.workHours);
    const ot   = parseFloat(r.otHours);

    const hasWork = Number.isFinite(work) && work > 0;
    const hasOT   = Number.isFinite(ot) && ot > 0;

    return hasWork || hasOT;
  });

  // Optional: normalize numbers so Apps Script gets clean values
  const manpowerClean = manpowerFiltered.map(r => {
    const work = parseFloat(r.workHours);
    const ot   = parseFloat(r.otHours);
    return {
      role: r.role,
      name: String(r.name || "").trim(),
      workHours: (Number.isFinite(work) ? work : 0),
      otHours: (Number.isFinite(ot) ? ot : 0),
    };
  });

  return {
    date: elDate.value || "",
    cp1: elCP1.value || "",
    cp2: elCP2.value || "",
    cp3: elCP3.value || "",
    cpSite: (elCPSite?.value || "CP2").trim(),
    manpower: manpowerClean,
    equipment: serializeEquip(rowsEquip),
  };
}


async function submitAll(){
  const url = FIXED_API_URL;

  const payload = { action: "submitAll", ...buildPayload() };
  if(!payload.date) return setStatus("Date is required.", false);

  setStatus("Submitting...");
  try{
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let json;
    try{ json = JSON.parse(text); } catch { json = { raw:text }; }

    if(json.status === "ok"){
      setStatus(`Submitted ✅ ${json.message || ""}`.trim());
      
      // ✅ NEW: after submit, move After -> Before (equipment section)
      rollEquipmentAfterToBefore();
      
    } else {
      setStatus(`Submit failed: ${json.message || text}`, false);
    }
  } catch(e){
    setStatus(`Submit error: ${e.message}`, false);
  }
}

document.getElementById("submitAll").addEventListener("click", submitAll);

function fillDatalist(id, items) {
  const dl = document.getElementById(id);
  if (!dl) return;
  dl.innerHTML = "";
  (items || []).forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    dl.appendChild(opt);
  });
}

async function refreshMasterData() {
  const url = FIXED_API_URL;

  try {
    // Works whether your URL already has ? or not
    const u = new URL(url);
    u.searchParams.set("action", "masterdata");

    const res = await fetch(u.toString(), { method: "GET" });
    const text = await res.text();

    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    if (!json || json.status !== "ok") {
      setStatus("MasterData fetch failed (check Web App access).", false);
      return;
    }

    const d = json.data || {};
    fillDatalist("dl-heo", d.HEO || []);
    fillDatalist("dl-spotter", d.Spotter || []);
    fillDatalist("dl-helper", d.Helper || []);
    fillDatalist("dl-flagman", d.Flagman || []);
    fillDatalist("dl-equipment", d.Equipment || []);

    setStatus("Autocomplete lists updated from MasterData ✅");
  } catch (e) {
    setStatus("MasterData fetch error: " + e.message, false);
  }
}

function rollEquipmentAfterToBefore() {
  [...rowsEquip.children].forEach(row => {
    const inputs = row.querySelectorAll("input");
    if (!inputs || inputs.length < 4) return;

    const eqName = inputs[0];
    const before = inputs[1];
    const after  = inputs[2];
    const hmr    = inputs[3];

    const eq = (eqName.value || "").trim();
    const a  = (after.value || "").trim();

    // only roll real rows with AFTER value
    if (!eq) return;
    if (a === "") return;

    // ✅ move After -> Before
    before.value = a;

    // ✅ clear After
    after.value = "";

    // ✅ clear HMR (so next time it recomputes when you type new After)
    hmr.value = "";
  });

  // persist changes
  save();
}

function buildDraftObject() {
  // Same structure you already store locally
  return {
    header: {
      date: elDate.value || "",
      cp1: elCP1.value || "",
      cp2: elCP2.value || "",
      cp3: elCP3.value || "",
      cpSite: (elCPSite?.value || "CP2").trim(),
      draftKey: elDraftKey.value || ""
    },
    manpower: {
      HEO: serializeMan(rowsHEO),
      Spotter: serializeMan(rowsSpotter),
      Helper: serializeMan(rowsHelper),
      Flagman: serializeMan(rowsFlagman),
    },
    equipment: serializeEquip(rowsEquip)
  };
}

async function saveDraftToCloud() {
  const url = FIXED_API_URL;
  const key = (elDraftKey.value || "").trim();
  if (!url || !key) return setStatus("Set Script URL and Draft Key first.", false);

  const payload = {
    action: "draftSave",
    key,
    data: buildDraftObject()
  };

  setStatus("Saving draft to cloud...");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const text = await res.text(); // helps debugging
    // optional parse
    // let json; try { json = JSON.parse(text); } catch { json = null; }

    saveLocalSilent();

    // ✅ make switching instant + always updated
    draftMemoryCache.set(key, buildDraftObject());
    lastLoadedDraftKey = key;
    
    setStatus("Draft saved to cloud ✅");

  } catch (e) {
    setStatus("Draft save failed: " + e.message, false);
  }
}

function saveLocalSilent(){
  const data = {
    header: {
      date: elDate.value || "",
      cp1: elCP1.value || "",
      cp2: elCP2.value || "",
      cp3: elCP3.value || "",
      cpSite: (elCPSite?.value || "CP2").trim(),
      draftKey: elDraftKey.value || ""
    },
    manpower: {
      HEO: serializeMan(rowsHEO),
      Spotter: serializeMan(rowsSpotter),
      Helper: serializeMan(rowsHelper),
      Flagman: serializeMan(rowsFlagman)
    },
    equipment: serializeEquip(rowsEquip)
  };

  // OT rule: blank OT before saving
  ["HEO","Spotter","Helper","Flagman"].forEach(role => {
    data.manpower[role] = data.manpower[role].map(r => ({...r, otHours:""}));
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function applyDraft(d) {
  elDate.value = d.header?.date || elDate.value;
  elCP1.value = d.header?.cp1 || elCP1.value;
  elCP2.value = d.header?.cp2 || elCP2.value;
  elCP3.value = d.header?.cp3 || elCP3.value;
  elCPSite.value = d.header?.cpSite || elCPSite.value;

  rowsHEO.innerHTML = "";
  rowsSpotter.innerHTML = "";
  rowsHelper.innerHTML = "";
  rowsFlagman.innerHTML = "";
  rowsEquip.innerHTML = "";

  (d.manpower?.HEO || []).forEach(r => addManRow("HEO", r));
  (d.manpower?.Spotter || []).forEach(r => addManRow("Spotter", r));
  (d.manpower?.Helper || []).forEach(r => addManRow("Helper", r));
  (d.manpower?.Flagman || []).forEach(r => addManRow("Flagman", r));
  (d.equipment || []).forEach(r => addEquipRow(r));

  saveLocalSilent();
}

async function loadDraftFromCloud() {
  const url = FIXED_API_URL;
  const key = (elDraftKey.value || "").trim();
  if (!url || !key) return setStatus("Set Script URL and Draft Key first.", false);

  // ✅ If same key is already loaded, do nothing
  if (key === lastLoadedDraftKey) {
    return setStatus("Draft already loaded ✅");
  }

  // ✅ If we already loaded this key before, load instantly from memory
  if (draftMemoryCache.has(key)) {
    setStatus("Loading draft (memory cache)...");
    applyDraft(draftMemoryCache.get(key));
    lastLoadedDraftKey = key;
    return setStatus("Loaded draft instantly ✅");
  }

  setStatus("Loading draft from cloud...");

  try {
    const u = new URL(url);
    u.searchParams.set("action", "draftGet");
    u.searchParams.set("key", key);

    const res = await fetch(u.toString(), { method: "GET" });
    const json = await res.json();

    if (!json || json.status !== "ok") {
      return setStatus((json && json.message) || "Draft load failed", false);
    }
    if (!json.data) {
      return setStatus("No saved draft found for that key.", false);
    }

    // ✅ Save to memory cache
    draftMemoryCache.set(key, json.data);

    // ✅ Apply
    applyDraft(json.data);
    
    lastLoadedDraftKey = key;
    setStatus("Loaded draft from cloud ✅");
    // ✅ update memory cache so future loads are instant + updated
    
  } catch (e) {
    setStatus("Draft load failed: " + e.message, false);
  }
}

// --- Draft sync listeners (attach once) ---
if (btnSaveDraft) btnSaveDraft.addEventListener("click", saveDraftToCloud);
if (btnLoadDraft) btnLoadDraft.addEventListener("click", loadDraftFromCloud);

// function autoLoadDraftIfReady() {
//   const url = FIXED_API_URL;
//   const key = (elDraftKey.value || "").trim();
//   if (url && key) loadDraftFromCloud();
// }

// INIT
load();

// ensure the fixed URL is shown (optional)
if (elScriptUrl) {
  elScriptUrl.value = FIXED_API_URL;
  elScriptUrl.readOnly = true;
}

refreshMasterData();

// When scriptUrl changes, re-fetch autocomplete
// elScriptUrl.addEventListener("change", refreshMasterData);
// elScriptUrl.addEventListener("blur", refreshMasterData);
