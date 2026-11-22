import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const SUPABASE_URL = "https://abqwyxtghsvkwedhqcyv.supabase.co";
const SUPABASE_KEY = "sb_publishable_vflJpQgec7RCkclQbBi_RQ_mrUVOsj-";
const DB_NAME = "pvefps-knowledge-hub";
const BUCKET = "knowledge-files";
const OWNER_KEY = "pvefps-kh-cloud-owner";
const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let syncTimer = null;
let syncing = false;
let syncAgain = false;
let lastUserId = null;
const $ = (s) => document.querySelector(s);
const iso = (v) => v ? new Date(v).toISOString() : new Date().toISOString();
const stamp = (v) => Date.parse(v || 0) || 0;
const strip = (html) => {
  const node = document.createElement("div");
  node.innerHTML = html || "";
  return (node.textContent || node.innerText || "").trim();
};
const safeName = (s) => String(s || "file").replace(/[\\\/:*?"<>|]/g, "_").slice(0, 160);

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function all(store) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function fetchAll(table, columns, userId) {
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from(table).select(columns).eq("user_id", userId).range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}
async function upsertChunks(table, rows, onConflict) {
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const { error } = await client.from(table).upsert(rows.slice(i, i + chunkSize), { onConflict });
    if (error) throw error;
  }
}
async function replaceAll(store, rows) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    os.clear();
    rows.forEach((row) => os.put(row));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("로컬 저장소 갱신 실패"));
  });
}
async function status(message, good = false) {
  const node = $("#kh-syncstatus");
  if (node) {
    node.textContent = message;
    node.style.color = good ? "#16834a" : "#68717d";
  }
  const cloud = $("#kh-cloudstatus");
  if (cloud) cloud.textContent = message;
}
function announce() {
  window.dispatchEvent(new CustomEvent("knowledge-cloud-updated"));
}
function queueSync() {
  if (!lastUserId) return;
  if (syncing) { syncAgain = true; return; }
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncAll(false), 1800);
}

