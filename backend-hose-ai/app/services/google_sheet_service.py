import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

# Graceful degradation if libraries are missing
try:
    import gspread
    from oauth2client.service_account import ServiceAccountCredentials
    HAS_GSPREAD = True
except ImportError:
    HAS_GSPREAD = False

class GoogleSheetService:
    """
    Service for syncing data with Google Sheets.
    Requires 'credentials.json' in root directory.
    """
    
    CREDENTIALS_FILE = "credentials.json"
    SCOPE = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]

    def __init__(self):
        if not HAS_GSPREAD:
            print("[WARNING] gspread not installed. Google Sheets Sync disabled.")
            return

        self.client = None
        self._authenticate()

    def _authenticate(self):
        """Authenticate with Google Service Account"""
        if not os.path.exists(self.CREDENTIALS_FILE):
            print(f"[WARNING] {self.CREDENTIALS_FILE} not found. Google Sheets Sync disabled.")
            return

        try:
            creds = ServiceAccountCredentials.from_json_keyfile_name(self.CREDENTIALS_FILE, self.SCOPE)
            self.client = gspread.authorize(creds)
            print("[INFO] ✅ Google Sheets API Authenticated")
        except Exception as e:
            print(f"[ERROR] Google Sheets Authentication failed: {str(e)}")

    def push_inventory_report(self, sheet_id: str, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Push inventory data to a specific Google Sheet.
        Overwrites the 'Live_Inventory' worksheet.
        """
        if not self.client:
            return {"status": "error", "message": "Google Sheets not configured (missing credentials or dependencies)"}

        try:
            # Open Sheet
            sheet = self.client.open_by_key(sheet_id)
            
            # Select or Create Worksheet
            try:
                worksheet = sheet.worksheet("Live_Inventory")
                worksheet.clear()
            except gspread.WorksheetNotFound:
                worksheet = sheet.add_worksheet(title="Live_Inventory", rows=1000, cols=20)

            if not data:
                return {"status": "success", "message": "No data successfully synced (empty list)"}

            # Prepare Headers and Rows
            headers = list(data[0].keys())
            rows = [list(item.values()) for item in data]
            
            # Update (Bulk update is faster)
            # data structure: [headers, ...rows]
            update_data = [headers] + rows
            
            worksheet.update(values=update_data, range_name="A1")
            
            # Formatting (Bold Header)
            worksheet.format('A1:Z1', {'textFormat': {'bold': True}})
            
            last_sync = datetime.now().strftime("%Y-m-d %H:%M:%S")
            worksheet.update_acell('H1', f"Last Sync: {last_sync}") # Put timestamp somewhere

            return {"status": "success", "message": f"Synced {len(rows)} items to Google Sheet"}

        except Exception as e:
            return {"status": "error", "message": f"Sync failed: {str(e)}"}

    def pull_prices(self, sheet_id: str) -> List[Dict[str, Any]]:
        """
        Read 'Price_List' worksheet for bulk price updates.
        Expected columns: SKU, Sell Price, Cost Price
        """
        if not self.client:
            raise Exception("Google Sheets not configured")

        try:
            sheet = self.client.open_by_key(sheet_id)
            worksheet = sheet.worksheet("Price_List")
            
            # Get all records as list of dicts
            records = worksheet.get_all_records()
            return records
            
        except Exception as e:
            raise Exception(f"Failed to pull prices: {str(e)}")
