#!/usr/bin/env python3
"""
Butterfly / PreMortem — Phase 1 extractor
Walks a Python repo and emits dependency FACTS as plain-English sentences
that get fed into Cognee via add_text -> cognify.

The facts are written so Cognee's graph can answer:
  - "what depends on validateUser?"       (blast radius)
  - "who owns auth-service?"              (notify the right team)
  - "what does get_current_user call?"    (downstream traversal)

Usage:
  python extract.py /path/to/repo --out facts.json
  python extract.py /path/to/repo --out facts.json --module-name myapp

Output: a JSON file of {facts: [...], stats: {...}}, where each fact is one
short sentence. Phase 2 ingests these into Cognee.

No third-party deps — uses only the stdlib `ast`.
"""

import ast
import os
import sys
import json
import argparse
from collections import defaultdict

# Windows consoles default to cp1252, which can't encode the ✓/•/── glyphs we
# print (it raises UnicodeEncodeError *after* the work is done). Force UTF-8 on
# the output streams when possible, and fall back to ASCII markers if the stream
# still can't represent them (e.g. an exotic redirected pipe).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _supports_unicode():
    enc = getattr(sys.stdout, "encoding", None) or "ascii"
    try:
        "✓•──".encode(enc)
        return True
    except (LookupError, UnicodeEncodeError):
        return False


_UNI = _supports_unicode()
OK = "✓" if _UNI else "[ok]"
BULLET = "•" if _UNI else "-"
RULE = "──" if _UNI else "--"


def rel_module(path, root):
    """Turn a file path into a dotted module name relative to repo root."""
    rp = os.path.relpath(path, root)
    rp = rp[:-3] if rp.endswith(".py") else rp
    parts = [p for p in rp.split(os.sep) if p and p != "__init__"]
    return ".".join(parts) if parts else os.path.basename(root)


def collect_py_files(root, ignore_dirs):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs and not d.startswith(".")]
        for f in filenames:
            if f.endswith(".py"):
                yield os.path.join(dirpath, f)


class FileAnalyzer(ast.NodeVisitor):
    """Extracts defs, imports, and call sites from a single file."""

    def __init__(self, module):
        self.module = module
        self.defs = []            # function/class names defined here
        self.imports = []         # (imported_name, from_module)
        self.calls = defaultdict(set)  # caller_func -> {called_names}
        self._scope = []          # current function stack

    def visit_FunctionDef(self, node):
        qualified = ".".join(self._scope + [node.name]) if self._scope else node.name
        self.defs.append((node.name, "function"))
        self._scope.append(node.name)
        self.generic_visit(node)
        self._scope.pop()

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_ClassDef(self, node):
        self.defs.append((node.name, "class"))
        self._scope.append(node.name)
        self.generic_visit(node)
        self._scope.pop()

    def visit_Import(self, node):
        for a in node.names:
            self.imports.append((a.asname or a.name, a.name))
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        mod = node.module or ""
        for a in node.names:
            self.imports.append((a.asname or a.name, f"{mod}.{a.name}" if mod else a.name))
        self.generic_visit(node)

    def visit_Call(self, node):
        caller = self._scope[-1] if self._scope else "<module>"
        name = None
        if isinstance(node.func, ast.Name):
            name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            name = node.func.attr
        if name:
            self.calls[caller].add(name)
        self.generic_visit(node)


def infer_service(module, root_name):
    """Best-effort service/component name from the module path.
    e.g. 'app.auth.routes' -> 'auth'. Falls back to top package."""
    parts = module.split(".")
    # skip a common top wrapper like 'app'/'src'/root
    skip = {"app", "src", "backend", root_name}
    meaningful = [p for p in parts if p not in skip]
    return meaningful[0] if meaningful else (parts[0] if parts else root_name)


