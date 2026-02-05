"""
HoseMaster WMS - Discount Helper
Multi-tier/cascading discount calculation
"""
from decimal import Decimal, ROUND_HALF_UP


def calculate_tiered_discount(base_price: float, discounts: list) -> dict:
    """
    Calculate tiered/cascading discount
    
    Example: 30% + 5%
    - Base: 100,000
    - After 30%: 70,000
    - After 5% of 70,000: 66,500
    
    Args:
        base_price: Original price
        discounts: List of discount percentages [30, 5] or ["30%", "5%"]
    
    Returns:
        dict with calculations
    """
    result = {
        "base_price": base_price,
        "discounts_applied": [],
        "discount_details": [],
        "total_discount": 0,
        "final_price": base_price
    }
    
    if not discounts:
        return result
    
    current_price = Decimal(str(base_price))
    total_discount = Decimal(0)
    
    for i, disc in enumerate(discounts):
        # Parse discount value (handle "30%" or 30)
        disc_value = str(disc).replace('%', '').strip()
        try:
            disc_pct = Decimal(disc_value)
        except:
            continue
        
        if disc_pct <= 0:
            continue
        
        # Calculate discount amount on current price
        disc_amount = (current_price * disc_pct / Decimal(100)).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        price_after = current_price - disc_amount
        
        result["discount_details"].append({
            "step": i + 1,
            "discount_percent": float(disc_pct),
            "price_before": float(current_price),
            "discount_amount": float(disc_amount),
            "price_after": float(price_after)
        })
        
        result["discounts_applied"].append(float(disc_pct))
        total_discount += disc_amount
        current_price = price_after
    
    result["total_discount"] = float(total_discount)
    result["final_price"] = float(current_price)
    result["effective_discount_percent"] = round(
        float(total_discount) / base_price * 100 if base_price > 0 else 0, 2
    )
    
    return result


def format_discount_string(discounts: list) -> str:
    """Format discount list as string: 30% + 5%"""
    return " + ".join([f"{d}%" for d in discounts])
