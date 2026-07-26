# Google Colab - Үнэгүй GPU Сервер Тохируулах Заавар

Таны компьютер график картгүй (GPU-гүй) тул бид Google-ийн хүчирхэг компьютерийг үнэгүй ашиглах болно. Үүнийг **Google Colab** гэдэг.

Энэ зааврыг алхам алхмаар дагаарай.

## 1-р Алхам: Google Colab руу орох
1. [Google Colab (Энд дар)](https://colab.research.google.com/) руу орно.
2. **New Notebook** (Шинэ дэвтэр) товчийг дарж шинэ хуудас нээгээрэй.

## 2-р Алхам: GPU асаах (Чухал!)
1. Дээд цэснээс **Runtime** -> **Change runtime type** гэж сонгоно.
2. **Hardware accelerator** хэсгээс **T4 GPU**-г сонгоод **Save** дарна.
   *(Тэгэхгүй бол маш удаан ажиллана шүү!)*

## 3-р Алхам: Кодоо хуулах
Доорх кодыг бүтнээр нь хуулж аваад Colab дээрээ тавиарай.

**АНХААР:** `YOUR_NGROK_TOKEN_HERE` гэсэн хэсэгт өөрийн Token-ийг хийх ёстой.
*Token авах заавар:* [ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken) руу бүртгүүлээд орвол `Example` хэсэгт `ngrok config add-authtoken ...` гээд урт үсэг тоонууд байгаа. Тэрийг хуулж авна.

```python
# @title 1. AI Серверийг Асаах (Play товчийг дар)
!pip install -q git+https://github.com/zhongyang219/manga-image-translator.git
!pip install -q fastapi uvicorn python-multipart pyngrok nest-asyncio

import os
import shutil
import asyncio
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import Response
# from manga_image_translator import translate 
# (Жинхэнэ орчуулга хийх үед дээрхийг идэвхжүүлнэ)

import uvicorn
from pyngrok import ngrok
import nest_asyncio

# Colab дээр сервер асаахад хэрэгтэй
nest_asyncio.apply()

app = FastAPI()
os.makedirs("temp_uploads", exist_ok=True)

@app.post("/process")
async def process_image(
    image: UploadFile = File(...),
    target_lang: str = Form("mn"),
    model: str = Form("gpt-3.5-turbo")
):
    print(f"Зураг ирлээ: {image.filename}")
    path = f"temp_uploads/{image.filename}"
    
    # Зургийг хадгалах
    with open(path, "wb") as f:
        shutil.copyfileobj(image.file, f)
    
    # Энд жинхэнэ AI ажиллах хэсэг байна.
    # Одоогоор тест хийж байгаа тул зүгээр л буцаагаад явуулъя.
    # Та дараа нь жинхэнэ орчуулгын кодыг идэвхжүүлж болно.
    
    try:
        # Жинхэнэ код иймэрхүү байна:
        # await translate.translate_image(path, dest='CHS', translator='google', inpainter='lama-mpe')
        
        # Түр зуур: Зургийг буцааж илгээх (Холболт болсныг шалгах)
        with open(path, "rb") as f:
             return Response(content=f.read(), media_type="image/png")
             
    except Exception as e:
        return Response(content=str(e), status_code=500)

# Ngrok тохиргоо (Token-оо энд хийнэ үү!)
# Жишээ: auth_token = "2arT..."
auth_token = "YOUR_NGROK_TOKEN_HERE" 
ngrok.set_auth_token(auth_token)

# Серверийг интернетэд гаргах
public_url = ngrok.connect(5000).public_url
print("="*50)
print(f"🚀 ТАНЫ ЛИНК: {public_url}")
print("Дээрх https://... гэсэн линкийг хуулж аваад Admin Panel-даа хийнэ үү.")
print("="*50)

# Сервер эхлүүлэх
uvicorn.run(app, port=5000)
```

## 4-р Алхам: Сайттайгаа холбох
1. Colab дээр код ажиллаж эхлэхэд `🚀 ТАНЫ ЛИНК: https://random-id.ngrok-free.app` гэж гарч ирнэ.
2. Тэр линкийг хуулж авна.
3. Өөрийн вэб сайтын **Admin Panel -> AI Орчуулагч** хэсэг рүү орно.
4. "Google Colab Линк" гэсэн хэсэгт хуулсан линкээ тавиарай.
5. Одоо зураг оруулаад "Орчуулах" товчийг дарж үзээрэй!

Амжилт хүсье! 🚀
