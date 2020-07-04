import os
import textwrap

from time import sleep

from driver import requiresClients, main

test_config = {
    'rebuild_required': False,
}

@requiresClients(1)
def testNoUIClient(testInput):
    testPath = os.path.join(
        testInput.buildOutput.tempdir, "dist/test/mytest.js")
    with open(testPath, 'w') as f:
        f.write(textwrap.dedent(
            """
            (async () => {
                sessionStorage.setItem("name", "guest");
                sessionStorage.setItem("idmgmt", "guest");
                const mockedClient = test.newMockedClient({});
                await mockedClient.client.setupWaiter;
                console.log("[TEST] '" + mockedClient.client.identity.name + "'");
                console.log("[TEST] " + mockedClient.client.identity.id);
                console.log(JSON.stringify(mockedClient.client.identity));
                await mockedClient.client.postCB("hi", null);
                const calls = mockedClient.mockUI.recordedCalls
                const renderPostCalls = calls.get("renderPost");
                if (renderPostCalls.length != 1)
                    throw new Error("???");
                console.log("[TEST] " + renderPostCalls[0][0]);
                console.log("[TEST] SUCCESS");
            })();
            """
        ))

    guest = testInput.pool.clients[0];
    guest.reset()
    guest.driver.get(f"https://localhost:{guest.port}/dist/test/test.html")
    guest.driver.execute_script("import('./mytest.js');");

    max_count = 10
    found = False
    while max_count > 0:
        for log in guest.get_logs():
            print(log)
            if "[TEST] SUCCESS" in log["message"]:
                found = True
                break
        if found:
            break
        else:
            max_count -= 1
            sleep(1)
    if not found:
        raise Exception("!")

if __name__ == "__main__":
    main(__name__)
