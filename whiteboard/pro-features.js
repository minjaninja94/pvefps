const STYLE = `
#whiteboard-pro-button{margin-left:4px}
#whiteboard-pro-panel{position:fixed;inset:0;z-index:1000;background:#0006;display:none;place-items:center;padding:18px;font:13px/1.5 Inter,system-ui,sans-serif;color:#222}
#whiteboard-pro-panel.open{display:grid}
#whiteboard-pro-panel .pro-card{width:min(760px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 20px 70px #0003;padding:20px}
#whiteboard-pro-panel h2{font-size:18px;margin:0 0 5px}
#whiteboard-pro-panel .pro-sub{color:#777;margin:0 0 16px}
#whiteboard-pro-panel .pro-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#whiteboard-pro-panel .pro-item{border:1px solid #e4e4e1;border-radius:10px;padding:12px;min-width:0}
#whiteboard-pro-panel .pro-item h3{font-size:13px;margin:0 0 5px}
#whiteboard-pro-panel .pro-item p{font-size:11px;color:#777;margin:0 0 10px}
#whiteboard-pro-panel button{border:1px solid #ddd;background:#fff;border-radius:7px;padding:7px 10px;font:inherit;cursor:pointer}
#whiteboard-pro-panel button.primary{background:#252525;color:#fff;border-color:#252525}
#whiteboard-pro-panel textarea{width:100%;min-height:125px;border:1px solid #ddd;border-radius:8px;padding:10px;font:12px/1.5 ui-monospace,monospace;resize:vertical}
#whiteboard-pro-panel input{max-width:100%;border:1px solid #ddd;border-radius:7px;padding:7px;font:inherit}
#whiteboard-pro-panel .pro-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
#whiteboard-pro-panel .pro-comments{max-height:130px;overflow:auto;font-size:11px;color:#555;margin-top:8px}
#whiteboard-pro-panel .pro-foot{display:flex;justify-content:space-between;gap:8px;margin-top:16px;align-items:center}
#whiteboard-pro-panel .pro-foot small{color:#888}
@media(max-width:600px){#whiteboard-pro-panel .pro-grid{grid-template-columns:1fr}}
`;

function el(tag, attrs = {}, text = "") {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "className") node.className = value;
    else if (key === "onclick") node.addEventListener("click", value);
    else node.setAttribute(key, value);
  });
  if (text) node.textContent = text;
  return node;
}

function getApi() {
  return window.__whiteboardPro || null;
}

function shareUrl(doc) {
  const payload = { type: "excalidraw", version: 2, document: doc.document, title: doc.title || "공유 드로잉" };
  const raw = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const safe = raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return window.location.origin + window.location.pathname + "#shared=" + safe;
}

async function exportSlides(api) {
  const doc = api.getDoc();
  if (!doc) throw new Error("열린 드로잉이 없습니다.");
  const lib = api.getLib();
  if (typeof lib.exportToSvg !== "function") throw new Error("현재 Excalidraw 모듈에서 SVG 내보내기를 제공하지 않습니다.");
  const elements = (doc.document.elements || []).filter(item => !item.isDeleted);
  const frames = elements.filter(item => item.type === "frame").sort((a,b) => a.y - b.y || a.x - b.x);
  const targets = frames.length ? frames.map(frame => ({
    title: frame.name || "슬라이드",
    elements: [frame, ...elements.filter(item => item.frameId === frame.id)]
  })) : [{ title: doc.title || "드로잉", elements }];
  const slides = [];
  for (const target of targets) {
    const svg = await lib.exportToSvg({
      elements: target.elements,
      appState: { ...(doc.document.appState || {}), exportBackground: true },
      files: doc.document.files || {},
      exportPadding: 20
    });
    slides.push({ title: target.title, svg: svg.outerHTML });
  }
  return slides;
}

