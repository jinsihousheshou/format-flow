from app.audio import AUDIO_FORMATS, protected_audio_result


def test_protected_platform_never_returns_a_download():
    result = protected_audio_result("https://music.163.com/song?id=1", "netease")
    assert result["download_available"] is False
    assert result["formats"] == {}
    assert result["official_url"].startswith("https://music.163.com/")


def test_audio_outputs_are_explicitly_limited():
    assert set(AUDIO_FORMATS) == {"mp3", "m4a", "wav", "aac", "flac", "ogg"}
