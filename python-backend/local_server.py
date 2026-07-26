
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from manga_image_translator.translator import MangaTranslator
import PIL.Image
import numpy as np
import io

app = FastAPI()

# CORS тохиргоо (Frontend-тэй холбогдоход хэрэгтэй)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI Орчуулагчийг ачаалах
print("🚀 Local AI моделейг ачаалж байна (Түр хүлээнэ үү)...")
translator = MangaTranslator(
    detector='yolov8',
    translator='google',
    ocr='manga-ocr',
    inpainter='lama',
)
print("✅ Бэлэн боллоо. Сервер http://localhost:8000 дээр ажиллаж байна.")

@app.post("/process")
async def process(image: UploadFile = File(...), target_lang: str = Form("mn")):
    contents = await image.read()
    img = PIL.Image.open(io.BytesIO(contents)).convert("RGB")
    img_np = np.array(img)

    dest_lang = 'mn' if target_lang.lower() == 'mn' else target_lang.upper()
    
    # Орчуулах
    result = translator.translate(img_np, dest=dest_lang)

    # PNG болгож буцаах
    img_byte_arr = io.BytesIO()
    result.save(img_byte_arr, format='PNG')
    return Response(content=img_byte_arr.getvalue(), media_type="image/png")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
