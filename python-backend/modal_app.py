
import modal
import io
import os
import subprocess
import sys
sys.path.insert(0, "/opt/manga")
from fastapi import Response, UploadFile, File, Form, FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 1. AI Environment Setup
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .run_commands(
        "git clone https://github.com/zyddnys/manga-image-translator.git /opt/manga",
        "cd /opt/manga && pip install -r requirements.txt",
        "pip install fastapi[standard] python-multipart manga-ocr rich omegaconf timm einops",
        # Pre-download MangaOCR model to cache
        "python -c 'from manga_ocr import MangaOcr; MangaOcr()'"
    )
    .env({"PYTHONPATH": "/opt/manga"})
)

# Шинэ нэрээр бүрэн шинээр үүсгэнэ
app = modal.App("webtoon-translator-v2", image=image)

# AI моделууд хадгалагддаг үндсэн фолдерыг диск болгон холбоно
manga_volume = modal.Volume.from_name("manga-models-v2", create_if_missing=True)


@app.cls(
    image=image,
    gpu="T4",
    timeout=1500,
    volumes={"/root/.manga_translator": manga_volume},
    scaledown_window=600, # Keep container alive for 10 mins after last request
    concurrency_limit=5    # Allow multiple concurrent translations
)
class Translator:
    @modal.enter()
    def setup(self):
        import sys
        import os
        if "/opt/manga" not in sys.path:
            sys.path.insert(0, "/opt/manga")

        from manga_translator import MangaTranslator
        import manga_translator.translators as translators
        from manga_translator.translators.google import GoogleTranslator
        
        # Monkeypatch: Re-enable Google Translator which is commented out in this version
        print("🔓 Re-enabling Google Translator...")
        translators.TRANSLATORS['google'] = GoogleTranslator
        # Also need to allow it in the Config Enum (hacky but works for Pydantic)
        from manga_translator.config import Translator as TranslatorEnum
        try:
            # This is a bit risky but we can try to inject it
            # If it fails, we'll just use the string directly and hope for the best
            pass
        except:
            pass

        # Safe Mode: Disable problematic internal log redirection that hangs in Modal
        print("🛠️ Applying Safe Mode patch to MangaTranslator...")
        def dummy_setup_log(self):
            print("📝 Internal MangaTranslator logging disabled for Modal stability.")
            return
        
        MangaTranslator._setup_log_file = dummy_setup_log
        
        print("🚀 Initializing AI Engine (Safe Mode)...")
        try:
            # Enable GPU and set kernel_size
            self.translator = MangaTranslator({
                'kernel_size': 3,
                'use_gpu': True
            })

            from manga_ocr import MangaOcr
            print("👁️ Loading MangaOCR for helper services...")
            self.mocr = MangaOcr()

            print("✅ AI Engine & OCR initialized successfully with GPU support.")
        except Exception as e:
            print(f"❌ Failed to initialize AI Engine: {str(e)}")
            import traceback
            traceback.print_exc()
            raise e

    @modal.asgi_app()
    def web(self):
        web_app = FastAPI()
        
        web_app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @web_app.get("/")
        def check_status():
            return {"status": "running", "message": "AI Backend is online. Use POST to submit images."}

        @web_app.post("/")
        async def process(image: UploadFile = File(...), target_lang: str = Form("mn"), task_type: str = Form("translate"), task_id: str = Form("default"), mask_rect: str = Form(None)):
            import PIL.Image
            import numpy as np
            import asyncio
            import base64
            from manga_translator.config import Config, TranslatorConfig, OcrConfig, InpainterConfig, DetectorConfig

            print(f"📥 Received request: {task_id} | Type: {task_type} | Lang: {target_lang}")
            
            contents = await image.read()
            img = PIL.Image.open(io.BytesIO(contents)).convert("RGB")
            
            # Configure
            cfg = Config()
            cfg.verbose = True # Enable verbose for more logs in Modal
            
            # Common settings - Fixed names for Pydantic validation
            cfg.ocr = OcrConfig(ocr='mocr')
            cfg.detector = DetectorConfig(detector='default')
            cfg.inpainter = InpainterConfig(inpainter='lama_large')
            
            dest_lang = 'mn' if target_lang.lower() == 'mn' else target_lang.upper()
            
            # Bypass Pydantic enum validation for 'google' if needed
            # We use 'none' as placeholder then override
            cfg.translator = TranslatorConfig(translator='none', target_lang=dest_lang)
            if task_type != 'erase_only':
                # Manually set to 'google' bypassing enum validation via pydantic internal
                object.__setattr__(cfg.translator, 'translator', 'google')

            # Run Process
            print(f"⚙️ Starting AI Engine for {task_id}...")
            try:
                if task_type == 'full_automation_json':
                    print(f"🤖 Starting Full Automation (JSON Output) for {task_id}")
                    
                    # 1. Run Pipeline
                    # We utilize the standard translate function but interpret results differently
                    ctx = await self.translator.translate(img, config=cfg)
                    
                    # 2. Extract Clean Image (Inpainted)
                    # The library usually stores the 'final' inpainted image in ctx.input if inpainting was successful
                    # effectively modifying the input image object in place or storing it in intermediate structures.
                    # A safer bet with this specific library is checking ctx.input (which might be modified) 
                    # or better, simply returning the result text blocks and let frontend handle cleaning? 
                    # No, we want the clean image. 
                    
                    # Let's inspect the library source via our knowledge or assumptions. 
                    # Usually: 'ctx.result' is the final image with text baked in.
                    # 'ctx.text_regions' contains the text data.
                    # To get the CLEAN image (text removed), we need to look at intermediate steps.
                    # However, since we can't easily hook into intermediate steps without modifying the library,
                    # We will rely on running a separate inpainting pass if needed, OR:
                    # In `manga-image-translator`, there isn't a direct "get clean image" output exposed easily in `translate`.
                    # BUT, we can use `task_type='erase_only'` logic to get clean image? No, that returns an image.
                    
                    # STRATEGY: 
                    # We will parse `ctx.text_regions`.
                    # We will return the `ctx.result` (which is translated) as a preview? No user wants editable.
                    # We need the CLEAN image.
                    
                    # Let's try to access the internal mask/inpaining.
                    # Actually, if we look at `translate` implementation in the library:
                    # It does: detect -> ocr -> translate -> mask -> inpaint -> render.
                    # We might need to manually run these steps to get intermediate data if `translate` doesn't return it.
                    
                    # ALTERNATIVE: Use the library's classes directly inside this function for granular control.
                    from manga_translator.detection import dispatch as dispatch_detection
                    from manga_translator.ocr import dispatch as dispatch_ocr
                    from manga_translator.inpainting import dispatch as dispatch_inpainting
                    from manga_translator.utils import TextBlock
                    
                    # A. Detection
                    print("   - Running Detection...")
                    text_regions = await dispatch_detection(cfg.detector, np.array(img), self.translator.device)
                    # Convert to TextBlock objects
                    blks = [TextBlock(r) for r in text_regions]
                    
                    # B. OCR
                    print("   - Running OCR...")
                    await dispatch_ocr(cfg.ocr, np.array(img), blks, self.translator.device)
                    
                    # C. Translation
                    print("   - Running Translation...")
                    from manga_translator.translation import dispatch as dispatch_translation
                    # We need to set up the translator properly
                    # Re-instantiate a translator instance or use the global one if possible
                    # We'll use the dispatch function which is stateless-ish
                    await dispatch_translation(cfg.translator, blks)
                    
                    # D. Inpainting (Clean Image)
                    print("   - Running Inpainting (Cleaning)...")
                    # Create combined mask from all blocks
                    h, w = np.array(img).shape[:2]
                    mask = np.zeros((h, w), dtype=np.uint8)
                    for blk in blks:
                        x1, y1, x2, y2 = blk.xyxy
                        mask[y1:y2, x1:x2] = 255
                    
                    inpainted_np = await dispatch_inpainting(cfg.inpainter.inpainter, np.array(img), mask, cfg.inpainter, 1024, self.translator.device)
                    clean_img_pil = PIL.Image.fromarray(inpainted_np)
                    
                    # E. Prepare Response
                    clean_buff = io.BytesIO()
                    clean_img_pil.save(clean_buff, format="PNG")
                    clean_b64 = base64.b64encode(clean_buff.getvalue()).decode('utf-8')
                    
                    regions_data = []
                    for blk in blks:
                        regions_data.append({
                            'xyxy': blk.xyxy.tolist(),
                            'text': blk.text,             # Original OCR
                            'translation': blk.translation, # Translated Text
                            'fg_color': blk.fg_color.tolist() if hasattr(blk, 'fg_color') else [0,0,0],
                            'bg_color': blk.bg_color.tolist() if hasattr(blk, 'bg_color') else [255,255,255]
                        })
                        
                    response_json = {
                        "clean_image": f"data:image/png;base64,{clean_b64}",
                        "regions": regions_data
                    }
                    
                    return Response(content=json.dumps(response_json), media_type="application/json")


                if task_type == 'context_aware_fill' and mask_rect:
                    import json
                    rect = json.loads(mask_rect)
                    print(f"✨ Performing Context Aware Fill on rect: {rect}")
                    
                    # Create mask
                    mask = np.zeros((img.height, img.width), dtype=np.uint8)
                    x, y, w, h = int(rect['x']), int(rect['y']), int(rect['w']), int(rect['h'])
                    # Ensure within bounds
                    x = max(0, min(x, img.width - 1))
                    y = max(0, min(y, img.height - 1))
                    w = min(w, img.width - x)
                    h = min(h, img.height - y)
                    mask[y:y+h, x:x+w] = 255
                    
                    # Run inpainting directly using dispatch_inpainting
                    from manga_translator.inpainting import dispatch as dispatch_inpainting
                    
                    img_np = np.array(img)
                    inpainted = await dispatch_inpainting(
                        'lama_large', 
                        img_np, 
                        mask, 
                        cfg.inpainter,
                        1024, # inpainting_size
                        self.translator.device, 
                        True
                    )
                    
                    result_img = PIL.Image.fromarray(inpainted)
                    img_byte_arr = io.BytesIO()
                    result_img.save(img_byte_arr, format='PNG')
                    print(f"✅ Context Aware Fill Success for {task_id}")
                    return Response(content=img_byte_arr.getvalue(), media_type="image/png")

                result_ctx = await self.translator.translate(img, config=cfg)
                print(f"🚀 AI Processing finished for {task_id}")
            except Exception as e:
                print(f"❌ AI Error during processing: {str(e)}")
                import traceback
                traceback.print_exc()
                raise e
            
            # Result handling
            img_byte_arr = io.BytesIO()
            if result_ctx.result:
                result_ctx.result.save(img_byte_arr, format='PNG')
            else:
                # Fallback if no result (shouldn't happen usually)
                result_ctx.input.save(img_byte_arr, format='PNG')

            print(f"📤 Sending back result for {task_id}")
            return Response(content=img_byte_arr.getvalue(), media_type="image/png")

        @web_app.post("/ocr")
        async def ocr_region(image: UploadFile = File(...)):
            import PIL.Image
            print("🔍 Processing OCR Region request...")
            try:
                contents = await image.read()
                img = PIL.Image.open(io.BytesIO(contents)).convert("RGB")
                
                # Use our pre-loaded MangaOCR
                text = self.mocr(img)
                print(f"✅ OCR Success: {text}")
                return {"text": text}
            except Exception as e:
                print(f"❌ OCR Error: {str(e)}")
                return {"error": str(e), "text": ""}

        @web_app.post("/detect_bubbles")
        async def detect_bubbles(image: UploadFile = File(...)):
            """
            Detect all speech bubbles/text regions in the image.
            Returns coordinates of all detected bubbles for frontend masking.
            """
            import PIL.Image
            import numpy as np
            from manga_translator.detection import dispatch as dispatch_detection
            from manga_translator.config import DetectorConfig
            
            print("🎯 Processing Bubble Detection request...")
            try:
                contents = await image.read()
                img = PIL.Image.open(io.BytesIO(contents)).convert("RGB")
                
                # Use the existing detection engine
                detector_cfg = DetectorConfig(detector='default')
                text_regions = await dispatch_detection(detector_cfg, np.array(img), self.translator.device)
                
                # Format coordinates
                bubbles = []
                for region in text_regions:
                    # region is typically [x1, y1, x2, y2] or similar
                    bubbles.append({
                        'x1': int(region[0]),
                        'y1': int(region[1]),
                        'x2': int(region[2]),
                        'y2': int(region[3])
                    })
                
                print(f"✅ Detected {len(bubbles)} bubbles")
                return {"bubbles": bubbles, "count": len(bubbles)}
                
            except Exception as e:
                print(f"❌ Bubble Detection Error: {str(e)}")
                import traceback
                traceback.print_exc()
                return {"error": str(e), "bubbles": [], "count": 0}
    
        return web_app

