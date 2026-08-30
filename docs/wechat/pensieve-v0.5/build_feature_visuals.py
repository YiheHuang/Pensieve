from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).parent
ASSETS = ROOT / "assets"
FONT = "C:/Windows/Fonts/Deng.ttf"
BOLD = "C:/Windows/Fonts/Dengb.ttf"
SERIF = "C:/Windows/Fonts/STSONG.TTF"


def font(path, size):
    return ImageFont.truetype(path, size)


def base_canvas():
    image = Image.new("RGB", (900, 450), "#071521")
    draw = ImageDraw.Draw(image)
    draw.ellipse((90, -225, 810, 495), outline="#173748", width=2)
    draw.ellipse((180, -135, 720, 405), outline="#123140", width=2)
    return image, draw


def emotion_visual():
    image, draw = base_canvas()
    draw.text((54, 42), "一段记忆，也可以拥有多种情绪", font=font(SERIF, 34), fill="#ECF7F9")
    draw.text((55, 92), "主标签决定主要情绪，副标签补充更复杂的感受", font=font(FONT, 18), fill="#8EAFBA")

    draw.rounded_rectangle((55, 142, 845, 264), radius=22, fill="#0E2634", outline="#234958", width=2)
    draw.text((82, 164), "主情绪", font=font(BOLD, 17), fill="#7FC8D7")
    draw.rounded_rectangle((82, 198, 220, 238), radius=20, fill="#4A3D22")
    draw.ellipse((99, 214, 109, 224), fill="#F4CA72")
    draw.text((120, 204), "欣喜", font=font(BOLD, 18), fill="#F7D98D")
    draw.text((286, 164), "副情绪", font=font(BOLD, 17), fill="#7FC8D7")
    for x, label, fill, dot, color in [
        (286, "温暖", "#3A2929", "#EC9E7E", "#F1B59C"),
        (434, "怀念", "#302A46", "#B7A1E5", "#CBBCEF"),
    ]:
        draw.rounded_rectangle((x, 198, x + 132, 238), radius=20, fill=fill)
        draw.ellipse((x + 17, 214, x + 27, 224), fill=dot)
        draw.text((x + 39, 204), label, font=font(BOLD, 18), fill=color)

    draw.text((55, 302), "标准情绪光谱", font=font(BOLD, 17), fill="#7FC8D7")
    items = [
        ("欣喜", "#F4CA72"), ("宁静", "#86C8D7"), ("温暖", "#EC9E7E"),
        ("怀念", "#B7A1E5"), ("勇敢", "#8CD4BD"), ("难过", "#8193C9"),
    ]
    for i, (label, color) in enumerate(items):
        x = 55 + i * 133
        draw.rounded_rectangle((x, 342, x + 116, 392), radius=14, fill="#102936", outline="#214553", width=1)
        draw.ellipse((x + 16, 361, x + 28, 373), fill=color)
        draw.text((x + 39, 352), label, font=font(BOLD, 18), fill="#D8E9ED")
    image.save(ASSETS / "feature-emotions.jpg", quality=92, optimize=True, progressive=True)


def use_cases_visual():
    image, draw = base_canvas()
    draw.text((54, 40), "Pensieve 可以用来做什么？", font=font(SERIF, 34), fill="#ECF7F9")
    draw.text((55, 90), "同一套记忆能力，可以承载不同的人生片段", font=font(FONT, 18), fill="#8EAFBA")
    cards = [
        ("旅行札记", "照片、声音与地点"),
        ("家庭档案", "共同经历与陪伴"),
        ("成长记录", "学习、项目与变化"),
        ("灵感收藏", "梦境与创作片段"),
        ("阶段回顾", "情绪、关系与洞察"),
        ("私人空间", "留给自己，不必发布"),
    ]
    for i, (title, subtitle) in enumerate(cards):
        row, col = divmod(i, 3)
        x = 55 + col * 270
        y = 142 + row * 132
        draw.rounded_rectangle((x, y, x + 245, y + 105), radius=18, fill="#0E2634", outline="#234958", width=2)
        draw.ellipse((x + 20, y + 22, x + 50, y + 52), fill="#173D4E", outline="#79BFCE", width=2)
        draw.ellipse((x + 31, y + 33, x + 39, y + 41), fill="#B8E6ED")
        draw.text((x + 65, y + 18), title, font=font(BOLD, 20), fill="#E5F3F6")
        draw.text((x + 65, y + 55), subtitle, font=font(FONT, 15), fill="#88A9B4")
    image.save(ASSETS / "feature-use-cases.jpg", quality=92, optimize=True, progressive=True)


if __name__ == "__main__":
    emotion_visual()
    use_cases_visual()
