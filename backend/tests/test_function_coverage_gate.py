import importlib.util
import json
from pathlib import Path


SCRIPT_PATH = Path(__file__).parents[1] / "scripts" / "check_changed_function_coverage.py"
SPEC = importlib.util.spec_from_file_location("check_changed_function_coverage", SCRIPT_PATH)
coverage_gate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(coverage_gate)


def test_parse_unified_diff_tracks_added_lines_and_skips_deletions():
    diff = """diff --git a/frontend/src/lib/access.js b/frontend/src/lib/access.js
--- a/frontend/src/lib/access.js
+++ b/frontend/src/lib/access.js
@@ -8,2 +8,3 @@ export function allow() {
-  return false;
+  const role = 'aprendiz';
+  return role === 'aprendiz';
 }"""

    assert coverage_gate.parse_unified_diff(diff) == {
        "frontend/src/lib/access.js": {8, 9},
    }


def test_normalize_coverage_path_accepts_absolute_and_module_relative_paths():
    assert coverage_gate.normalize_coverage_path(
        r"C:\repo\frontend\src\lib\access.js", "frontend/src"
    ) == "frontend/src/lib/access.js"
    assert coverage_gate.normalize_coverage_path(
        "/home/runner/work/repo/frontend/src/lib/access.js", "frontend/src"
    ) == "frontend/src/lib/access.js"
    assert coverage_gate.normalize_coverage_path("app/auth.py", "backend/app") == "backend/app/auth.py"


def test_python_targets_use_first_executable_line_after_docstring():
    source = '''def changed():
    """Documentación de la función."""
    value = True
    return value
'''

    assert coverage_gate.python_function_targets(source, {4}) == [("changed", 3)]


def test_python_targets_include_decorator_changes():
    source = '''@require_staff
def changed():
    return True
'''

    assert coverage_gate.python_function_targets(source, {1}) == [("changed", 3)]


def test_python_targets_skip_nonlocal_declarations_before_executable_code():
    source = '''def outer():
    value = 0
    def nested():
        nonlocal value
        value += 1
        return value
'''

    assert coverage_gate.python_function_targets(source, {4, 5}) == [
        ("outer", 2),
        ("nested", 5),
    ]


def test_istanbul_targets_include_modified_callbacks_and_execution_counts():
    coverage_entry = {
        "fnMap": {
            "0": {"name": "manejador", "loc": {"start": {"line": 10}, "end": {"line": 14}}},
            "1": {"name": "otra", "loc": {"start": {"line": 20}, "end": {"line": 22}}},
        },
        "f": {"0": 1, "1": 0},
    }

    assert coverage_gate.istanbul_function_targets(coverage_entry, {12}) == [
        ("manejador", 10, 1),
    ]


def test_check_coverage_reports_python_function_that_never_ran(tmp_path, monkeypatch):
    source_path = tmp_path / "backend" / "app" / "users.py"
    source_path.parent.mkdir(parents=True)
    source_path.write_text("def list_users():\n    return []\n", encoding="utf-8")
    monkeypatch.setattr(coverage_gate, "REPOSITORY_ROOT", tmp_path)

    checked, missing = coverage_gate.check_coverage(
        {"files": {"app/users.py": {"executed_lines": []}}},
        {"backend/app/users.py": {2}},
        "backend/app",
        "python",
    )

    assert checked == [("backend/app/users.py", "list_users", 2)]
    assert missing == ["backend/app/users.py:2 list_users"]


def test_check_coverage_fails_when_changed_frontend_file_has_no_report():
    checked, missing = coverage_gate.check_coverage(
        {},
        {"frontend/src/lib/access.js": {4}},
        "frontend/src",
        "istanbul",
    )

    assert checked == [("frontend/src/lib/access.js", "archivo", 4)]
    assert missing == ["frontend/src/lib/access.js (sin informe de cobertura)"]


def test_check_coverage_skips_frontend_test_files():
    checked, missing = coverage_gate.check_coverage(
        {},
        {"frontend/src/test/access.test.jsx": {4}},
        "frontend/src",
        "istanbul",
    )

    assert checked == []
    assert missing == []


