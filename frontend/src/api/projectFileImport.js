import { fetchAPI } from './config';

function payload({ files, carpeta, tipo }, seleccion) {
  const body = new FormData();
  for (const file of files) body.append('files', file);
  if (carpeta) body.append('carpeta', carpeta);
  if (tipo) body.append('tipo', tipo);
  if (seleccion) body.append('seleccion', JSON.stringify(seleccion));
  return body;
}

export const ProjectFileImportAPI = {
  analyze: (projectId, source) => fetchAPI(`/proyectos/${projectId}/expediente/analizar-archivos`, { method: 'POST', body: payload(source), mutates: false }),
  save: (projectId, source, seleccion) => fetchAPI(`/proyectos/${projectId}/expediente/importar-archivos`, { method: 'POST', body: payload(source, seleccion) }),
};
