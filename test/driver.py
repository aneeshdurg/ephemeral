import os
import signal
import subprocess
import sys
import time

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager

from client import ClientPool

def setupEnvironment():
    path = os.path.dirname(os.path.realpath(sys.argv[0]))
    os.chdir(path)
    os.environ["PATH"] = "{}:./".format(os.environ["PATH"])

@contextmanager
def server():
    try:
        with open("./subprocess_output.log", 'a') as log:
            p = subprocess.Popen(
                ["npm", "run", "serve"],
                stdout=log,
                stderr=log,
                preexec_fn=os.setpgrp)
            # TODO poll for the server coming online
            time.sleep(1)
            yield
    finally:
        try:
            os.kill(-p.pid, signal.SIGINT)
        except PermissionError:
            pass
        p.wait()

if __name__ == "__main__":
    setupEnvironment()
    with server():
        # TODO create clients and run tests
        with ClientPool(2) as pool:
            guest = pool.clients[0]
            user = pool.clients[1]

            def client_login(obj):
                obj["client"].login(obj["name"], mode=obj["mode"])
                obj["client"].waitForUserSetup()

            with ThreadPoolExecutor() as executor:
                executor.map(client_login, [
                    {
                        "client": guest,
                        "name": "guest",
                        "mode": "guest",
                    },
                    {
                        "client": user,
                        "name": "user",
                        "mode": "createid",
                    },
                ])

            print("created guest", guest.id)
            print("created user", user.id)