async function upsertNotebookMap(userId, localNotes, remoteNotebooks) {
  const names = [...new Set(localNotes.map(n => n.book || "기본 노트북"))];
  const rows = names.map(name => ({ user_id: userId, name }));
  if (rows.length) {
    await upsertChunks("notebooks", rows, "user_id,name");
  }
  const { data, error } = await client.from("notebooks").select("id,name").eq("user_id", userId);
  if (error) throw error;
  return new Map((data || []).map(x => [x.name, x.id]));
}
async function upsertTagMap(userId, localNotes) {
  const names = [...new Set(localNotes.flatMap(n => Array.isArray(n.tags) ? n.tags : []))];
  if (names.length) {
    await upsertChunks("tags", names.map(name => ({ user_id: userId, name })), "user_id,name");
  }
  const { data, error } = await client.from("tags").select("id,name").eq("user_id", userId);
  if (error) throw error;
  return new Map((data || []).map(x => [x.name, x.id]));
}
function localNoteToRow(n, userId, notebookMap) {
  return {
    id: n.id, user_id: userId, notebook_id: notebookMap.get(n.book || "기본 노트북") || null,
    title: n.title || "새 노트", content: { html: n.body || "" },
    content_text: strip(n.body || ""), note_type: n.url ? "web_clip" : "note",
    source_url: n.url || null, source_title: n.url ? (n.title || null) : null,
    excerpt: null, is_favorite: !!n.favorite, is_archived: !!n.archived,
    is_pinned: !!n.pinned, created_at: iso(n.created), updated_at: iso(n.updated)
  };
}
function rowToLocalNote(row, notebookNames, tagNames) {
  const content = row.content && typeof row.content === "object" ? row.content : {};
  return {
    id: row.id, title: row.title || "새 노트", body: content.html || "",
    book: notebookNames.get(row.notebook_id) || "기본 노트북",
    tags: tagNames || [], url: row.source_url || "",
    favorite: !!row.is_favorite, archived: !!row.is_archived, pinned: !!row.is_pinned,
    created: row.created_at, updated: row.updated_at
  };
}
function localTaskToRow(t, userId) {
  const due = t.due && /^\\d{4}-\\d{2}-\\d{2}$/.test(t.due) ? t.due + "T00:00:00.000Z" : null;
  return {
    id: t.id, user_id: userId, title: t.title || "할 일", description: t.description || null,
    status: t.done ? "done" : (t.status || "todo"), priority: t.priority || "normal",
    due_at: due, completed_at: t.done ? iso(t.updated || t.created) : null,
    created_at: iso(t.created), updated_at: iso(t.updated || t.created)
  };
}
function rowToLocalTask(t) {
  return {
    id: t.id, title: t.title, description: t.description || "",
    due: t.due_at ? t.due_at.slice(0, 10) : "", done: t.status === "done",
    status: t.status, priority: t.priority, created: t.created_at, updated: t.updated_at
  };
}
async function uploadLocalFiles(userId, localFiles, remoteFiles) {
  const remoteById = new Map((remoteFiles || []).map(f => [f.id, f]));
  const result = [];
  const pending = [];
  const attachmentLimitBytes = 250 * 1024 * 1024;
  let projectedBytes = (remoteFiles || []).reduce((sum, file) => sum + Number(file.size_bytes || 0), 0);
  for (const file of localFiles) {
    if (!file.blob) continue;
    const existing = remoteById.get(file.id);
    if (existing && stamp(existing.created_at) >= stamp(file.updated || file.created)) {
      result.push(file);
      continue;
    }
    const size = file.blob.size;
    projectedBytes = projectedBytes - Number(existing?.size_bytes || 0) + size;
    pending.push({ file, size });
  }
  if (projectedBytes > attachmentLimitBytes) {
    const error = new Error("지식관리 첨부파일 무료 저장 예산 250MB에 도달했습니다. 로컬 파일은 유지하고 클라우드 업로드를 중단했습니다.");
    error.code = "WHITEBOARD_QUOTA";
    throw error;
  }
  for (const item of pending) {
    const file = item.file;
    const path = userId + "/" + file.id + "/" + safeName(file.name);
    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file.blob, {
      contentType: file.type || "application/octet-stream", upsert: true
    });
    if (uploadError) throw uploadError;
    const row = {
      id: file.id, user_id: userId, note_id: file.noteId || null, storage_path: path,
      file_name: file.name, mime_type: file.type || null, size_bytes: item.size,
      created_at: iso(file.created)
    };
    const { error } = await client.from("attachments").upsert(row, { onConflict: "id" });
    if (error) throw error;
    result.push(file);
  }
  return result;
}
async function downloadRemoteFiles(remoteFiles, localFiles) {
  const localIds = new Set(localFiles.map(f => f.id));
  const result = [...localFiles];
  for (const row of remoteFiles || []) {
    if (localIds.has(row.id)) continue;
    const { data, error } = await client.storage.from(BUCKET).download(row.storage_path);
    if (error) throw error;
    result.push({
      id: row.id, noteId: row.note_id, name: row.file_name, type: row.mime_type || data.type,
      size: row.size_bytes || data.size, created: row.created_at, blob: data
    });
  }
  return result;
}
async function syncAll(showToast = true) {
  if (syncing) return;
  const { data: auth } = await client.auth.getUser();
  const user = auth && auth.user;
  if (!user) { lastUserId = null; await status("로그인하면 클라우드 동기화"); return; }
  syncing = true;
  lastUserId = user.id;
  const previousOwner = localStorage.getItem(OWNER_KEY);
  if (previousOwner && previousOwner !== user.id) {
    await status("다른 계정의 로컬 자료가 남아 있습니다. 기존 계정으로 로그인하거나 백업 후 브라우저 자료를 정리해주세요.");
    syncing = false;
    return;
  }
  await status("Supabase 동기화 중…");
  try {
    const [localNotes, localTasks, localFiles] = await Promise.all([all("notes"), all("tasks"), all("files")]);
    const remoteNotes = await fetchAll("notes", "*", user.id);
    const remoteTasks = await fetchAll("tasks", "*", user.id);
    const remoteFiles = await fetchAll("attachments", "*", user.id);
    const remoteDeletes = await fetchAll("sync_deletions", "*", user.id);
    const localTombstones = JSON.parse(localStorage.getItem("pvefps-kh-deleted") || "[]");
    const tombstoneMap = new Map();
    for (const x of remoteDeletes || []) tombstoneMap.set(x.store + ":" + x.item_id, { store: x.store, id: x.item_id, deletedAt: x.deleted_at });
    for (const x of localTombstones) tombstoneMap.set(x.store + ":" + x.id, x);
    const tombstones = [...tombstoneMap.values()];
    const deadNotes = new Set(tombstones.filter(x => x.store === "notes").map(x => x.id));
    const deadTasks = new Set(tombstones.filter(x => x.store === "tasks").map(x => x.id));
    const deadFiles = new Set(tombstones.filter(x => x.store === "files").map(x => x.id));
    const remoteNotebooks = await fetchAll("notebooks", "id,name", user.id);
    const notebookNames = new Map((remoteNotebooks || []).map(x => [x.id, x.name]));
    const remoteTags = await fetchAll("tags", "id,name", user.id);
    const tagNames = new Map((remoteTags || []).map(x => [x.id, x.name]));
    const remoteNoteTags = await fetchAll("note_tags", "note_id,tag_id", user.id);
    const tagsByNote = new Map();
    for (const x of remoteNoteTags || []) {
      if (!tagsByNote.has(x.note_id)) tagsByNote.set(x.note_id, []);
      const name = tagNames.get(x.tag_id); if (name) tagsByNote.get(x.note_id).push(name);
    }
    const remoteLocalNotes = (remoteNotes || []).filter(x => !deadNotes.has(x.id)).map(x => rowToLocalNote(x, notebookNames, tagsByNote.get(x.id) || []));
    const localNoteMap = new Map(localNotes.filter(x => !deadNotes.has(x.id)).map(x => [x.id, x]));
    const remoteNoteMap = new Map(remoteLocalNotes.map(x => [x.id, x]));
    const mergedNotes = new Map();
    for (const id of new Set([...localNoteMap.keys(), ...remoteNoteMap.keys()])) {
      const l = localNoteMap.get(id), r = remoteNoteMap.get(id);
      mergedNotes.set(id, !l ? r : !r ? l : stamp(l.updated) > stamp(r.updated) ? l : r);
    }
    const notes = [...mergedNotes.values()];
    const notebookMap = await upsertNotebookMap(user.id, notes, remoteNotebooks);
    const tagMap = await upsertTagMap(user.id, notes);
    const noteRows = notes.map(n => localNoteToRow(n, user.id, notebookMap));
    await upsertChunks("notes", noteRows, "id");
    const { error: clearTagsError } = await client.from("note_tags").delete().eq("user_id", user.id);
    if (clearTagsError) throw clearTagsError;
    const links = [];
    for (const n of notes) for (const name of n.tags || []) {
      const tagId = tagMap.get(name); if (tagId) links.push({ user_id: user.id, note_id: n.id, tag_id: tagId });
    }
    await upsertChunks("note_tags", links, "note_id,tag_id");
    const localTaskMap = new Map(localTasks.filter(x => !deadTasks.has(x.id)).map(x => [x.id, x]));
    const remoteTaskMap = new Map((remoteTasks || []).filter(x => !deadTasks.has(x.id)).map(x => [x.id, rowToLocalTask(x)]));
    const mergedTasks = [];
    for (const id of new Set([...localTaskMap.keys(), ...remoteTaskMap.keys()])) {
      const l = localTaskMap.get(id), r = remoteTaskMap.get(id);
      mergedTasks.push(!l ? r : !r ? l : stamp(l.updated) > stamp(r.updated) ? l : r);
    }
    const keptTasks = mergedTasks;
    const taskRows = keptTasks.map(t => localTaskToRow(t, user.id));
    await upsertChunks("tasks", taskRows, "id");
    let mergedFiles = await uploadLocalFiles(user.id, localFiles.filter(x => !deadFiles.has(x.id)), remoteFiles);
    mergedFiles = await downloadRemoteFiles((remoteFiles || []).filter(x => !deadFiles.has(x.id)), mergedFiles);
    if (tombstones.length) {
      const rows = tombstones.map(x => ({ user_id: user.id, store: x.store, item_id: x.id, deleted_at: iso(x.deletedAt) }));
      await upsertChunks("sync_deletions", rows, "user_id,store,item_id");
    }
    for (const tomb of tombstones) {
      if (tomb.store === "notes") await client.from("notes").delete().eq("id", tomb.id).eq("user_id", user.id);
      if (tomb.store === "tasks") await client.from("tasks").delete().eq("id", tomb.id).eq("user_id", user.id);
      if (tomb.store === "files") {
        const row = (remoteFiles || []).find(x => x.id === tomb.id);
        if (row) {
          await client.storage.from(BUCKET).remove([row.storage_path]);
          await client.from("attachments").delete().eq("id", tomb.id).eq("user_id", user.id);
        }
      }
    }
    localStorage.removeItem("pvefps-kh-deleted");
    await Promise.all([replaceAll("notes", notes), replaceAll("tasks", keptTasks), replaceAll("files", mergedFiles)]);
    localStorage.setItem(OWNER_KEY, user.id);
    announce();
    await status("Supabase 동기화 완료 · " + new Date().toLocaleTimeString("ko-KR"), true);
    if (showToast && $("#kh-toast")) {
      $("#kh-toast").textContent = "클라우드 동기화가 완료됐습니다.";
      $("#kh-toast").style.display = "block";
      setTimeout(() => { const x = $("#kh-toast"); if (x) x.style.display = "none"; }, 2600);
    }
  } catch (error) {
    console.error("Knowledge Hub Supabase sync failed:", error);
    await status("동기화 실패 · " + (error.message || "오류"));
  } finally {
    syncing = false;
    if (syncAgain) { syncAgain = false; queueSync(); }
  }
}

