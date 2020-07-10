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
- [x] Markdown editor
- [ ] Latex editor
- [ ] Editor UI widgets
- [ ] Better UI overall
- [ ] Use a [color pallete](https://palette.ninja/#26556a-#266a63-#4bc2d0-#348790-#26636a)

### Networking/protocol/Performance:
- [x] Cache known IDs
- [ ] Transient "connections" - connections established for replying
- [ ] Faster/more reliable ID propogation
- [ ] Fault tolerance on connection drops
- [ ] Query posts by time range
- [ ] Query posts by tags
- [ ] Efficient comment threads
- [ ] Less CPU intensive under high load by using message queues
- [ ] More efficient strategy used while connecting to peercloud
- [ ] Ability to use multiple peercloud servers
- [ ] Poisoning posts that fail verification
- [ ] Poisoning malicious ids/peers
- [x] Install certbot on the peerserver
- [ ] Get a custom domain name for live site

### Features
- [x] persistent identities
- [x] Comment threads
- [ ] Password protected ID
- [ ] Editable posts
- [ ] Followers system
- [ ] User profiles
- [ ] Search posts
- [ ] Ability to share posts
- [x] Ability to embed links
- [ ] Ability to display link previews
- [ ] Ability to embed media
- [ ] Content filtering
- [ ] Likes/strength estimation
- [ ] Block users/tags

### Tests/Test Coverage
- [x] Unit test framework
- [ ] Use enzyme for react tests?
- [ ] More tests
- [ ] Allow javascript tests to interact with the python test framework better
- [ ] Spawn a new peer server for every test
- [ ] Refactor/rethink driver.py

### Project organization
- [x] Use typescript
- [x] Use typescript react
- [x] Convert ephemeral.html/ephemeral.ts to react
- [x] Use react conventions/best practices
- [ ] Remove dist/test/ during gh-pages commit
- [ ] Convert TODO list into github issues?
