# AUTOMATED WEBTOON TRANSLATION SYSTEM - IMPLEMENTATION PLAN

## 1. System Overview
Create an automated pipeline that takes a raw webtoon image, detects text, translates it to Mongolian using AI, removes the original text, and renders the new Mongolian text seamlessly.

**Goal:** Reduce manual typesetting time by 90%.

## 2. Technology Stack

### Frontend (User Interface)
- **Framework:** Next.js (Current Project)
- **Features:**
    - Bulk Image Upload (Drag & Drop)
    - Side-by-Side Comparison (Original vs Translated)
    - Manual Editor (To fix bad translations or text placement)
    - Export/Download

### Backend (The AI Worker)
*Note: This requires a separate Python server (e.g., running on RunPod, Google Colab, or a local PC with NVIDIA GPU).*
- **Language:** Python 3.10+
- **Core Library:** [manga-image-translator](https://github.com/zhongyang219/manga-image-translator) (Industry Standard Open Source)
- **Text Detection:** Comic Text Detector (YOLO model)
- **OCR:** Manga-OCR
- **Translator:** GPT-4o API (Custom connector for Mongolian context)
- **Inpainting:** LaMa (Resolution-robust Large Mask Inpainting)

## 3. Detailed Workflow

### Step 1: Image Pre-processing
User uploads images to Supabase Storage. The Next.js API triggers a webhook to the Python Server.

### Step 2: Detection & Masking
The Python script runs detection to find all text bubbles. It creates a "Mask" image where white pixels = text and black pixels = art.

### Step 3: OCR & Translation
1. Crop the text areas.
2. Run OCR to extract Korean/English text.
3. Send text to LLM (GPT-4o) with prompt:
   > "Translate the following manhwa dialogue to conversational Mongolian. Context: Action/Fantasy. Keep lines short."
   
### Step 4: Cleaning (Inpainting)
Using the Mask from Step 2, the `LaMa` model erases the original text and visually hallucinates/paints the background behind the text.

### Step 5: Typesetting (Rendering)
1. Calculate the bounding box of the bubble.
2. Choose a predefined Mongolian font (e.g., "Manga Temple" or a free Cyrillic Brush font).
3. Use an algorithm to wrap text to fit the bubble shape.
4. Draw the text onto the cleaned image.

## 4. How to Integrate with Current Project

Since we cannot run heavy Python AI models directly efficiently in Next.js Serverless functions, we will build a simple **bridge**.

### Approach A: Local AI Server (Recommended for Dev)
1. You run the Python script on your local machine (using your GPU).
2. You expose a simple API (FastAPI) locally.
3. Your Next.js app sends images to `localhost:8000/process`.

### Approach B: Cloud GPU (Production)
1. Deploy the Python code to a service like **Replicate** or **RunPod**.
2. Next.js calls the Replicate API with the image URL.
3. Replicate returns the translated image URL after processing (approx 5-10 seconds per image).

## 5. Implementation Steps (MVP)

1. **Install Python Tools:**
   Set up `manga-image-translator` locally to verify quality.
   
2. **Setup Admin Interface:**
   Create a page `/admin/translator` in Next.js.

3. **Connect API:**
   Create an API route `POST /api/translate-image` that forwards the request to the Python backend.

4. **Refine Fonts:**
   Add custom Mongolian fonts to the Python renderer to make it look "World Class" instead of using Arial/Times New Roman.

## 6. Code Snippets (Concept)

### Next.js API Route (The Bridge)
```typescript
// src/app/api/translate/route.ts
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('image');
  
  // Forward to Python Server
  const response = await fetch('http://localhost:5000/process', {
    method: 'POST',
    body: formData,
  });
  
  const translatedImage = await response.blob();
  return new Response(translatedImage);
}
```

### Python Server (The Engine) - Basic Concept
```python
# requires: pip install manga-image-translator
from manga_image_translator import translate
import asyncio

async def process_image(image_path):
    # This single line does detection, OCR, translation, and inpainting
    await translate(
        image_path,
        translator='gpt3.5', # Or custom GPT-4 wrap
        target_lang='mn',    # Custom mapping for Mongolian
        inpainter='lama'
    )
```

## 7. Next Steps for YOU

1. Do you have a PC with an NVIDIA GPU? Or do you want to use a Cloud API service (Costs money per image)?
2. If you have a GPU, I can guide you to install the Python backend locally.
3. If you want Cloud, we can look into **Replicate** or **HuggingFace** endpoints.
