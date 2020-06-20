#!/usr/bin/env python3
import argparse
import http.server
import os
import shutil
import ssl
import subprocess

from multiprocessing import Process
from time import sleep
from watchdog.events import PatternMatchingEventHandler
from watchdog.observers import Observer

srcdir = 'src'
outputdir = 'dist'

def clean():
    shutil.rmtree(outputdir)

def copy(watch):
    # TODO use watch
    def _copy():
        def do_copy(*args, **kwargs):
            for (parent, _, files) in os.walk(srcdir):
                outdir = parent.replace(srcdir, outputdir)
                print("Creating", outdir)
                try:
                    os.mkdir(outdir)
                except FileExistsError:
                    pass

                for f in files:
                    srcfile = os.path.join(parent, f)
                    outputfile = os.path.join(outdir, f)
                    print(srcfile, "->", outputfile)
                    shutil.copy(srcfile, outputfile)
        do_copy()
        if watch:
            handler = PatternMatchingEventHandler(ignore_patterns=['*.ts'])
            handler.on_modified = do_copy
            observer = Observer()
            observer.schedule(handler, srcdir, recursive=True)
            observer.start()
            try:
                while True:
                    sleep(1)
            except:
                observer.stop()
            observer.join()

    proc = Process(target=_copy)
    proc.start()
    return proc

def build(watch):
    p = subprocess.Popen(['webpack'] + (['--watch'] if watch else []))
    return p

def serve():
    server_address = ('0.0.0.0', 4443)
    httpd = http.server.HTTPServer(
        server_address, http.server.SimpleHTTPRequestHandler)
    httpd.socket = ssl.wrap_socket(httpd.socket,
                                   server_side=True,
                                   certfile='localhost.pem',
                                   ssl_version=ssl.PROTOCOL_TLSv1)
    print("Now serving at: https://localhost:4443")
    httpd.serve_forever()

def main():
    parser = argparse.ArgumentParser(description="build")
    parser.add_argument('-c', '--clean', action='store_true')
    parser.add_argument('-w', '--watch', action='store_true')
    parser.add_argument('-s', '--serve', action='store_true')

    args = parser.parse_args()
    if args.clean:
        clean()
    copy_proc = copy(args.watch)
    build_proc = build(args.watch)

    if args.serve:
        serve_proc = Process(target=serve)
        serve_proc.start()
        serve_proc.join()

    copy_proc.join()
    build_proc.wait()

if __name__ == "__main__":
    main()
