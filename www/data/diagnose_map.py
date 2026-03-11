import json

map_path = r'c:\Users\定淵\Documents\Games\Project202\data\Map004.json'

try:
    with open(map_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    events = data.get('events', [])
    print(f"Total entries in 'events': {len(events)}")
    
    for i, event in enumerate(events):
        if i == 0:
            if event is not None:
                print(f"Warning: Index 0 is not null (Value: {event})")
            continue
            
        if event is None:
            # print(f"Index {i} is null (Normal if deleted)")
            continue
            
        if 'pages' not in event:
            print(f"ERROR: Event ID {event.get('id')} (Index {i}) is missing 'pages'!")
        elif event['pages'] is None:
            print(f"ERROR: Event ID {event.get('id')} (Index {i}) has 'pages' as null!")
        else:
            # 檢查 pages 內部
            for p_idx, page in enumerate(event['pages']):
                if page is None:
                    print(f"ERROR: Event ID {event.get('id')} (Index {i}) Page {p_idx} is null!")

    print("Scan complete.")

except Exception as e:
    print(f"An error occurred during file reading: {e}")
