const settings = {
    "intervals": {
        "queryposts": 100,
        "refreshconnections": 100,
    }
};

class Test extends test.TestSuite {
    async testUserPost() {
        await test.withMockedClients(settings, [{name: "user1", idmgmt: "createid"}], async (clients) => {
            const mockedClient = clients[0];
            await mockedClient.client.setupWaiter;
            console.log(mockedClient.client.identity.name);
            console.log(mockedClient.client.identity.id);
            console.log(JSON.stringify(mockedClient.client.identity));
            await mockedClient.client.postCB("hi", null);
            const calls = mockedClient.mockUI.recordedCalls
            const renderPostCalls = calls.get("renderPost");
            this.assert(renderPostCalls.length == 1, renderPostCalls.length)
        });
    }

    async testMultipleUsersPost() {
        // TODO pass in a fake localforage to prevent name collision
        const clients_ = [{name: "user2", idmgmt: "createid"}, {name: "user3", idmgmt: "createid"}];
        await test.withMockedClients(settings, clients_, async (clients) => {
            await clients[0].client.postCB("hi", null);
            this.retry(() => {
                const calls = clients[1].mockUI.recordedCalls;
                const renderPostCalls = calls.get("renderPost") || [];
                return renderPostCalls.length == 1;
            }, 10, 500);
        });
    }
}

(new Test()).run();
