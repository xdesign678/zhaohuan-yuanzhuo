from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "assets" / "source-sheets" / "m3"
OUT_DIR = ROOT / "assets" / "atlas"
KEY_COLOR = (255, 0, 255)

PALETTE: list[tuple[int, int, int]] = [
    (5, 4, 8),
    (9, 8, 13),
    (16, 13, 22),
    (27, 22, 33),
    (48, 40, 60),
    (75, 58, 99),
    (28, 31, 36),
    (47, 52, 59),
    (78, 84, 92),
    (130, 137, 143),
    (207, 198, 223),
    (243, 238, 252),
    (49, 32, 24),
    (104, 69, 43),
    (191, 143, 78),
    (242, 211, 107),
    (106, 33, 35),
    (212, 80, 55),
    (255, 90, 54),
    (255, 174, 72),
    (12, 59, 57),
    (35, 149, 128),
    (92, 214, 180),
    (76, 201, 240),
    (39, 91, 148),
    (54, 134, 210),
    (56, 44, 101),
    (121, 79, 196),
    (179, 136, 255),
    (102, 170, 77),
    (129, 230, 111),
    (150, 63, 88),
]


@dataclass(frozen=True)
class CellAsset:
    key: str
    sheet: str
    cols: int
    rows: int
    index: int
    size: int
    chroma: bool


CHARACTER_ASSETS: list[CellAsset] = [
    CellAsset("summoner", "characters-sheet.png", 4, 4, 0, 48, True),
    CellAsset("pet_saberWolf", "characters-sheet.png", 4, 4, 1, 48, True),
    CellAsset("pet_flameImp", "characters-sheet.png", 4, 4, 2, 48, True),
    CellAsset("pet_frostButterfly", "characters-sheet.png", 4, 4, 3, 48, True),
    CellAsset("pet_stormHawk", "characters-sheet.png", 4, 4, 4, 48, True),
    CellAsset("pet_healingBloom", "characters-sheet.png", 4, 4, 5, 48, True),
    CellAsset("enemy_skeleton", "characters-sheet.png", 4, 4, 6, 32, True),
    CellAsset("enemy_bat", "characters-sheet.png", 4, 4, 7, 32, True),
    CellAsset("enemy_slime", "characters-sheet.png", 4, 4, 8, 32, True),
    CellAsset("enemy_ghost", "characters-sheet.png", 4, 4, 9, 32, True),
    CellAsset("enemy_eliteKnight", "characters-sheet.png", 4, 4, 10, 64, True),
    CellAsset("enemy_eliteDemon", "characters-sheet.png", 4, 4, 11, 64, True),
    CellAsset("enemy_lichBoss", "characters-sheet.png", 4, 4, 12, 96, True),
    CellAsset("pickup_xpGem", "characters-sheet.png", 4, 4, 13, 16, True),
    CellAsset("pickup_heart", "characters-sheet.png", 4, 4, 14, 16, True),
    CellAsset("pickup_soulCrystal", "characters-sheet.png", 4, 4, 15, 16, True),
]

UI_NAMES = [
    "icon_physical",
    "icon_fire",
    "icon_ice",
    "icon_lightning",
    "icon_heal",
    "icon_petLevel",
    "icon_hp",
    "icon_speed",
    "icon_pickup",
    "icon_reaction",
    "icon_shield",
    "icon_soul",
    "icon_cardFrame",
    "icon_kill",
    "icon_timer",
    "icon_settings",
]

TILE_NAMES = [
    "tile_cracked",
    "tile_rune",
    "tile_mossy",
    "tile_blood",
    "tile_ice",
    "tile_scorched",
    "tile_lightning",
    "tile_bone",
    "tile_dark",
]

ASSETS: list[CellAsset] = [
    *CHARACTER_ASSETS,
    *[CellAsset(name, "ui-icons-sheet.png", 4, 4, index, 64, True) for index, name in enumerate(UI_NAMES)],
    *[CellAsset(name, "tiles-sheet.png", 3, 3, index, 32, False) for index, name in enumerate(TILE_NAMES)],
]


def crop_cell(sheet: Image.Image, cols: int, rows: int, index: int) -> Image.Image:
    col = index % cols
    row = index // cols
    left = round(col * sheet.width / cols)
    upper = round(row * sheet.height / rows)
    right = round((col + 1) * sheet.width / cols)
    lower = round((row + 1) * sheet.height / rows)
    return sheet.crop((left, upper, right, lower)).convert("RGBA")


def remove_chroma(image: Image.Image) -> Image.Image:
    pixels = image.load()
    for y in range(image.height):
      for x in range(image.width):
        r, g, b, a = pixels[x, y]
        distance = abs(r - KEY_COLOR[0]) + abs(g - KEY_COLOR[1]) + abs(b - KEY_COLOR[2])
        if distance < 96:
            pixels[x, y] = (0, 0, 0, 0)
        elif a > 0:
            pixels[x, y] = (r, g, b, 255)
    return image


def trim_alpha(image: Image.Image) -> Image.Image:
    bbox = image.getbbox()
    if not bbox:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    return image.crop(bbox)


