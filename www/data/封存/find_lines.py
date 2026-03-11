import json
import os

fp = r"c:\Users\定淵\Documents\Games\Project202\data\Map012.json"
with open(fp, 'r', encoding='utf-8') as f:
    lines = f.readlines()

targets = [1, 2, 16, 19, 20, 21, 41, 42, 43, 44]
results = {}

for i, line in enumerate(lines):
    for t in targets:
        if f'"id": {t},' in line:
            results[t] = i + 1

print(json.dumps(results))
