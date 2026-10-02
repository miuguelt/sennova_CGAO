#!/usr/bin/env python3
"""Agrega al .env solo las variables obligatorias para Docker Compose."""

import sys
from pathlib import Path

REQUIRED_VARS = ("DB_PASSWORD", "JWT_SECRET", "INITIAL_ADMIN_PASSWORD")


def check_color(text, color):
    colors = {
        "green": "\033[92m",
        "red": "\033[91m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "cyan": "\033[96m",
        "reset": "\033[0m",
    }
    return f"{colors.get(color, '')}{text}{colors['reset']}"


def setup_env(root_dir=None, input_fn=None):
    print(check_color("\nConfiguración mínima de .env para Docker Compose", "blue"))
    project_dir = Path(root_dir) if root_dir is not None else Path(__file__).resolve().parent.parent
    env_file = project_dir / ".env"
    original = env_file.read_text(encoding="utf-8") if env_file.exists() else ""

    current_vars = {}
    for line in original.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key, value = stripped.split("=", 1)
            current_vars[key.strip()] = value.strip()

    unconfigured = [key for key in REQUIRED_VARS if not current_vars.get(key)]
    vars_to_add = [key for key in unconfigured if key not in current_vars]
    if not unconfigured:
        print(check_color("Las tres variables obligatorias ya tienen valores.", "green"))
        return True

    print("Variables obligatorias sin valor:")
    for key in unconfigured:
        print(f"   - {key}")

    if vars_to_add:
        ask = input if input_fn is None else input_fn
        response = ask("¿Deseas agregar al .env las variables que faltan? (s/N): ").strip().lower()
        if response not in ("s", "si", "sí", "yes", "y"):
            print(check_color("No se modificó el archivo .env.", "yellow"))
            return False

        lines = [original.rstrip("\r\n")] if original else []
        if lines:
            lines.extend(["", "# Variables obligatorias para Docker Compose"])
        else:
            lines.append("# Variables obligatorias para Docker Compose")
        lines.extend(f"{key}=" for key in vars_to_add)
        env_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(check_color(f"Se agregaron {len(vars_to_add)} variables vacías a {env_file}.", "green"))

    print("Asigne los valores en .env antes de desplegar; el script no crea contraseñas predeterminadas.")
    return True


if __name__ == "__main__":
    sys.exit(0 if setup_env() else 1)
