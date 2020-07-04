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
def testPostsAreVisibleToSelf(testInput):
    guest = testInput.pool.clients[0]
    guest.login("guest")
    guest.waitForUserSetup()
    posts = guest.getPosts()
    assert len(posts) == 0, "{}{}".format(guest.activeconnections, posts)

    guest.newPost("hi")
    posts = guest.getPosts()
    assert len(posts) == 1, posts
    post = list(posts.values())[0]
    assert len(post.children) == 0
    assert post.contents == "hi", post.contents

    post.reply("bye")
    assert len(guest.getPosts()) == 1
    assert len(post.children) == 1
    assert post.children[0].contents == "bye", post.children[0].contents

@requiresClients(2)
def testPostsAreVisibleToOthers(testInput):
    guest = testInput.pool.clients[0]
    guest.login("guest")
    guest.waitForUserSetup()
    guest.newPost("hi")
    post = list(guest.getPosts().values())[0]
    post.reply("bye")

    guest1 = testInput.pool.clients[1]
    guest1.login("guest1")
    guest1.waitForUserSetup()

    max_retries = 10
    found = False
    while max_retries:
        max_retries -= 1
        posts = guest1.getPosts()
        if len(posts) == 0:
            print("Could not find any posts!")
        else:
            found = True
            break
        sleep(1)
    assert found

    posts = list(posts.values())

    assert posts[0].contents == "hi", posts[0].contents
    assert posts[0].children[0].contents == "bye", posts[0].children[0].contents

if __name__ == "__main__":
    main(__name__)
