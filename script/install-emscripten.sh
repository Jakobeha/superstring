#!/usr/bin/env bash

set -e

EMSCRIPTEN_DOWNLOAD_URL='https://codeload.github.com/emscripten-core/emsdk/tar.gz/1.38.48'
EMSDK_PATH="./emsdk-1.38.48/emsdk"

if [ ! -f $EMSDK_PATH ]; then
  echo 'Downloading emscripten SDK installer...'
  curl $EMSCRIPTEN_DOWNLOAD_URL | tar xz
fi

echo 'Installing emscripten SDK...'

# Workaround https://github.com/juj/emsdk/pull/74
#sed -i{} "s_/kripken/emscripten/'_/kripken/emscripten'_" $EMSDK_PATH
#sed -i{} "s_/WebAssembly/binaryen/'_/WebAssembly/binaryen'_" $EMSDK_PATH

$EMSDK_PATH update
$EMSDK_PATH list --old
$EMSDK_PATH install sdk-1.37.9-64bit
$EMSDK_PATH activate sdk-1.37.9-64bit