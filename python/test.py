import os
import json
import time
import PyPDF2
import google.generativeai as genai

# --- Configuration ---
# IMPORTANT: Replace "YOUR_API_KEY" with your actual Google AI API key
# You can get a key from https://aistudio.google.com/app/apikey
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBxDSFr8NeyI3Q6EyIrU5y27a3YfpaaCrE")

# The name of the PDF file to process
PDF_FILE_PATH = "Accessories Item list.pdf"

# The name of the output JSON file
OUTPUT_JSON_PATH = "car_models.json"

# How many product lines to send to the AI in a single batch
BATCH_SIZE = 50

# --- Main Script Logic ---

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
    # Remove leading/trailing whitespace and filter out empty lines
    product_lines = [line.strip() for line in lines if line.strip()]
    print(f"Found {len(product_lines)} non-empty lines.")
    return product_lines

def build_prompt(lines_batch):
    """Builds the prompt for the Gemini API with instructions and examples."""
    prompt_lines = [
        "From the following list of product descriptions, extract the car make, model, and any aliases.",
        "Your response MUST be a valid JSON array of objects. Do not include any text or formatting outside of the JSON array.",
        "Each object in the array should have the following structure:",
        '{ "make": "CarManufacturer", "model": "CarModel", "aliases": ["alias1", "alias2"] }',
        "\n--- RULES ---",
        '1. "make": The official manufacturer of the car (e.g., "Maruti", "Honda", "Hyundai").',
        '2. "model": The specific model of the vehicle (e.g., "Ertiga", "Amaze", "City").',
        '3. "aliases": A list of lowercase variations, typos, short-form tokens, or year-specific mentions found in the text. Ensure aliases are unique within the list.',
        "4. Merge duplicate vehicles: If you find multiple entries for the same make and model, create a single entry and combine all their aliases.",
        "5. Ignore non-vehicle words: Skip accessory names, features (like 'usb', 'charger', 'wipers'), screen sizes, or generic terms.",
        "6. Be conservative: Only include entries that are clearly actual vehicle models.",
        "7. Focus on Indian car makes and models.",
        "8. The final output must be a single, valid JSON array that can be directly loaded into MongoDB.",
        "\n--- EXAMPLES ---",
        'Input: "NOIRE- INFINITY Honda AMAZE -18 ( AUTOMATIC NOT FOR MANUAL ) 2018 - ONWARDS Beige"',
        'Output: { "make": "Honda", "model": "Amaze", "aliases": ["amaze", "amaze -18"] }',
        'Input: "NOIRE- INFINITY Mahindra BOLERO ( SUITABLE FOR 7 SEATER ) SEP 2011 - ONWARDS Black"',
        'Output: { "make": "Mahindra", "model": "Bolero", "aliases": ["bolero", "bolero 7 seater"] }',
        'Input: "Gomechanic Car Specific Android Seltos 12.3 Inch 2+32"',
        'Output: { "make": "Kia", "model": "Seltos", "aliases": ["seltos"] }',
        "\n--- PRODUCT LINES TO PROCESS ---"
    ]
    prompt_lines.extend(lines_batch)
    return "\n".join(prompt_lines)

def call_gemini_api(prompt):
    """Sends a prompt to the Gemini API and returns the JSON response."""
    try:
        genai.configure(api_key=API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        # Clean up the response to ensure it's valid JSON
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_response)
    except Exception as e:
        print(f"An error occurred with the Gemini API call: {e}")
        print("Response that caused the error:", response.text if 'response' in locals() else "No response")
        return []

def process_in_batches(lines):
    """Processes all product lines in batches and returns a list of vehicle data."""
    all_vehicles = []
    for i in range(0, len(lines), BATCH_SIZE):
        batch = lines[i:i + BATCH_SIZE]
        print(f"\nProcessing batch {i // BATCH_SIZE + 1}...")
        prompt = build_prompt(batch)
        
        # Adding a delay to respect API rate limits
        time.sleep(1) 
        
        batch_result = call_gemini_api(prompt)
        
        if batch_result:
            print(f"Successfully processed batch and got {len(batch_result)} vehicle entries.")
            all_vehicles.extend(batch_result)
        else:
            print("Batch processing returned no data.")
            
    return all_vehicles

def merge_duplicates(vehicle_list):
    """Merges duplicate vehicle entries based on make and model."""
    print("\nMerging duplicate entries...")
    merged_vehicles = {}
    for vehicle in vehicle_list:
        # Ensure the required keys exist and are strings
        if not all(k in vehicle and isinstance(vehicle[k], str) for k in ['make', 'model']):
            print(f"Skipping malformed entry: {vehicle}")
            continue

        make = vehicle["make"].strip().title()
        model = vehicle["model"].strip().title()
        key = (make, model)

        if key not in merged_vehicles:
            merged_vehicles[key] = {
                "make": make,
                "model": model,
                "aliases": set()
            }
        
        # Add new aliases, ensuring they are lowercase and unique
        if "aliases" in vehicle and isinstance(vehicle["aliases"], list):
            for alias in vehicle["aliases"]:
                if isinstance(alias, str):
                    merged_vehicles[key]["aliases"].add(alias.lower())

    # Convert sets of aliases back to lists for the final JSON
    final_list = list(merged_vehicles.values())
    for vehicle in final_list:
        vehicle["aliases"] = sorted(list(vehicle["aliases"]))
        
    print(f"Merged data down to {len(final_list)} unique vehicles.")
    return final_list

def save_to_json(data, file_path):
    """Saves the final data to a JSON file."""
    print(f"Saving the final list to '{file_path}'...")
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        print("Successfully saved data.")
    except Exception as e:
        print(f"Could not write to file: {e}")

# --- Main execution flow ---
if __name__ == "__main__":
    if API_KEY == "YOUR_API_KEY":
        print("ERROR: Please replace 'YOUR_API_KEY' with your actual Gemini API key in the script.")
    else:
        pdf_text = extract_text_from_pdf(PDF_FILE_PATH)
        if pdf_text:
            product_lines = clean_and_split_text(pdf_text)
            extracted_data = process_in_batches(product_lines)
            if extracted_data:
                unique_vehicles = merge_duplicates(extracted_data)
                save_to_json(unique_vehicles, OUTPUT_JSON_PATH)
                print(f"\n✅ All done! Check the '{OUTPUT_JSON_PATH}' file for the results.")
            else:
                print("\nNo data was extracted from the PDF.")
