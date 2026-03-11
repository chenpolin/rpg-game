import json

map_path = r'c:\Users\定淵\Documents\Games\Project202\data\Map004.json'

def scan_list(event_id, page_idx, cmd_list):
    for cmd in cmd_list:
        code = cmd.get('code')
        params = cmd.get('parameters', [])
        
        # 203: Set Event Location (param 0 is eventId)
        if code == 203 and params[0] == 5:
            print(f"FOUND: Event {event_id} Page {page_idx} Code 203 references Event 5")
            
        # 205: Set Move Route (param 0 is eventId)
        if code == 205 and params[0] == 5:
            print(f"FOUND: Event {event_id} Page {page_idx} Code 205 references Event 5")

def scan_map():
    with open(map_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    events = data.get('events', [])
    for event in events:
        if event is None: continue
        eid = event.get('id')
        pages = event.get('pages', [])
        for i, page in enumerate(pages):
            scan_list(eid, i, page.get('list', []))
            
            # 檢查移動路徑中的重複
            move_route = page.get('moveRoute', {})
            # 如果 moveRoute 本身有引用 ID 嗎？不，那是執行者的。
            
    print("Instruction scan complete.")

scan_map()
