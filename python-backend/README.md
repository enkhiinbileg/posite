# Webtoon AI Translator Backend

Энэ нь вэбтүүн зургийг автоматаар орчуулах AI сервер юм. Next.js Frontend-ээс ирсэн хүсэлтийг хүлээн авч, `manga-image-translator` ашиглан боловсруулна.

## Шаардлага

- Python 3.8+ (3.10 зөвлөж байна)
- NVIDIA GPU (CUDA суусан байвал сайн, эсвэл CPU дээр удаан ажиллана)

## Суулгах заавар

1. **Virtual Environment үүсгэх (Зөвлөмж):**
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```

2. **Dependency суулгах:**
   ```bash
   pip install -r requirements.txt
   ```
   
   *Жич: `manga-image-translator` санг албан ёсоор суулгах:*
   ```bash
   pip install manga-image-translator
   ```
   *Эсвэл Github-ээс:*
   ```bash
   pip install git+https://github.com/zhongyang219/manga-image-translator.git
   ```

3. **Torch (GPU) суулгах:**
   Хэрэв танд NVIDIA карт байгаа бол PyTorch-ийг GPU хувилбараар суулгаарай:
   [PyTorch Get Started](https://pytorch.org/get-started/locally/)

## Ажиллуулах

```bash
python server.py
```

Сервер `http://127.0.0.1:5000` дээр асах болно.

## API Endpoints

- **POST /process**
  - `image`: Upload file
  - `target_lang`: 'mn' (default), 'en', 'kr'
  - `model`: 'gpt-4o', etc.

## Анхаарах зүйлс

- Анх удаа ажиллуулахад AI моделиудыг татах тул бага зэрэг удна.
- `temp_uploads` фолдерт түр зуурын файлууд хадгалагдана.
