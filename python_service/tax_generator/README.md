# Tax Generator Module - Python PDF Generator

PDF generation for tax forms that matches the Node.js routes.

## Features

- **Federal Form 1040** - U.S. Individual Income Tax Return
- **California Form 540** - CA Resident Income Tax Return
- **MongoDB Session Support** - Reads tax session data directly
- **Direct POST Support** - Also accepts direct data via POST

## Installation

### 1. Copy to python_service directory

```bash
cp -r tax_generator/ C:/ai_tax/python_service/
```

### 2. Install dependencies

```bash
pip install pypdf motor --break-system-packages
```

### 3. Copy PDF templates

Make sure you have the PDF templates in place:
```
python_service/
├── tax_generator/
│   ├── __init__.py
│   ├── pdf_router.py
│   ├── form_1040.py
│   ├── form_ca540.py
│   └── templates/
│       ├── f1040_2024.pdf          ← Federal 1040 template
│       └── state/
│           └── ca540_2024.pdf      ← CA 540 template
```

### 4. Add to main.py

```python
from tax_generator import pdf_router

# Add this after other router registrations
app.include_router(pdf_router, prefix="/api/tax")
```

## API Endpoints

These match the Node.js routes:

### From Session (MongoDB)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tax/1040/generate/{session_id}` | Generate Federal 1040 |
| GET | `/api/tax/state/ca/generate/{session_id}` | Generate CA 540 |
| GET | `/api/tax/state/supported` | List supported states |
| GET | `/api/tax/forms` | List all available forms |

### Direct POST

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tax/1040` | Generate 1040 from POST data |
| POST | `/api/tax/ca540` | Generate CA 540 from POST data |

## Usage Examples

### From Session (like Node.js)

```bash
# Federal 1040
curl http://localhost:5002/api/tax/1040/generate/user_123 -o form_1040.pdf

# California 540
curl http://localhost:5002/api/tax/state/ca/generate/user_123 -o ca_540.pdf
```

### Direct POST

```bash
curl -X POST http://localhost:5002/api/tax/1040 \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "user_123",
    "personal": {
      "first_name": "JOHN",
      "last_name": "SMITH",
      "ssn": "123456789",
      "address": "123 MAIN ST",
      "city": "LOS ANGELES",
      "state": "CA",
      "zip": "90001"
    },
    "federal": {
      "filing_status": "married_filing_jointly",
      "wages": 23500,
      "agi": 16500,
      "standard_deduction": 30000,
      "taxable_income": 0,
      "bracket_tax": 0,
      "eitc": 4328,
      "ctc_refundable": 2500,
      "withholding": 1500,
      "refund": 7528
    },
    "dependents": [
      {"first_name": "CHILD", "last_name": "SMITH", "ssn": "111111111", "relationship": "SON", "age": 10}
    ]
  }' -o form_1040.pdf
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://localhost:27017/taxsky` | MongoDB connection string |

## Field Mappings

### Federal 1040 Fields

The module uses the exact same field names as the Node.js implementation:

```python
FIELDS = {
    "firstName": "topmostSubform[0].Page1[0].f1_04[0]",
    "lastName": "topmostSubform[0].Page1[0].f1_05[0]",
    "ssn": "topmostSubform[0].Page1[0].f1_06[0]",
    # ... (see form_1040.py for full list)
}
```

### CA 540 Fields

```python
FIELDS = {
    "firstName": "540-1002",
    "lastName": "540-1004",
    "ssn": "540-1006",
    # ... (see form_ca540.py for full list)
}
```

## Integration with Frontend

Update UserDashboard.jsx to call these endpoints:

```javascript
// For session-based generation (recommended)
const response = await fetch(`${PYTHON_API}/api/tax/1040/generate/${userId}`);
const blob = await response.blob();

// Or use direct POST with calculated data
const response = await fetch(`${PYTHON_API}/api/tax/1040`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(pdfData)
});
```

## Troubleshooting

### Template not found

Make sure the PDF templates are in the correct location:
- `tax_generator/templates/f1040_2024.pdf`
- `tax_generator/templates/state/ca540_2024.pdf`

### MongoDB connection failed

Set the `MONGO_URI` environment variable or check your MongoDB is running:
```bash
export MONGO_URI="mongodb://localhost:27017/taxsky"
```

### motor not installed

Install the async MongoDB driver:
```bash
pip install motor --break-system-packages
```

## Version History

- **v1.0** - Initial Python port from Node.js
  - Federal 1040 support
  - CA 540 support
  - MongoDB session integration
  - Direct POST support
