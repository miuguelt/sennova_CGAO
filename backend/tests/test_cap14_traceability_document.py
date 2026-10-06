from pathlib import Path
from zipfile import ZipFile


def test_cap14_objective_traceability_and_user_validation_protocol_are_packaged():
    repository_root = Path(__file__).resolve().parents[2]
    reference_dir = (
        repository_root
        / "docs"
        / "generados-referencias-sennova-2026-10-04"
        / "CAP-14-2026-sistema-informacion"
    )
    document_path = reference_dir / "trazabilidad_cap14_objetivos.md"
    package_readme_path = reference_dir / "README.md"
    reference_map_path = (
        repository_root / "maintenance" / "project-documentation" / "reference-map-cap14.md"
    )
    package_path = reference_dir.parent / "CAP-14-2026-sistema-informacion.zip"

    document = document_path.read_text(encoding="utf-8")
    package_readme = package_readme_path.read_text(encoding="utf-8")
    reference_map = reference_map_path.read_text(encoding="utf-8")
    expected_objectives = (
        "Identificar necesidades y requisitos",
        "Diseñar una herramienta Excel para indicadores de clasificación de Minciencias",
        "Diseñar la estructura funcional y la base de datos",
        "Desarrollar módulos para registrar y hacer seguimiento y control de proyectos, cronogramas y productos",
        "Implementar consultas y generación de reportes",
        "Validar el sistema mediante pruebas con usuarios",
    )

    assert all(objective in document for objective in expected_objectives)
    assert "pruebas automatizadas no equivalen a validación con usuarios" in document
    assert "Protocolo propuesto para validar con usuarios" in document
    assert "Criterios de aceptación pendientes de aprobación" in document
    assert "trazabilidad_cap14_objetivos.md" in package_readme
    assert "trazabilidad_cap14_objetivos.md" in reference_map

    with ZipFile(package_path) as package:
        packaged_document = (
            "CAP-14-2026-sistema-informacion/trazabilidad_cap14_objetivos.md"
        )
        assert packaged_document in package.namelist()
        assert package.read(packaged_document) == document_path.read_bytes()
