import cv2
import numpy as np
import os

def detect_bubbles(image_path, output_path):
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        print("Image not found")
        return
    
    # Resize for faster processing
    height, width = img.shape[:2]
    scale = 1000 / width
    dsize = (1000, int(height * scale))
    resized = cv2.resize(img, dsize)
    
    # Convert to grayscale
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    
    # Thresholding to find white areas (bubbles)
    # Most comic bubbles are near-white (200-255)
    _, thresh = cv2.threshold(gray, 220, 255, cv2.THRESH_BINARY)
    
    # Morphological operations to clean up
    kernel = np.ones((5,5), np.uint8)
    opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter and draw
    result_img = resized.copy()
    bubbles = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = float(w)/h
        
        # Heuristics for comic bubbles
        # 1. Minimum area to filter out noise
        # 2. Aspect ratio shouldn't be too extreme
        if area > 1000 and 0.2 < aspect_ratio < 5.0:
            cv2.rectangle(result_img, (x, y), (x+w, y+h), (0, 255, 0), 2)
            bubbles.append((x, y, w, h))
            
    # Save result
    cv2.imwrite(output_path, result_img)
    print(f"Detected {len(bubbles)} bubbles. Result saved to {output_path}")

if __name__ == "__main__":
    input_img = r"C:\Users\artmo\.gemini\antigravity\brain\f8995458-1957-4cdf-8719-a3855e28151e\uploaded_media_1771152635249.png"
    output_img = r"C:\Users\artmo\.gemini\antigravity\brain\f8995458-1957-4cdf-8719-a3855e28151e\bubble_test_result.png"
    detect_bubbles(input_img, output_img)
