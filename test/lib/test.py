#!/usr/bin/env python3
import importlib.util
import os
import subprocess
import sys

from threading import Thread

from driver import  main

def get_all_tests():
    tests = subprocess.check_output(
        ["find", "test/", "-name", "*_test.py"])
    tests = tests.strip().decode().split('\n')
    return tests

def load_module(fullpath):
    module = os.path.basename(fullpath).rsplit('.', 1)[0]
    spec = importlib.util.spec_from_file_location(module, fullpath)
    lib = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(lib)
    return lib

def _run_tests(argv):
    toplevel = subprocess.check_output(["git", "rev-parse", "--show-toplevel"])
    os.chdir(toplevel.strip())

    if len(argv) == 0:
        argv += get_all_tests()

    threads = []
    for arg in argv:
        path = os.path.realpath(arg)
        threads.append(Thread(target=main, args=(load_module(path),)))
        threads[-1].start()

    for thread in threads:
        thread.join()
        print("!")
if __name__ == "__main__":
    _run_tests(sys.argv[1:])
