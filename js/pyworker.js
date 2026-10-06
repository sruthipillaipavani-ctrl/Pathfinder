// Runs student Python in the browser (Pyodide, loaded once from a CDN) inside a Web Worker,
// so an infinite loop can be stopped without freezing the page.
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
importScripts(PYODIDE + 'pyodide.js');

const HARNESS = `
import json, sys, io, math, copy, traceback

def _norm(v):
    try:
        return json.loads(json.dumps(v))
    except Exception:
        return repr(v)

def _eq(a, b):
    if isinstance(a, bool) != isinstance(b, bool):
        return False
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-6)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_eq(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_eq(a[k], b[k]) for k in a)
    return a == b

def _where(e):
    line = '?'
    for fr in traceback.extract_tb(e.__traceback__):
        if fr.filename == 'your_code.py':
            line = fr.lineno
    return line

def run_student(code, fn, tests_json):
    tests = json.loads(tests_json)
    ns = {'__name__': 'student'}
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    try:
        try:
            exec(compile(code, 'your_code.py', 'exec'), ns)
        except SyntaxError as e:
            return json.dumps({'fatal': 'Syntax error on line %s: %s' % (e.lineno, e.msg)})
        except Exception as e:
            return json.dumps({'fatal': '%s on line %s: %s' % (type(e).__name__, _where(e), e)})
        f = ns.get(fn)
        if not callable(f):
            return json.dumps({'fatal': 'I could not find a function called %s. Your code needs a line like: def %s(...):' % (fn, fn)})
        results = []
        for t in tests:
            try:
                got = _norm(f(*copy.deepcopy(t['a'])))
                results.append({'ok': _eq(got, t['e']), 'got': got, 'err': None})
            except Exception as e:
                results.append({'ok': False, 'got': None, 'err': '%s: %s (line %s)' % (type(e).__name__, e, _where(e))})
        return json.dumps({'results': results, 'stdout': buf.getvalue()[:1500]})
    finally:
        sys.stdout = old
`;

const ready = loadPyodide({ indexURL: PYODIDE }).then((py) => {
  py.runPython(HARNESS);
  self.postMessage({ ready: true });
  return py;
});

self.onmessage = async (e) => {
  const { id, code, fn, tests } = e.data;
  try {
    const py = await ready;
    const out = py.globals.get('run_student')(code, fn, JSON.stringify(tests));
    self.postMessage({ id, ok: true, result: JSON.parse(out) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