async function whiteboardUser() {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) {
    const error = new Error("클라우드 계정에 로그인해야 동기화할 수 있습니다.");
    error.code = "AUTH_REQUIRED";
    throw error;
  }
  return data.user;
}
async function whiteboardList() {
  const user = await whiteboardUser();
  const { data, error } = await client.from("whiteboard_drawings")
    .select("id,title,storage_path,size_bytes,created_at,updated_at")
    .eq("user_id", user.id).is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function whiteboardUsage() {
  const user = await whiteboardUser();
  const { data, error } = await client.from("whiteboard_drawings")
    .select("size_bytes").eq("user_id", user.id).is("deleted_at", null);
  if (error) throw error;
  const rows = data || [];
  return { bytes: rows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0), files: rows.length };
}
async function whiteboardSave(doc) {
  const user = await whiteboardUser();
  const serialized = JSON.stringify(doc.document);
  const blob = new Blob([serialized], { type: "application/json" });
  const maxFileBytes = 50 * 1024 * 1024;
  const appLimitBytes = 650 * 1024 * 1024;
  if (blob.size > maxFileBytes) {
    const error = new Error("드로잉 파일이 50MB를 초과합니다. 로컬 저장과 내보내기는 가능하지만 클라우드에는 저장할 수 없습니다.");
    error.code = "WHITEBOARD_FILE_LIMIT";
    throw error;
  }
  const { data: currentRows, error: listError } = await client.from("whiteboard_drawings")
    .select("id,size_bytes").eq("user_id", user.id).is("deleted_at", null);
  if (listError) throw listError;
  const rows = currentRows || [];
  const current = rows.find(row => row.id === doc.id);
  const usedBytes = rows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0);
  const projectedBytes = usedBytes - Number(current?.size_bytes || 0) + blob.size;
  if (projectedBytes > appLimitBytes) {
    const error = new Error("화이트보드 클라우드 자체 한도(650MB)에 도달했습니다. 추가 업로드를 중단했습니다. 기존 그림은 로컬에 보존됩니다.");
    error.code = "WHITEBOARD_QUOTA";
    throw error;
  }
  const path = user.id + "/" + doc.id + ".json";
  const { error: uploadError } = await client.storage.from("whiteboard-drawings").upload(path, blob, {
    contentType: "application/json", upsert: true, cacheControl: "3600"
  });
  if (uploadError) {
    if (/quota|limit|maximum|exceed|payload|413|507/i.test(uploadError.message || "") || String(uploadError.statusCode || "") === "413") {
      const quotaError = new Error(uploadError.message || "클라우드 저장 한도에 도달했습니다.");
      quotaError.code = "WHITEBOARD_QUOTA";
      throw quotaError;
    }
    throw uploadError;
  }
  const row = {
    id: doc.id, user_id: user.id, title: doc.title || "새 드로잉",
    storage_path: path, size_bytes: blob.size,
    updated_at: new Date().toISOString()
  };
  const { error: rowError } = await client.from("whiteboard_drawings").upsert(row, { onConflict: "id" });
  if (rowError) throw rowError;
  return { sizeBytes: blob.size, usedBytes: projectedBytes, warning: projectedBytes >= 520 * 1024 * 1024 };
}
async function whiteboardLoad(item) {
  const user = await whiteboardUser();
  const { data, error } = await client.storage.from("whiteboard-drawings").download(item.storage_path);
  if (error) throw error;
  const document = JSON.parse(await data.text());
  return {
    id: item.id, title: item.title || "클라우드 드로잉", document,
    cloudName: "supabase", cloudSha: "", cloudSizeBytes: Number(item.size_bytes || data.size),
    updatedAt: Date.parse(item.updated_at || item.created_at) || Date.now()
  };
}
async function whiteboardDelete(id) {
  const user = await whiteboardUser();
  const { data: row, error: readError } = await client.from("whiteboard_drawings")
    .select("storage_path").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (readError) throw readError;
  if (row?.storage_path) {
    const { error } = await client.storage.from("whiteboard-drawings").remove([row.storage_path]);
    if (error) throw error;
  }
  const { error } = await client.from("whiteboard_drawings").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
}

