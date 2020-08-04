#!/usr/local/bin/python3
import os
import subprocess

from flask import Flask, request

app = Flask(__name__)


@app.route("/", methods=["POST", "GET"])
def hook():
    if request.method == "GET":
        return "hello!"
    else:
        # Trigger deploy
        try:
            req = request.get_json()
            branch = req["ref"].split("/")[-1]
            if branch == "main":
                subprocess.check_call(["bash", "webhook/deployer.sh"])
        except:
            pass
        return ("", 204)


if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__))
    os.chdir("..")

    app.run(
        host="0.0.0.0", port=9002,
    )
