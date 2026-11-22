const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function response(data, status, origin) {
  const headers = new Headers(JSON_HEADERS);
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers });
}

function cors(origin) {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, PUT, DELETE, OPTIONS",
      "access-control-allow-headers": "Authorization, Content-Type",
      "access-control-max-age": "86400",
      "vary": "Origin",
    },
  });
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function decodeBase64(text) {
  const binary = atob(text.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, function (c) { return c.charCodeAt(0); });
  return new TextDecoder().decode(bytes);
}

function validName(name) {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(name);
}

async function github(env, path, options) {
  const url = "https://api.github.com/repos/" + env.GITHUB_OWNER + "/" + env.GITHUB_REPO + "/contents/" + path;
  const response = await fetch(url, {
    method: options && options.method || "GET",
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": "Bearer " + env.GITHUB_TOKEN,
      "x-github-api-version": "2022-11-28",
      "user-agent": "pvefps-whiteboard-sync",
      ...(options && options.body ? { "content-type": "application/json" } : {}),
    },
    body: options && options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(function () { return {}; });
  if (!response.ok) {
    const error = new Error(data.message || "GitHub API request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN;

    if (!allowedOrigin || origin !== allowedOrigin) {
      return response({ error: "Origin not allowed" }, 403);
    }
    if (request.method === "OPTIONS") return cors(origin);
    if (!env.GITHUB_TOKEN || !env.SYNC_KEY) {
      return response({ error: "Worker secrets are not configured" }, 503, origin);
    }

    const auth = request.headers.get("Authorization") || "";
    if (auth !== "Bearer " + env.SYNC_KEY) {
      return response({ error: "Sync key is invalid" }, 401, origin);
    }

    if (url.pathname === "/api/knowledge") {
      const knowledgePath = "whiteboard/knowledge/knowledge-hub.json";
      const branch = env.GITHUB_BRANCH || "main";
      try {
        if (request.method === "GET") {
          try {
            const file = await github(env, knowledgePath + "?ref=" + encodeURIComponent(branch));
            return response({ sha: file.sha, document: JSON.parse(decodeBase64(file.content)) }, 200, origin);
          } catch (error) {
            if (error.status === 404) return response({ sha: "", document: { version: 1, notes: [], tasks: [], files: [] } }, 200, origin);
            throw error;
          }
        }
        if (request.method === "PUT") {
          const body = await request.json();
          const document = body && body.document;
          if (!document || document.version !== 1 || !Array.isArray(document.notes) || !Array.isArray(document.tasks) || !Array.isArray(document.files)) {
            return response({ error: "Invalid Knowledge Hub document" }, 400, origin);
          }
          const serialized = JSON.stringify(document, null, 2);
          if (new TextEncoder().encode(serialized).length > 900 * 1024) {
            return response({ error: "Knowledge Hub backup exceeds the 900 KB GitHub Contents API safety limit. Reduce attachments or split large files." }, 413, origin);
          }
          const payload = {
            message: "knowledge-hub: synchronize notes and files",
            content: encodeBase64(serialized),
            branch: branch,
          };
          if (typeof body.sha === "string" && body.sha) payload.sha = body.sha;
          const saved = await github(env, knowledgePath, { method: "PUT", body: payload });
          return response({ saved: true, sha: saved.content.sha, commit: saved.commit.sha }, 200, origin);
        }
        return response({ error: "Method not allowed" }, 405, origin);
      } catch (error) {
        const status = error.status === 404 ? 404 : error.status === 409 || error.status === 422 ? 409 : 502;
        return response({ error: status === 409 ? "Knowledge data changed on another device; synchronize again" : error.message }, status, origin);
      }
    }

    const prefix = "/api/drawings";
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + "/")) {
      return response({ error: "Not found" }, 404, origin);
    }
    const basePath = (env.GITHUB_PATH || "whiteboard/drawings").replace(/^\/+|\/+$/g, "");
    const branch = env.GITHUB_BRANCH || "main";
    const suffix = url.pathname.slice(prefix.length).replace(/^\/+/, "");

    try {
      if (request.method === "GET" && !suffix) {
        const entries = await github(env, basePath + "?ref=" + encodeURIComponent(branch));
        const drawings = Array.isArray(entries) ? entries
          .filter(function (entry) { return entry.type === "file" && entry.name.endsWith(".excalidraw"); })
          .map(function (entry) { return { name: entry.name.slice(0, -11), sha: entry.sha, size: entry.size }; }) : [];
        return response({ drawings: drawings }, 200, origin);
      }

      if (!suffix || suffix.includes("/") || !suffix.endsWith(".excalidraw")) {
        return response({ error: "Invalid drawing path" }, 400, origin);
      }
      const name = suffix.slice(0, -11);
      if (!validName(name)) return response({ error: "Invalid drawing name" }, 400, origin);
      const path = basePath + "/" + name + ".excalidraw";

      if (request.method === "GET") {
        const file = await github(env, path + "?ref=" + encodeURIComponent(branch));
        return response({
          name: name,
          sha: file.sha,
          document: JSON.parse(decodeBase64(file.content)),
        }, 200, origin);
      }

      if (request.method === "PUT") {
        const body = await request.json();
        if (!body || !body.document || body.document.type !== "excalidraw" || !Array.isArray(body.document.elements)) {
          return response({ error: "Invalid Excalidraw document" }, 400, origin);
        }
        if (new TextEncoder().encode(JSON.stringify(body.document)).length > 900 * 1024) {
          return response({ error: "Drawing exceeds the 900 KB GitHub Contents API safety limit. Export the file locally or reduce embedded images." }, 413, origin);
        }
        const payload = {
          message: "whiteboard: save " + name,
          content: encodeBase64(JSON.stringify(body.document, null, 2)),
          branch: branch,
        };
        if (typeof body.sha === "string" && body.sha) payload.sha = body.sha;
        const saved = await github(env, path, { method: "PUT", body: payload });
        return response({
          saved: true,
          sha: saved.content.sha,
          commit: saved.commit.sha,
        }, 200, origin);
      }

      if (request.method === "DELETE") {
        const body = await request.json();
        if (!body || typeof body.sha !== "string" || !body.sha) {
          return response({ error: "Current file SHA is required for deletion" }, 400, origin);
        }
        const result = await github(env, path, {
          method: "DELETE",
          body: {
            message: "whiteboard: delete " + name,
            sha: body.sha,
            branch: branch,
          },
        });
        return response({ deleted: true, commit: result.commit.sha }, 200, origin);
      }

      return response({ error: "Method not allowed" }, 405, origin);
    } catch (error) {
      const status = error.status === 404 ? 404 : error.status === 409 || error.status === 422 ? 409 : 502;
      return response({ error: status === 409 ? "GitHub file changed; refresh the drawing list and retry" : error.message }, status, origin);
    }
  },
};