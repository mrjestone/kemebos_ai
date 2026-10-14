# Vercel entry point. The real application lives in backend/ so that Vercel
# doesn't turn every helper file into its own endpoint.
import sys
from pathlib import Path

# Make `backend` importable no matter which directory the platform runs from.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.main import app  # noqa: E402,F401
