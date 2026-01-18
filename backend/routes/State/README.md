# State Tax Form Routes

This folder contains routes for generating state tax form PDFs.

## Folder Structure

```
backend/
├── routes/
│   ├── state/
│   │   ├── index.js          # Main router - exports all state routes
│   │   ├── ca540Routes.js    # California Form 540
│   │   ├── ny201Routes.js    # New York IT-201 (add later)
│   │   ├── az140Routes.js    # Arizona Form 140 (add later)
│   │   └── README.md         # This file
│   └── irs1040Routes.js      # Federal Form 1040
├── templates/
│   ├── state/
│   │   ├── ca540_2024.pdf    # CA 540 template
│   │   ├── ny201_2024.pdf    # NY IT-201 template (add later)
│   │   └── az140_2024.pdf    # AZ 140 template (add later)
│   └── f1040_2024.pdf        # Federal 1040 template
```

## How to Register Routes

In your `server.js` or main app file:

```javascript
import stateRoutes from "./routes/state/index.js";

// Register state routes
app.use("/api/tax/state", stateRoutes);
```

## API Endpoints

| State | Form | Endpoint |
|-------|------|----------|
| California | 540 | GET `/api/tax/state/ca/generate/:sessionId` |
| New York | IT-201 | GET `/api/tax/state/ny/generate/:sessionId` |
| Arizona | 140 | GET `/api/tax/state/az/generate/:sessionId` |

## Get Supported States

```
GET /api/tax/state/supported
```

Returns list of supported states and which have no income tax.

## Adding a New State

1. Download the state tax form PDF (fillable version)
2. Save to `templates/state/[state][form]_2024.pdf`
3. Create route file: `routes/state/[state][form]Routes.js`
4. Extract field names using pypdf (see 540_debug.pdf example)
5. Map fields and implement the route
6. Register in `routes/state/index.js`

## States with No Income Tax

These states don't require state tax forms:
- Texas (TX)
- Florida (FL)  
- Washington (WA)
- Nevada (NV)
- Wyoming (WY)
- South Dakota (SD)
- Alaska (AK)
- Tennessee (TN) - no wage income tax
- New Hampshire (NH) - no wage income tax
