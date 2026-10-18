"""Checks every Python exercise: reference solutions must pass all tests, starter code must not."""
import json, math, copy, sys, subprocess

JSC = '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc'
out = subprocess.run([JSC, '-e', "var window={}; load('js/exercises.js'); print(JSON.stringify(window.PF_EXERCISES));"], capture_output=True, text=True).stdout
ex = json.loads(out)

def eq(a, b):
    if isinstance(a, bool) != isinstance(b, bool): return False
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-6)
    if isinstance(a, list) and isinstance(b, list): return len(a) == len(b) and all(eq(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict): return a.keys() == b.keys() and all(eq(a[k], b[k]) for k in a)
    return a == b

bad = 0; ids = set()
for e in ex:
    if e['id'] in ids: print('DUP id', e['id']); bad += 1
    ids.add(e['id'])
    if len(e['tests']) < 4 or len(e['hints']) < 2: print('too few tests/hints', e['id']); bad += 1
    for label, code, should_pass in (('solution', e['solution'], True), ('starter', e['starter'], False)):
        ns = {}
        exec(code, ns); f = ns[e['fn']]
        oks = []
        for t in e['tests']:
            try: oks.append(eq(json.loads(json.dumps(f(*copy.deepcopy(t['a'])))), t['e']))
            except Exception: oks.append(False)
        if should_pass and not all(oks): bad += 1; print('SOLUTION FAILS', e['id'])
        if not should_pass and all(oks): bad += 1; print('STARTER ALREADY PASSES', e['id'])
    if ('def %s(%s)' % (e['fn'], e['sig'])) not in e['starter']: print('signature mismatch', e['id']); bad += 1
print('%d exercises checked, %d problems' % (len(ex), bad))
sys.exit(1 if bad else 0)
