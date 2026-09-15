from pathlib import Path
import json
import re
import sys

STATE = Path(__file__).resolve().parent
ROOT = STATE.parent.parent
INVENTORY = json.loads((STATE / 'inventory.json').read_text())
ORIGINALS = json.loads((STATE / 'originals.json').read_text())
FENCE = re.compile(r'^```[^\n]*\n[\s\S]*?^```[^\n]*', re.M)

def code_blocks(s):
    return [m.group() for m in FENCE.finditer(s) if re.search(
        r'^```\w|^\s*(for |if |while |def |class |return |int |vector|func |function |dp\[.*;)|//|^\s*# ',
        m.group(), re.M)]

def bounds(s):
    m = re.search(r'^## 思路[ \t]*$', s, re.M)
    if not m:
        return None
    start = m.end()
    end = re.search(r'^## ', s[start:], re.M)
    return start, start + end.start() if end else len(s)

def apply(batch):
    parts = re.split(r'^@@ (\d+)\s*\n', Path(batch).read_text(), flags=re.M)
    changed = []
    for j in range(1, len(parts), 2):
        i, replacement = int(parts[j]), parts[j+1].strip()
        rel = INVENTORY[i]['path']
        original = ORIGINALS[rel]
        span = bounds(original)
        if span:
            start, end = span
            old = original[start:end]
            protected = code_blocks(old)
            for k, block in enumerate(protected):
                marker = '{{CODE' + str(k) + '}}'
                if marker not in replacement:
                    raise ValueError(f'{i}: missing {marker}')
                replacement = replacement.replace(marker, block)
            updated = original[:start] + '\n\n' + replacement + '\n\n' + original[end:]
            assert original[:start] == updated[:start]
            assert updated.endswith(original[end:])
        else:
            # Standalone theory/summary: preserve title and every code block.
            old = original
            protected = [m.group() for m in FENCE.finditer(old)]
            for k, block in enumerate(protected):
                marker = '{{CODE' + str(k) + '}}'
                if marker not in replacement:
                    raise ValueError(f'{i}: missing {marker}')
                replacement = replacement.replace(marker, block)
            title = re.match(r'^# [^\n]*', original)
            updated = (title.group() + '\n\n' if title else '') + replacement + '\n'
        assert code_blocks(original) == code_blocks(updated), f'Code changed: {i}'
        assert re.findall(r'<!--[\s\S]*?-->', original) == re.findall(r'<!--[\s\S]*?-->', updated)
        current = (ROOT / rel).read_text()
        # Accept originals or a prior version written by this task only.
        log = STATE / 'applied.json'
        applied = json.loads(log.read_text()) if log.exists() else {}
        assert current == original or current == applied.get(rel), f'Concurrent edit: {rel}'
        (ROOT / rel).write_text(updated)
        applied[rel] = updated
        log.write_text(json.dumps(applied, ensure_ascii=False, indent=2))
        changed.append(i)
    print('Updated', len(changed), 'files:', changed)

if __name__ == '__main__':
    apply(sys.argv[1])
