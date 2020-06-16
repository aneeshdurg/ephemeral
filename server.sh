#!/bin/bash
peerjs --port 9000 --key peerjs --path /peerserver --allow_discovery --sslcert localhost.pem --sslkey localhost.pem --proxied &

./server.py
