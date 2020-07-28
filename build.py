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
    try:
        shutil.rmtree(outputdir)
    except FileNotFoundError:
        pass


def _copy(watch):
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


def copy(watch):
    # TODO use watch
    proc = Process(target=_copy, args=(watch,))
    proc.start()
    return proc

def build(watch):
    p = subprocess.Popen(['webpack'] + (['--watch'] if watch else []))
    return p

def sass(watch):
    srcfile = os.path.join(srcdir, 'stylesheets/style.scss')
    dstfile = os.path.join(outputdir, 'style.css')
    p = subprocess.Popen(
        ['sass', srcfile, dstfile] + (['--watch'] if watch else [])
    )
    return p

def serve(dir_, port):
    if dir_:
        os.chdir(dir_)
    if port is None:
        port = 4443
    server_address = ('0.0.0.0', port)
    httpd = http.server.HTTPServer(
        server_address, http.server.SimpleHTTPRequestHandler)
    httpd.socket = ssl.wrap_socket(httpd.socket,
                                   server_side=True,
                                   certfile='localhost.pem',
                                   ssl_version=ssl.PROTOCOL_TLSv1_2)
    print(f"Now serving at: https://localhost:{port}")
    httpd.serve_forever()

def main():
    parser = argparse.ArgumentParser(description="build")
    parser.add_argument('-c', '--clean', action='store_true')
    parser.add_argument('-w', '--watch', action='store_true')
    parser.add_argument('-s', '--serve', action='store_true')
    parser.add_argument('-d', '--dir', type=str)
    parser.add_argument('-p', '--port', type=int)
    parser.add_argument('--no-build', action='store_true')

    args = parser.parse_args()
    if args.clean:
        clean()

    sass_proc = None
    build_proc = None
    copy_proc = None
    if not args.no_build:
        copy_proc = copy(args.watch)
        sass_proc = sass(args.watch)
        build_proc = build(args.watch)

    if args.serve:
        serve_proc = Process(target=serve, args=(args.dir, args.port))
        serve_proc.start()
        serve_proc.join()

    if not args.no_build:
        copy_proc.join()
        sass_proc.wait()
        build_proc.wait()

if __name__ == "__main__":
    main()
