#!/usr/bin/env python3
"""URL 内容类型检测脚本。

根据 URL 模式匹配确定内容类型，返回 JSON 结果。
匹配失败时默认返回 article 类型（通用抓取策略）。

用法: python detect_content_type.py <url>
"""

import json
import re
import subprocess
import sys
from urllib.parse import parse_qs, urlparse

TWITTER_STATUS_PATTERNS = (
    re.compile(r"^/(?P<author>[^/]+)/status/(?P<tweet_id>\d+)$"),
    re.compile(r"^/i/status/(?P<tweet_id>\d+)$"),
    re.compile(r"^/i/web/status/(?P<tweet_id>\d+)$"),
    re.compile(r"^/status/(?P<tweet_id>\d+)$"),
)

TWITTER_HOSTS = {
    "twitter.com",
    "www.twitter.com",
    "x.com",
    "www.x.com",
    "mobile.twitter.com",
    "mobile.x.com",
    "fxtwitter.com",
    "www.fxtwitter.com",
    "vxtwitter.com",
    "www.vxtwitter.com",
    "xfxtwitter.com",
    "www.xfxtwitter.com",
    "api.fxtwitter.com",
    "api.vxtwitter.com",
    "api.xfxtwitter.com",
}


def extract_twitter_status(path: str) -> tuple:
    """Extract (author_handle, tweet_id) from a twitter-like status path."""
    cleaned = path.rstrip("/") or "/"
    for pattern in TWITTER_STATUS_PATTERNS:
        match = pattern.match(cleaned)
        if not match:
            continue
        tweet_id = match.group("tweet_id")
        author_handle = match.groupdict().get("author")
        if author_handle == "i":
            author_handle = None
        return author_handle, tweet_id
    return None, None


def build_twitter_canonical_url(author_handle: str, tweet_id: str) -> str:
    if author_handle:
        return f"https://x.com/{author_handle}/status/{tweet_id}"
    return f"https://x.com/i/web/status/{tweet_id}"


def detect(url: str) -> dict:
    """根据 URL 模式匹配返回内容类型信息。"""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    path = parsed.path.rstrip("/") or "/"
    result = {"type": None, "platform": None, "fetcher": None, "template": None, "metadata": {}}

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
                fetcher="references/fetchers/github-repo.md",
                template="references/templates/repo.md",
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
                fetcher="references/fetchers/reddit.md",
                template="references/templates/thread.md",
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
                fetcher="references/fetchers/hn.md",
                template="references/templates/thread.md",
                metadata={"item_id": item_id},
            )
            return result

    # Twitter / X
    if host in TWITTER_HOSTS:
        author_handle, tweet_id = extract_twitter_status(path)
        if tweet_id:
            result.update(
                type="thread",
                platform="twitter",
                fetcher="references/fetchers/twitter.md",
                template="references/templates/thread.md",
                metadata={
                    "author_handle": author_handle,
                    "tweet_id": tweet_id,
                    "source_host": host,
                    "canonical_url": build_twitter_canonical_url(author_handle, tweet_id),
                },
            )
            return result

    # 未匹配 — 默认为通用文章类型
    result.update(
        type="article",
        platform=None,
        fetcher="references/fetchers/common.md",
        template="references/templates/article.md",
    )
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "用法: python detect_content_type.py <url>"}))
        sys.exit(1)
    print(json.dumps(detect(sys.argv[1]), ensure_ascii=False))
