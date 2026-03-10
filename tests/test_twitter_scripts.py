#!/usr/bin/env python3
"""Unit tests for twitter detection and fetch normalization scripts."""

import sys
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest import mock


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "skills" / "content-summarizer" / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import detect_content_type as detect_mod  # noqa: E402
import fetch_twitter_status as fetch_mod  # noqa: E402


class DetectTwitterContentTypeTests(unittest.TestCase):
    def test_detect_standard_x_status(self) -> None:
        result = detect_mod.detect("https://x.com/jack/status/20")
        self.assertEqual(result["type"], "thread")
        self.assertEqual(result["platform"], "twitter")
        self.assertEqual(result["metadata"]["tweet_id"], "20")
        self.assertEqual(result["metadata"]["author_handle"], "jack")
        self.assertEqual(result["metadata"]["canonical_url"], "https://x.com/jack/status/20")

    def test_detect_i_web_status_without_author(self) -> None:
        result = detect_mod.detect("https://twitter.com/i/web/status/20")
        self.assertEqual(result["type"], "thread")
        self.assertEqual(result["platform"], "twitter")
        self.assertEqual(result["metadata"]["tweet_id"], "20")
        self.assertIsNone(result["metadata"]["author_handle"])
        self.assertEqual(result["metadata"]["canonical_url"], "https://x.com/i/web/status/20")

    def test_detect_mirror_host(self) -> None:
        result = detect_mod.detect("https://vxtwitter.com/jack/status/20")
        self.assertEqual(result["type"], "thread")
        self.assertEqual(result["platform"], "twitter")
        self.assertEqual(result["metadata"]["source_host"], "vxtwitter.com")
        self.assertEqual(result["metadata"]["canonical_url"], "https://x.com/jack/status/20")

    def test_detect_api_host(self) -> None:
        result = detect_mod.detect("https://api.fxtwitter.com/status/20")
        self.assertEqual(result["type"], "thread")
        self.assertEqual(result["platform"], "twitter")
        self.assertEqual(result["metadata"]["tweet_id"], "20")
        self.assertIsNone(result["metadata"]["author_handle"])

    def test_detect_xfxtwitter_host(self) -> None:
        result = detect_mod.detect("https://xfxtwitter.com/jack/status/20")
        self.assertEqual(result["type"], "thread")
        self.assertEqual(result["platform"], "twitter")
        self.assertEqual(result["metadata"]["source_host"], "xfxtwitter.com")


class ParseTweetInputTests(unittest.TestCase):
    def test_parse_numeric_id(self) -> None:
        tweet_id, author, host = fetch_mod.parse_tweet_input("20")
        self.assertEqual(tweet_id, "20")
        self.assertIsNone(author)
        self.assertIsNone(host)

    def test_parse_i_status(self) -> None:
        tweet_id, author, host = fetch_mod.parse_tweet_input("https://x.com/i/status/20")
        self.assertEqual(tweet_id, "20")
        self.assertIsNone(author)
        self.assertEqual(host, "x.com")

    def test_parse_invalid_raises(self) -> None:
        with self.assertRaises(ValueError):
            fetch_mod.parse_tweet_input("https://twitter.com/i/web/status/not-a-number")


