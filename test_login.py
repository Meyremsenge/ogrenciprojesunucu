import requests

users = [
    ("student@demo.com", "Demo123!"),
    ("teacher@demo.com", "Demo123!"),
    ("admin@demo.com", "Demo123!"),
    ("superadmin@demo.com", "Demo123!")
]

print("Testing login for all demo users:\n")
for email, pwd in users:
    r = requests.post("http://127.0.0.1:5000/api/v1/auth/login", json={"email": email, "password": pwd})
    if r.status_code == 200:
        data = r.json()["data"]
        role = data["user"]["role"]
        print(f"✓ {email} - Role: {role}")
    else:
        print(f"✗ {email} - Error: {r.status_code}")

print("\n✅ All login tests completed!")
