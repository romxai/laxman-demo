import os
import json
import time
import PyPDF2
import google.generativeai as genai

# --- Configuration ---
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBxDSFr8NeyI3Q6EyIrU5y27a3YfpaaCrE")
PDF_FILE_PATH = "Accessories Item list.pdf"
VEHICLES_JSON_PATH = "car_models.json"
OUTPUT_JSON_PATH = "products_compatibility.json"
BATCH_SIZE = 50

def extract_text_from_pdf(pdf_path):
    """Extracts all text from a given PDF file."""
    print(f"Reading text from '{pdf_path}'...")
    try:
        with open(pdf_path, 'rb') as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            full_text = ""
            for page in pdf_reader.pages:
                full_text += page.extract_text() + "\n"
        print("Successfully extracted text from PDF.")
        return full_text
    except FileNotFoundError:
        print(f"Error: The file '{pdf_path}' was not found.")
        return None
    except Exception as e:
        print(f"An error occurred while reading the PDF: {e}")
        return None

def clean_and_split_text(text):
    """Cleans the extracted text and splits it into product lines."""
    print("Cleaning and splitting text into product lines...")
    lines = text.split('\n')
    product_lines = [line.strip() for line in lines if line.strip()]
    print(f"Found {len(product_lines)} non-empty lines.")
    return product_lines

def load_vehicles(vehicles_path):
    """Loads the vehicles JSON file."""
    print(f"Loading vehicles from '{vehicles_path}'...")
    try:
        with open(vehicles_path, 'r') as f:
            vehicles = json.load(f)
        print(f"Loaded {len(vehicles)} vehicle entries.")
        return vehicles
    except Exception as e:
        print(f"Error loading vehicles: {e}")
        return []

def build_prompt(product_lines, vehicles):
    """Builds the prompt for Gemini with instructions."""
    vehicles_str = json.dumps(vehicles, indent=2)
    prompt = f"""
You are an AI tasked with extracting **structured vehicle and product compatibility data** from car accessories product names. The output should be a **minimal JSON object** per product, suitable for direct use in a database or ETL pipeline. You must use the provided `vehicles.json` file as the authoritative list of vehicle makes, models, and aliases. Do **not** invent new vehicles.

## Vehicles Reference
{vehicles_str}

## Objective
1. For each product name, extract:
   - Brand (if explicitly mentioned)
   - Vehicle compatibility (make, model, years, variants)
   - Whether the product is universal (fits all vehicles)
   - Minimal notes necessary for correct matching
2. Output a JSON array containing one object per product line.

## Output Schema
Each object should follow this structure:

{{
  "sku": "...",              // optional, copy from source row if available
  "name": "...",             // raw product name from PDF
  "brand": "...|null",       // normalized brand from product name
  "category": "...|null",    // optional, if available from source
  "colour": "...|null",      // extracted colour if mentioned (e.g., "Yellow", "Black")
  "compatibility": [         // array of vehicle objects
    {{
      "make": "...",         // from vehicles.json
      "model": "...",        // from vehicles.json
      "year_from": null|number,
      "year_to": null|number,
      "notes": "..."         // optional, e.g., "Automatic only", "7-seater"
    }}
  ],
  "universal": true|false,   // true if product fits all vehicles, no specific model mentioned (USB cable, bulbs, etc.)
}}

## Extraction Rules

### Brand
- Extract the brand if it appears at the start of the product name.
- Normalize known variants (e.g., Gomechanic → GoMechanic, NOIRE-INFINITY → Noire Infinity).
- If brand is not explicitly present, leave brand as null.

### Vehicle Compatibility
- Use vehicles.json as reference.
- Only include vehicles explicitly mentioned in the product name (do not invent models or years).
- Year extraction:
  - Explicit years in text (e.g., 2018, 2011) → populate year_from.
  - Short years like -18 → infer full year from context.
  - Ranges like 2018 - ONWARDS → year_from=2018, year_to=null.
- Variant notes (optional, minimal):
  - Automatic/manual restrictions, seating variants, boot availability, etc.
  - Include only if explicitly present in the text.
- If product does not reference a specific vehicle, compatibility should be an empty array.

### Universal Products
- If product is general-purpose (USB cable, bulbs, generic accessories), set "universal": true.
- Otherwise, "universal": false.

### Aliases
- Do not create aliases here; vehicles.json already contains canonical names and aliases.
- You should only match the product name tokens to existing aliases for correct make/model mapping.

### Category
- Extract category from product name using this predefined list only:
  - Android Screen
  - Perfume
  - Wiper Blade
  - Vacuum Cleaner
  - Aerosol
  - USB Cable
  - BTFM (Bluetooth FM Transmitter)
  - Speaker
  - Car Charger
  - Tyre Inflator
  - Camera
  - Steering Cover
  - Grass Mats
  - Memory Foam
  - Microfiber
  - Mobile Holder
  - PrismX LED
  - Lumiere LED
  - Damping Sheet
  - Car Care Kit
  - Mats
- Match the most appropriate category from this list based on product description.
- If no match found, set to null.
- Do not invent new categories.

### Name
- Always include the full raw product name, but clean it by removing:
  - SKU codes (e.g., "SE_LED_042")
  - HSN codes (e.g., "85122010" or "870810")
  - GST codes (e.g., "18", "28")
  - Any category keywords (e.g., android screen, perfume, wiper blade, vaccum cleaner, areosol, usb cable, BTFM, speaker, car charger, Tyre inflator, Speaker, Camera and parking, steering cover, grass mats, memory foam, microfibers, Mobile Holder, PrismX LED, Lumerie LED, Damping sheet, Care care kit, Mats,)
  - Any numeric codes at the end that are not part of the product description
- Keep the core product description.

### Colour
- Extract colour if explicitly mentioned in the product name (e.g., "Yellow", "Black", "Beige - Mix").
- If no colour mentioned do not invent one just dont have that field.
- Remove colour from the name after extracting.

## Formatting
- The entire response must be valid JSON.
- No extra commentary, text, or explanations.
- One JSON array per batch of products.

## Examples

Product: NOIRE- INFINITY Honda AMAZE -18 ( AUTOMATIC NOT FOR MANUAL ) 2018 - ONWARDS Beige

{{
  "sku": "...",
  "name": "NOIRE INFINITY for Honda AMAZE",
  "brand": "Noire Infinity",
  "category": "Mats",
  "colour": "Beige",
  "compatibility": [
    {{
      "make": "Honda",
      "model": "Amaze",
      "year_from": 2018,
      "year_to": null,
      "notes": "Automatic only"
    }}
  ],
  "universal": false
}}

Product: Gomechanic Accessories USB Cables - Type C

{{
  "sku": "...",
  "name": "Gomechanic Accessories USB Cables - Type C",
  "brand": "GoMechanic",
  "category": "USB Cable",
  "colour": null,
  "compatibility": [],
  "universal": true
}}

Product: Gomechanic Car Specific Android Seltos 12.3 Inch 2+32

{{
  "sku": "...",
  "name": "Gomechanic Car Specific Android Seltos 12.3 Inch 2+32",
  "brand": "GoMechanic",
  "category": "Android Screen",
  "colour": null,
  "compatibility": [
    {{
      "make": "Kia",
      "model": "Seltos",
      "year_from": null,
      "year_to": null,
      "notes": ""
    }}
  ],
  "universal": false
}}

Product: SE_LED_042 Gomechanic Accessories PrismX H8/H11 Yellow LED Headlight 4500k (160 W) PrismX LED 18 85122010

{{
  "sku": "SE_LED_042",
  "name": "Gomechanic Accessories PrismX H8/H11 Yellow LED Headlight 4500k (160 W)",
  "brand": "GoMechanic",
  "category": "PrismX LED",
  "colour": "Yellow",
  "compatibility": [],
  "universal": true
}}

## Instructions for Gemini
- Use vehicles.json for make/model matching.
- Extract years, variants, and compatibility directly from the text.
- Set universal=true for generic products.
- Clean the product name by removing SKU, GST/HSN codes, and extract colour to separate field.
- Use the predefined category list to match the most appropriate category for each product.
- Output a clean JSON array containing all processed products.
- Do not invent vehicles, brands, or categories beyond the provided list.

## Product Lines to Process
"""
    for i, line in enumerate(product_lines, 1):
        prompt += f"{i}. {line}\n"
    return prompt

