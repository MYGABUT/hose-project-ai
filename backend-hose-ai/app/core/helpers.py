"""
HoseMaster WMS - Core Helpers
Shared utility functions for the application
"""
from typing import Any, Optional

def get_enum_value(enum_obj: Any) -> Optional[str]:
    """
    Safely get value from potential Enum object or return string.
    Handles cases where SQLAlchemy returns a string instead of an Enum object.
    
    Args:
        enum_obj: The object to extract value from (Enum, str, or None)
        
    Returns:
        str: The string value of the enum/string, or None
    """
    if enum_obj is None:
        return None
        
    if hasattr(enum_obj, 'value'):
        return str(enum_obj.value)
        
    return str(enum_obj)
