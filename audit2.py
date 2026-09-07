#!/usr/bin/env python3
"""
audit2.py — Auditoria rápida do MyRotina (vanilla JS PWA).

Verifica:
  1. Ausência de código morto / debug em JS (console.log, TODO, FIXME, debugger,
     setStyle, stopPropagation, TASK_MODE).
  2. Ausência de handlers inline no HTML (onclick=, onchange=, oninput=...).
  3. IDs únicos no index.html.
  4. Classes de CSS "mortas" conhecidas (removidas na refatoração 2026-09-07).
  5. Versão do cache no sw.js segue o padrão de data.

Sai com código 0 se tudo limpo, 1 se encontrar problemas.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

JS_FILES = [
    "app.js",
    "scripts/core/theme.js",
    "scripts/pages/dashboard.js",
    "scripts/pages/settings.js",
    "scripts/pages/tasks.js",
    "sw.js",
]

# Padrões que não devem existir em produção
FORBIDDEN_JS = {
    r"console\.(log|error|warn|info)\b": "console.*",
    r"\bdebugger\b": "debugger",
    r"\bTODO\b": "TODO",
    r"\bFIXME\b": "FIXME",
    r"\bsetStyle\b": "setStyle (morto)",
    r"\bstopPropagation\b": "stopPropagation (morto)",
    r"\bTASK_MODE\b": "TASK_MODE (removido)",
    r"\bgetTaskFormMode\b": "getTaskFormMode (removido)",
    r"\bbuildTaskFromComposer\b": "buildTaskFromComposer (removido)",
    r"\bDEPRECATED_STORAGE_KEYS\b": "DEPRECATED_STORAGE_KEYS (removido)",
}

# Handlers inline que não devem existir
INLINE_HANDLERS = re.compile(r"\bon\w+\s*=", re.I)

# Classes removidas na refatoração (regressão guard).
# NOTA: .is-no-date-active segue VIVA (esmaece inputs com "Sem hora" ativo).
DEAD_CSS_CLASSES = [
    "dashboard-compact-header",
    "dashboard-hero",
    "dashboard-now-meta",
    "dashboard-progress",
    "task-datetime-head",
    "task-toggle-row-main",
    "task-config-grid",
    "task-inline-toggle-compact",
]

SW_VERSION_PATTERN = re.compile(r"ASSET_VERSION = '(\d{4}-\d{2}-\d{2}[-a-z0-9]*)'")


def read_text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def audit_js() -> list[str]:
    problems = []
    for rel in JS_FILES:
        try:
            content = read_text(rel)
        except FileNotFoundError:
            problems.append(f"[JS] arquivo ausente: {rel}")
            continue
        for pattern, label in FORBIDDEN_JS.items():
            for m in re.finditer(pattern, content):
                line = content[: m.start()].count("\n") + 1
                problems.append(f"[JS] {rel}:{line} contém {label} ({m.group(0)!r})")
    return problems


def audit_html() -> list[str]:
    problems = []
    try:
        html = read_text("index.html")
    except FileNotFoundError:
        return ["[HTML] index.html ausente"]

    for m in INLINE_HANDLERS.finditer(html):
        line = html[: m.start()].count("\n") + 1
        problems.append(f"[HTML] index.html:{line} handler inline {m.group(0)!r}")

    ids = re.findall(r'id="([^"]+)"', html)
    dup = {id_ for id_ in ids if ids.count(id_) > 1}
    for id_ in sorted(dup):
        problems.append(f"[HTML] id duplicado: {id_!r}")
    return problems


def audit_css(html: str) -> list[str]:
    problems = []
    try:
        css = read_text("style.css")
    except FileNotFoundError:
        return ["[CSS] style.css ausente"]

    for cls in DEAD_CSS_CLASSES:
        if cls in css:
            problems.append(f"[CSS] classe morta {cls!r} ainda existe no style.css")
    return problems


def audit_sw() -> list[str]:
    problems = []
    try:
        sw = read_text("sw.js")
    except FileNotFoundError:
        return ["[SW] sw.js ausente"]
    m = SW_VERSION_PATTERN.search(sw)
    if not m:
        problems.append("[SW] ASSET_VERSION não segue o padrão aaaa-mm-dd-tag")
    return problems


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    print(f"Auditoria MyRotina — {ROOT.name}\n")
    all_problems: list[str] = []
    for fn in (audit_js, audit_html, audit_sw):
        all_problems += fn()

    try:
        html = read_text("index.html")
        all_problems += audit_css(html)
    except FileNotFoundError:
        all_problems.append("[HTML] index.html ausente")

    # Resumo de tamanho
    for rel in JS_FILES + ["index.html", "style.css"]:
        p = ROOT / rel
        if p.exists():
            print(f"  {rel:<32} {p.stat().st_size:>7} bytes  ({len(p.read_text().splitlines()):>5} linhas)")

    print()
    if all_problems:
        print(f"PROBLEMAS ({len(all_problems)}):")
        for p in all_problems:
            print(f"  - {p}")
        print("\nAuditoria FALHOU.")
        return 1

    print("Auditoria limpa: sem código morto, sem handlers inline, IDs únicos, CSS ok.")
    print("Auditoria OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())