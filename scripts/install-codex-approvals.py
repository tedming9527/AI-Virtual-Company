#!/usr/bin/env python3
"""Install explicitly authorized, bounded MCP approvals (Python 3.11+).

Preserve TOML text and existing choices; parse before/after to verify the only
semantic changes are the three requested per-tool defaults. Never trust hooks.
"""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
import tomllib

TOOLS = ("task_begin", "load_asset", "task_closeout")


def table_path(line):
    """Recognize a table using the TOML parser, including quoted identifiers."""
    if not line.lstrip().startswith("[") or line.lstrip().startswith("[["):
        return None
    try:
        value = tomllib.loads(line.strip() + '\n__avc_section_probe__ = true\n')
    except tomllib.TOMLDecodeError:
        return None
    path = []
    while isinstance(value, dict) and len(value) == 1:
        key, value = next(iter(value.items()))
        if key == "__avc_section_probe__":
            return path
        path.append(key)
    return None


def prepare(source, server_id, plugin_id=None, prior_tools=None, prior_policy=None):
    before = tomllib.loads(source)
    expected = copy.deepcopy(before)
    path = (["plugins", plugin_id] if plugin_id else []) + ["mcp_servers", server_id]
    target = expected
    try:
        for key in path:
            target = target[key]
    except (KeyError, TypeError):
        raise ValueError("Register the exact MCP server/configuration before installing approvals") from None
    if not isinstance(target, dict) or target.get("enabled") is False:
        raise ValueError("Target MCP server must be enabled")
    if not plugin_id and not (target.get("command") or target.get("url")):
        raise ValueError("Target MCP server has no registered command or URL")
    if not isinstance(target.get("tools", {}), dict) or any(
        not isinstance(value, dict) for value in target.get("tools", {}).values()
    ):
        raise ValueError("Invalid MCP tool settings; no settings changed")
    added, preserved = [], {}
    result = source
    policy_lines = []
    for key, value in (prior_policy or {}).items():
        valid = (key == "enabled" and type(value) is bool) or (
            key in ("enabled_tools", "disabled_tools") and isinstance(value, list)
            and all(isinstance(item, str) for item in value)) or (
            key == "default_tools_approval_mode" and value in ("auto", "prompt", "writes", "approve"))
        if not valid:
            raise ValueError("Invalid prior server policy")
        if key in target:
            if target[key] != value:
                raise ValueError("Conflicting server policy; no settings changed")
            continue
        target[key] = value
        policy_lines.append(f'{key} = {json.dumps(value)}\n')
    if policy_lines:
        lines = result.splitlines(keepends=True)
        matches = [i for i, line in enumerate(lines) if table_path(line) == path]
        if len(matches) != 1:
            raise ValueError("Server policy requires one explicit TOML table")
        index = matches[0]
        lines[index] = lines[index].rstrip("\r\n") + "\n" + "".join(policy_lines)
        result = "".join(lines)
    # codex mcp add replaces the server table. Restore previously reviewed tool
    # settings before adding defaults, including policies for non-monitor tools.
    for tool, settings in (prior_tools or {}).items():
        if not isinstance(settings, dict) or any(
            key not in ("approval_mode", "output_token_limit") for key in settings
        ):
            raise ValueError("Unsupported prior tool settings; restore configuration before retrying")
        current = target.setdefault("tools", {})
        if tool in current:
            if current[tool] != settings:
                raise ValueError("Conflicting current/prior tool settings; no settings changed")
            continue
        if ("approval_mode" in settings and settings["approval_mode"] not in
                ("auto", "prompt", "writes", "approve")) or (
                "output_token_limit" in settings and
                (type(settings["output_token_limit"]) is not int or settings["output_token_limit"] <= 0)):
            raise ValueError("Invalid prior tool policy")
        current[tool] = copy.deepcopy(settings)
        header = ".".join(json.dumps(key) for key in path + ["tools", tool])
        result += f'\n[{header}]\n'
        result += "".join(f'{key} = {json.dumps(value)}\n' for key, value in settings.items())
    for tool in TOOLS:
        settings = target.setdefault("tools", {}).setdefault(tool, {})
        if "approval_mode" in settings:
            preserved[tool] = settings["approval_mode"]
            continue
        settings["approval_mode"] = "approve"
        added.append(tool)
        tool_path = path + ["tools", tool]
        lines = result.splitlines(keepends=True)
        matches = [i for i, line in enumerate(lines) if table_path(line) == tool_path]
        if len(matches) > 1:
            raise ValueError("Ambiguous TOML table; no settings changed")
        if matches:
            index = matches[0]
            lines[index] = lines[index].rstrip("\r\n") + '\napproval_mode = "approve"\n'
            result = "".join(lines)
        else:
            header = ".".join(json.dumps(key) for key in tool_path)
            result += f'\n[{header}]\napproval_mode = "approve"\n'
    try:
        after = tomllib.loads(result)
    except tomllib.TOMLDecodeError:
        raise ValueError("TOML layout cannot be patched safely; use explicit tool tables") from None
    if after != expected:
        raise ValueError("Unexpected semantic change; no settings changed")
    return result, added, preserved


