import inspect
import json
import os
import shutil
import signal
import subprocess
import sys
import time
import traceback

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from io import StringIO
from tempfile import TemporaryDirectory

from client import ClientPool

def setupEnvironment():
    os.environ["PATH"] = f"{os.environ['PATH']}:test/lib/"

class BuildOutput:
    def __init__(self, log, tempdir):
        self.log = log
        self.tempdir = tempdir

@contextmanager
def buildTest(do_build, settings_json):
    try:
        with open("./subprocess_output.log", 'a') as log:
            with TemporaryDirectory() as tempdir:
                with TemporaryDirectory(dir=".", prefix="src") as tempctx:
                    tempsrc = os.path.join(tempctx, "src")
                    shutil.copytree("src", tempsrc)
                    tempdist = os.path.join(tempdir, "dist")
                    shutil.copytree("dist", tempdist)
                    shutil.copy("test/lib/localhost.pem", tempdir)
                    if settings_json:
                        with open(
                            os.path.join(tempsrc, "settings.json"), 'w'
                        ) as f:
                            f.write(json.dumps(settings_json))
                    if do_build:
                        cmd = ["webpack"]
                        cmd += ["--context", tempctx]
                        cmd += ["--output-path", tempdist]
                        subprocess.check_call(cmd, stdout=log, stderr=log)
                    yield BuildOutput(log, tempdir)
    finally:
        pass

@contextmanager
def server(do_server, buildOutput, port):
    if not do_server:
        yield
        return

    server = None
    try:
        cmd = ["./build.py"]
        cmd += ["--no-build", "--serve"]
        cmd += ["--dir", buildOutput.tempdir]
        cmd += ["--port", str(port)]
        log = buildOutput.log
        server = subprocess.Popen(
            cmd, stdout=log, stderr=log, preexec_fn=os.setpgrp)
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


class TestInput:
    def __init__(self, clientPool, buildOutput):
        self.pool = clientPool
        self.buildOutput = buildOutput


clientRequests = dict()
def requiresClients(count):
    def wrapper(f):
        clientRequests[f.__name__] = count
        return f
    return wrapper

def load_settings_json(test_config):
    with open('dist/settings.json') as f:
        settings_json = json.load(f)
    for k in test_config.get('settings_json', {}):
        v = test_config['settings_json'][k]
        if type(v) == dict:
            settings_json[k].update(v)
        else:
            settings_json[k] = v

    return settings_json

g_port = 8000

def main(module):
    global g_port
    setupEnvironment()
    moduleMembers = dict(inspect.getmembers(module))
    tests = [f for f in moduleMembers.values()
        if (inspect.isfunction(f) and f.__name__.startswith('test'))]
    print(f"Running {len(tests)} test(s).")
    for test in tests:
        print(f"\t{module.__name__}:{test.__name__}")

    test_config = {
        'rebuild_required': True,
        'server_required': True,
        'settings_json': {},
    }
    if 'test_config' in moduleMembers:
        test_config.update(moduleMembers['test_config'])

    settings_json = load_settings_json(test_config)
    port = g_port
    g_port += 1

    print(f"{module.__name__} using port {port}")

    max_clients = max(list(clientRequests.values()) + [0])
    failures = []
    with buildTest(test_config['rebuild_required'], settings_json) as buildOutput:
        if test_config['rebuild_required']:
            print("Finished rebuilding!")
        else:
            print("Finished copying built directory!")
        with server(test_config['server_required'], buildOutput, port):
            if test_config['server_required']:
                print("server initialized!")
            with ClientPool(port, max_clients) as pool:
                if max_clients:
                    print("clients initialized!")
                for test in tests:
                    # TODO use a threadpool to run all tests in parallel if
                    # possible. Will need to pass in arrays of clients instead of
                    # the clientPool directly in that case.
                    print("------------------------------")
                    print(f"Running test [{test.__name__}]")

                    num_clients = clientRequests.get(test.__name__, 0)
                    # TODO only reset num_clients clients and isolate them
                    # somehow?
                    try:
                        pool.reset()
                    except:
                        print("Reset failed!")

                    old_stdout = sys.stdout
                    sys.stdout = captured_stdout = StringIO()
                    failed = None

                    start = time.time()
                    try:
                        test(TestInput(pool, buildOutput))
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
