#!/usr/bin/env python3
"""Fetch Twitter/X status data from mirror APIs with fallback.

Usage:
  python3 fetch_twitter_status.py <tweet_url_or_tweet_id>
"""

import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple


USER_AGENT = "Mozilla/5.0 (content-summarizer/1.0; +https://x.com)"
SOURCES = [
    {
        "name": "fxtwitter",
        "url": "https://api.fxtwitter.com/status/{tweet_id}",
        "timeout": 8.0,
        "optional": False,
    },
    {
        "name": "vxtwitter",
        "url": "https://api.vxtwitter.com/status/{tweet_id}",
        "timeout": 8.0,
        "optional": False,
    },
    {
        "name": "xfxtwitter",
        "url": "https://api.xfxtwitter.com/status/{tweet_id}",
        "timeout": 3.0,
        "optional": True,
    },
]

STATUS_PATTERNS = [
    re.compile(r"^/(?P<author>[^/]+)/status/(?P<tweet_id>\d+)$"),
    re.compile(r"^/i/status/(?P<tweet_id>\d+)$"),
    re.compile(r"^/i/web/status/(?P<tweet_id>\d+)$"),
    re.compile(r"^/status/(?P<tweet_id>\d+)$"),
]


def first_non_empty(*values: Any) -> Optional[Any]:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return value
    return None


def to_int(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).replace(",", "").strip()
    if not text:
        return 0
    if text.isdigit():
        return int(text)
    try:
        return int(float(text))
    except (ValueError, TypeError):
        return 0


def build_canonical_url(tweet_id: str, author_handle: Optional[str]) -> str:
    if author_handle:
        return f"https://x.com/{author_handle}/status/{tweet_id}"
    return f"https://x.com/i/web/status/{tweet_id}"


def parse_tweet_input(raw: str) -> Tuple[str, Optional[str], Optional[str]]:
    value = (raw or "").strip()
    if not value:
        raise ValueError("输入为空")

    if re.fullmatch(r"\d+", value):
        return value, None, None

    candidate = value
    if "://" not in candidate:
        candidate = "https://" + candidate

    parsed = urllib.parse.urlparse(candidate)
    host = (parsed.hostname or "").lower()
    path = parsed.path.rstrip("/")
    if not path:
        path = "/"

    for pattern in STATUS_PATTERNS:
        match = pattern.match(path)
        if not match:
            continue
        tweet_id = match.group("tweet_id")
        author_handle = match.groupdict().get("author")
        if author_handle == "i":
            author_handle = None
        return tweet_id, author_handle, host or None

    raise ValueError(f"无法从输入中解析 tweet_id: {raw}")


