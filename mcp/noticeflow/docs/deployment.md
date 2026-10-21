# Noticeflow Deployment

Use this procedure to update an existing single-instance Docker Compose deployment. It packages a chosen Git commit and replaces only the application image. First installation and database recovery are separate procedures; see the [README](../README.md) and [architecture](architecture.md).

## Deployment record

Keep a private record in the ignored `tmp/noticeflow/` directory or outside the repository. Record the SSH alias, server platform, Compose project/service and every Compose file, container name, configuration path, mounts, networks, proxy-variable presence, port bindings, healthcheck, and stop timeout. Keep passwords and token values in their existing credential stores. Local records require separate secure retention when moving or cleaning the checkout.

Refresh this record from running containers before each update. Image tags and cached server source directories are insufficient evidence of the deployed revision. Record both the current image reference and ID; inspect `org.opencontainers.image.revision` when present. Keep personal addresses, server profiles, inspection output, bundles, and operation history outside tracked files.

## Select and verify the source

1. Commit the intended change and resolve the target to a full Git commit SHA. In a clean checkout of that commit, run the asset's `npm ci --ignore-scripts`, `npm run typecheck`, `npm test`, and `npm run build`, plus the repository documentation checks.
2. Review changes since the deployed revision, especially configuration validation, database migrations, encryption, authorization storage, and the Dockerfile. Establish database rollback compatibility before switching; an unknown deployed revision requires image/source evidence rather than assuming the server's cached checkout is current.
3. Confirm the deployment platform and available disk space. Keep one application instance and retain the current database, data key, issuer URL, routing configuration, proxy settings, networks, mounts, port bindings, healthcheck, and restart policy. Allow sufficient time for graceful shutdown; the normal HTTP drain deadline is 12 seconds, so 30 seconds is a suitable starting stop timeout.

## Build and transfer

Run from the repository root with `TARGET_COMMIT`, `PLATFORM`, and a new `BUNDLE_DIRECTORY` set from the private deployment record:

```sh
node mcp/noticeflow/scripts/build-image.ts \
  "$TARGET_COMMIT" "$PLATFORM" "$BUNDLE_DIRECTORY"
```

The script requires Node.js 24, Git, tar, Docker and Buildx. It accepts `linux/amd64` or `linux/arm64`, archives only runtime build inputs from the specified commit, and builds with a revision label and platform-specific commit tag. It verifies the built platform and revision before exporting `image.tar`, `bundle.json`, and `SHA256SUMS`. Prototypes, deployment files and working-tree edits are excluded. Existing output directories are refused; output inside the checkout must be under `tmp/`. Failed builds have no completion marker (`SHA256SUMS`); use a fresh directory for a retry.

Transfer the complete bundle and [configuration checker](../scripts/check-compose-update.py) over the existing SSH connection. Keep the checked bundle for rollback/audit; a source commit pins application inputs, while mutable upstream image tags or package repositories can still change rebuild results. The archive checksum identifies the exact transported artifact.

On the server, verify the bundle before loading it:

```sh
cd "$REMOTE_BUNDLE_DIRECTORY"
sha256sum -c SHA256SUMS
docker image load --input image.tar
docker image inspect --format \
  '{{index .Config.Labels "org.opencontainers.image.revision"}} {{.Os}}/{{.Architecture}} {{.Id}}' \
  "$IMAGE_REFERENCE"
```

Require the image reference, revision and platform to match `bundle.json` and the chosen target. Record the loaded image ID on the deployment host and later compare the running container with that ID. Build-host and deployment-host IDs can differ across image-store/export formats. Preserve the old image ID under a rollback tag before changing configuration.

## Back up and prepare

Create a protected operation directory on the server. Preserve all active Compose files, required interpolation inputs and the effective Compose JSON. Effective configuration can contain credentials: use a directory accessible only to its owner and a restrictive umask, and keep it on the server. Use the same project name, project directory, ordered Compose files and interpolation environment for every command, including configuration checks and rollback. Retain the original data key separately from database backups.

```sh
docker exec "$APP_CONTAINER" node dist/main.js backup create --config "$CONFIG_PATH"
```

Require a successful, verified backup and record its metadata. Edit only the selected service's image reference in the existing Compose configuration. Capture the effective configuration before and after the edit, then run the checker with those protected JSON files:

```sh
python3 check-compose-update.py \
  "$BEFORE_JSON" "$AFTER_JSON" "$SERVICE" "$IMAGE_REFERENCE"
```

The checker permits only `services.<service>.image` to change; every other effective setting and service must be identical. It prints only a pass/fail marker. A rejection stops the image-only update and requires a separate review of the configuration change. When dependencies or configuration must change, plan that migration explicitly rather than bypassing this check.

## Switch and verify

After reviewing the backup, preserved configuration, loaded image and rollback path, update the selected service. The following example has one Compose file; supply every recorded `-f` argument in its original order when more than one is active:

```sh
docker compose --project-directory "$COMPOSE_DIRECTORY" \
  -p "$PROJECT" -f "$COMPOSE_FILE" \
  up -d --no-deps --no-build --pull never --wait --wait-timeout 120 "$SERVICE"
```

Compose recreates the service for its new image while preserving mounted data. A failure or timeout does not automatically roll back; inspect state and use the prepared rollback path. Require the configured healthcheck to report `healthy`; Compose's wait option alone only establishes `running` for a service without a healthcheck.

Verify the running image ID and revision, unchanged mounts/ports/networks/proxy-variable presence, internal `/healthz`, public OAuth discovery, and an existing host connection. Verify any changed OAuth interaction through one authorization attempt. A real notification is a separate external side effect and requires explicit authorization.

After acceptance, update the private deployment record with the target revision, image reference/ID, archive checksum, backup metadata and verification results. Keep the previous image and protected operation directory until the rollback retention period has passed. This is deployment of a commit, independent of an asset semver release.

## Roll back

For a compatible image-only update, restore the preserved Compose configuration, selecting the pinned old image ID/tag, and run the same scoped Compose command. Verify health, image identity, configuration and the existing connection again. Keep the current database and original key in place.

A schema-changing update needs its own recovery plan: the older binary may reject the newer schema. Database restore is a stopped-service maintenance operation; it revokes authorization and pauses delivery, so it is not the ordinary image rollback mechanism. Follow the documented recovery procedure and record any necessary host reauthorization.

## References

- [Compose production updates](https://docs.docker.com/compose/how-tos/production/)
- [Compose up and health waiting](https://docs.docker.com/reference/cli/docker/compose/up/)
- [Docker exporters](https://docs.docker.com/build/exporters/)
- [Image save](https://docs.docker.com/reference/cli/docker/image/save/)
