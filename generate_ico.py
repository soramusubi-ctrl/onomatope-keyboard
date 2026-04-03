#!/usr/bin/env python3
"""
Windows用 ICO ファイルを生成する
ICO形式は複数サイズを1ファイルに格納できる
"""

from PIL import Image
import os

def generate_ico():
    src_png = "/home/ubuntu/onomatope-keyboard/assets/icon.png"
    out_ico = "/home/ubuntu/onomatope-keyboard/assets/icon.ico"

    base = Image.open(src_png).convert("RGBA")

    # ICOに含めるサイズ（Windows標準）
    sizes = [16, 24, 32, 48, 64, 128, 256]
    icons = [base.resize((s, s), Image.LANCZOS) for s in sizes]

    # 最大サイズを基準に保存（Pillowが自動でマルチサイズICOを生成）
    icons[0].save(
        out_ico,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=icons[1:]
    )
    print(f"✅ Generated: {out_ico}")

    # 確認
    ico = Image.open(out_ico)
    print(f"   ICO sizes: {ico.info.get('sizes', 'N/A')}")

if __name__ == "__main__":
    generate_ico()
