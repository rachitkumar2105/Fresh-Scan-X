def generate_feedback(fruit_name, freshness):
    # Handle the unknown fruit scenario where confidence was too low
    if not fruit_name:
        if freshness == "Fresh":
            return "The scanned item appears fresh with no visible signs of spoilage."
        else:
            return "The item shows visible discoloration indicating possible spoilage."

    # Format fruit name for nice grammar
    fruit_name = fruit_name.lower()
    
    # Natural feedback generation rules:
    # For fresh fruits: mention color, texture, absence of spoilage.
    # For rotten fruits: mention discoloration, surface damage, spoilage indicators.
    
    if freshness == "Fresh":
        return f"The fruit appears fresh with healthy color and no visible signs of spoilage."
    else:
        return f"The fruit shows visible discoloration and signs of spoilage."
