import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_bw_wallet_icon(size=1024):
    # 1. Solid Pure Black Canvas (#000000)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    
    # Render at high-res then downscale for super crisp antialiasing
    high_res_size = size * 2
    hr_img = Image.new("RGBA", (high_res_size, high_res_size), (0, 0, 0, 255))
    hr_draw = ImageDraw.Draw(hr_img)
    
    # High-res coordinates
    s = high_res_size
    
    # Minimalist Wallet Geometry
    # Outer Wallet Body (Main Rect)
    w_left = int(s * 0.22)
    w_top = int(s * 0.32)
    w_right = int(s * 0.78)
    w_bottom = int(s * 0.72)
    radius = int(s * 0.08)
    line_width = int(s * 0.035)

    # 1. Back Card (Sleek minimalist card sticking out of top)
    card_rect = [int(s * 0.30), int(s * 0.22), int(s * 0.70), int(s * 0.45)]
    hr_draw.rounded_rectangle(card_rect, radius=int(s * 0.04), fill=(0, 0, 0, 255), outline=(255, 255, 255, 255), width=line_width)
    
    # Card accent line (stripe)
    hr_draw.line([(card_rect[0] + int(s * 0.04), card_rect[1] + int(s * 0.06)), 
                  (card_rect[2] - int(s * 0.04), card_rect[1] + int(s * 0.06))], 
                 fill=(255, 255, 255, 255), width=int(s * 0.02))

    # 2. Main Wallet Body (Filled black with thick pure white outline)
    hr_draw.rounded_rectangle([w_left, w_top, w_right, w_bottom], radius=radius, fill=(0, 0, 0, 255), outline=(255, 255, 255, 255), width=line_width)

    # 3. Flap / Clasp on right side
    flap_w = int(s * 0.20)
    flap_h = int(s * 0.16)
    flap_left = w_right - int(flap_w * 0.75)
    flap_top = (w_top + w_bottom) // 2 - flap_h // 2
    flap_right = flap_left + flap_w
    flap_bottom = flap_top + flap_h
    flap_radius = int(s * 0.04)

    # Draw Flap (filled black with white border)
    hr_draw.rounded_rectangle([flap_left, flap_top, flap_right, flap_bottom], radius=flap_radius, fill=(0, 0, 0, 255), outline=(255, 255, 255, 255), width=line_width)

    # Clasp Button (White circle inside flap)
    button_cx = flap_left + int(flap_w * 0.65)
    button_cy = (flap_top + flap_bottom) // 2
    button_r = int(s * 0.025)
    hr_draw.ellipse([button_cx - button_r, button_cy - button_r, button_cx + button_r, button_cy + button_r], fill=(255, 255, 255, 255))

    # 4. Euro Symbol (€) centered on left side of wallet
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    font_size = int(s * 0.16)
    font = ImageFont.truetype(font_path, font_size)
    
    euro_text = "€"
    bbox = font.getbbox(euro_text)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    euro_cx = w_left + int((flap_left - w_left) * 0.5)
    euro_cy = (w_top + w_bottom) // 2

    euro_x = euro_cx - text_w // 2 - bbox[0]
    euro_y = euro_cy - text_h // 2 - bbox[1]

    hr_draw.text((euro_x, euro_y), euro_text, font=font, fill=(255, 255, 255, 255))

    # Downsample high-res to output size using Lanczos for perfect smoothness
    final_img = hr_img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

if __name__ == "__main__":
    print("Generating pure black & white minimalist icons...")
    base_icon = create_bw_wallet_icon(1024)

    # Generate 512x512
    icon512 = base_icon.resize((512, 512), Image.Resampling.LANCZOS)
    icon512.save("frontend/public/icon-512.png", "PNG")

    # Generate 192x192
    icon192 = base_icon.resize((192, 192), Image.Resampling.LANCZOS)
    icon192.save("frontend/public/icon-192.png", "PNG")

    # Generate apple-touch-icon (180x180)
    icon180 = base_icon.resize((180, 180), Image.Resampling.LANCZOS)
    icon180.save("frontend/public/apple-touch-icon.png", "PNG")

    # Generate favicon.ico (64x64)
    icon64 = base_icon.resize((64, 64), Image.Resampling.LANCZOS)
    icon64.save("frontend/public/favicon.ico", format="ICO", sizes=[(64, 64), (32, 32), (16, 16)])

    print("Pure black & white icons successfully generated in frontend/public!")
