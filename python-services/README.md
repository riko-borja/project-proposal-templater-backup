# Python Table Parser Service

This folder contains a standalone Flask service used by the main project.

## Endpoints

- `GET /api/parse-document`
- `POST /api/remove-empty-rows`

## Requirements

- Python 3.9+ recommended
- Dependencies from `requirements.txt`

## Setup

From `C:\Projects\project_proposal_templater\python-services`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Configuration

- `NODE_BACKEND_URL` (optional): Node backend base URL used by `GET /api/parse-document`
- Default fallback: `http://127.0.0.1:5001`

Example:

```powershell
$env:NODE_BACKEND_URL = "http://127.0.0.1:5001"
```

## Run

```powershell
python tableparser.py
```

The Flask service runs on `http://127.0.0.1:5000` by default.

## Notes

- `POST /api/remove-empty-rows` can run independently with uploaded `.docx` files.
- `GET /api/parse-document` requires the Node backend API routes used in `tableparser.py`.
