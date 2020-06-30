import importlib.util
import os
import subprocess
import sys

from driver import  main

if __name__ == "__main__":
    toplevel = subprocess.check_output(["git", "rev-parse", "--show-toplevel"])
    os.chdir(toplevel.strip())

    if len(sys.argv) == 1:
        tests = subprocess.check_output(
            ["find", "test/", "-name", "*_test.py"])
        tests = tests.strip().decode().split('\n')
        sys.argv += tests

    for arg in sys.argv[1:]:
        path = os.path.realpath(arg)
        module = os.path.basename(path).rsplit('.', 1)[0]
        spec = importlib.util.spec_from_file_location(module, path)
        lib = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(lib)
        main(lib)
