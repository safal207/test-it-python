// Learner code runs in a disposable worker; grading is formative, not tamper-proof.
let runtime;
const indexURL='https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
self.onmessage=async({data})=>{
  const {code,checks,packages=[],pytest=false}=data;
  let scope;
  try{
    self.postMessage({type:'status',text:'Загружаем Python. Первый запуск может занять около минуты…'});
    const {loadPyodide}=await import(indexURL+'pyodide.mjs');
    runtime=await loadPyodide({indexURL,stdout:text=>self.postMessage({type:'stdout',text}),stderr:text=>self.postMessage({type:'stdout',text})});
    if(packages.length) await runtime.loadPackage(packages);
    self.postMessage({type:'ready'});
    scope=runtime.toPy({__name__:'__main__',_source:code,_checks:checks});
    await runtime.runPythonAsync(code,{globals:scope});
    scope.set('_scope',scope);
    await runtime.runPythonAsync(`
import ast
from unittest.mock import Mock

def _raises(kind, fn, *args):
    try:
        fn(*args)
    except kind:
        return True
    except Exception:
        return False
    return False

def _assert_detects_bad_sum(fn):
    if not callable(fn):
        return False
    marker = object()
    old = fn.__globals__.get('sum', marker)
    fn.__globals__['sum'] = lambda values: 599
    try:
        return _raises(AssertionError, fn)
    finally:
        if old is marker:
            fn.__globals__.pop('sum', None)
        else:
            fn.__globals__['sum'] = old

def _param_cases_cover(fn):
    for mark in getattr(fn, 'pytestmark', []):
        if mark.name == 'parametrize' and len(mark.args) >= 2:
            try:
                return {(0, 0), (-1, 1), (1, 1), (-10, 10)} <= {tuple(pair) for pair in mark.args[1]}
            except (TypeError, ValueError):
                return False
    return False

def _fixture_is_function(fn):
    marker = getattr(fn, '_fixture_function_marker', None) or getattr(fn, '_pytestfixturefunction', None)
    return marker is not None and marker.scope == 'function'

def _fixture_is_fresh(fn):
    raw = getattr(fn, '__wrapped__', None)
    if raw is None and hasattr(fn, '_get_wrapped_function'):
        raw = fn._get_wrapped_function()
    if not callable(raw):
        return False
    a, b = raw(), raw()
    return a == [] and b == [] and a is not b

def _mock_check(fn, uid, name):
    client = Mock()
    client.get_user.return_value = {'name': name}
    result = fn(client, uid)
    client.get_user.assert_called_once_with(uid)
    return result == name

def _propagates_client_error(fn):
    client = Mock()
    client.get_user.side_effect = ValueError('client failed')
    return _raises(ValueError, fn, client, 7)

def _does_not_mutate(fn):
    values = [3, 1, 3, 2]
    result = fn(values)
    return values == [3, 1, 3, 2] and result == [3, 1, 2]

def _sql_check(fn, uid, expected):
    import sqlite3
    db = sqlite3.connect(':memory:')
    try:
        db.execute('CREATE TABLE orders (id INTEGER, total_cents INTEGER)')
        db.executemany('INSERT INTO orders VALUES (?, ?)', [(1, 500), (2, 900)])
        return fn(db, uid) == expected
    finally:
        db.close()

def _percentile_preserves_input(fn):
    values = [40, 10, 30, 20]
    fn(values, 95)
    return values == [40, 10, 30, 20]
`,{globals:scope});
    if(pytest){
      runtime.FS.writeFile('/home/pyodide/test_exercise.py',code);
      await runtime.runPythonAsync(`
import pytest, os, sys
os.environ['PYTEST_DISABLE_PLUGIN_AUTOLOAD'] = '1'
sys.modules.pop('test_exercise', None)
class _CountResults:
    def __init__(self):
        self.count = 0
    def pytest_runtest_logreport(self, report):
        if report.when == 'call' and report.passed:
            self.count += 1
_counter = _CountResults()
_pytest_result = int(pytest.main(['/home/pyodide/test_exercise.py', '-q', '-p', 'no:cacheprovider'], plugins=[_counter]))
_pytest_count = _counter.count
`,{globals:scope});
    }
    const results=[];
    for(const check of checks){
      try{const passed=runtime.runPython('bool('+check.expression+')',{globals:scope});results.push({label:check.label,passed});}
      catch(error){results.push({label:check.label,passed:false,error:error.message.split('\n').slice(-2).join(' ')});}
    }
    self.postMessage({type:'result',results});
  }catch(error){self.postMessage({type:'error',text:error.message});}
  finally{scope?.destroy();}
};
