import ast
import importlib
from contextlib import redirect_stdout
from io import StringIO
import os
from pathlib import Path
import runpy
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from qa_credentials import get_qa_credentials, get_qa_seed_password


class QaCredentialsTests(unittest.TestCase):
    def test_qa_scripts_do_not_embed_password_string_literals(self):
        project_root = Path(__file__).resolve().parents[2]
        qa_scripts = (
            project_root / "scripts" / "test_features.py",
            project_root / "scripts" / "test_crud.py",
            project_root / "scripts" / "test_completo_crud.py",
            project_root / "scripts" / "test_advanced.py",
            project_root / "scripts" / "test_roles_formularios.py",
            project_root / "scripts" / "seed_data.py",
            project_root / "scripts" / "seed_remote.py",
            project_root / "backend" / "seed_dev_users.py",
        )
        findings = []
        for script in qa_scripts:
            tree = ast.parse(script.read_text(encoding="utf-8"), filename=str(script))
            for node in ast.walk(tree):
                if not isinstance(node, ast.Dict):
                    continue
                for key, value in zip(node.keys, node.values):
                    if (
                        isinstance(key, ast.Constant)
                        and key.value == "password"
                        and isinstance(value, ast.Constant)
                        and isinstance(value.value, str)
                        and value.value
                    ):
                        findings.append(f"{script.relative_to(project_root)}:{node.lineno}")
        self.assertEqual(findings, [])

    def test_prefers_project_specific_login_credentials(self):
        with patch.dict(os.environ, {
            "SENNOVA_QA_EMAIL": "qa@example.invalid",
            "SENNOVA_QA_PASSWORD": "qa-secret",
            "DEV_SEED_EMAIL": "fallback@example.invalid",
            "DEV_SEED_PASSWORD": "fallback-secret",
        }, clear=True):
            self.assertEqual(get_qa_credentials(), {
                "email": "qa@example.invalid", "password": "qa-secret"
            })

    def test_accepts_seed_credentials_as_login_fallback(self):
        with patch.dict(os.environ, {
            "DEV_SEED_EMAIL": "seed@example.invalid",
            "DEV_SEED_PASSWORD": "seed-secret",
        }, clear=True):
            self.assertEqual(get_qa_credentials(), {
                "email": "seed@example.invalid", "password": "seed-secret"
            })

    def test_rejects_missing_login_credentials(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "SENNOVA_QA_EMAIL"):
                get_qa_credentials()

    def test_http_utilities_fail_before_sending_requests_without_credentials(self):
        utilities = (
            ("test_crud", "test_all"),
            ("test_completo_crud", "login"),
            ("test_advanced", "test_advanced"),
            ("seed_data", "login"),
        )
        for module_name, function_name in utilities:
            module = importlib.import_module(module_name)
            with self.subTest(module=module_name), patch.dict(os.environ, {}, clear=True):
                with patch.object(module.requests, "post") as post:
                    with self.assertRaisesRegex(RuntimeError, "SENNOVA_QA_EMAIL"):
                        getattr(module, function_name)()
                    post.assert_not_called()

    def test_data_creators_validate_seed_password_before_http_calls(self):
        utilities = (
            ("seed_data", "seed_data"),
            ("test_completo_crud", "test_all_tables"),
        )
        for module_name, function_name in utilities:
            module = importlib.import_module(module_name)
            environment = {
                "SENNOVA_QA_EMAIL": "qa@example.invalid",
                "DEV_SEED_PASSWORD": "login-secret",
            }
            with self.subTest(module=module_name), patch.dict(os.environ, environment, clear=True):
                with patch.object(module.requests, "post") as post:
                    with self.assertRaisesRegex(RuntimeError, "SENNOVA_QA_SEED_PASSWORD"):
                        getattr(module, function_name)()
                    post.assert_not_called()

    def test_remote_seed_does_not_send_request_without_credentials(self):
        module = importlib.import_module("seed_remote")
        with patch.dict(os.environ, {}, clear=True), patch.object(module.requests, "post") as post:
            with redirect_stdout(StringIO()):
                self.assertIsNone(module.login())
            post.assert_not_called()

    def test_seed_password_requires_explicit_environment_value(self):
        with patch.dict(os.environ, {"SENNOVA_QA_SEED_PASSWORD": "seed-secret"}, clear=True):
            self.assertEqual(get_qa_seed_password(), "seed-secret")
        with patch.dict(os.environ, {"SENNOVA_QA_PASSWORD": "login-secret"}, clear=True):
            self.assertEqual(get_qa_seed_password(), "login-secret")
        with patch.dict(os.environ, {"DEV_TEST_PASSWORD": "role-secret"}, clear=True):
            self.assertEqual(get_qa_seed_password(), "role-secret")
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "SENNOVA_QA_SEED_PASSWORD"):
                get_qa_seed_password()

    def test_dev_seed_stops_before_loading_database_without_password(self):
        seed_path = Path(__file__).resolve().parents[2] / "backend" / "seed_dev_users.py"
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "DEV_SEED_PASSWORD"):
                runpy.run_path(str(seed_path))


if __name__ == "__main__":
    unittest.main()
