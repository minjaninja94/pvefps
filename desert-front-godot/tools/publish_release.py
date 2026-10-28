#!/usr/bin/env python3
"""Publish a verified single-file preview to the fixed GitHub release."""
import json
import os
import pathlib
import urllib.error
import urllib.parse
import urllib.request

repo = os.environ["GH_REPOSITORY"]
version = (pathlib.Path("desert-front-godot") / "VERSION").read_text(encoding="utf-8").strip()
tag = os.environ.get("RELEASE_TAG", "")
if tag != "desert-front-v" + version:
    raise SystemExit("Release tag and game VERSION differ")
page = pathlib.Path("desert-front-download/index.html").read_text(encoding="utf-8")
if tag not in page or "v" + version not in page:
    raise SystemExit("Download page and game VERSION differ")
name = "DesertFront-Windows.exe"
artifact = pathlib.Path("desert-front-godot/build") / name
if not artifact.is_file() or artifact.stat().st_size < 1_000_000:
    raise SystemExit("Windows release EXE missing")
headers = {"Authorization": "Bearer " + os.environ["GH_TOKEN"],
           "Accept": "application/vnd.github+json",
           "X-GitHub-Api-Version": "2022-11-28",
           "User-Agent": "desert-front-publisher"}
base = "https://api.github.com/repos/" + repo

def api(url, method="GET", payload=None, kind=None):
    hh = dict(headers)
    data = None
    if payload is not None:
        data = json.dumps(payload).encode() if kind is None else payload
        hh["Content-Type"] = kind or "application/json"
    request = urllib.request.Request(url, headers=hh, data=data, method=method)
    with urllib.request.urlopen(request, timeout=180) as response:
        result = response.read()
        return json.loads(result) if result and "json" in response.headers.get("Content-Type", "") else result

body = ("Desert Front Windows 알파 프리뷰. DesertFront-Windows.exe 파일 하나를 다운로드해 실행하세요. "
        "첫 실행 시 게임 파일을 사용자 폴더에 설치하며, 이후에는 저장된 파일을 재사용합니다.\n\n"
        "80개 병종, 3라인 대전, 싱글 플레이와 비공식 커뮤니티 순위를 포함합니다. "
        "NodeTunnel 원격 대전은 베타이며 서로 다른 네트워크의 PC 간 연결은 아직 검증되지 않았습니다. "
        "온라인 기록은 클라이언트 자체 신고 값으로 공식 경쟁 랭킹이나 보상에 사용하지 않습니다.")
try:
    release = api(base + "/releases/tags/" + tag)
except urllib.error.HTTPError as error:
    if error.code != 404:
        raise
    release = api(base + "/releases", "POST", {"tag_name": tag,
        "target_commitish": os.environ["GH_TARGET"],
        "name": "Desert Front " + version + " | Windows Alpha",
        "body": body, "prerelease": True, "draft": False})
else:
    release = api(base + "/releases/" + str(release["id"]), "PATCH",
                  {"body": body, "prerelease": True, "draft": False})
for asset in release.get("assets", []):
    if asset.get("name") == name:
        api(base + "/releases/assets/" + str(asset["id"]), "DELETE")
raw = artifact.read_bytes()
url = release["upload_url"].split("{", 1)[0] + "?" + urllib.parse.urlencode({"name": name})
uploaded = api(url, "POST", raw, "application/octet-stream")
assert uploaded["name"] == name and uploaded["size"] == len(raw)
for asset in release.get("assets", []):
    if asset.get("name") == "DesertFront-Preview-Windows.zip":
        api(base + "/releases/assets/" + str(asset["id"]), "DELETE")
print("Published:", uploaded["browser_download_url"])
