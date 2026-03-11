import json
import os

def extract_rpg_maker_dialogue(file_path):
    if not os.path.exists(file_path):
        return f"File {file_path} not found."
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    events = data.get('events', [])
    output = []
    
    for event in events:
        if event is None:
            continue
        
        event_name = event.get('name', 'Unknown Event')
        event_id = event.get('id', 0)
        pages = event.get('pages', [])
        
        event_header_added = False
        
        for p_idx, page in enumerate(pages):
            list_cmds = page.get('list', [])
            
            # 提取對話 (101: Show Text, 401: Text data)
            # 提取物品 (126: Change Items)
            
            p_text_buffer = []
            
            for cmd in list_cmds:
                code = cmd.get('code')
                indent = cmd.get('indent')
                params = cmd.get('parameters', [])
                
                if code == 101: # Show Text
                    p_text_buffer.append(f"--- 對話開始 (Indent: {indent}) ---")
                elif code == 401: # Text Data
                    text = params[0]
                    p_text_buffer.append(text)
                elif code == 126: # Change Items
                    item_id = params[0]
                    operation = "獲得" if params[1] == 0 else "失去"
                    amount = params[4] if len(params) > 4 else params[3] if len(params) > 3 else "數量未知"
                    p_text_buffer.append(f">>> 物品操作: {operation} 物品ID:{item_id}")
            
            if p_text_buffer:
                if not event_header_added:
                    output.append(f"## 事件 ID: {event_id} ({event_name})")
                    event_header_added = True
                
                output.append(f"### 頁面 {p_idx + 1}")
                output.extend(p_text_buffer)
                output.append("") # 新行

    return "\n".join(output)

if __name__ == "__main__":
    target_file = r"c:\Users\定淵\Documents\Games\Project202\data\Map012.json"
    result = extract_rpg_maker_dialogue(target_file)
    
    output_path = r"C:\Users\定淵\Documents\Games\Project202\data\Map012_Dialogue_Extracted.md"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# Map012.json 劇情文本提取結果\n\n")
        f.write(result)
    
    print(f"Extraction complete. Saved to {output_path}")
