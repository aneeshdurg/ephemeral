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
        console.log(renderPostCalls[0][0]);
    }
}

(new Test()).run();
