# Validación y publicación

La definición vigente de pruebas y cobertura es el workflow [CI de GitHub](.github/workflows/ci.yml). Los conteos de pruebas de esta guía eran históricos y no describen la suite actual.

Para ejecutar la validación local:

```powershell
python -m pytest backend/tests
```

```powershell
Set-Location frontend
npm test
npm run build
```

La inicialización de la API elimina el esquema heredado de bitácoras y formatos de etapa productiva. La migración conserva los datos de proyectos, los documentos y la auditoría general, según el [alcance documental](docs/architecture/alcance-documental.md).
