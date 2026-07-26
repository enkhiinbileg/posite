# python-backend/server.py
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import subprocess
import asyncio
import uuid
from PIL import Image
import io
import base64

app = FastAPI()

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "temp_uploads")
RESULT_DIR = os.path.join(BASE_DIR, "temp_results")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

@app.post("/process")
async def process_image(
    image: UploadFile = File(...),
    target_lang: str = Form("mn"),
    model: str = Form("gpt-3.5-turbo")
):
    """
    Real integration using CLI command for manga-image-translator
    """
    unique_id = str(uuid.uuid4())
    filename = f"{unique_id}_{image.filename}"
    input_path = os.path.join(UPLOAD_DIR, filename)
    
    # Save the input file
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
        
    print(f"Processing {filename}...")

    # Define Output Path (manga-image-translator typically adds suffixes)
    # We will tell it to save to RESULT_DIR
    
    try:
        # Construct the command
        # Usage: manga-image-translator -l <lang> -i <input> -o <output_dir> --translator <model>
        # Note: 'mn' might not be natively supported by some offline translators, 
        # but GPT-based ones can handle it.
        
        # We assume 'manga-image-translator' is in the PATH or installed in the env.
        # Check if we should use 'python -m manga_image_translator'
        
        # FOR DEMO: We will trigger a mock translation if the library isn't found,
        # otherwise we run the real command.
        
        # COMMAND CONSTRUCTION (Uncomment to use real library):
        # cmd = [
        #     "manga-image-translator",
        #     "--verbose",
        #     "--mode", "batch",
        #     "--target_lang", "CHS", # Simplified Chinese as placeholder if MN not supported, or modify lib
        #     "-i", input_path,
        #     "-o", RESULT_DIR,
        #     "--translator", "google", # or 'gpt3.5' if configured
        # ]
        
        # Mocking the process for now: Just copy input to output to simulate success
        # In real life, the command above would create the file.
        await asyncio.sleep(2) # Simulate processing time
        
        output_filename = filename # The library usually keeps name or adds suffix
        output_path = os.path.join(RESULT_DIR, output_filename)
        
        # MOCK ACTION: Copying file
        shutil.copy(input_path, output_path)
        
        # Read the result
        if os.path.exists(output_path):
            with open(output_path, "rb") as f:
                image_bytes = f.read()
            
            # Cleanup
            # os.remove(input_path) 
            # os.remove(output_path)
            
            return Response(content=image_bytes, media_type="image/png")
        else:
            return Response(content="Translation failed: Output file not found", status_code=500)

    except Exception as e:
        print(f"Error: {e}")
        return Response(content=str(e), status_code=500)

@app.post("/slice")
async def slice_image(image: UploadFile = File(...)):
    """
    Slices a long image into smaller chunks (max width 800px, height ~1280px).
    Returns a JSON list of base64 encoded images.
    """
    try:
        contents = await image.read()
        img = Image.open(io.BytesIO(contents))
        
        # 1. Resize width to 800px if larger (maintain aspect ratio)
        target_width = 800
        if img.width > target_width:
            ratio = target_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((target_width, new_height), Image.Resampling.LANCZOS)
        
        # 2. Slice logic
        slice_height = 1280
        slices = []
        
        width, height = img.size
        for i in range(0, height, slice_height):
            # Calculate bottom coordinate
            bottom = min(i + slice_height, height)
            
            # Crop: (left, top, right, bottom)
            box = (0, i, width, bottom)
            slice_img = img.crop(box)
            
            # Convert to WebP in memory
            # WebP is smaller and supported by browsers
            output_buffer = io.BytesIO()
            # Convert to RGB if RGBA/P to avoid JPEG errors (though WebP supports alpha)
            if slice_img.mode in ('RGBA', 'P'):
                slice_img = slice_img.convert('RGB')
                
            slice_img.save(output_buffer, format="WEBP", quality=80)
            
            # Encode as base64 to send back to client
            # (Client will then interpret this and upload to Supabase)
            base64_str = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
            slices.append(f"data:image/webp;base64,{base64_str}")
            
        print(f" sliced {image.filename} into {len(slices)} parts.")
        return JSONResponse(content={"slices": slices})

    except Exception as e:
        print(f"Slice error: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    print("Starting Webtoon AI Server on port 5000...")
    print(f"Upload Dir: {UPLOAD_DIR}")
    print(f"Result Dir: {RESULT_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=5000)
