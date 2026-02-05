# Raw connection test - bypass encoding issues
import socket
import struct

HOST = "localhost"
PORT = 5432
USER = b"micha"
DATABASE = b"hose_pro_db"

print("Testing raw PostgreSQL connection...")

# Create startup message
def create_startup_message(user, database):
    # Protocol version 3.0
    version = struct.pack(">I", 196608)  # 3.0
    
    params = b"user\x00" + user + b"\x00"
    params += b"database\x00" + database + b"\x00"
    params += b"\x00"  # terminator
    
    length = struct.pack(">I", 4 + len(version) + len(params))
    return length + version + params

try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((HOST, PORT))
    
    msg = create_startup_message(USER, DATABASE)
    s.send(msg)
    
    response = s.recv(1024)
    print(f"Raw response (first 100 bytes): {response[:100]}")
    print(f"Response hex: {response[:50].hex()}")
    
    # Check first byte
    if response[0:1] == b'R':
        print("✅ Server responded with Authentication request")
    elif response[0:1] == b'E':
        print("❌ Server responded with Error")
        # Try to extract error message
        try:
            error_msg = response[5:].split(b'\x00')[0]
            print(f"Error: {error_msg}")
        except:
            pass
    
    s.close()
except Exception as e:
    print(f"Error: {e}")