class NormalizePayloadTests(unittest.TestCase):
    def test_normalize_fxtwitter_shape(self) -> None:
        payload = {
            "code": 200,
            "message": "OK",
            "tweet": {
                "url": "https://x.com/jack/status/20",
                "id": "20",
                "text": "just setting up my twttr",
                "author": {"name": "jack", "screen_name": "jack"},
                "created_at": "Tue Mar 21 20:50:14 +0000 2006",
                "likes": 123,
                "replies": 10,
                "retweets": 8,
                "views": 1000,
                "media": [],
            },
        }
        result = fetch_mod.normalize_payload("fxtwitter", payload, "20", None)
        self.assertTrue(result["ok"])
        self.assertEqual(result["source"], "fxtwitter")
        self.assertEqual(result["tweet_id"], "20")
        self.assertEqual(result["author"]["handle"], "jack")
        self.assertEqual(result["text"], "just setting up my twttr")
        self.assertEqual(result["stats"]["likes"], 123)

    def test_normalize_requires_text_and_author(self) -> None:
        payload = {"tweet": {"id": "20", "text": ""}}
        with self.assertRaises(ValueError):
            fetch_mod.normalize_payload("fxtwitter", payload, "20", None)

    def test_normalize_vxtwitter_flat_shape(self) -> None:
        payload = {
            "conversationID": "20",
            "text": "just setting up my twttr",
            "user_name": "jack",
            "screen_name": "jack",
            "date": "Tue Mar 21 20:50:14 +0000 2006",
            "likes": "111",
            "replies": "9",
            "retweets": "7",
            "views": "1001",
            "url": "https://x.com/jack/status/20",
            "media": [],
        }
        result = fetch_mod.normalize_payload("vxtwitter", payload, "20", None)
        self.assertTrue(result["ok"])
        self.assertEqual(result["tweet_id"], "20")
        self.assertEqual(result["author"]["name"], "jack")
        self.assertEqual(result["author"]["handle"], "jack")
        self.assertEqual(result["stats"]["likes"], 111)
        self.assertEqual(result["stats"]["views"], 1001)

    def test_normalize_rejects_wrong_tweet_id(self) -> None:
        payload = {
            "tweet": {
                "id": "21",
                "text": "hello",
                "author": {"name": "jack", "screen_name": "jack"},
            }
        }
        with self.assertRaises(ValueError):
            fetch_mod.normalize_payload("fxtwitter", payload, "20", None)


class MainFlowTests(unittest.TestCase):
    def test_main_fallback_to_second_source(self) -> None:
        payload = {
            "tweet": {
                "id": "20",
                "text": "hello",
                "author": {"name": "jack", "screen_name": "jack"},
            }
        }
        fake_sources = [
            {"name": "fxtwitter", "url": "https://api.fxtwitter.com/status/{tweet_id}", "timeout": 1.0, "optional": False},
            {"name": "vxtwitter", "url": "https://api.vxtwitter.com/status/{tweet_id}", "timeout": 1.0, "optional": False},
        ]
        stdout = StringIO()
        with mock.patch.object(fetch_mod, "SOURCES", fake_sources):
            with mock.patch.object(fetch_mod, "fetch_json", side_effect=[RuntimeError("boom"), payload]) as fetch_mock:
                with mock.patch.object(sys, "argv", ["fetch_twitter_status.py", "20"]):
                    with redirect_stdout(stdout):
                        code = fetch_mod.main()
        self.assertEqual(code, 0)
        self.assertEqual(fetch_mock.call_count, 2)
        self.assertIn('"source": "vxtwitter"', stdout.getvalue())

    def test_main_all_sources_failed(self) -> None:
        fake_sources = [
            {"name": "fxtwitter", "url": "https://api.fxtwitter.com/status/{tweet_id}", "timeout": 1.0, "optional": False},
            {"name": "vxtwitter", "url": "https://api.vxtwitter.com/status/{tweet_id}", "timeout": 1.0, "optional": False},
            {"name": "xfxtwitter", "url": "https://api.xfxtwitter.com/status/{tweet_id}", "timeout": 1.0, "optional": True},
        ]
        stdout = StringIO()
        with mock.patch.object(fetch_mod, "SOURCES", fake_sources):
            with mock.patch.object(fetch_mod, "fetch_json", side_effect=RuntimeError("down")):
                with mock.patch.object(sys, "argv", ["fetch_twitter_status.py", "20"]):
                    with redirect_stdout(stdout):
                        code = fetch_mod.main()
        self.assertEqual(code, 1)
        output = stdout.getvalue()
        self.assertIn('"ok": false', output)
        self.assertIn('"attempts"', output)


if __name__ == "__main__":
    unittest.main()
