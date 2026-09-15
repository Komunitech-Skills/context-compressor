#!/usr/bin/env python3
"""Validate local Markdown links and declared CLI/configuration documentation contracts.

Canonical source: rin-proxy/rin-runbook, scripts/check-docs.py.
Only Python's standard library is required. No commands, network requests or agent
configuration are executed. Contracts intentionally cover declared public interfaces,
not arbitrary prose or every Markdown extension.
"""
import argparse
import ast
import hashlib
import html
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


def prose(text):
    lines = []
    fence = None
    for line in text.splitlines():
        match = re.match(r'^\s{0,3}(`{3,}|~{3,})', line)
        if match:
            marker = match[1]
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            continue
        if fence is None:
            lines.append(line)
    return '\n'.join(lines), fence is not None


def anchors(text):
    clean, _ = prose(text)
    found, counts = set(), {}
    for heading in re.findall(r'^\s{0,3}#{1,6}\s+(.+?)\s*#*$', clean, re.M):
        heading = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', heading)
        heading = re.sub(r'<[^>]*>', '', heading)
        slug = re.sub(r'[^\w\- ]', '', html.unescape(heading).lower()).replace(' ', '-')
        number = counts.get(slug, 0)
        counts[slug] = number + 1
        found.add(slug + ('-' + str(number) if number else ''))
    found.update(re.findall(r'\b(?:id|name)=["\']([^"\']+)["\']', clean))
    return found


def local(root, relative):
    path = root / relative
    if Path(relative).is_absolute() or not path.resolve().is_relative_to(root):
        raise ValueError('path escapes repository: ' + relative)
    return path


def check(root, contract):
    errors = []
    for name in contract['documents']:
        file = local(root, name)
        if not file.is_file():
            errors.append(name + ': missing document')
            continue
        text, unclosed = prose(file.read_text())
        if unclosed:
            errors.append(name + ': unclosed code fence')
        # Inline links (including images), and explicit reference definitions.
        links = re.findall(r'\]\((<[^>]+>|[^\s)]+)(?:\s+["\'][^\n]*?["\'])?\)', text)
        links += re.findall(r'^\s{0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)', text, re.M)
        for target in links:
            target = target.strip('<>')
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc:
                continue
            dest = (file.parent / unquote(parsed.path)).resolve() if parsed.path else file
            if not dest.is_relative_to(root) or not dest.exists():
                errors.append(name + ': missing/unsafe local link ' + target)
            elif parsed.fragment and dest.is_file() and dest.suffix.lower() == '.md':
                if unquote(parsed.fragment) not in anchors(dest.read_text()):
                    errors.append(name + ': missing anchor ' + target)
    for row in contract.get('cli', []):
        source = local(root, row['source']).read_text()
        documented = local(root, row['document']).read_text()
        flags = set()
        for node in ast.walk(ast.parse(source)):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == 'add_argument':
                flags.update(arg.value for arg in node.args if isinstance(arg, ast.Constant) and isinstance(arg.value, str))
        for flag in row['flags']:
            if flag not in flags or flag not in documented:
                errors.append(row['document'] + ': CLI flag differs from parser: ' + flag)
    for row in contract.get('config', []):
        schema = json.loads(local(root, row['source']).read_text())['configSchema']['properties']
        documented = local(root, row['document']).read_text()
        for key in row['keys']:
            if key not in schema or key not in documented:
                errors.append(row['document'] + ': plugin config key differs from schema: ' + key)
    for row in contract.get('required_text', []):
        text = local(root, row['document']).read_text()
        for value in row['values']:
            if value not in text:
                errors.append(row['document'] + ': missing contract text: ' + value)
    for name in contract.get('required_files', []):
        if not local(root, name).is_file():
            errors.append('missing required file: ' + name)
    expected = contract.get('checker_sha256')
    if expected and hashlib.sha256(Path(__file__).read_bytes()).hexdigest() != expected:
        errors.append('shared checker differs from pinned content; synchronize from rin-runbook')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        root = args.root.resolve()
        contract = json.loads((root / 'docs-contract.json').read_text())
        errors = check(root, contract)
    except (OSError, ValueError, KeyError, TypeError, SyntaxError) as exc:
        errors = [str(exc)]
    print(json.dumps({'status': 'FAIL' if errors else 'PASS', 'errors': errors}, indent=2))
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