def call_gemini_api(prompt):
    """Sends a prompt to the Gemini API and returns the JSON response."""
    try:
        genai.configure(api_key=API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
        cleaned_response = cleaned_response.strip()
        return json.loads(cleaned_response)
    except Exception as e:
        print(f"An error occurred with the Gemini API call: {e}")
        print("Response that caused the error:", response.text if 'response' in locals() else "No response")
        return []

def process_in_batches(lines, vehicles):
    """Processes all product lines in batches."""
    all_products = []
    for i in range(0, len(lines), BATCH_SIZE):
        batch = lines[i:i + BATCH_SIZE]
        print(f"\nProcessing batch {i // BATCH_SIZE + 1}...")
        prompt = build_prompt(batch, vehicles)
        
        time.sleep(1)  # Rate limit
        
        batch_result = call_gemini_api(prompt)
        
        if batch_result:
            print(f"Successfully processed batch and got {len(batch_result)} product entries.")
            all_products.extend(batch_result)
        else:
            print("Batch processing returned no data.")
            
    return all_products

def save_to_json(data, file_path):
    """Saves the final data to a JSON file."""
    print(f"Saving the final list to '{file_path}'...")
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        print("Successfully saved data.")
    except Exception as e:
        print(f"Could not write to file: {e}")

if __name__ == "__main__":
    if API_KEY == "YOUR_API_KEY":
        print("ERROR: Please set GEMINI_API_KEY environment variable.")
    else:
        vehicles = load_vehicles(VEHICLES_JSON_PATH)
        if vehicles:
            pdf_text = extract_text_from_pdf(PDF_FILE_PATH)
            if pdf_text:
                product_lines = clean_and_split_text(pdf_text)
                extracted_data = process_in_batches(product_lines, vehicles)
                if extracted_data:
                    save_to_json(extracted_data, OUTPUT_JSON_PATH)
                    print(f"\n✅ All done! Check the '{OUTPUT_JSON_PATH}' file for the results.")
                else:
                    print("\nNo data was extracted from the PDF.")
        else:
            print("Failed to load vehicles data.")
