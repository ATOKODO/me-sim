"""Regenerate the install icons from the same simple mark as icon.svg."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent


# @spec TECH-TOOLING-ART
def quadratic(start, control, end, steps=30):
    for index in range(steps + 1):
        t = index / steps
        yield (
            (1 - t) ** 2 * start[0] + 2 * (1 - t) * t * control[0] + t**2 * end[0],
            (1 - t) ** 2 * start[1] + 2 * (1 - t) * t * control[1] + t**2 * end[1],
        )


for size in (192, 512):
    scale = size / 64
    image = Image.new("RGB", (size, size), "#171c23")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=16 * scale, fill="#171c23")
    paths = [
        [(14, 43), (14, 24)],
        [(14, 30), *quadratic((14, 30), (14, 24), (23, 24)),
         *quadratic((23, 24), (32, 24), (32, 32)), (32, 43)],
        [(32, 30), *quadratic((32, 30), (32, 24), (41, 24)),
         *quadratic((41, 24), (50, 24), (50, 32)), (50, 43)],
    ]
    for path in paths:
        draw.line([(round(x * scale), round(y * scale)) for x, y in path],
                  fill="#bde883", width=round(5 * scale), joint="curve")
    image.save(ROOT / f"icon-{size}.png", optimize=True)
