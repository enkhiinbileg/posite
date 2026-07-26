from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
import cv2
import json
import base64
import easyocr
import traceback

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from ultralytics import YOLO

# Initialize EasyOCR Reader (English)
print("Loading AI Models (EasyOCR)...")
reader = easyocr.Reader(['en'], gpu=False) 
print("AI Models Loaded.")

# Load Comic Bubble Detector (YOLO)
print("Loading Comic Bubble Detector (YOLOv8)...")
try:
    bubble_model = YOLO("comic_bubble_detector.pt")
    print("YOLO Model Loaded.")
except Exception as e:
    print(f"Failed to load YOLO model: {e}. Using OpenCV fallback.")
    bubble_model = None

def sort_by_reading_order(results):
    """Sorts OCR results: Top-to-Bottom, then Left-to-Right"""
    return sorted(results, key=lambda x: (x[0][0][1], x[0][0][0]))

def get_iou(box1, box2):
    """Intersection over Union for box deduplication/merging"""
    # Box format: [[x1,y1], [x2,y2], [x3,y3], [x4,y4]] (for OCR results)
    # OR: (x1, y1, x2, y2) (for simple rects)
    
    # standardize to x1,y1,x2,y2
    if isinstance(box1, list) or isinstance(box1, tuple):
        if hasattr(box1[0], '__len__'):
             # polygon [[x1,y1]...]
             ax1, ay1 = box1[0]
             ax2, ay2 = box1[2]
        else:
             ax1, ay1, ax2, ay2 = box1
    
    if isinstance(box2, list) or isinstance(box2, tuple):
        if hasattr(box2[0], '__len__'):
             bx1, by1 = box2[0]
             bx2, by2 = box2[2]
        else:
             bx1, by1, bx2, by2 = box2

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    if inter_x2 < inter_x1 or inter_y2 < inter_y1:
        return 0.0

    inter_area = max(0, inter_x2 - inter_x1) * max(0, inter_y2 - inter_y1)
    area1 = (ax2 - ax1) * (ay2 - ay1)
    area2 = (bx2 - bx1) * (by2 - by1)
    
    return inter_area / float(area1 + area2 - inter_area)

def find_text_regions(img):
    """
    Hybrid Detection: YOLO (AI) for Bubbles + OpenCV for Floating Text.
    100% Comic Translate Logic.
    """
    regions = []
    
    # 1. AI Bubble Detection (YOLO)
    if bubble_model:
        results = bubble_model.predict(img, conf=0.3, verbose=False)
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                regions.append((int(x1), int(y1), int(x2), int(y2)))
    
    # 2. OpenCV Fallback / Supplement (for SFX/Floating)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 10)
    combined = cv2.bitwise_or(edges, binary)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 5)) # Wider kernel to group text lines
    dilated = cv2.dilate(combined, kernel, iterations=3)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    h, w = img.shape[:2]
    opencv_regions = []
    for cnt in contours:
        x, y, rw, rh = cv2.boundingRect(cnt)
        if rw > 15 and rh > 15: # Filter tiny noise
            pad = 10
            rx1, ry1, rx2, ry2 = max(0, x-pad), max(0, y-pad), min(w, x+rw+pad), min(h, y+rh+pad)
            
            # Check overlap with existing AI regions
            is_new = True
            for ax1, ay1, ax2, ay2 in regions:
                # If OpenCV region is INSIDE or HIGHLY OVERLAPS with AI bubble, ignore OpenCV (AI is better)
                iou = get_iou((rx1, ry1, rx2, ry2), (ax1, ay1, ax2, ay2))
                if iou > 0.1: # Any significant overlap -> Trust AI
                    is_new = False
                    break
            
            if is_new:
                opencv_regions.append((rx1, ry1, rx2, ry2))

    return regions + opencv_regions

@app.websocket("/ws-ocr")
async def websocket_ocr(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            image_b64 = message.get("image")
            page_id = message.get("id")
            
            if not image_b64:
                continue

            await websocket.send_json({"type": "progress", "id": page_id, "percent": 5, "stage": "Initializing Ultra-Speed..."})

            # Decode
            encoded_data = image_b64.split(',')[1] if ',' in image_b64 else image_b64
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                await websocket.send_json({"type": "error", "id": page_id, "message": "Invalid image format"})
                continue

            height, width = img.shape[:2]
            
            # --- ULTRA FAST SCAN MODE ---
            # 1. Downscale for super fast region detection
            scale = 1.0
            if width > 1000:
                scale = 1000.0 / width
                detect_img = cv2.resize(img, (1000, int(height * scale)))
            else:
                detect_img = img

            await websocket.send_json({"type": "progress", "id": page_id, "percent": 15, "stage": "Detecting Text Areas..."})
            
            # 2. Find ROI regions (Super fast OpenCV)
            regions = find_text_regions(detect_img)
            
            # 3. Map regions back to original scale
            final_raw_results = []
            if not regions:
                 await websocket.send_json({"type": "success", "id": page_id, "text": [], "percent": 100})
                 continue

            total = len(regions)
            await websocket.send_json({"type": "progress", "id": page_id, "percent": 25, "stage": f"OCR-ing {total} blocks..."})

            # 4. OCR only the regions (The magic fix for speed!)
            for i, (x1, y1, x2, y2) in enumerate(regions):
                # Scale back
                rx1, ry1, rx2, ry2 = int(x1/scale), int(y1/scale), int(x2/scale), int(y2/scale)
                crop = img[ry1:ry2, rx1:rx2]
                
                if crop.size == 0: continue

                # Run OCR on small crop (Very fast)
                # Greedy decoder is fine for small crops
                res = reader.readtext(crop, detail=1, paragraph=True, decoder='greedy')
                
                for box, text, conf in res:
                    # Offset back to full image
                    for pt in box:
                        pt[0] += rx1
                        pt[1] += ry1
                    final_raw_results.append((box, text, conf))
                
                # Update progress every few items to feel smooth
                if i % 5 == 0:
                    percent = 25 + int((i / total) * 70)
                    await websocket.send_json({"type": "progress", "id": page_id, "percent": percent, "stage": f"Proccessing {i}/{total}..."})

            await websocket.send_json({"type": "progress", "id": page_id, "percent": 98, "stage": "Finalizing..."})
            
            # Dedup and sort
            dedup_results = []
            final_raw_results.sort(key=lambda x: x[2], reverse=True)
            for res in final_raw_results:
                is_dup = False
                for ex in dedup_results:
                    if get_iou(res[0], ex[0]) > 0.5:
                        is_dup = True
                        break
                if not is_dup:
                    dedup_results.append(res)

            sorted_results = sort_by_reading_order(dedup_results)
            extracted_text = [res[1] for res in sorted_results]
            
            await websocket.send_json({
                "type": "success", 
                "id": page_id, 
                "text": extracted_text,
                "percent": 100
            })

    except Exception:
        print(traceback.format_exc())
    finally:
        await websocket.close()

@app.get("/")
async def health():
    return {"status": "online"}

@app.post("/ocr-pro")
async def ocr_pro_sync(image: UploadFile = File(...)):
    # Standard fallback
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    results = reader.readtext(img, detail=1, paragraph=True)
    sorted_res = sort_by_reading_order(results)
    return {"success": True, "text": [r[1] for r in sorted_res]}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5000)