def test_global_python_function_coverage_checks_every_function(tmp_path, monkeypatch):
    source_path = tmp_path / "backend" / "app" / "users.py"
    source_path.parent.mkdir(parents=True)
    source_path.write_text(
        "def tested():\n    return 1\n\ndef untested():\n    return 2\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(coverage_gate, "REPOSITORY_ROOT", tmp_path)

    checked, missing = coverage_gate.check_all_function_coverage(
        {"files": {"app/users.py": {"executed_lines": [2]}}},
        "backend/app",
        "python",
    )

    assert checked == [
        ("backend/app/users.py", "tested", 2),
        ("backend/app/users.py", "untested", 5),
    ]
    assert missing == ["backend/app/users.py:5 untested"]


def test_global_frontend_function_coverage_checks_every_production_function():
    checked, missing = coverage_gate.check_all_function_coverage(
        {
            "/runner/repo/frontend/src/lib/roleAccess.js": {
                "fnMap": {
                    "0": {"name": "visible", "loc": {"start": {"line": 2}}},
                    "1": {"name": "hidden", "loc": {"start": {"line": 8}}},
                },
                "f": {"0": 3, "1": 0},
            }
        },
        "frontend/src",
        "istanbul",
    )

    assert checked == [
        ("frontend/src/lib/roleAccess.js", "visible", 2),
        ("frontend/src/lib/roleAccess.js", "hidden", 8),
    ]
    assert missing == ["frontend/src/lib/roleAccess.js:8 hidden"]


def test_coverage_reports_merge_counts_for_isolated_frontend_modules():
    report_path = "C:/repo/frontend/src/api/proyectos.js"
    function_map = {
        "0": {"name": "analyzeFormulation", "loc": {"start": {"line": 19}, "end": {"line": 23}}},
        "1": {"name": "importFormulation", "loc": {"start": {"line": 28}, "end": {"line": 33}}},
    }
    reports = [
        {report_path: {"fnMap": function_map, "f": {"0": 0, "1": 0}}},
        {report_path: {"fnMap": function_map, "f": {"0": 1, "1": 1}}},
    ]

    merged = coverage_gate.merge_coverage_reports(reports, "istanbul")
    checked, missing = coverage_gate.check_coverage(
        merged,
        {"frontend/src/api/proyectos.js": {20, 29}},
        "frontend/src",
        "istanbul",
    )

    assert checked == [
        ("frontend/src/api/proyectos.js", "analyzeFormulation", 19),
        ("frontend/src/api/proyectos.js", "importFormulation", 28),
    ]
    assert missing == []


def test_coverage_reports_merge_windows_paths_without_double_counting_functions():
    report_path_backslashes = r"C:\repo\frontend\src\api\proyectos.js"
    report_path_slashes = "C:/repo/frontend/src/api/proyectos.js"
    function_map = {
        "0": {"name": "analyzeFormulation", "loc": {"start": {"line": 19}, "end": {"line": 23}}},
    }
    reports = [
        {report_path_backslashes: {"fnMap": function_map, "f": {"0": 0}}},
        {report_path_slashes: {"fnMap": function_map, "f": {"0": 1}}},
    ]

    merged = coverage_gate.merge_coverage_reports(reports, "istanbul")

    assert len(merged) == 1
    assert next(iter(merged.values()))["f"] == {"0": 1}


def test_main_combines_multiple_python_coverage_reports(tmp_path, monkeypatch, capsys):
    source_path = tmp_path / "backend" / "app" / "users.py"
    source_path.parent.mkdir(parents=True)
    source_path.write_text("def list_users():\n    return []\n", encoding="utf-8")
    first_report = tmp_path / "first.json"
    second_report = tmp_path / "second.json"
    first_report.write_text(
        '{"files":{"app/users.py":{"executed_lines":[2]}}}',
        encoding="utf-8",
    )
    second_report.write_text(
        '{"files":{"app/users.py":{"executed_lines":[]}}}',
        encoding="utf-8",
    )
    monkeypatch.setattr(coverage_gate, "REPOSITORY_ROOT", tmp_path)

    result = coverage_gate.main([
        "--all-functions",
        "--coverage", str(first_report),
        "--coverage", str(second_report),
        "--format", "python",
        "--source-root", "backend/app",
    ])

    assert result == 0
    assert "Cobertura global de funciones: 1/1 ejecutadas." in capsys.readouterr().out


def test_global_cli_describes_uncovered_functions_correctly(tmp_path, monkeypatch, capsys):
    source_path = tmp_path / "backend" / "app" / "users.py"
    source_path.parent.mkdir(parents=True)
    source_path.write_text("def list_users():\n    return []\n", encoding="utf-8")
    report_path = tmp_path / "coverage.json"
    report_path.write_text(
        json.dumps({"files": {"app/users.py": {"executed_lines": []}}}),
        encoding="utf-8",
    )
    monkeypatch.setattr(coverage_gate, "REPOSITORY_ROOT", tmp_path)

    result = coverage_gate.main([
        "--all-functions",
        "--coverage",
        str(report_path),
        "--format",
        "python",
        "--source-root",
        "backend/app",
    ])

    captured = capsys.readouterr()
    assert result == 1
    assert "Cobertura global de funciones: 0/1 ejecutadas." in captured.out
    assert "Funciones sin cobertura global:" in captured.err
