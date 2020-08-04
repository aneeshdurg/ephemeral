import os
import textwrap

from time import sleep

from driver import requiresClients, main

test_config = {
    'rebuild_required': False,
}

testList = []

def generateJsTest(name, path):
    exec(textwrap.dedent(
        f"""
        @requiresClients(1)
        def {name}(testInput):
            client = testInput.pool.clients[0];
            doTest(client, "{path}")
            verifyTest(client)
        testList.append({name})
        """))

def doTest(client, path):
    client.reset()
    client.driver.get(f"https://localhost:{client.port}/dist/test/test.html")
    client.driver.execute_script(f"import('/{path}');");

def verifyTest(client):
    max_count = 10
    found = False
    error = None
    while max_count > 0:
        for log in client.get_logs():
            if log["source"] == "other":
                continue
            print(log)
            if "[SUITE] SUCCESS" in log["message"]:
                found = True
                break
            if "[SUITE] FAILED" in log["message"] or log["level"] == "SEVERE":
                if log["level"] == "SEVERE":
                    # TODO fix these errors
                    ignore_patterns = [
                        "Warning: Failed prop type",
                        "Warning: render()",
                    ]
                    if any([p in log["message"] for p in ignore_patterns]):
                        continue
                error = log
                break
        if found or error:
            break
        else:
            max_count -= 1
            sleep(1)
    if not found:
        raise Exception(str(log))

for (parent, _, files) in os.walk('test/js'):
    for f in files:
        if f.endswith('Test.js'):
            path = os.path.join(parent, f)
            testname = path.replace('/', '_').replace('.', '__')
            generateJsTest(testname, path)

if __name__ == "__main__":
    main(__name__)
