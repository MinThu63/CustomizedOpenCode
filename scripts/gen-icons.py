"""Generate the dev-channel app icon set from a single source image.

Usage: python scripts/gen-icons.py <source-image> <dest-dir>
Produces icon.ico (multi-size), core PNGs, and Windows Square*Logo tiles.
"""

import sys
from pathlib import Path
from PIL import Image

src_path = Path(sys.argv[1])
dest = Path(sys.argv[2])
dest.mkdir(parents=True, exist_ok=True)

img = Image.open(src_path).convert("RGBA")

# Square-crop safety (source is already square, but guard anyway).
w, h = img.size
if w != h:
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))


def resized(size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


# Core PNGs used by the app / dock / build.
png_sizes = {
    "32x32.png": 32,
    "64x64.png": 64,
    "128x128.png": 128,
    "128x128@2x.png": 256,
    "icon.png": 512,
    "dock.png": 512,
    "StoreLogo.png": 50,
}
for name, size in png_sizes.items():
    resized(size).save(dest / name, "PNG")

# Windows Store square tile logos.
square_logos = {
    "Square30x30Logo.png": 30,
    "Square44x44Logo.png": 44,
    "Square71x71Logo.png": 71,
    "Square89x89Logo.png": 89,
    "Square107x107Logo.png": 107,
    "Square142x142Logo.png": 142,
    "Square150x150Logo.png": 150,
    "Square284x284Logo.png": 284,
    "Square310x310Logo.png": 310,
}
for name, size in square_logos.items():
    resized(size).save(dest / name, "PNG")

# Multi-resolution Windows .ico (taskbar + window title bar).
ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
resized(256).save(dest / "icon.ico", format="ICO", sizes=ico_sizes)

print("Generated icon set in", dest)
for f in sorted(dest.iterdir()):
    print(" ", f.name)
