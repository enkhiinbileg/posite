from PIL import Image, ImageDraw

def build_perfect():
    # The clean Uchiha red/white logo without the chopped black background
    red_white_src = r"C:\Users\artmo\.gemini\antigravity\brain\336932dd-987c-429c-8ecc-a689c94b165a\media__1774843617496.png"
    
    # We will output a perfectly generated black circle icon
    icon_dest = r"c:\Users\artmo\OneDrive\Desktop\all projects\webtoon\src\app\icon.png"

    try:
        # Step 1: Create a geometrically mathematically perfect 512x512 black circle
        canvas = Image.new("RGBA", (512, 512), (0,0,0,0))
        draw = ImageDraw.Draw(canvas)
        draw.ellipse((0, 0, 512, 512), fill=(10, 10, 10, 255)) # Soft black for elegance

        # Step 2: Load the raw un-chopped clean logo
        logo = Image.open(red_white_src).convert("RGBA")
        
        # Strip invisible margins
        bbox = logo.getbbox()
        if bbox:
            logo = logo.crop(bbox)
            
        # Step 3: Resize it to fit beautifully inside the black circle
        w, h = logo.size
        # Make the logo fill about 75% of the black circle width (512 * 0.75 = 384)
        target_size = 384
        ratio = target_size / max(w, h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        
        logo = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Step 4: Center it totally flush
        offset_x = (512 - new_w) // 2
        offset_y = (512 - new_h) // 2
        canvas.paste(logo, (offset_x, offset_y), logo)
        
        # Save!
        canvas.save(icon_dest)
        
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    build_perfect()
