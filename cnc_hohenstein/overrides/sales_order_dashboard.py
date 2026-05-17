def get_data(data):
    data.get("transactions", []).append({
        "label": "CNC Hohenstein",
        "items": ["Fertigungskarte"]
    })

    return data