def build_facts(root, module_name=None):
    root = os.path.abspath(root)
    root_name = module_name or os.path.basename(root.rstrip(os.sep))
    ignore = {"node_modules", "venv", ".venv", "env", "__pycache__", "tests",
              "test", "migrations", "build", "dist", ".git", "site-packages"}

    files = list(collect_py_files(root, ignore))
    analyzers = {}
    def_owner = {}     # def_name -> module that defines it
    def_kind = {}      # def_name -> 'function'|'class'
    module_service = {}

    # Pass 1: parse every file
    for path in files:
        module = rel_module(path, root)
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                tree = ast.parse(fh.read(), filename=path)
        except SyntaxError:
            continue
        fa = FileAnalyzer(module)
        fa.visit(tree)
        analyzers[module] = fa
        module_service[module] = infer_service(module, root_name)
        for name, kind in fa.defs:
            # first definition wins (avoids dupes across files)
            def_owner.setdefault(name, module)
            def_kind.setdefault(name, kind)

    # Per-module resolution tables. A bare name used in a module only counts as a
    # cross-module dependency if it actually *resolves* there — i.e. it was imported
    # into the module (a bound name) or defined locally. This stops a shared bare
    # name (a `charge`/`get`/`__call__` method, a param, a local var) from matching a
    # same-named def in an unrelated module and inflating the blast radius.
    module_bound = {m: {local for local, _ in fa.imports} for m, fa in analyzers.items()}
    module_defs = {m: {name for name, _ in fa.defs} for m, fa in analyzers.items()}

    def resolve(name, module):
        """The module `name` refers to when used inside `module`, or None.
        Locally-defined names resolve to their own module; imported names resolve
        to the in-repo module that defines them; anything else is unresolvable and
        is not counted as an edge."""
        if name in module_defs.get(module, ()):      # defined/shadowed locally
            return module
        if name in module_bound.get(module, ()) and name in def_owner:
            return def_owner[name]
        return None

    facts = []
    stats = {"files": len(files), "modules": len(analyzers), "defs": len(def_owner)}

    # Fact type 1: where each def lives + its service
    for name, module in def_owner.items():
        svc = module_service.get(module, root_name)
        kind = def_kind.get(name, "function")
        facts.append(
            f"The {kind} `{name}` is defined in module `{module}` "
            f"which belongs to the `{svc}` component."
        )

    # Fact type 2: import edges (module A depends on module B via name)
    for module, fa in analyzers.items():
        svc = module_service.get(module, root_name)
        for imported, from_mod in fa.imports:
            # only record edges to things defined inside this repo
            if imported in def_owner:
                target_mod = def_owner[imported]
                target_svc = module_service.get(target_mod, root_name)
                if target_mod != module:
                    facts.append(
                        f"Module `{module}` (component `{svc}`) depends on "
                        f"`{imported}` from `{target_mod}` (component `{target_svc}`)."
                    )

    # Fact type 3: call edges — only when the callee actually resolves in the
    # caller's module (imported there or defined locally), not just name-matched.
    for module, fa in analyzers.items():
        for caller, callees in fa.calls.items():
            for callee in callees:
                target = resolve(callee, module)
                if target and target != module:
                    facts.append(
                        f"In module `{module}`, `{caller}` calls `{callee}` "
                        f"(defined in `{target}`)."
                    )

    # Fact type 4: reverse index — who depends on each def (the blast-radius fuel).
    # Both edge kinds are name-scoped: imports are bound names by construction, and
    # call edges must resolve in the using module.
    dependents = defaultdict(set)
    for module, fa in analyzers.items():
        for imported, _ in fa.imports:
            if imported in def_owner and def_owner[imported] != module:
                dependents[imported].add(module)
        for caller, callees in fa.calls.items():
            for callee in callees:
                target = resolve(callee, module)
                if target and target != module:
                    dependents[callee].add(module)
    for name, deps in dependents.items():
        if deps:
            dep_list = ", ".join(f"`{d}`" for d in sorted(deps))
            facts.append(
                f"If `{name}` changes, these modules are directly affected: {dep_list}."
            )

    stats["facts"] = len(facts)
    stats["defs_with_dependents"] = len(dependents)
    return facts, stats, root_name


def main():
    ap = argparse.ArgumentParser(description="Extract dependency facts from a Python repo for Cognee.")
    ap.add_argument("repo", help="path to the target repo")
    ap.add_argument("--out", default="facts.json", help="output JSON file")
    ap.add_argument("--module-name", default=None, help="override top-level project name")
    ap.add_argument("--preview", type=int, default=8, help="how many sample facts to print")
    args = ap.parse_args()

    if not os.path.isdir(args.repo):
        print(f"error: {args.repo} is not a directory", file=sys.stderr)
        sys.exit(1)

    facts, stats, root_name = build_facts(args.repo, args.module_name)

    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump({"project": root_name, "facts": facts, "stats": stats}, fh, indent=2)

    print(f"{OK} extracted {stats['facts']} facts from {stats['files']} files "
          f"({stats['defs']} defs, {stats['defs_with_dependents']} with dependents)")
    print(f"{OK} wrote {args.out}\n")
    print(f"{RULE} sample facts {RULE}")
    for f in facts[:args.preview]:
        print(f"  {BULLET}", f)
    if not facts:
        print("  (no facts — is this a Python repo with internal imports?)")


if __name__ == "__main__":
    main()