def fetch_json(url: str, timeout: float) -> Dict[str, Any]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/plain, */*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = getattr(resp, "status", 200)
            if status < 200 or status >= 300:
                raise RuntimeError(f"HTTP {status}")
            body = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"网络错误: {exc.reason}") from exc
    except TimeoutError as exc:
        raise RuntimeError("请求超时") from exc

    try:
        data = json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError("响应不是合法 JSON") from exc

    if not isinstance(data, dict):
        raise RuntimeError("JSON 顶层不是对象")
    return data


def normalize_payload(
    source: str,
    payload: Dict[str, Any],
    expected_tweet_id: str,
    fallback_handle: Optional[str],
) -> Dict[str, Any]:
    container = payload.get("tweet")
    if not isinstance(container, dict):
        container = payload
    if not isinstance(container, dict):
        raise ValueError("响应结构异常")

    tweet_id_raw = first_non_empty(
        container.get("id"),
        payload.get("id"),
        container.get("tweet_id"),
        payload.get("tweet_id"),
        payload.get("conversationID"),
        expected_tweet_id,
    )
    tweet_id = str(tweet_id_raw).strip()

    text = first_non_empty(
        container.get("text"),
        container.get("full_text"),
        payload.get("text"),
        payload.get("full_text"),
    )
    raw_text = container.get("raw_text")
    if not text and isinstance(raw_text, dict):
        text = first_non_empty(raw_text.get("text"))
    text = (str(text).strip() if text is not None else "")

    author = container.get("author")
    if not isinstance(author, dict):
        author = {}

    author_handle = first_non_empty(
        author.get("screen_name"),
        author.get("username"),
        author.get("user_name"),
        container.get("user_screen_name"),
        payload.get("user_screen_name"),
        payload.get("screen_name"),
        fallback_handle,
    )
    author_name = first_non_empty(
        author.get("name"),
        container.get("user_name"),
        payload.get("user_name"),
        payload.get("author_name"),
    )
    author_obj = {
        "name": str(author_name).strip() if author_name is not None else "",
        "handle": str(author_handle).strip() if author_handle is not None else "",
    }

    published_at = first_non_empty(
        container.get("created_at"),
        container.get("date"),
        payload.get("created_at"),
        payload.get("date"),
        payload.get("published_at"),
    )
    published_at = str(published_at).strip() if published_at is not None else ""

    likes = to_int(first_non_empty(container.get("likes"), payload.get("likes"), payload.get("favorite_count")))
    replies = to_int(first_non_empty(container.get("replies"), payload.get("replies"), payload.get("reply_count")))
    retweets = to_int(
        first_non_empty(
            container.get("retweets"),
            payload.get("retweets"),
            payload.get("retweet_count"),
            container.get("quote_retweets"),
        )
    )
    views = to_int(
        first_non_empty(
            container.get("views"),
            payload.get("views"),
            payload.get("view_count"),
            container.get("view_count"),
        )
    )

    media = first_non_empty(container.get("media"), payload.get("media"), payload.get("media_extended"))
    if not isinstance(media, list):
        media = []

    canonical_url = first_non_empty(
        container.get("url"),
        payload.get("url"),
        payload.get("tweetURL"),
    )
    canonical_url = (
        str(canonical_url).strip()
        if canonical_url is not None and str(canonical_url).strip()
        else build_canonical_url(tweet_id, author_obj["handle"] or fallback_handle)
    )

    errors: List[str] = []
    if not tweet_id:
        errors.append("缺少 tweet_id")
    if tweet_id and tweet_id != expected_tweet_id:
        errors.append(f"tweet_id 不匹配: expected={expected_tweet_id}, got={tweet_id}")
    if not text:
        errors.append("缺少正文 text")
    if not (author_obj["name"] or author_obj["handle"]):
        errors.append("缺少作者信息")
    if errors:
        raise ValueError("; ".join(errors))

    return {
        "ok": True,
        "source": source,
        "tweet_id": tweet_id,
        "canonical_url": canonical_url,
        "author": author_obj,
        "text": text,
        "published_at": published_at,
        "stats": {
            "likes": likes,
            "replies": replies,
            "retweets": retweets,
            "views": views,
        },
        "media": media,
        "raw": payload,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "用法: python3 fetch_twitter_status.py <tweet_url_or_tweet_id>"}, ensure_ascii=False))
        return 1

    try:
        tweet_id, author_handle, source_host = parse_tweet_input(sys.argv[1])
    except ValueError as exc:
        print(
            json.dumps(
                {"ok": False, "error": str(exc), "attempts": []},
                ensure_ascii=False,
            )
        )
        return 1

    attempts: List[Dict[str, str]] = []

    for source in SOURCES:
        name = source["name"]
        url = source["url"].format(tweet_id=tweet_id)
        timeout = float(source["timeout"])
        optional = bool(source["optional"])

        try:
            payload = fetch_json(url, timeout)
            result = normalize_payload(name, payload, tweet_id, author_handle)
            if source_host:
                result["source_host"] = source_host
            print(json.dumps(result, ensure_ascii=False))
            return 0
        except Exception as exc:  # noqa: BLE001
            err = str(exc)
            attempts.append({"source": name, "error": err})
            if optional:
                continue

    response = {
        "ok": False,
        "tweet_id": tweet_id,
        "error": "所有镜像源均失败",
        "attempts": attempts,
    }
    print(json.dumps(response, ensure_ascii=False))
    return 1


if __name__ == "__main__":
    sys.exit(main())
