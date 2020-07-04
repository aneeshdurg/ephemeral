const settings = {
    "intervals": {
        "queryposts": 100,
        "refreshconnections": 100,
    }
};

class Test extends test.TestSuite {
    async testGuestPost() {
        console.log("Running tgp");
        await test.withMockedClients(settings, [{name: "guest", idmgmt: "guest"}], async (clients) => {
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

    async testMultipleGuestsPost() {
        console.log("Running tmgp");
        const clients_ = [{name: "guest1", idmgmt: "guest"}, {name: "guest2", idmgmt: "guest"}];
        await test.withMockedClients(settings, clients_, async (clients) => {
            await clients[0].client.postCB("hi", null);
            this.retry(() => {
                const calls = clients[1].mockUI.recordedCalls
                const renderPostCalls = calls.get("renderPost") || [];
                renderPostCalls.forEach(c => {
                    console.log(c[0], c[0].contents, c[0].id);
                    console.log(c[1]);
                });
                console.log("TEST", renderPostCalls.length);
                console.log("TEST", clients[0].client.postCache.postIds.length);
                console.log("TEST", clients[1].client.postCache.postIds.length);
                return renderPostCalls.length == 1;
            }, 10, 500);
        });
    }
}

(new Test()).run();
