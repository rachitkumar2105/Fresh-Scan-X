def generate_feedback(fruit_name, freshness):
    # Handle the unknown fruit scenario where confidence was too low
    if not fruit_name:
        if freshness == "Fresh":
            return "The scanned item appears fresh with no clear signs of spoilage."
        else:
            return "The scanned item shows signs of spoilage and deterioration."

    # Format fruit name for nice grammar
    fruit_name = fruit_name.lower()
    
    # Natural feedback generation rules:
    # For fresh fruits: mention color, texture, absence of spoilage.
    # For rotten fruits: mention discoloration, surface damage, spoilage indicators.
    
    if freshness == "Fresh":
        return f"The {fruit_name} appears fresh with a healthy color and intact surface. No visible spoilage or discoloration was detected."
    else:
        return f"The {fruit_name} shows dark patches and signs of deterioration. Visible spoilage suggests the fruit is no longer fresh."
