# HOSE PRO - Backend AI Scanner

Enterprise Python backend for Hose Computer Vision detection using PaddleOCR and Strategy Pattern.

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### POST /api/v1/scan-hose
Upload gambar hose untuk deteksi otomatis.

**Request:** `multipart/form-data` dengan field `file` (image)

**Response:**
```json
{
  "status": "success",
  "brand": "EATON",
  "sku": "EC525-12",
  "pressure_bar": 350,
  "desc": "Hose Eaton EC525 - 2 Wire Braid"
}
```

## Architecture

```
backend-hose-ai/
├── app/
│   ├── api/v1/endpoints/    # API Routes
│   ├── core/                # Configuration
│   ├── services/            # Business Logic
│   │   └── brand_parsers/   # Strategy Pattern (per-brand logic)
│   └── data/                # Data loaders
├── data_source/             # CSV datasets
└── main.py                  # Entry point
```

## Adding New Brand

1. Create `app/services/brand_parsers/newbrand.py`
2. Extend `BaseHoseParser` class
3. Register in `parser_manager.py`
