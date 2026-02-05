import os
import sys
from sqlalchemy import text, inspect
from app.core.database import engine

def dump_schema():
    print("🔍 Dumping 'products' schema...")
    with open("schema_dump.txt", "w") as f:
        inspector = inspect(engine)
        columns = inspector.get_columns('products')
        for col in columns:
            line = f"{col['name']} | {col['type']} | Nullable: {col['nullable']}"
            print(line)
            f.write(line + "\n")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    dump_schema()
