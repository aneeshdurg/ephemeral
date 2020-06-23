# Ephemeral

WIP - A p2p social networking platform using peerjs

To access:

- Go to https://18.220.3.4:9000/peerserver/peerjs/peers and accept the SSL certificate
- Go to https://aneeshdurg.me/ephemeral and either create an account or login as a guest!

To build run `npm run build`

## TODO:

### UI:
- [x] Markdown editor
- [ ] Latex editor
- [ ] Editor UI widgets
- [ ] Better UI overall
- [ ] Use a [color pallete](https://palette.ninja/#26556a-#266a63-#4bc2d0-#348790-#26636a)

### Networking/protocol/Performance:
- [ ] Cache known IDs
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
- [ ] Install certbot on the peerserver
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

### Project organization
- [x] Use typescript
- [x] Use typescript react
- [ ] Convert ephemeral.html/ephemeral.ts to react
- [ ] Use react conventions/best practices
- [ ] Unit tests
- [ ] Convert TODO list into github issues?
