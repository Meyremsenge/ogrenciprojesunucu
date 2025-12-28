import requests
import time

print("Login performans testi:\n")

# 5 login testi yapıp ortalama süre ölç
times = []
for i in range(5):
    start = time.time()
    r = requests.post(
        "http://127.0.0.1:5000/api/v1/auth/login", 
        json={"email": "student@demo.com", "password": "Demo123!"}
    )
    elapsed = (time.time() - start) * 1000  # ms
    times.append(elapsed)
    
    status = "✓" if r.status_code == 200 else "✗"
    print(f"  Test {i+1}: {status} {elapsed:.0f}ms")

avg = sum(times) / len(times)
min_t = min(times)
max_t = max(times)

print(f"\n📊 Sonuçlar:")
print(f"  Ortalama: {avg:.0f}ms")
print(f"  Minimum:  {min_t:.0f}ms")
print(f"  Maximum:  {max_t:.0f}ms")
