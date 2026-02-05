
import requests
import json

BASE_URL = "http://localhost:8000/api/v1/batches"

def test_available_batches():
    print(f"Testing {BASE_URL}/available...")
    try:
        # Test without parameters (all available)
        response = requests.get(f"{BASE_URL}/available")
        print(f"Status Code (No Params): {response.status_code}")
        if response.status_code == 200:
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print("Error:", response.text)

        # Test with random product_id (simulate search for non-existent product)
        response = requests.get(f"{BASE_URL}/available?product_id=999999")
        print(f"\nStatus Code (Product 999999): {response.status_code}")
        if response.status_code == 200:
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print("Error:", response.text)
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_available_batches()