async function printPdf(api) {
  const win = window.open("", "_blank");
  if (!win) throw new Error("팝업이 차단되었습니다. 이 사이트의 팝업을 허용해주세요.");
  const slides = await exportSlides(api);
  const body = slides.map((slide, i) => '<section class="slide"><header>' + escapeHtml(slide.title) + '</header>' + slide.svg + '<footer>' + (i+1) + ' / ' + slides.length + '</footer></section>').join("");
  win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>화이트보드 PDF</title><style>@page{size:landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.slide{height:185mm;page-break-after:always;display:flex;flex-direction:column;align-items:stretch}.slide:last-child{page-break-after:auto}.slide header,.slide footer{font-size:10px;color:#777;padding:5px}.slide svg{width:100%;height:100%;min-height:0;object-fit:contain}</style></head><body>' + body + '<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>');
  win.document.close();
}

async function exportPptx(api) {
  const slides = await exportSlides(api);
  const mod = await import("https://esm.sh/pptxgenjs@3.12.0");
  const PptxGenJS = mod.default || mod;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Whiteboard";
  pptx.subject = "Excalidraw presentation";
  pptx.title = api.getDoc().title || "Presentation";
  for (const item of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    const encoded = btoa(unescape(encodeURIComponent(item.svg)));
    slide.addImage({ data: "data:image/svg+xml;base64," + encoded, x: 0.25, y: 0.25, w: 12.83, h: 6.7 });
  }
  await pptx.writeFile({ fileName: (api.getDoc().title || "whiteboard") + ".pptx" });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}

async function makeMermaid(api, source) {
  const lib = api.getLib();
  const parser = await import("https://esm.sh/@excalidraw/mermaid-to-excalidraw@3.6.0");
  if (typeof lib.convertToExcalidrawElements !== "function") throw new Error("Excalidraw 요소 변환기를 찾을 수 없습니다.");
  const parsed = await parser.parseMermaidToExcalidraw(source, { elbow: true });
  const converted = lib.convertToExcalidrawElements(parsed.elements, { regenerateIds: true });
  const canvas = api.getCanvas();
  if (!canvas) throw new Error("캔버스가 아직 준비되지 않았습니다.");
  canvas.updateScene({ elements: [...canvas.getSceneElements(), ...converted] });
  if (parsed.files) canvas.addFiles(Object.values(parsed.files));
  canvas.scrollToContent(converted, { fitToContent: true, animate: true });
}

function mountPanel() {
  if (document.getElementById("whiteboard-pro-panel")) return;
  const style = el("style"); style.textContent = STYLE; document.head.append(style);
  const panel = el("div", { id: "whiteboard-pro-panel" });
  const card = el("div", { className: "pro-card" });
  const header = el("div");
  header.append(el("h2", {}, "화이트보드 PRO 도구"), el("p", { className: "pro-sub" }, "유료 워크스페이스 의존 없이 현재 브라우저와 GitHub 저장 구조에서 쓸 수 있는 확장 기능입니다."));
  const grid = el("div", { className: "pro-grid" });

  const share = el("section", { className: "pro-item" });
  share.append(el("h3", {}, "읽기 전용 공유 링크"), el("p", {}, "현재 드로잉 데이터를 링크에 담아 전달합니다. 링크를 가진 사람은 열람할 수 있습니다."));
  share.append(el("button", { className: "primary", onclick: async () => {
    try {
      const api = getApi(), doc = api && api.getDoc(); if (!doc) throw new Error("열린 드로잉이 없습니다.");
      const url = shareUrl(doc);
      if (url.length > 180000) throw new Error("공유 링크가 너무 깁니다. 이미지가 많은 드로잉은 GitHub 저장 후 파일로 공유해주세요.");
      await navigator.clipboard.writeText(url);
      api.notify("읽기 전용 공유 링크를 복사했습니다.");
    } catch (e) { const api=getApi(); if(api) api.notify(e.message); else alert(e.message); }
  } }, "공유 링크 복사"));

  const folder = el("section", { className: "pro-item" });
  folder.append(el("h3", {}, "폴더 분류"), el("p", {}, "현재 드로잉에 폴더 이름을 지정합니다. 분류는 이 브라우저의 로컬 문서 정보에 저장됩니다."));
  const folderInput = el("input", { placeholder: "예: 게임 기획 / UI 시안" });
  const folderSave = el("button", { className: "primary", onclick: () => {
    const api=getApi(), doc=api && api.getDoc(); if(!doc) return;
    const next=Object.assign({},doc,{folder:folderInput.value.trim(),updatedAt:Date.now()});
    api.updateDoc(next); api.notify(next.folder ? "폴더를 지정했습니다." : "폴더 분류를 해제했습니다.");
  }}, "폴더 저장");
  folder.append(folderInput, el("div", {className:"pro-row"}), folderSave);

  const mermaid = el("section", { className: "pro-item" });
  mermaid.append(el("h3", {}, "Mermaid → 편집 가능한 도형"), el("p", {}, "Mermaid 문법을 실제 Excalidraw 도형·화살표로 변환합니다. AI 키나 요청 횟수 제한이 없습니다."));
  const code = el("textarea");
  code.value = "flowchart TD\n  A[아이디어] --> B{검토}\n  B -->|승인| C[실행]\n  B -->|보완| D[수정]\n  D --> B";
  mermaid.append(code, el("button", { className: "primary", onclick: async () => {
    const api=getApi(); if(!api) return;
    try { await makeMermaid(api, code.value); api.notify("Mermaid 다이어그램을 편집 가능한 도형으로 추가했습니다."); }
    catch(e) { api.notify("변환 실패: " + e.message); }
  }}, "캔버스에 추가"));

  const comments = el("section", { className: "pro-item" });
  comments.append(el("h3", {}, "드로잉 메모 / 댓글"), el("p", {}, "개인 검토 의견을 문서에 저장합니다. 다른 사용자와 실시간 공유되는 댓글은 아닙니다."));
  const commentInput = el("input", { placeholder: "검토 의견 입력" });
  const commentList = el("div", { className: "pro-comments" });
  const addComment = el("button", { className: "primary", onclick: () => {
    const api=getApi(), doc=api && api.getDoc(); if(!doc || !commentInput.value.trim()) return;
    const commentsNow=(doc.comments || []).concat([{ id: crypto.randomUUID(), text: commentInput.value.trim(), createdAt: Date.now() }]);
    api.updateDoc(Object.assign({},doc,{comments:commentsNow,updatedAt:Date.now()}));
    commentInput.value=""; renderComments();
  }}, "메모 저장");
  function renderComments() {
    const api=getApi(), doc=api && api.getDoc();
    commentList.replaceChildren();
    (doc && doc.comments || []).slice().reverse().forEach(item => {
      const line=el("div",{},new Date(item.createdAt).toLocaleString() + " · " + item.text);
      commentList.append(line);
    });
    if (!commentList.childNodes.length) commentList.textContent="저장된 메모가 없습니다.";
  }
  comments.append(commentInput,addComment,commentList);

  const pdf = el("section", { className: "pro-item" });
  pdf.append(el("h3", {}, "PDF 프레젠테이션 내보내기"), el("p", {}, "프레임이 있으면 프레임별 페이지로, 없으면 전체 장면을 한 페이지로 인쇄합니다. 브라우저 인쇄 창에서 PDF로 저장하세요."));
  pdf.append(el("button", { className: "primary", onclick: async () => { const api=getApi(); try{await printPdf(api);}catch(e){api.notify(e.message);} } }, "PDF로 저장"));

  const pptx = el("section", { className: "pro-item" });
  pptx.append(el("h3", {}, "PPTX 프레젠테이션 내보내기"), el("p", {}, "프레임별 슬라이드를 PowerPoint 파일로 만듭니다. 첫 실행 시 변환 라이브러리를 내려받습니다."));
  pptx.append(el("button", { className: "primary", onclick: async () => { const api=getApi(); try{await exportPptx(api);api.notify("PPTX 파일을 생성했습니다.");}catch(e){api.notify("PPTX 내보내기 실패: "+e.message);} } }, "PPTX 다운로드"));

  const presentation = el("section", { className: "pro-item" });
  presentation.append(el("h3", {}, "프레젠테이션 보기"), el("p", {}, "캔버스의 프레임을 좌표 순서대로 슬라이드처럼 보여줍니다. 프레임이 없으면 전체 장면 하나를 표시합니다."));
  presentation.append(el("button", { className: "primary", onclick: async () => {
    const api=getApi(); try {
      const slides=await exportSlides(api);
      let index=0;
      const viewer=el("div",{});
      viewer.style.cssText="position:fixed;inset:0;z-index:2000;background:#111;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px";
      const image=el("div",{}); image.style.cssText="width:min(94vw,1400px);height:78vh;background:white;display:grid;place-items:center;overflow:hidden";
      const controls=el("div",{className:"pro-row"}); controls.style.marginTop="14px";
      const label=el("span",{});
      function draw(){image.innerHTML=slides[index].svg;const svg=image.querySelector("svg");if(svg){svg.style.width="100%";svg.style.height="100%";}label.textContent=(index+1)+" / "+slides.length+" · "+slides[index].title;}
      controls.append(el("button",{onclick:()=>{index=Math.max(0,index-1);draw();}},"이전"),label,el("button",{onclick:()=>{index=Math.min(slides.length-1,index+1);draw();}},"다음"),el("button",{onclick:()=>viewer.remove()},"닫기"));
      viewer.append(image,controls);document.body.append(viewer);draw();
      viewer.tabIndex=0;viewer.focus();viewer.addEventListener("keydown",e=>{if(e.key==="ArrowRight"){index=Math.min(slides.length-1,index+1);draw();}if(e.key==="ArrowLeft"){index=Math.max(0,index-1);draw();}if(e.key==="Escape")viewer.remove();});
    } catch(e){api.notify(e.message);}
  }}, "슬라이드 시작"));

  grid.append(share,folder,mermaid,comments,pdf,pptx,presentation);
  const foot=el("div",{className:"pro-foot"});
  foot.append(el("small",{},"실시간 협업·팀 권한·음성/화면 공유는 별도 서버와 사용자 인증이 필요합니다."));
  foot.append(el("button",{onclick:()=>panel.classList.remove("open")},"닫기"));
  card.append(header,grid,foot);panel.append(card);
  panel.addEventListener("click",e=>{if(e.target===panel)panel.classList.remove("open");});
  document.body.append(panel);
  panel.addEventListener("transitionstart",renderComments);
  panel.addEventListener("click",renderComments);
  panel._refresh=()=>{const api=getApi(),doc=api&&api.getDoc();folderInput.value=doc&&doc.folder||"";renderComments();};
}

export function mount() {
  const install = () => {
    if (!getApi()) return;
    mountPanel();
    // Never inject controls into React-owned descendants such as .topbar.
    // External DOM mutations inside the Excalidraw/React tree can destabilize
    // its portal and Zustand subscription lifecycle.
    if (!document.getElementById("whiteboard-pro-button")) {
      const button=el("button",{id:"whiteboard-pro-button",className:"btn primary",onclick:()=>{
        const panel=document.getElementById("whiteboard-pro-panel");
        if(panel){panel.classList.add("open");panel._refresh&&panel._refresh();}
      }},"PRO 도구");
      button.style.cssText="position:fixed;right:16px;bottom:16px;z-index:900;background:#252525;color:#fff;border:0;box-shadow:0 4px 18px #0003";
      document.body.append(button);
    }
  };
  const observer=new MutationObserver(install);
  observer.observe(document.body,{childList:true});
  install();
}
