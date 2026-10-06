import React from 'react';
import { createPortal } from 'react-dom';
import Modal from '../ui/Modal';

// El portal evita que el contenedor del formulario limite la ventana emergente.
export default function ProjectDocumentationModal(props) {
  return createPortal(<Modal {...props} />, document.body);
}
