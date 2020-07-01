from time import sleep

from driver import requiresClients, main

test_config = {
    'settings_json': {
        'intervals': {
            'queryposts': 100,
            'refreshconnections': 100,
        },
    },
}

@requiresClients(1)
def testPostIsVisibleToSelf(clientPool):
    guest = clientPool.clients[0]
    guest.login("guest")
    guest.waitForUserSetup()
    posts = guest.getPosts()
    assert len(posts) == 0, posts

    guest.newPost("hi")
    posts = guest.getPosts()
    assert len(posts) != 0, posts
    post = list(posts.values())[0]
    print(post.contents)
    assert post.contents == "hi", post.contents

@requiresClients(2)
def testPostIsVisibleToOthers(clientPool):
    guest = clientPool.clients[0]
    guest.login("guest")
    guest.waitForUserSetup()
    guest.newPost("hi")

    guest1 = clientPool.clients[1]
    guest1.login("guest1")
    guest1.waitForUserSetup()
    sleep(1)
    posts = guest1.getPosts()
    assert len(posts) == 1, posts

if __name__ == "__main__":
    main(__name__)
