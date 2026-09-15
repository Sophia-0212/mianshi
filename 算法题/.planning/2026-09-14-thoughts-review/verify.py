import difflib
import json
import re
import statistics
from rewrite import STATE, ROOT, INVENTORY, ORIGINALS, FENCE, bounds, code_blocks

errors, rows = [], []
changed = code_count = 0
applied = json.loads((STATE / 'applied.json').read_text())
for i, entry in enumerate(INVENTORY):
    rel = entry['path']
    old, new = ORIGINALS[rel], (ROOT / rel).read_text()
    changed += old != new
    old_code = code_blocks(old)
    code_count += len(old_code)
    if old_code != code_blocks(new):
        errors.append([i, 'code/embedded comments changed'])
    for pattern in [r'<!--[\s\S]*?-->', r'^```[A-Za-z][^\n]*\n[\s\S]*?^```[^\n]*']:
        if re.findall(pattern, old, re.M) != re.findall(pattern, new, re.M):
            errors.append([i, 'protected content changed'])
    a, b = bounds(old), bounds(new)
    if a:
        if old[:a[0]] != new[:b[0]] or old[a[1]:] != new[b[1]:]:
            errors.append([i, 'outside thoughts changed'])
        before, after = old[a[0]:a[1]], new[b[0]:b[1]]
        if '时间' not in after or '空间' not in after:
            errors.append([i, 'complexity absent'])
        rows.append(dict(index=i, path=rel, before=len(re.sub(r'\s', '', before)), after=len(re.sub(r'\s', '', after))))
    elif [m.group() for m in FENCE.finditer(old)] != [m.group() for m in FENCE.finditer(new)]:
        errors.append([i, 'standalone fenced block changed'])
    if '{{CODE' in new:
        errors.append([i, 'unresolved placeholder'])
    if len(list(FENCE.finditer(new))) * 2 != sum(line.startswith('```') for line in new.splitlines()):
        errors.append([i, 'unbalanced fences'])
    if (i == 0 and old != new) or (i != 0 and old == new):
        errors.append([i, 'coverage mismatch'])
    if new != applied.get(rel, old):
        errors.append([i, 'unexpected edit'])

before = sum(row['before'] for row in rows)
after = sum(row['after'] for row in rows)
result = dict(files_checked=len(INVENTORY), files_changed=changed, thought_sections=len(rows),
              standalone_documents=changed-len(rows), code_blocks_unchanged=code_count, errors=errors,
              thought_chars_before=before, thought_chars_after=after,
              reduction_percent=round(100*(before-after)/before, 1),
              median_before=statistics.median(row['before'] for row in rows),
              median_after=statistics.median(row['after'] for row in rows), rows=rows)
(STATE / 'validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(json.dumps({key: value for key, value in result.items() if key != 'rows'}, ensure_ascii=False, indent=2))
assert not errors, errors
patch = []
for i in [1, 44, 104, 177, 197, 211]:
    rel = INVENTORY[i]['path']
    patch.extend(difflib.unified_diff(ORIGINALS[rel].splitlines(True), (ROOT / rel).read_text().splitlines(True),
                                     fromfile='before/'+rel, tofile='after/'+rel))
(STATE / 'representative.diff').write_text(''.join(patch))
