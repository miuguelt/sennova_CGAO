import { fetchAPI } from './config';

export const BitacoraAPI = {
    listarPorProyecto: (proyectoId) => fetchAPI(`/bitacora/proyecto/${proyectoId}`),
    crear: (data) => fetchAPI('/bitacora/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    update: (id, data) => fetchAPI(`/bitacora/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    delete: (id) => fetchAPI(`/bitacora/${id}`, {
        method: 'DELETE'
    }),
    sign: (id, data = {}) => fetchAPI(`/bitacora/${id}/sign`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    uploadAdjunto: (id, formData) => fetchAPI(`/bitacora/${id}/adjuntos`, {
        method: 'POST',
        body: formData,
        headers: {
            // fetchAPI manejará el Content-Type si es FormData
            'Accept': 'application/json'
        }
    })
};
