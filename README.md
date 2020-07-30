<h1>
    ephemeral
    <img src="https://raw.githubusercontent.com/aneeshdurg/ephemeral/main/src/assets/logo.png"/>
</h1>

WIP - A p2p social networking platform using peerjs

### To access:

- Go to https://aneeshdurg.me/ephemeral and either create an account or login as a guest!

### To install build/test dependencies:
```bash
pip3 install -r requirements.txt
npm i
```

### To build:
```bash
# To just build the project once:
npm run build

# To serve you'll need to generate a self-signed cert
openssl req -new -x509 -keyout localhost.pem -out localhost.pem -days 365 -nodes
npm run serve

# To automatically rebuild on changes and serve:
npm run watch
```

The project will be served at: [https://0.0.0.0:4443/dist](https://0.0.0.0:4443/dist)

You can start your own peerjs server locally (with ssl and peer
discovery enabled!) and point `src/settings.json` there instead. If you use a
self-signed certificate with your local peerserver, make sure you navigate to
the `/peerjs/peers` page of your peerserver to accept the SSL cert and ensure
that peer discovery is working.

### To run tests:
Download the chromedriver executable appropriate for your platform here:
[https://sites.google.com/a/chromium.org/chromedriver/home](https://sites.google.com/a/chromium.org/chromedriver/home)

Copy the binary to `test/lib/`.
Run `npm run test` to run all tests, or `python3 test/lib/test.py [names of test
files]` to run a specific test file.

## TODO:

### UI:
- [ ] Multiple views for all posts, posts from followed tags/users, search
- [ ] Way to drop cache/inspect cache size from UI
- [ ] Latex editor
- [ ] Editor UI widgets
- [ ] Better UI overall
- [x] Markdown editor
- [x] Use a [color pallete](https://palette.ninja/#26556a-#266a63-#4bc2d0-#348790-#26636a)
- [x] Use sass

### Networking/protocol/Performance:
- [ ] Faster convergence of network
    - [ ] Dynamically update the timeouts for querying posts/users based on
      current posts/connections
    - [ ] Transient "connections" - connections established for replying
    - [x] Cache known IDs
- [ ] Reduce noisy post traffic
    - [ ] Efficient comment threads
    - [ ] Query posts with filters
        - [ ] Query posts by time range
        - [ ] Query posts by tags (tags are prefixed by %)
        - [ ] Query posts by author
        - [x] Switch to using jsstore
- [ ] Reduce peercloud load
    - [ ] More efficient strategy used while connecting to peercloud
    - [ ] Ability to use multiple peercloud servers
- [ ] Security
    - [ ] Store priv keys w/ password encryption
    - [ ] Change how posts are signed
    - [ ] Poisoning posts that fail verification
    - [ ] Poisoning malicious ids/peers
    - [ ] Less CPU intensive under high load by using message queues
- [ ] Misc
    - [ ] Allow posts to store image data
    - [ ] Allow posts to store gif data
    - [ ] Allow posts to store audio/video data
    - [ ] Fault tolerance on connection drops
    - [ ] Get a custom domain name for live site
    - [x] Install certbot on the peerserver

### Features
- [ ] Transferable identities
- [ ] Editable posts
    - [x] Ability to edit posts locally
    - [ ] Ability to broadcast updates
- [ ] Followers users/tags
- [ ] User profiles
- [ ] Search posts
- [ ] Ability to share posts
- [ ] Ability to display link previews (open graph?)
- [ ] Ability to embed media
    - [ ] Ability to send images via ephemeral
    - [ ] Ability to send video
        - [ ] Ability to send videos < 100 MB via ephemeral
        - [ ] Ability to seek in sent video (probably requires DASH? or maybe manual mp4 fragment parsing)
        - [ ] Ability to send videos > 100 MB via ephemeral (requires DASH)
- [ ] Content filtering
- [ ] Likes/strength estimation
- [ ] Block users/tags
- [x] persistent identities
- [x] Comment threads
- [x] Ability to embed links

### Tests/Test Coverage
- [ ] Use enzyme for react tests?
- [ ] More tests
- [ ] Allow javascript tests to interact with the python test framework better
- [ ] Spawn a new peer server for every test
- [ ] Refactor/rethink driver.py
- [x] Unit test framework

### Project organization
- [ ] Remove dist/test/ during gh-pages commit
- [ ] Convert TODO list into github issues?
- [x] Use a seperate peerserver for developement vs. production
- [x] Use typescript
- [x] Use typescript react
- [x] Convert ephemeral.html/ephemeral.ts to react
- [x] Use react conventions/best practices
