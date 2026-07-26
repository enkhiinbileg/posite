from PIL import Image

def fix_icon_enlarged():
    src = r"C:\Users\artmo\Downloads\Screenshot_2026-03-29_221822-removebg-preview.png"
    dest = r"c:\Users\artmo\OneDrive\Desktop\all projects\webtoon\src\app\icon.png"

    try:
        img = Image.open(src).convert("RGBA")
        
        # Trim all empty transparent space natively
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
            
        w, h = img.size
        
        # We need a perfect square canvas to prevent the browser from stretching/squishing it
        # But we want to MAXIMIZE the size entirely without cutting off the image
        side = max(w, h)
        
        # Create a new transparent square image
        square_img = Image.new("RGBA", (side, side), (0,0,0,0))
        
        # Paste the strictly cropped image precisely in the center
        offset_x = (side - w) // 2
        offset_y = (side - h) // 2
        square_img.paste(img, (offset_x, offset_y))
        
        # Resize to standard favicon size for max clarity
        final_img = square_img.resize((512, 512), Image.Resampling.LANCZOS)
        
        final_img.save(dest)
        print("Success: Made icon as LARGE as mathematically possible!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_icon_enlarged()
