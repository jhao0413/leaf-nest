#!/bin/sh

set -eu

if [ "${1:-}" = "node" ] && [ "${2:-}" = "dist-server/index.js" ]; then
  secret_file="${BETTER_AUTH_SECRET_FILE:-/var/lib/leaf-nest/secrets/better-auth-secret}"

  if [ -z "${BETTER_AUTH_SECRET:-}" ]; then
    if [ -s "$secret_file" ]; then
      BETTER_AUTH_SECRET="$(cat "$secret_file")"
      export BETTER_AUTH_SECRET
      echo "Leaf Nest: loaded the persisted authentication secret."
    else
      secret_directory="$(dirname "$secret_file")"
      mkdir -p "$secret_directory"
      umask 077
      temporary_secret_file="${secret_file}.tmp.$$"
      node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" > "$temporary_secret_file"
      mv "$temporary_secret_file" "$secret_file"
      BETTER_AUTH_SECRET="$(cat "$secret_file")"
      export BETTER_AUTH_SECRET
      echo "Leaf Nest: generated and persisted a new authentication secret."
    fi
  else
    echo "Leaf Nest: using the authentication secret supplied by the environment."
  fi
fi

exec "$@"