def install(home, server_id, plugin_id=None, check=False, prior_tools=None, prior_policy=None):
    home = Path(home).resolve()
    config = home / "config.toml"
    if config.is_symlink() or not config.is_file():
        raise ValueError("Expected an existing regular config.toml, not a symlink")
    original = config.read_bytes()
    try:
        updated, added, preserved = prepare(original.decode("utf-8"), server_id, plugin_id, prior_tools, prior_policy)
    except tomllib.TOMLDecodeError:
        # Parser exceptions can contain configuration values: do not print them.
        raise ValueError("Invalid config.toml; no settings changed") from None
    report = {"server": server_id, "plugin": plugin_id, "added": added,
              "preserved": preserved, "changed": updated.encode("utf-8") != original and not check,
              "checkOnly": check, "activation": "Reload the client and verify a new MCP call"}
    if check or updated.encode("utf-8") == original:
        return report
    lock = home / ".ted-avc-approvals.lock"
    lock.mkdir()  # Prevent concurrent installer writes; never remove another lock.
    temporary = None
    try:
        if config.is_symlink() or config.read_bytes() != original:
            raise ValueError("Configuration changed during installation; retry after review")
        digest = hashlib.sha256(original).hexdigest()[:16]
        backup = home / f"config.toml.ted-avc-approvals-{digest}.bak"
        if backup.exists() or backup.is_symlink():
            if backup.is_symlink() or backup.read_bytes() != original:
                raise ValueError("Backup collision; no settings changed")
        else:
            fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "wb") as stream:
                stream.write(original)
        with tempfile.NamedTemporaryFile(dir=home, prefix=".ted-avc-approvals-", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(updated.encode("utf-8"))
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, stat.S_IMODE(config.stat().st_mode) & 0o600)
        if config.is_symlink() or config.read_bytes() != original:
            raise ValueError("Configuration changed during installation; retry after review")
        os.replace(temporary, config)
        report["backup"] = backup.name
        return report
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
        lock.rmdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--codex-home", required=True)
    parser.add_argument("--server-id", default="ted-avc-manager")
    parser.add_argument("--plugin-id", help="Only for an already configured plugin-scoped MCP server")
    parser.add_argument("--authorize-monitor-tools", action="store_true")
    parser.add_argument("--preserve-tools-json", type=json.loads, help="Tool policies captured before MCP re-registration")
    parser.add_argument("--preserve-server-policy-json", type=json.loads, help="Server permission settings captured before re-registration")
    parser.add_argument("--check", action="store_true", help="Validate and preview without writing")
    args = parser.parse_args()
    if not args.check and not args.authorize_monitor_tools:
        parser.error("Explicit --authorize-monitor-tools is required")
    try:
        if args.preserve_tools_json is not None and not isinstance(args.preserve_tools_json, dict):
            raise ValueError("Prior tool policies must be an object")
        if args.preserve_server_policy_json is not None and not isinstance(args.preserve_server_policy_json, dict):
            raise ValueError("Prior server policy must be an object")
        print(json.dumps(install(args.codex_home, args.server_id, args.plugin_id, args.check, args.preserve_tools_json, args.preserve_server_policy_json)))
    except (ValueError, OSError) as error:
        parser.exit(1, f"Approval installation failed: {error}\n")


if __name__ == "__main__":
    main()
