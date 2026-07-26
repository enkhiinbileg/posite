import os
import glob
import shutil

def main():
    brain_dir = r"C:\Users\artmo\.gemini\antigravity\brain\336932dd-987c-429c-8ecc-a689c94b165a"
    pngs = glob.glob(os.path.join(brain_dir, 'media__*.png'))
    if not pngs:
        print("No images found.")
        return
    
    newest_png = max(pngs, key=os.path.getmtime)
    print(f"Using exact image: {newest_png}")
    
    # Paths
    logo_path = r"c:\Users\artmo\OneDrive\Desktop\all projects\webtoon\public\logo.png"
    icon_path = r"c:\Users\artmo\OneDrive\Desktop\all projects\webtoon\src\app\icon.png"
    
    # Just copy EXACTLY as it is
    shutil.copyfile(newest_png, logo_path)
    shutil.copyfile(newest_png, icon_path)
    
    print("Success: Exact matching image overwritten.")

if __name__ == "__main__":
    main()
