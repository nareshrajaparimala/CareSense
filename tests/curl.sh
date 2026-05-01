#!/usr/bin/env bash
# Test API examples — copy any line and run it.
# Set EMAIL to a CareSense account (sign up first at /login).
#
# Usage:
#   EMAIL=you@example.com bash tests/curl.sh diabetes
#   EMAIL=you@example.com bash tests/curl.sh flush

set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
EMAIL="${EMAIL:-test@example.com}"
SCENARIO="${1:-list}"

case "$SCENARIO" in
  list)
    curl -s "$BASE/api/test/list" | jq
    ;;

  flush)
    curl -s -X POST "$BASE/api/test/flush" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\"}" | jq
    ;;

  diabetes|hypertension|heart-attack|cardiac|kidney|stable|deteriorating)
    curl -s -X POST "$BASE/api/test/$SCENARIO" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL\"}" | jq
    ;;

  *)
    echo "Unknown scenario: $SCENARIO"
    echo "Usage: EMAIL=you@example.com bash tests/curl.sh <scenario>"
    echo "Scenarios: list, diabetes, hypertension, heart-attack, cardiac, kidney, stable, deteriorating, flush"
    exit 1
    ;;
esac
