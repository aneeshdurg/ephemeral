import inspect
import os
import signal
import subprocess
import sys
import time
import traceback

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from io import StringIO

from client import ClientPool

def setupEnvironment():
    os.environ["PATH"] = f"{os.environ['PATH']}:test/lib/"

@contextmanager
def server():
    try:
        with open("./subprocess_output.log", 'a') as log:
            server = subprocess.Popen(
                ["npm", "run", "serve"],
                stdout=log,
                stderr=log,
                preexec_fn=os.setpgrp)
            # TODO spawn a peerserver process and replace the peerserver
            # host/port in settings.json
            # TODO poll for the server coming online
            # TODO check for errors!
            time.sleep(1)
            yield
    finally:
        try:
            os.kill(-server.pid, signal.SIGINT)
        except PermissionError:
            pass
        server.wait()


clientRequests = dict()
def requiresClients(count):
    def wrapper(f):
        clientRequests[f.__name__] = count
        return f
    return wrapper

def main(module):
    setupEnvironment()
    tests = [obj for name,obj in inspect.getmembers(module)
        if (inspect.isfunction(obj) and name.startswith('test'))]
    print(f"Running {len(tests)} test(s).")
    for test in tests:
        print(f"\t{module.__name__}:{test.__name__}")
    max_clients = max(clientRequests.values())
    failures = []
    with server():
        print("server initialized!")
        with ClientPool(max_clients) as pool:
            print("clients initialized!")
            for test in tests:
                # TODO use a threadpool to run all tests in parallel if
                # possible. Will need to pass in arrays of clients instead of
                # the clientPool directly in that case.
                print("------------------------------")
                print(f"Running test [{test.__name__}]")

                num_clients = clientRequests[test.__name__]
                pool.reset(num_clients)

                old_stdout = sys.stdout
                sys.stdout = captured_stdout = StringIO()
                failed = None

                start = time.time()
                try:
                    test(pool)
                except Exception as e:
                    traceback.print_exc()
                    failed = e
                delta = time.time() - start

                sys.stdout = old_stdout
                if failed:
                    print(f"{test.__name__} Failed! ({delta})")
                    print("================================")
                    print(f"{test.__name__} Produced stdout:")
                    print(captured_stdout.getvalue())
                    print("================================")
                    failures.append((test.__name__, delta))
                else:
                    print(f"{test.__name__} passed. ({delta})")
    if len(failures):
        print("-----")
        print("Failures:")
        for failure in failures:
            print("    ", failure[0], failure[1])
        sys.exit(1)
    else:
        print("-----")
        print("All tests passed!")
