import urllib.request
import json

url = "http://localhost:8000/api/v1/users/login"
data = {
    "email": "admin@hosepro.id",
    "password": "admin123"
}
headers = {'Content-Type': 'application/json'}

req = urllib.request.Request(
    url,
    data=json.dumps(data).encode('utf-8'),
    headers=headers,
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        print(f"Status: {response.status}")
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"Error: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Failed: {e}")