def nearest_palette_color(r: int, g: int, b: int) -> tuple[int, int, int]:
    best = PALETTE[0]
    best_distance = 1_000_000
    for pr, pg, pb in PALETTE:
        distance = (r - pr) * (r - pr) + (g - pg) * (g - pg) + (b - pb) * (b - pb)
        if distance < best_distance:
            best = (pr, pg, pb)
            best_distance = distance
    return best


def quantize_to_palette(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a < 32:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            nr, ng, nb = nearest_palette_color(r, g, b)
            pixels[x, y] = (nr, ng, nb, 255)
    return image


def normalize_asset(cell: Image.Image, size: int, chroma: bool) -> Image.Image:
    if chroma:
        cell = remove_chroma(cell)
        cell = trim_alpha(cell)
    cell.thumbnail((size, size), Image.Resampling.NEAREST)
    normalized = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - cell.width) // 2
    y = (size - cell.height) // 2
    normalized.alpha_composite(cell, (x, y))
    return quantize_to_palette(normalized)


def process_title() -> None:
    source = Image.open(SOURCE_DIR / "title-splash.png").convert("RGB")
    title = source.resize((180, 380), Image.Resampling.NEAREST).convert("RGBA")
    title = quantize_to_palette(title)
    title.save(OUT_DIR / "title-splash.png", optimize=True)


def pack_atlas(processed: Iterable[tuple[str, Image.Image]]) -> dict[str, object]:
    atlas_width = 512
    x = 0
    y = 0
    row_height = 0
    placements: dict[str, tuple[int, int, Image.Image]] = {}

    for key, image in processed:
        if x + image.width > atlas_width:
            x = 0
            y += row_height
            row_height = 0
        placements[key] = (x, y, image)
        x += image.width
        row_height = max(row_height, image.height)

    atlas_height = y + row_height
    atlas = Image.new("RGBA", (atlas_width, atlas_height), (0, 0, 0, 0))
    frames: dict[str, object] = {}

    for key, (px, py, image) in placements.items():
        atlas.alpha_composite(image, (px, py))
        frames[key] = {
            "frame": {"x": px, "y": py, "w": image.width, "h": image.height},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": image.width, "h": image.height},
            "sourceSize": {"w": image.width, "h": image.height},
        }

    atlas.save(OUT_DIR / "m3-atlas.png", optimize=True)
    atlas_json = {
        "frames": frames,
        "meta": {
            "app": "process_m3_assets.py",
            "image": "m3-atlas.png",
            "format": "RGBA8888",
            "size": {"w": atlas.width, "h": atlas.height},
            "scale": "1",
        },
    }
    (OUT_DIR / "m3-atlas.json").write_text(json.dumps(atlas_json, ensure_ascii=False, indent=2), encoding="utf-8")
    return atlas_json


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    source_cache: dict[str, Image.Image] = {}
    processed: list[tuple[str, Image.Image]] = []

    for asset in ASSETS:
        source = source_cache.get(asset.sheet)
        if source is None:
            source_path = SOURCE_DIR / asset.sheet
            if not source_path.exists():
                raise FileNotFoundError(f"Missing source sheet: {source_path}")
            source = Image.open(source_path).convert("RGBA")
            source_cache[asset.sheet] = source
        cell = crop_cell(source, asset.cols, asset.rows, asset.index)
        processed.append((asset.key, normalize_asset(cell, asset.size, asset.chroma)))

    atlas_json = pack_atlas(processed)
    process_title()

    manifest = {
        "sourceSheets": {
            "characters": "assets/source-sheets/m3/characters-sheet.png",
            "ui": "assets/source-sheets/m3/ui-icons-sheet.png",
            "tiles": "assets/source-sheets/m3/tiles-sheet.png",
            "title": "assets/source-sheets/m3/title-splash.png",
        },
        "runtime": {
            "atlasPng": "assets/atlas/m3-atlas.png",
            "atlasJson": "assets/atlas/m3-atlas.json",
            "titleSplash": "assets/atlas/title-splash.png",
        },
        "paletteColorCount": len(PALETTE),
        "frames": list(atlas_json["frames"].keys()),
        "frameCount": len(atlas_json["frames"]),
        "method": "Built-in image_gen source sheets, then deterministic Pillow crop, chroma-key, nearest resize, fixed-palette quantization, and atlas packing.",
    }
    (OUT_DIR / "m3-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    report = "\n".join(
        [
            "# M3 Art Pack",
            "",
            "Method: built-in image_gen source sheets, copied into `assets/source-sheets/m3`, then processed by `npm run assets:m3`.",
            "",
            "Runtime outputs:",
            "- `assets/atlas/m3-atlas.png`",
            "- `assets/atlas/m3-atlas.json`",
            "- `assets/atlas/title-splash.png`",
            "- `assets/atlas/m3-manifest.json`",
            "",
            f"Frame count: {manifest['frameCount']}",
            f"Palette colors: {len(PALETTE)}",
            "",
            "Caveat: sprites are static source frames; motion is handled by runtime tween/tint/flip effects.",
        ]
    )
    (OUT_DIR / "M3_ART_REPORT.md").write_text(report + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
