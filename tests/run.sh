#!/bin/sh
# Runs all automated checks. Usage:  sh tests/run.sh   (macOS: uses the built-in JavaScriptCore "jsc")
cd "$(dirname "$0")/.." || exit 1
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
fail=0
echo "== syntax =="; for f in js/*.js; do [ "$f" = js/pyworker.js ] && continue; $JSC -e "try{ new Function(read('$f')) }catch(e){ print('SYNTAX ERROR in $f: '+e); throw e }" >/dev/null 2>&1 || { echo "FAIL $f"; fail=1; }; done; [ $fail = 0 ] && echo "ok"
echo "== python exercises =="; python3 tests/exercises_check.py || fail=1
echo "== every screen =="; $JSC tests/screens.js | tail -4 | tee /tmp/pf_screens.txt; grep -q " 0 failures" /tmp/pf_screens.txt || fail=1
[ $fail = 0 ] && echo "ALL CHECKS PASSED" || { echo "SOME CHECKS FAILED"; exit 1; }
