# -*- coding: utf-8 -*-
"""
PostgreSQL Connection Test
Run this to verify database connection
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

try:
    import psycopg2
    
    print("=" * 50)
    print("PostgreSQL Connection Test")
    print("=" * 50)
    
    # Connection parameters - EDIT THESE IF NEEDED
    HOST = "localhost"
    PORT = "5432"
    DATABASE = "hose_pro_db"
    USER = "micha"
    PASSWORD = "postgress"
    
    print(f"\nConnecting to: {HOST}:{PORT}/{DATABASE}")
    print(f"User: {USER}")
    
    # Try to connect
    conn = psycopg2.connect(
        host=HOST,
        port=PORT,
        database=DATABASE,
        user=USER,
        password=PASSWORD,
        client_encoding='UTF8'
    )
    
    print("\n✅ CONNECTION SUCCESSFUL!")
    
    # Create cursor
    cur = conn.cursor()
    
    # Check database version
    cur.execute("SELECT version();")
    version = cur.fetchone()
    print(f"\nPostgreSQL Version: {version[0][:50]}...")
    
    # List all tables
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
    """)
    tables = cur.fetchall()
    
    print(f"\nTables in database ({len(tables)} total):")
    for table in tables:
        print(f"  - {table[0]}")
    
    # Check if hose_rolls exists
    if any('hose_rolls' in t for t in tables):
        cur.execute("SELECT COUNT(*) FROM hose_rolls;")
        count = cur.fetchone()[0]
        print(f"\n📦 hose_rolls table: {count} records")
    else:
        print("\n⚠️ hose_rolls table not found (will be created on first run)")
    
    # Close connection
    cur.close()
    conn.close()
    print("\n✅ Test completed successfully!")
    
except psycopg2.OperationalError as e:
    print(f"\n❌ Connection Error: {e}")
    print("\nPossible issues:")
    print("  1. PostgreSQL not running")
    print("  2. Wrong password")
    print("  3. Database doesn't exist")
    print("  4. Wrong host/port")
    
except Exception as e:
    print(f"\n❌ Error: {type(e).__name__}: {e}")

print("\n" + "=" * 50)
