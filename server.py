import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback

app = Flask(__name__)
CORS(app)

# Mock database of product information
PRODUCT_DATABASE = {
    "9780486996844": {
        "name": "Example Product",
        "description": "EMINS PRODUKT DE HÄR!!!! is a sample description for the product.",
        "image": "https://via.placeholder.com/150",
    },
    "0705632441947": {
        "name": "Another Product",
        "description": "This is another example product with additional details.",
        "image": "https://via.placeholder.com/150",
    },
}

OPENFOODFACTS_URL = "https://world.openfoodfacts.org/api/v0/product/{}.json"

@app.route('/scan', methods=['POST'])
def scan():
    try:
        data = request.get_json()
        barcode = data.get('barcode')

        if not barcode:
            return jsonify({"error": "No barcode provided"}), 400

        # Check local database first
        product_info = PRODUCT_DATABASE.get(barcode)

        if not product_info:
            # Fetch from Open Food Facts API
            url = OPENFOODFACTS_URL.format(barcode)
            headers = {
                "User-Agent": "EcoGrading - Version_school_project 1.0 - www.will.provide.website.soon..com"
            }
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                api_data = response.json()
                product = api_data.get("product", {})
                
                if product:
                    product_info = {
                        "name": product.get("product_name", "Unknown Product"),
                        "generic_name": product.get("generic_name", "No description available"),
                        "quantity": product.get("quantity", "Unknown quantity"),
                        "packaging": product.get("packaging", "Unknown packaging"),
                        "categories": product.get("categories", "Unknown categories"),
                        "labels": product.get("labels", "No labels"),
                        "image": product.get("image_url", "https://via.placeholder.com/150"),
                        "origins": product.get("origins", "Unknown origins"),
                        "manufacturing_place": product.get("manufacturing_places", "Unknown manufacturing place"),
                        "ecoscore_grade": product.get("ecoscore_grade", "Unknown"),
                    }
                    return jsonify({"product_info": product_info}), 200
                else:
                    return jsonify({"error": "Product not found in external API"}), 404
            else:
                print(f"External API error: {response.status_code}, {response.text}")
                return jsonify({"error": "Failed to fetch product from external API"}), 500

        return jsonify({"product_info": product_info}), 200

    except Exception as e:
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": "An internal server error occurred"}), 500

if __name__ == '__main__':
    app.run(debug=True)