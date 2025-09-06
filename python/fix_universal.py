import json
import os

def fix_universal_flag():
    """Fix universal flag for products with empty compatibility arrays."""

    # Path to the products file
    products_file = "products_compatibility.json"

    # Check if file exists
    if not os.path.exists(products_file):
        print(f"❌ Error: {products_file} not found!")
        return

    # Load the products data
    print(f"📂 Loading {products_file}...")
    with open(products_file, 'r', encoding='utf-8') as f:
        products = json.load(f)

    print(f"📊 Found {len(products)} products")

    # Track changes
    fixed_count = 0

    # Iterate through products and fix universal flag
    for i, product in enumerate(products):
        if 'compatibility' in product and 'universal' in product:
            # Check if compatibility array is empty or contains only empty objects
            compatibility = product['compatibility']
            is_empty = (
                not compatibility or  # empty array
                all(not comp or (isinstance(comp, dict) and not any(comp.values())) for comp in compatibility)  # empty objects
            )

            if is_empty and not product['universal']:
                product['universal'] = True
                fixed_count += 1
                print(f"✅ Fixed product {i+1}: {product.get('name', 'Unknown')[:50]}...")

    # Save the updated data
    print(f"\n💾 Saving updated data...")
    with open(products_file, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    print(f"✅ Fixed {fixed_count} products")
    print(f"📊 Total products: {len(products)}")
    print("🎉 Data consistency check completed!")

if __name__ == "__main__":
    fix_universal_flag()
