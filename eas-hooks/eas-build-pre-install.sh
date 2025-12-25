#!/usr/bin/env bash

set -euo pipefail

echo "Configuring npm to use legacy-peer-deps..."
npm config set legacy-peer-deps true

