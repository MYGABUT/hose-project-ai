
import time
try:
    with open('backend_error.log', 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            print(line.strip())
            time.sleep(0.05) # Slow down to help buffer
except Exception as e:
    print(e)
