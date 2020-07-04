from driver import requiresClients, main

@requiresClients(1)
def testGuestLogin(testInput):
    guest = testInput.pool.clients[0]
    guest.login("guest")
    guest.waitForUserSetup()
    assert guest.id.startswith("e'")

@requiresClients(1)
def testUserCreation(testInput):
    user = testInput.pool.clients[0]
    user.login("user", mode="createid")
    user.waitForUserSetup()
    assert not user.id.startswith("e'")

@requiresClients(1)
def testReuseUser(testInput):
    user = testInput.pool.clients[0]
    user.login("user", mode="createid")
    user.waitForUserSetup()
    created_id = user.id
    user.logout()
    user.login("user", mode="reuseid")
    assert user.id == created_id

if __name__ == "__main__":
    main(__name__)
