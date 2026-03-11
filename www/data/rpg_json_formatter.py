import json
import re
import os

def fix_json_format(fp):
    if not os.path.exists(fp):
        return
    try:
        with open(fp, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 1. 生成標準縮排
        s = json.dumps(data, indent=2, ensure_ascii=False)
        
        # 2. 針對指令物件進行單行化壓縮
        pattern = re.compile(r'\{\s*"code":\s*(\d+),\s*"indent":\s*(\d+),\s*"parameters":\s*(\[.*?\])\s*\}', re.DOTALL)
        
        def shrink_match(m):
            c = m.group(1)
            i = m.group(2)
            p = m.group(3)
            p_flat = re.sub(r'\s+', ' ', p).strip()
            return f'{{ "code": {c}, "indent": {i}, "parameters": {p_flat} }}'
            
        final_s = pattern.sub(shrink_match, s)
        
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(final_s)
        print(f"已優化: {os.path.basename(fp)}")
    except Exception as e:
        print(f"處理 {fp} 時出錯: {e}")

if __name__ == "__main__":
    data_dir = os.path.dirname(os.path.abspath(__file__))
    target_files = [f for f in os.listdir(data_dir) if f.startswith('Map') and f.endswith('.json')]
    target_files.append('CommonEvents.json')
    
    for filename in target_files:
        fix_json_format(os.path.join(data_dir, filename))
