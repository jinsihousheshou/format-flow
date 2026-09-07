import pytest
from fastapi import HTTPException

from app.security import classify_url, extract_url


def test_extracts_url_from_share_copy():
    assert extract_url("复制文案 https://v.douyin.com/abc123/ 打开应用") == "https://v.douyin.com/abc123/"


def test_rejects_localhost():
    with pytest.raises(HTTPException):
        classify_url("https://localhost/video.mp4")


def test_does_not_accept_suffix_confusion():
    with pytest.raises(HTTPException):
        classify_url("https://douyin.com.example.org/video/1")
