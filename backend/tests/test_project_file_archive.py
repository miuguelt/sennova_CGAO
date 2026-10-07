"""Seguridad y conservación de rutas en la carga de expedientes."""

import hashlib
import io
import stat
import struct
import zipfile

import pytest

from app.services.project_file_import import archive


def zipped(entries):
    target = io.BytesIO()
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as package:
        for name, content in entries:
            package.writestr(name, content)
    return target.getvalue()


def test_zip_preserves_hierarchy_empty_folders_and_removes_project_wrapper():
    result = archive.read_uploads([("proyecto.zip", zipped([
        ("Mi proyecto/1ProyectoFomulado/Anexos/", b""),
        ("Mi proyecto/2ActadeInicio/acta.txt", "Ciudad: Vélez".encode()),
    ]))])
    assert result["carpetas"] == ["1ProyectoFomulado", "1ProyectoFomulado/Anexos", "2ActadeInicio"]
    assert result["files"] == [{
        "ruta": "2ActadeInicio/acta.txt", "nombre_archivo": "acta.txt",
        "content": "Ciudad: Vélez".encode(), "content_type": "text/plain",
        "sha256": hashlib.sha256("Ciudad: Vélez".encode()).hexdigest(),
        "tamano": len("Ciudad: Vélez".encode()),
    }]


def test_independent_files_preserve_subfolders_and_destination():
    result = archive.read_uploads([("fotos\\nota.md", b"Texto")], "7Borradoresyvarios")
    assert result["files"][0]["ruta"] == "7Borradoresyvarios/fotos/nota.md"
    assert result["carpetas"] == ["7Borradoresyvarios", "7Borradoresyvarios/fotos"]


@pytest.mark.parametrize("name", ["../a.txt", "/a.txt", "C:/a.txt", "a/../b.txt", "a//b.txt", "a/./b.txt", "a\x00.txt", "a:secret.txt", "a./b.txt", "CON.txt", "a/NUL.txt"])
def test_unsafe_paths_are_rejected_without_writes(name, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    with pytest.raises(ValueError, match="ruta|nombre"):
        archive.read_uploads([(name, b"texto")])
    assert list(tmp_path.iterdir()) == []


def test_folder_and_file_collisions_and_casefold_duplicates_are_rejected():
    for entries in [[("A.txt", b"a"), ("a.txt", b"b")], [("a.txt", b"a"), ("a.txt/b.txt", b"b")]]:
        with pytest.raises(ValueError, match="duplicad|carpeta"):
            archive.read_uploads([("p.zip", zipped(entries))])


def test_zip_rejects_links_encrypted_data_and_corruption():
    link = zipfile.ZipInfo("enlace.txt")
    link.create_system = 3
    link.external_attr = (stat.S_IFLNK | 0o777) << 16
    with pytest.raises(ValueError, match="enlaces"):
        archive.read_uploads([("p.zip", zipped([(link, b"destino")]))])
    data = bytearray(zipped([("a.txt", b"texto")]))
    local = data.index(b"PK\x03\x04")
    central = data.index(b"PK\x01\x02")
    struct.pack_into("<H", data, local + 6, 1)
    struct.pack_into("<H", data, central + 8, 1)
    with pytest.raises(ValueError, match="cifrad"):
        archive.read_uploads([("p.zip", bytes(data))])
    with pytest.raises(ValueError, match="dañado|válido"):
        archive.read_uploads([("p.zip", b"PK corrupto")])


@pytest.mark.parametrize("uploads", [[], [("p.zip", b"a"), ("a.txt", b"b")], [("p.zip", b"a"), ("q.zip", b"b")], [("a.exe", b"MZ" )], [("a.png", b"texto")], [("a.txt", b"a\x00b")], [("a.txt", b"")]])
def test_invalid_uploads_rejected(uploads):
    with pytest.raises(ValueError):
        archive.read_uploads(uploads)


@pytest.mark.parametrize("limit,value,entries", [
    ("MAX_ZIP_SIZE", 2, [("a.txt", b"abcd")]),
    ("MAX_FILE_SIZE", 3, [("a.txt", b"abcd")]),
    ("MAX_TOTAL_SIZE", 3, [("a.txt", b"ab"), ("b.txt", b"cd")]),
    ("MAX_FILES", 1, [("a.txt", b"a"), ("b.txt", b"b")]),
    ("MAX_ENTRIES", 1, [("a/", b""), ("b/", b"")]),
])
def test_archive_limits_are_checked_before_decompression(limit, value, entries, monkeypatch):
    monkeypatch.setattr(archive, limit, value)
    with pytest.raises(ValueError, match="límite|supera"):
        archive.read_uploads([("p.zip", zipped(entries))])


def test_nested_zips_are_rejected_and_unknown_container_kept():
    with pytest.raises(ValueError, match="ZIP"):
        archive.read_uploads([("p.zip", zipped([("otro.zip", zipped([("a.txt", b"a")]))]))])
    result = archive.read_uploads([("p.zip", zipped([("Carpeta/a.txt", b"a")]))])
    assert result["files"][0]["ruta"] == "Carpeta/a.txt"


def test_empty_directories_can_be_uploaded_as_zip():
    assert archive.read_uploads([("p.zip", zipped([("1ProyectoFomulado/", b"")]))]) == {
        "files": [], "carpetas": ["1ProyectoFomulado"]}


def test_json_supports_reimport_of_export_manifest_but_rejects_invalid_json():
    result = archive.read_uploads([("expediente.json", b'{"proyecto_id": "ejemplo"}')])
    assert result["files"][0]["content_type"] == "application/json"
    for content in (b"{corrupto}", b"123", b'"texto"'):
        with pytest.raises(ValueError, match="JSON"):
            archive.read_uploads([("expediente.json", content)])
