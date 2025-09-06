import json
import re
from pathlib import Path

# Config
INPUT_FILE = Path("products_compatibility.json")
OUTPUT_FILE = Path("clean_products_compatibility.json")

CATEGORIES = [
    "android screen", "perfume", "wiper blade", "vaccum cleaner", "areosol",
    "usb cable", "BTFM", "speaker", "car charger", "Tyre inflator",
    "Speaker", "Camera and parking", "steering cover", "grass mats",
    "memory foam", "microfibers", "Mobile Holder", "PrismX LED", "Lumerie LED",
    "Damping sheet", "Care care kit", "Mats"
]

def clean_name(entry):
    name = entry.get("name", "")

    # Remove repeated SKU at start
    sku = entry.get("sku")
    if sku and name.startswith(sku):
        name = name[len(sku):].strip()

    # Remove categories if present at start or end
    for cat in CATEGORIES:
        # case-insensitive match
        pattern = re.compile(rf"(^|\s){re.escape(cat)}($|\s)", re.IGNORECASE)
        name = pattern.sub(" ", name).strip()

    # Remove GST code (2 digits, e.g., 18, 28) at end
    name = re.sub(r"\b(18|28)\b$", "", name).strip()

    # Remove HSN codes (6-8 digit numbers)
    name = re.sub(r"\b\d{6,8}\b", "", name).strip()

    # Collapse multiple spaces
    name = re.sub(r"\s{2,}", " ", name)

    return name

def main():
    with INPUT_FILE.open("r", encoding="utf-8") as f:
        products = json.load(f)

    cleaned = []
    for entry in products:
        entry["name"] = clean_name(entry)
        cleaned.append(entry)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)

    print(f"✅ Cleaned {len(cleaned)} entries written to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
