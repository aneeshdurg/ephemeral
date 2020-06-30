import os
import signal
import subprocess
import sys
import time

from contextlib import contextmanager

from client import Client

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
            time.sleep(5)
            yield
    finally:
        os.kill(-p.pid, signal.SIGINT)
        p.wait()

if __name__ == "__main__":
    setupEnvironment()
    with server():
        # TODO create clients and run tests
        print("creating client!")
        with Client() as c:
            print("created client!")
            c.login("asdf")
            c.waitForUserSetup()
            print("ID is", c.id);

        print("creating client 2!")
        with Client() as c:
            print("created client!")
            c.login("asdf", mode="createid")
            c.waitForUserSetup()
            print("ID is", c.id)

