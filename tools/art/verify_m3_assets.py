from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ATLAS = ROOT / "assets" / "atlas" / "m3-atlas.png"
ATLAS_JSON = ROOT / "assets" / "atlas" / "m3-atlas.json"
TITLE = ROOT / "assets" / "atlas" / "title-splash.png"
MANIFEST = ROOT / "assets" / "atlas" / "m3-manifest.json"
MAX_ATLAS_BYTES = 800 * 1024
EXPECTED_FRAMES = 41


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    for path in [ATLAS, ATLAS_JSON, TITLE, MANIFEST]:
        assert_true(path.exists(), f"Missing asset output: {path}")
        assert_true(path.stat().st_size > 0, f"Empty asset output: {path}")

    assert_true(ATLAS.stat().st_size <= MAX_ATLAS_BYTES, f"Atlas too large: {ATLAS.stat().st_size} bytes")

    atlas = Image.open(ATLAS).convert("RGBA")
    title = Image.open(TITLE).convert("RGBA")
    assert_true(atlas.getpixel((0, 0))[3] == 0, "Atlas top-left corner is not transparent")
    assert_true(title.width == 180 and title.height == 380, f"Unexpected title size: {title.size}")

    data = json.loads(ATLAS_JSON.read_text(encoding="utf-8"))
    frames = data.get("frames", {})
    assert_true(len(frames) == EXPECTED_FRAMES, f"Expected {EXPECTED_FRAMES} frames, got {len(frames)}")

    for required in [
        "summoner",
        "pet_saberWolf",
        "pet_flameImp",
        "pet_frostButterfly",
        "pet_stormHawk",
        "pet_healingBloom",
        "enemy_skeleton",
        "enemy_lichBoss",
        "pickup_xpGem",
        "tile_dark",
        "icon_fire",
    ]:
        assert_true(required in frames, f"Missing frame: {required}")

    print(f"M3 assets verified: frames={len(frames)}, atlas={ATLAS.stat().st_size} bytes, title={TITLE.stat().st_size} bytes")


if __name__ == "__main__":
    main()
