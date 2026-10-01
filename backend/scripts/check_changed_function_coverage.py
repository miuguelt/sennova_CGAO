"""Comprueba que las funciones tocadas tengan una prueba que las ejecute."""

import argparse
import ast
import json
import re
import subprocess
import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


def parse_unified_diff(diff_text):
    """Devuelve las líneas nuevas por archivo a partir de un diff unificado."""
    changed = {}
    current_file = None
    new_line = None

    for line in diff_text.splitlines():
        if line.startswith("+++ b/"):
            current_file = line[6:].replace("\\", "/")
            changed.setdefault(current_file, set())
            new_line = None
            continue

        if line.startswith("@@"):
            match = re.search(r"\+(\d+)(?:,(\d+))?", line)
            new_line = int(match.group(1)) if match else None
            continue

        if new_line is None or current_file is None or line.startswith("\\"):
            continue
        if line.startswith("+") and not line.startswith("+++"):
            changed[current_file].add(new_line)
            new_line += 1
        elif line.startswith(" "):
            new_line += 1

    return {path: lines for path, lines in changed.items() if lines}


def normalize_coverage_path(path, source_root):
    """Normaliza rutas absolutas o relativas de los informes de cobertura."""
    normalized = str(path).replace("\\", "/")
    root = source_root.strip("/").replace("\\", "/")
    lower_path = normalized.lower()
    lower_root = root.lower()
    marker = f"/{lower_root}/"
    if marker in lower_path:
        position = lower_path.rfind(marker) + len(marker)
        return f"{root}/{normalized[position:]}"
    if lower_path.startswith(f"{lower_root}/"):
        return normalized

    root_name = root.rsplit("/", 1)[-1]
    marker = f"/{root_name.lower()}/"
    if marker in lower_path:
        position = lower_path.rfind(marker) + 1
        return f"{root.rsplit('/', 1)[0]}/{normalized[position:]}"
    if lower_path.startswith(f"{root_name.lower()}/"):
        return f"{root.rsplit('/', 1)[0]}/{normalized}"
    return None


def python_function_targets(source, changed_lines):
    """Ubica las funciones Python que contienen líneas modificadas y su entrada."""
    tree = ast.parse(source)
    targets = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        start_line = min(
            [node.lineno, *(decorator.lineno for decorator in node.decorator_list)]
        )
        if not any(start_line <= line <= node.end_lineno for line in changed_lines):
            continue
        body = node.body
        while body and (
            isinstance(body[0], (ast.Global, ast.Nonlocal))
            or (
                isinstance(body[0], ast.Expr)
                and isinstance(body[0].value, ast.Constant)
                and isinstance(body[0].value.value, str)
            )
        ):
            body = body[1:]
        if body:
            targets.append((node.name, body[0].lineno))
    return targets


def istanbul_function_targets(coverage_entry, changed_lines):
    """Ubica funciones JavaScript/TypeScript modificadas y sus contadores V8."""
    targets = []
    for function_id, function in coverage_entry.get("fnMap", {}).items():
        location = function.get("loc", {})
        start = location.get("start", {}).get("line")
        end = location.get("end", {}).get("line")
        if start is None or end is None:
            continue
        if any(start <= line <= end for line in changed_lines):
            name = function.get("name", f"función {function_id}")
            count = coverage_entry.get("f", {}).get(str(function_id), 0)
            targets.append((name, start, int(count)))
    return targets


