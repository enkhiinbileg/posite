import os
import glob
from PIL import Image, ImageDraw

def process_images():
    brain_dir = r"C:\Users\artmo\.gemini\antigravity\brain\336932dd-987c-429c-8ecc-a689c94b165a"
    pngs = glob.glob(os.path.join(brain_dir, 'media__*.png'))
    if not pngs:
        print("No pngs found")
        return
    newest_png = max(pngs, key=os.path.getmtime)
    print(f"Using {newest_png}")

    # 1. Update site logo
    logo_path = r"c:\Users\artmo\OneDrive\Desktop\all projects\webtoon\public\logo.png"
    img = Image.open(newest_png).convert("RGBA")
    img.save(logo_path)

    # 2. Transformed icon for browser
    icon_path = r"c:\Users\artmo\OneDrive\Desktop\all projects\webtoon\src\app\icon.png"
    
    # We want it enlarged and perfectly circle.
    # First, let's make it a square by fitting it compactly
    w, h = img.size
    side = min(w, h)
    
    # Crop to center
    left = (w - side) / 2
    top = (h - side) / 2
    right = (w + side) / 2
    bottom = (h + side) / 2
    img_cropped = img.crop((left, top, right, bottom))
    
    # Resize to standard size
    img_resized = img_cropped.resize((512, 512), Image.Resampling.LANCZOS)
    
    # "Enlarge" (zoom in) by 10% to remove excess transparent padding, making it wider and fill the circle more
    zoom = 1.15
    new_size = int(512 * zoom)
    img_zoomed = img_resized.resize((new_size, new_size), Image.Resampling.LANCZOS)
    
    # Stretch horizontally slightly as requested "iluu orgon" (wider) - 10%
    img_zoomed = img_zoomed.resize((int(new_size * 1.1), new_size), Image.Resampling.LANCZOS)

    zw, zh = img_zoomed.size
    z_left = (zw - 512) / 2
    z_top = (zh - 512) / 2
    img_final = img_zoomed.crop((z_left, z_top, z_left + 512, z_top + 512))

    # Apply perfect circle mask
    mask = Image.new("L", (512, 512), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, 512, 512), fill=255)

    output = Image.new("RGBA", (512, 512), (0,0,0,0))
    output.paste(img_final, (0,0), mask)

    output.save(icon_path)
    print("Saved public/logo.png and src/app/icon.png")

if __name__ == "__main__":
    process_images()
