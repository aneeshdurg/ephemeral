class Test extends test.TestSuite {
    async testGuestPost() {
        const mockedClient = test.newMockedClient({}, "guest", "guest");
        await mockedClient.client.setupWaiter;
        console.log(mockedClient.client.identity.name);
        console.log(mockedClient.client.identity.id);
        console.log(JSON.stringify(mockedClient.client.identity));
        await mockedClient.client.postCB("hi", null);
        const calls = mockedClient.mockUI.recordedCalls
        const renderPostCalls = calls.get("renderPost");
        this.assert(renderPostCalls.length == 1, `${renderPostCalls.length}`)
        mockedClient.client.peer.disconnect();
    }

    async testMultipleGuestsPost() {
        const settings = {
            "intervals": {
                "queryposts": 100,
                "refreshconnections": 100,
            }
        };
        const mockedClient1 = test.newMockedClient(settings, "guest1", "guest");
        await mockedClient1.client.setupWaiter;
        const mockedClient2 = test.newMockedClient(settings, "guest2", "guest");
        await mockedClient2.client.setupWaiter;

        await mockedClient1.client.postCB("hi", null);
        await this.sleep(1000);
        const calls = mockedClient2.mockUI.recordedCalls
        const renderPostCalls = calls.get("renderPost") || [];
        renderPostCalls.forEach(c => {
            console.log(c[0], c[0].contents, c[0].id);
            console.log(c[1]);
        });
        this.assert(renderPostCalls.length == 1, renderPostCalls);
    }
}

(new Test()).run();
