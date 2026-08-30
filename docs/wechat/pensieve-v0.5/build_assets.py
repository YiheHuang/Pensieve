from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).parent
ASSETS = ROOT / "assets"
FONT_SERIF = "C:/Windows/Fonts/STSONG.TTF"
FONT_SANS = "C:/Windows/Fonts/Deng.ttf"
FONT_SANS_BOLD = "C:/Windows/Fonts/Dengb.ttf"


def cover_crop(image: Image.Image, size: tuple[int, int], x_bias: float = 0.5) -> Image.Image:
    target_w, target_h = size
    src_ratio = image.width / image.height
    target_ratio = target_w / target_h
    if src_ratio > target_ratio:
        crop_w = int(image.height * target_ratio)
        left = int((image.width - crop_w) * x_bias)
        image = image.crop((left, 0, left + crop_w, image.height))
    else:
        crop_h = int(image.width / target_ratio)
        top = max(0, (image.height - crop_h) // 2)
        image = image.crop((0, top, image.width, top + crop_h))
    return image.resize(size, Image.Resampling.LANCZOS)


def fit_text(draw: ImageDraw.ImageDraw, text: str, font_path: str, max_size: int, min_size: int, max_width: int):
    for size in range(max_size, min_size - 1, -1):
        font = ImageFont.truetype(font_path, size)
        if draw.textbbox((0, 0), text, font=font)[2] <= max_width:
            return font
    return ImageFont.truetype(font_path, min_size)


def make_cover() -> None:
    source = Image.open(ASSETS / "home.jpg").convert("RGB")
    crop_height = int(source.width / (900 / 383))
    canvas = source.crop((0, 0, source.width, min(crop_height, source.height))).resize((900, 383), Image.Resampling.LANCZOS)
    canvas.save(ASSETS / "cover-900x383.jpg", quality=94, optimize=True, progressive=True)


def make_square() -> None:
    source = Image.open(ASSETS / "home.jpg").convert("RGB")
    canvas = cover_crop(source, (1080, 1080), x_bias=0.50)
    canvas.save(ASSETS / "cover-square-1080.jpg", quality=94, optimize=True, progressive=True)


if __name__ == "__main__":
    ASSETS.mkdir(parents=True, exist_ok=True)
    make_cover()
    make_square()
