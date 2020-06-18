#!/bin/bash
set -ex
rm -rf dist
webpack
cp -r src/* dist/
cp -r node_modules dist/