def load_changed_lines(base, source_root):
    """Obtiene del repositorio las líneas de código cambiadas frente a una base."""
    diff = subprocess.run(
        ["git", "diff", "--unified=0", base, "--", source_root],
        cwd=REPOSITORY_ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return parse_unified_diff(diff)


def check_coverage(coverage_data, changed_lines, source_root, report_format):
    """Compara las funciones modificadas con las líneas o contadores ejecutados."""
    report_entries = {}
    if report_format == "python":
        for report_path, entry in coverage_data.get("files", {}).items():
            normalized = normalize_coverage_path(report_path, source_root)
            if normalized:
                report_entries[normalized] = entry
    else:
        for report_path, entry in coverage_data.items():
            normalized = normalize_coverage_path(report_path, source_root)
            if normalized:
                report_entries[normalized] = entry

    checked = []
    missing = []
    for path, changed in changed_lines.items():
        if not path.startswith(f"{source_root}/"):
            continue
        path_parts = {part.lower() for part in Path(path).parts}
        if report_format == "istanbul" and (
            path_parts.intersection({"test", "tests", "__tests__"})
            or Path(path).name.lower().endswith((".test.js", ".test.jsx", ".test.ts", ".test.tsx", ".spec.js", ".spec.jsx", ".spec.ts", ".spec.tsx"))
        ):
            continue
        if report_format == "python":
            source_path = REPOSITORY_ROOT / Path(path)
            if not source_path.is_file():
                continue
            targets = python_function_targets(source_path.read_text(encoding="utf-8"), changed)
        else:
            entry = report_entries.get(path)
            if entry is None and Path(path).suffix.lower() in {".js", ".jsx", ".ts", ".tsx"}:
                checked.append((path, "archivo", min(changed)))
                missing.append(f"{path} (sin informe de cobertura)")
                continue
            targets = istanbul_function_targets(entry, changed) if entry else []

        if not targets:
            continue
        entry = report_entries.get(path)
        if entry is None:
            for target in targets:
                name, line = target[:2]
                checked.append((path, name, line))
                missing.append(f"{path}:{name}@{line} (sin informe de cobertura)")
            continue

        if report_format == "python":
            executed = {int(line) for line in entry.get("executed_lines", [])}
            for name, line in targets:
                checked.append((path, name, line))
                if line not in executed:
                    missing.append(f"{path}:{line} {name}")
        else:
            for name, line, count in targets:
                checked.append((path, name, line))
                if count == 0:
                    missing.append(f"{path}:{line} {name}")

    return checked, missing


def check_all_function_coverage(coverage_data, source_root, report_format):
    """Comprueba cada función de producción incluida en el informe."""
    checked = []
    missing = []

    if report_format == "python":
        for report_path, entry in coverage_data.get("files", {}).items():
            path = normalize_coverage_path(report_path, source_root)
            if not path or not path.startswith(f"{source_root}/"):
                continue
            source_path = REPOSITORY_ROOT / Path(path)
            if not source_path.is_file():
                missing.append(f"{path} (archivo fuente no encontrado)")
                continue
            source = source_path.read_text(encoding="utf-8")
            all_lines = set(range(1, source.count("\n") + 2))
            targets = python_function_targets(source, all_lines)
            executed = {int(line) for line in entry.get("executed_lines", [])}
            for name, line in targets:
                checked.append((path, name, line))
                if line not in executed:
                    missing.append(f"{path}:{line} {name}")
        return checked, missing

    for report_path, entry in coverage_data.items():
        path = normalize_coverage_path(report_path, source_root)
        if not path or not path.startswith(f"{source_root}/"):
            continue
        path_parts = {part.lower() for part in Path(path).parts}
        if (
            path_parts.intersection({"test", "tests", "__tests__"})
            or Path(path).name.lower().endswith((".test.js", ".test.jsx", ".test.ts", ".test.tsx", ".spec.js", ".spec.jsx", ".spec.ts", ".spec.tsx"))
        ):
            continue
        for function_id, function in entry.get("fnMap", {}).items():
            location = function.get("loc", {})
            line = location.get("start", {}).get("line")
            if line is None:
                continue
            name = function.get("name", f"función {function_id}")
            count = int(entry.get("f", {}).get(str(function_id), 0))
            checked.append((path, name, line))
            if count == 0:
                missing.append(f"{path}:{line} {name}")

    return checked, missing


def merge_coverage_reports(reports, report_format):
    """Combina contadores de reportes generados por suites aisladas."""
    if report_format == "python":
        merged = {"files": {}}
        canonical_paths = {}
        for report in reports:
            for path, entry in report.get("files", {}).items():
                identity = str(path).replace("\\", "/").casefold()
                canonical_path = canonical_paths.setdefault(identity, path)
                current = merged["files"].setdefault(canonical_path, dict(entry))
                current["executed_lines"] = sorted(
                    set(current.get("executed_lines", []))
                    | set(entry.get("executed_lines", []))
                )
        return merged

    merged = {}
    canonical_paths = {}
    for report in reports:
        for path, entry in report.items():
            identity = str(path).replace("\\", "/").casefold()
            canonical_path = canonical_paths.setdefault(identity, path)
            if canonical_path not in merged:
                merged[canonical_path] = dict(entry)
                continue
            current = merged[canonical_path]
            for counter_name in ("s", "f"):
                counters = current.setdefault(counter_name, {})
                for counter_id, count in entry.get(counter_name, {}).items():
                    counters[counter_id] = int(counters.get(counter_id, 0)) + int(count)
            branches = current.setdefault("b", {})
            for branch_id, counts in entry.get("b", {}).items():
                previous = branches.setdefault(branch_id, [0] * len(counts))
                branches[branch_id] = [
                    int(previous[index] if index < len(previous) else 0) + int(count)
                    for index, count in enumerate(counts)
                ]
    return merged


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="HEAD", help="Referencia Git para comparar los cambios")
    parser.add_argument(
        "--coverage",
        required=True,
        action="append",
        help="Ruta al informe JSON de cobertura; puede repetirse para combinar suites",
    )
    parser.add_argument("--format", choices=("python", "istanbul"), required=True)
    parser.add_argument("--source-root", choices=("backend/app", "frontend/src"), required=True)
    parser.add_argument(
        "--all-functions",
        action="store_true",
        help="Comprueba todas las funciones de producción, no solo las modificadas",
    )
    args = parser.parse_args(argv)

    coverage_reports = []
    for coverage_file in args.coverage:
        coverage_path = Path(coverage_file)
        if not coverage_path.is_absolute():
            coverage_path = REPOSITORY_ROOT / coverage_path
        coverage_reports.append(json.loads(coverage_path.read_text(encoding="utf-8")))
    coverage_data = merge_coverage_reports(coverage_reports, args.format)
    if args.all_functions:
        checked, missing = check_all_function_coverage(
            coverage_data,
            args.source_root,
            args.format,
        )
    else:
        changed_lines = load_changed_lines(args.base, args.source_root)
        checked, missing = check_coverage(coverage_data, changed_lines, args.source_root, args.format)

    label = "Cobertura global de funciones" if args.all_functions else "Cobertura de funciones modificadas"
    print(f"{label}: {len(checked) - len(missing)}/{len(checked)} ejecutadas.")
    if missing:
        heading = "Funciones sin cobertura global:" if args.all_functions else "Funciones modificadas sin prueba de ejecución:"
        print(heading, file=sys.stderr)
        for item in missing:
            print(f"- {item}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
