import json
import os

data_dir = r'c:\Users\定淵\Documents\Games\Project202\data'

def check_list(file_name, context, cmd_list):
    for cmd in cmd_list:
        code = cmd.get('code')
        params = cmd.get('parameters', [])
        if code in [201, 203, 205] and len(params) > 0 and params[0] == 5:
            print(f"MATCH: {file_name} -> {context} -> Code {code} references ID 5")

def scan_files():
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            if not file.endswith('.json'): continue
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if file.startswith('Map') and file != 'MapInfos.json':
                    events = data.get('events', [])
                    for event in events:
                        if event is None: continue
                        eid = event.get('id')
                        for p_idx, page in enumerate(event.get('pages', [])):
                            check_list(file, f"Event {eid} Page {p_idx}", page.get('list', []))
                
                if file == 'CommonEvents.json':
                    for ce in data:
                        if ce is None: continue
                        check_list(file, f"CommonEvent {ce.get('id')}", ce.get('list', []))
            except:
                continue

print("Starting Global Scan...")
scan_files()
print("Global Scan Complete.")
