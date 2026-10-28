"""Generate the shared Desert Front Windows and web identity assets."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
NATIVE = ROOT / "desert-front-godot" / "assets" / "ui"
WEB = ROOT / "desert-strike" / "assets"
DOWNLOAD = ROOT / "desert-front-download"
INK = (9, 24, 31, 255)
TEAL = (99, 231, 211, 255)
WHITE = (238, 246, 239, 255)


def mark(size: int) -> Image.Image:
    scale = 4 if size <= 64 else 1
    width = size * scale
    image = Image.new("RGBA", (width, width), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    margin = round(width * 0.045)
    draw.rounded_rectangle(
        (margin, margin, width - margin, width - margin),
        radius=round(width * 0.20),
        fill=INK,
        outline=(113, 174, 165, 255),
        width=max(1, round(width * 0.018)),
    )
    stroke = max(2, round(width * 0.075))
    draw.line([(width * .19, width * .25), (width * .19, width * .75)], fill=TEAL, width=stroke)
    draw.arc((width * .13, width * .25, width * .61, width * .75), -90, 90, fill=TEAL, width=stroke)
    draw.line([(width * .18, width * .25), (width * .37, width * .25)], fill=TEAL, width=stroke)
    draw.line([(width * .18, width * .75), (width * .37, width * .75)], fill=TEAL, width=stroke)
    slash = max(1, round(width * .042))
    for offset in (-.035, .025, .085):
        draw.line(
            [(width * (.52 + offset), width * .67), (width * (.64 + offset), width * .35)],
            fill=WHITE,
            width=slash,
        )
    draw.line([(width * .78, width * .26), (width * .78, width * .75)], fill=WHITE, width=stroke)
    draw.line([(width * .75, width * .26), (width * .88, width * .26)], fill=WHITE, width=stroke)
    draw.line([(width * .75, width * .49), (width * .86, width * .49)], fill=WHITE, width=stroke)
    return image.resize((size, size), Image.Resampling.LANCZOS) if scale != 1 else image


def main() -> None:
    for folder in (NATIVE, WEB, DOWNLOAD):
        folder.mkdir(parents=True, exist_ok=True)
    mark(1024).save(NATIVE / "desert-front-icon.png", optimize=True)
    frames = [mark(size) for size in (256, 128, 64, 48, 32, 16)]
    frames[0].save(
        NATIVE / "desert-front-icon.ico",
        format="ICO",
        append_images=frames[1:],
        sizes=[(f.width, f.height) for f in frames],
    )
    mark(128).save(WEB / "desert-front-favicon.png", optimize=True)
    mark(128).save(DOWNLOAD / "favicon.png", optimize=True)


if __name__ == "__main__":
    main()
