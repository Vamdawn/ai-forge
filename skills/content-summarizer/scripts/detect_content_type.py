#!/usr/bin/env python3
"""URL 内容类型检测脚本。

根据 URL 模式匹配确定内容类型，返回 JSON 结果。
匹配失败时返回 type: null，由 LLM 降级判断。

用法: python detect_content_type.py <url>
"""

import json
import re
import subprocess
import sys
from urllib.parse import urlparse, parse_qs


def detect(url: str) -> dict:
    """根据 URL 模式匹配返回内容类型信息。"""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    path = parsed.path.rstrip("/")
    result = {"type": None, "platform": None, "template": None, "metadata": {}}

    # GitHub Repo
    if host in ("github.com", "www.github.com"):
        parts = [p for p in path.split("/") if p]
        # 必须恰好是 /{owner}/{repo}，排除子页面
        sub_pages = {"issues", "pull", "pulls", "blob", "tree", "commit",
                     "commits", "actions", "releases", "wiki", "settings",
                     "discussions", "projects", "security", "network"}
        if len(parts) == 2 and parts[1] not in sub_pages:
            owner, repo = parts
            result.update(
                type="repo",
                platform="github",
                template="references/note-template-repo.md",
                metadata={"owner": owner, "repo": repo},
            )
            # 尝试用 gh CLI 获取仓库元数据
            try:
                gh_out = subprocess.run(
                    ["gh", "api", f"repos/{owner}/{repo}",
                     "--jq", '{stars: .stargazers_count, language, '
                             'license: .license.spdx_id, description, '
                             'topics, updated_at: .updated_at}'],
                    capture_output=True, text=True, timeout=10,
                )
                if gh_out.returncode == 0 and gh_out.stdout.strip():
                    result["metadata"].update(json.loads(gh_out.stdout))
            except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
                pass
            return result

    # Reddit
    if host in ("reddit.com", "www.reddit.com", "old.reddit.com"):
        m = re.match(r"/r/([^/]+)/comments/([^/]+)", path)
        if m:
            result.update(
                type="thread",
                platform="reddit",
                template="references/note-template-thread.md",
                metadata={"subreddit": m.group(1), "post_id": m.group(2)},
            )
            return result

    # Hacker News
    if host in ("news.ycombinator.com",):
        qs = parse_qs(parsed.query)
        item_id = qs.get("id", [None])[0]
        if item_id and parsed.path in ("/item", "/item/"):
            result.update(
                type="thread",
                platform="hn",
                template="references/note-template-thread.md",
                metadata={"item_id": item_id},
            )
            return result

    # Twitter / X
    if host in ("twitter.com", "www.twitter.com", "x.com", "www.x.com",
                "mobile.twitter.com", "mobile.x.com"):
        m = re.match(r"/([^/]+)/status/(\d+)", path)
        if m:
            result.update(
                type="thread",
                platform="twitter",
                template="references/note-template-thread.md",
                metadata={"author_handle": m.group(1), "tweet_id": m.group(2)},
            )
            return result

    # 未匹配 — 返回 null，降级给 LLM
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "用法: python detect_content_type.py <url>"}))
        sys.exit(1)
    print(json.dumps(detect(sys.argv[1]), ensure_ascii=False))
