from huggingface_hub import hf_hub_download
import shutil
import os

print("Downloading Comic Text Detector Model (ogkalu/comic-speech-bubble-detector-yolov8m)...")

try:
    # Correct filename from Hugging Face
    model_path = hf_hub_download(
        repo_id="ogkalu/comic-speech-bubble-detector-yolov8m", 
        filename="comic-speech-bubble-detector.pt"
    )
    print(f"Model downloaded to: {model_path}")

    # Copy to current directory
    target_path = "comic_bubble_detector.pt"
    shutil.copy(model_path, target_path)
    print(f"Model saved as {target_path}")

except Exception as e:
    print(f"Error downloading model: {e}")
