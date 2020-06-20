#!/bin/bash
set -ex
rm -rf dist
find src -type d | while read dir; do
    mkdir -p "${dir/src/dist}"
done;
find src -type f ! -name '*.ts' | while read file; do
    cp -v "$file" "${file/src/dist}"
done;
webpack
