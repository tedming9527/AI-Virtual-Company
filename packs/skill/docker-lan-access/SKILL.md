---
name: docker-lan-access
description: Ensure locally deployed Docker web apps and APIs are reachable through the Mac's LAN IP. Use when creating, deploying, restarting, or auditing local Docker services that people or other devices should access over the network.
---

# Docker LAN Access

For user-facing local web apps and APIs, publish host ports on all interfaces so both `localhost` and the machine's LAN IP work.

## Required outcome

- In Compose, prefer a normal port mapping such as `"7777:80"` or explicit `"0.0.0.0:7777:80"`.
- Do not use `127.0.0.1:<host>:<container>` for a service intended to be reached from the LAN.
- After changing a binding, recreate the container; `docker restart` alone cannot change published ports.
- Verify both `localhost:<port>` and `<LAN-IP>:<port>` after deployment. Discover the current LAN IP from active interfaces rather than assuming a fixed address.

## Audit workflow

1. Inspect all containers with `docker ps -a` and `docker inspect`. Record status, published ports, service role, Compose project, working directory, and config file.
2. Classify each container before changing it:
   - User-facing UI/API: must publish its intended port on all interfaces.
   - Internal dependency such as Redis, a database, or a message broker: keep private unless the user explicitly wants LAN access.
   - Stopped application: correct its persistent config, but do not start it unless the user asked to restart or deploy it.
3. Prefer editing the source `compose.yaml` or `docker-compose.yml`, then recreate only the affected service with Compose.
4. For a standalone container, preserve image, mounts, environment, command, restart policy, and name when recreating it. Do not expose secrets in logs or responses.
5. Confirm the new binding from `docker ps`/`docker inspect`, then make an HTTP or protocol-appropriate request through the LAN IP.

## Safety boundaries

- Do not expose internal infrastructure merely because it binds to localhost.
- Do not blindly restart every container. Restart or recreate only services whose intended user-facing endpoint is inaccessible by LAN IP.
- Resolve configuration and mounts before removing or replacing a container. Prefer recoverable, declarative changes.
- Report any macOS firewall, VPN, or network isolation that still prevents LAN access after Docker binds to `0.0.0.0`.

## Ambiguity rule

- If a tentative interpretation would narrow or skip this skill (for example, assuming a deployed UI is local-only and binding it to `127.0.0.1`), stop and ask the user for explicit direction. Do not silently substitute a local-only security default for this skill.
- A user instruction that all Docker deployments must support LAN-IP access is continuing authorization for user-facing services in that scope; publish those ports on all interfaces unless the user later narrows the scope.
