#!/usr/local/bin/python3

from flask import Flask, request
app = Flask(__name__)

@app.route("/", methods=["POST", "GET"])
def hook():
    if request.method == "GET":
        return "hello!"
    else:
        # Trigger deploy

        return ('', 204)

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=9002,
        # ssl_context=(
        #     '/etc/letsencrypt/live/aneeshdurg.ddns.net/cert.pem',
        #     '/etc/letsencrypt/live/aneeshdurg.ddns.net/privkey.pem'
        # )
    )
