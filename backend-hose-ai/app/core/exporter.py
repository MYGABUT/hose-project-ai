"""
Excel/CSV Exporter Core Module 📤
 Universal exporter using Pandas and XlsxWriter for high performance & styling.
"""
import io
import pandas as pd
from typing import List, Dict, Any, Union
from fastapi.responses import StreamingResponse

class DataExporter:
    """
    Generates downloadable .xlsx or .csv files from list of dicts or SQLAlchemy models.
    """
    
    @staticmethod
    def export_csv(data: List[Dict[str, Any]], filename: str = "export.csv") -> StreamingResponse:
        """Stream CSV response."""
        if not data:
            return DataExporter._empty_response("csv", filename)
            
        df = pd.DataFrame(data)
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        
        response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        return response

    @staticmethod
    def export_excel(
        data: List[Dict[str, Any]], 
        filename: str = "export.xlsx",
        sheet_name: str = "Data"
    ) -> StreamingResponse:
        """
        Generate styled Excel file using XlsxWriter engine (faster than openpyxl).
        Auto-adjusts column widths.
        """
        if not data:
            return DataExporter._empty_response("xlsx", filename)

        df = pd.DataFrame(data)
        output = io.BytesIO()
        
        # Use XlsxWriter for better formatting capability
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Get workbook and worksheet objects
            workbook = writer.book
            worksheet = writer.sheets[sheet_name]
            
            # Defines standard header format
            header_format = workbook.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#D7E4BC', # Light Green
                'border': 1
            })
            
            # Apply format to headers
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                
                # Auto-fit column width based on max content length (capped at 50)
                max_len = max(
                    df[value].astype(str).map(len).max(),
                    len(str(value))
                ) + 2
                worksheet.set_column(col_num, col_num, min(max_len, 50))

        output.seek(0)
        
        response = StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        return response

    @staticmethod
    def _empty_response(fmt: str, filename: str):
        """Handle empty data gracefuly."""
        if fmt == 'csv':
            return StreamingResponse(iter([""]), media_type="text/csv")
        # Empty Excel
        output = io.BytesIO()
        pd.DataFrame().to_excel(output)
        output.seek(0)
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