function mountAuthUI() {
  const head = $("#kh-head");
  if (!head || $("#kh-cloudlogin")) return;
  const button = document.createElement("button");
  button.id = "kh-cloudlogin";
  button.textContent = "클라우드 로그인";
  button.style.cssText = "white-space:nowrap";
  const panel = document.createElement("div");
  panel.id = "kh-cloudpanel";
  panel.style.cssText = "display:none;position:fixed;z-index:3100;inset:0;background:#0007;place-items:center;padding:16px";
  panel.innerHTML = '<section style="background:white;color:#20242b;width:min(420px,100%);padding:22px;border-radius:14px;box-shadow:0 16px 60px #0003"><h2 style="margin:0 0 8px">개인 클라우드 저장소</h2><p style="font-size:12px;color:#667085;line-height:1.6">이메일 없이 아이디와 비밀번호만으로 가입·로그인합니다. 다른 PC에서도 같은 아이디를 사용하세요.</p><label style="display:block;font-size:12px;margin:12px 0 5px">아이디</label><input id="kh-cloudid" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="영문 소문자·숫자·_ (3~24자)" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:7px"><label style="display:block;font-size:12px;margin:12px 0 5px">비밀번호</label><input id="kh-cloudpassword" type="password" autocomplete="current-password" placeholder="8자 이상" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:7px"><p style="font-size:11px;color:#9a6700;line-height:1.5">주의: 이메일을 사용하지 않으므로 비밀번호를 잊으면 계정을 복구할 수 없습니다. 안전한 곳에 보관하세요.</p><p id="kh-cloudmessage" style="font-size:12px;color:#667085;min-height:18px"></p><div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end"><button id="kh-cloudsignup">아이디 만들기</button><button id="kh-cloudsignin" style="background:#242a33;color:white">로그인</button><button id="kh-cloudlogout" style="display:none">로그아웃</button><button id="kh-cloudclose">닫기</button></div></section>';
  head.insertBefore(button, $("#kh-syncnow"));
  document.body.append(panel);
  const message = (value) => { const x = $("#kh-cloudmessage"); if (x) x.textContent = value; };
  const normalizeId = () => $("#kh-cloudid").value.trim().toLowerCase();
  const accountEmail = (id) => id + "@accounts.pvefps.github.io";
  const validId = (id) => /^[a-z0-9_]{3,24}$/.test(id);
  const open = async () => {
    const { data } = await client.auth.getUser();
    const loggedIn = !!data.user;
    $("#kh-cloudlogout").style.display = loggedIn ? "inline-block" : "none";
    $("#kh-cloudsignup").style.display = loggedIn ? "none" : "inline-block";
    $("#kh-cloudsignin").style.display = loggedIn ? "none" : "inline-block";
    const currentId = data.user?.user_metadata?.username || "연결됨";
    message(loggedIn ? currentId + " 아이디로 연결되어 있습니다." : "아이디와 비밀번호를 입력하세요.");
    panel.style.display = "grid";
  };
  button.onclick = open;
  window.__openKnowledgeCloudAuth = open;
  $("#kh-cloudclose").onclick = () => panel.style.display = "none";
  panel.addEventListener("click", e => { if (e.target === panel) panel.style.display = "none"; });
  $("#kh-cloudsignup").onclick = async () => {
    const id = normalizeId(), password = $("#kh-cloudpassword").value;
    if (!validId(id)) return message("아이디는 영문 소문자·숫자·밑줄 3~24자로 입력해주세요.");
    if (password.length < 8) return message("비밀번호는 8자 이상 입력해주세요.");
    message("아이디 생성 중…");
    const { data, error } = await client.auth.signUp({
      email: accountEmail(id), password,
      options: { data: { username: id } }
    });
    if (error) return message(error.message);
    if (data.session) {
      message("아이디 생성 및 로그인 완료. 클라우드 동기화를 시작합니다.");
      await syncAll(true);
      await open();
    } else {
      message("가입 요청은 완료됐지만 Supabase 이메일 확인이 켜져 있습니다. 프로젝트 Authentication 설정에서 이메일 확인(Confirm email)을 꺼야 이메일 없이 바로 로그인할 수 있습니다.");
    }
  };
  $("#kh-cloudsignin").onclick = async () => {
    const id = normalizeId(), password = $("#kh-cloudpassword").value;
    if (!validId(id)) return message("아이디는 영문 소문자·숫자·밑줄 3~24자로 입력해주세요.");
    if (!password) return message("비밀번호를 입력해주세요.");
    message("로그인 중…");
    const { error } = await client.auth.signInWithPassword({ email: accountEmail(id), password });
    message(error ? "아이디 또는 비밀번호를 확인해주세요." : "로그인 성공. 동기화를 시작합니다.");
    if (!error) { await syncAll(true); await open(); }
  };
  $("#kh-cloudlogout").onclick = async () => {
    const { error } = await client.auth.signOut();
    message(error ? error.message : "로그아웃했습니다.");
    lastUserId = null;
    await status("로그인하면 클라우드 동기화");
    await open();
  };
}
export function mountKnowledgeSupabase() {
  mountAuthUI();
  window.__whiteboardCloud = { user: whiteboardUser, list: whiteboardList, usage: whiteboardUsage, save: whiteboardSave, load: whiteboardLoad, delete: whiteboardDelete };
  window.dispatchEvent(new Event("whiteboard-cloud-ready"));
  client.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      lastUserId = session.user.id;
      window.dispatchEvent(new Event("whiteboard-cloud-auth-changed"));
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") syncAll(false);
    } else {
      lastUserId = null;
      window.dispatchEvent(new Event("whiteboard-cloud-auth-changed"));
      status("로그인하면 클라우드 동기화");
    }
  });
  window.addEventListener("knowledge-local-change", queueSync);
  window.addEventListener("online", queueSync);
  window.addEventListener("knowledge-cloud-updated", () => {
    if (window.__knowledgeHubReload) window.__knowledgeHubReload();
  });
  client.auth.getSession().then(({ data }) => {
    if (data.session) { lastUserId = data.session.user.id; syncAll(false); }
    else status("로그인하면 클라우드 동기화");
  });
  window.__knowledgeSupabaseSync = () => syncAll(true);
}
