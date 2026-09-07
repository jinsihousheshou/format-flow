import pytest
from fastapi import HTTPException

from app.security import classify_audio_url, classify_url, extract_url


def test_extracts_url_from_share_copy():
    assert extract_url("复制文案 https://v.douyin.com/abc123/ 打开应用") == "https://v.douyin.com/abc123/"


def test_rejects_localhost():
    with pytest.raises(HTTPException):
        classify_url("https://localhost/video.mp4")


def test_does_not_accept_suffix_confusion():
    with pytest.raises(HTTPException):
        classify_url("https://douyin.com.example.org/video/1")


def test_classifies_public_music_pages_without_treating_them_as_direct_files():
    assert classify_audio_url("https://music.163.com/song?id=1")[0] == "netease"
    assert classify_audio_url("https://y.qq.com/n/ryqq/songDetail/1")[0] == "qqmusic"
    assert classify_audio_url("https://www.kugou.com/song/1.html")[0] == "kugou"


def test_audio_rejects_localhost_and_lookalike_domains():
    with pytest.raises(HTTPException):
        classify_audio_url("https://localhost/audio.mp3")
    with pytest.raises(HTTPException):
        classify_audio_url("https://music.163.com.example.org/song?id=1")