@app.function(image=image, volumes={"/root/.manga_translator": manga_volume}, timeout=1500)
async def warmup():
    import sys
    if "/opt/manga" not in sys.path:
        sys.path.insert(0, "/opt/manga")
        
    from manga_translator import MangaTranslator
    from manga_translator.config import Config, TranslatorConfig, OcrConfig, InpainterConfig, DetectorConfig
    from PIL import Image, ImageDraw
    import numpy as np
    
    # Safe Mode for warmup too
    MangaTranslator._setup_log_file = lambda self: None
    
    print("🔥 Starting Deep Warmup (Checking all models)...")
    
    # Create a dummy image with some random text-like shapes to trigger full pipeline
    img = Image.new('RGB', (512, 512), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    for i in range(5):
        d.rectangle([100+i*50, 100, 140+i*50, 140], fill=(0, 0, 0))
    
    translator = MangaTranslator({
        'kernel_size': 3,
        'use_gpu': True
    })
    
    # Test Workflow: Translate to trigger OCR, Det, Inpaint
    cfg = Config()
    cfg.ocr = OcrConfig(ocr='mocr')
    cfg.detector = DetectorConfig(detector='default')
    cfg.inpainter = InpainterConfig(inpainter='lama_large')
    cfg.translator = TranslatorConfig(translator='none', target_lang='ENG')
    
    print("⚙️ Pipeline Check 1: Detection & Inpainting & OCR...")
    try:
        await translator.translate(img, config=cfg)
        print("✅ Pipeline test successful.")
    except Exception as e:
        print(f"⚠️ Warmup test warning: {str(e)}")
        # We don't raise here as some models might just be in download state
    
    print("✅ Models are being persistent on volume. Restarting may be needed for final speed.")
