# Vista inicial protegida del Grupo Investigadores CGAO

Este contrato desarrolla la regla 9.1 de `C:\Users\Miguel\Documents\Aplicaciones\.antigravityrules` y acompaña la captura `vista-inicial-grupo-cgao.png`.

## Comportamiento de entrada

- Al abrir la vista institucional del grupo, la aplicación muestra el módulo `grupos`, el grupo **Investigadores CGAO** y la pestaña `stats` (**Estadísticas e Indicadores**) seleccionada.
- El primer contenido del grupo es el tablero de impacto científico y formativo, con las secciones, tarjetas, indicadores y gráficas visibles en la captura.
- Los datos se consultan en tiempo real. La captura fija la presentación y el orden, no las cifras.

## Protección visual

- Conserva la composición, jerarquía, espaciado, etiquetas, orden de pestañas, elementos visibles y pestaña inicial de la referencia.
- No rediseñes, sustituyas, ocultes ni reorganices esta vista como parte de otro cambio. Solo una solicitud explícita posterior del usuario puede autorizarlo.
- Respeta los permisos y las vistas personales definidos para cada rol; este contrato protege la vista institucional del grupo y no concede acceso a funciones restringidas.

## Comprobación

La prueba `opens on the Grupo CGAO impact dashboard as the initial tab` debe confirmar que `Estadísticas e Indicadores` inicia seleccionada, que el tablero de impacto está visible y que el panel GrupLAC/CvLAC no reemplaza la vista inicial.
