import subprocess

import test

test_config = {
    'server_required': False
}

def test_get_all_tests(*args):
    all_tests = test.get_all_tests()
    assert "test//lib/test_test.py" in all_tests, all_tests

some_value = 123
def test_load_module(*args):
    current_module = test.load_module("test/lib/test_test.py")
    assert current_module.some_value == 123, current_module

def test_server_required_is_respected(*args):
    output = subprocess.check_output('ps aux'.split()).decode()
    assert 'build.py -s' not in output, output
