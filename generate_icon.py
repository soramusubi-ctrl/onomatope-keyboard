#!/usr/bin/env python3
"""アプリアイコンを生成する"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size=512):
    # グラデーション背景
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 丸みのある四角形の背景
    margin = size // 10
    radius = size // 5
    
    # グラデーション風の背景（複数の円で近似）
    for i in range(size):
        r = int(26 + (15 - 26) * i / size)
        g = int(26 + (33 - 26) * i / size)
        b = int(46 + (62 - 46) * i / size)
        draw.line([(margin, margin + i * (size - 2*margin) // size), 
                   (size - margin, margin + i * (size - 2*margin) // size)], 
                  fill=(r, g, b, 255))
    
    # 角丸四角形マスク
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([margin, margin, size-margin, size-margin], 
                                  radius=radius, fill=255)
    
    # 背景を適用
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg.paste(img, mask=mask)
    
    # ピアノキーのシンボルを描画
    draw2 = ImageDraw.Draw(bg)
    
    # キーボードの鍵盤風デザイン
    key_area_x = size // 6
    key_area_y = size // 3
    key_area_w = size * 2 // 3
    key_area_h = size // 3
    
    # 白鍵（5本）
    white_key_w = key_area_w // 5 - 4
    for i in range(5):
        x = key_area_x + i * (key_area_w // 5) + 2
        draw2.rounded_rectangle(
            [x, key_area_y, x + white_key_w, key_area_y + key_area_h],
            radius=4,
            fill=(255, 255, 255, 230)
        )
    
    # 黒鍵（3本）
    black_key_w = white_key_w * 6 // 10
    black_key_h = key_area_h * 6 // 10
    black_key_positions = [1, 2, 4]  # 白鍵の間
    for i in black_key_positions:
        x = key_area_x + i * (key_area_w // 5) - black_key_w // 2 + 2
        draw2.rounded_rectangle(
            [x, key_area_y, x + black_key_w, key_area_y + black_key_h],
            radius=3,
            fill=(30, 30, 60, 240)
        )
    
    # 音符を追加（上部）
    note_size = size // 8
    # ♪ 記号風
    cx = size // 2
    cy = size // 4
    draw2.ellipse([cx - note_size//3, cy - note_size//4, 
                   cx + note_size//3, cy + note_size//4], 
                  fill=(255, 107, 157, 200))
    draw2.rectangle([cx + note_size//3 - 4, cy - note_size, 
                     cx + note_size//3, cy], 
                    fill=(255, 107, 157, 200))
    
    # 星をいくつか追加
    stars = [(size//4, size//5), (size*3//4, size//6), (size//5, size*2//3)]
    for sx, sy in stars:
        r = size // 25
        draw2.ellipse([sx-r, sy-r, sx+r, sy+r], fill=(255, 209, 102, 180))
    
    return bg

# 各サイズのアイコンを生成
output_dir = "/home/ubuntu/onomatope-keyboard/assets"

# メインアイコン (512x512)
icon = create_icon(512)
icon.save(os.path.join(output_dir, "icon.png"))
print("Generated: icon.png")

# トレイアイコン (22x22) - 小さいサイズはリサイズで生成
tray_icon = create_icon(512).resize((22, 22), Image.LANCZOS)
tray_icon.save(os.path.join(output_dir, "tray-icon.png"))
print("Generated: tray-icon.png")

# 各サイズ - 小さいサイズはリサイズで生成
base_icon = create_icon(512)
for size in [16, 32, 64, 128, 256, 512]:
    resized = base_icon.resize((size, size), Image.LANCZOS)
    resized.save(os.path.join(output_dir, "build", f"icon_{size}.png"))
    print(f"Generated: build/icon_{size}.png")

print("✅ Icons generated!")
