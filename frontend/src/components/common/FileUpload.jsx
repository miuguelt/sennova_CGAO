import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, X } from 'lucide-react';

const FileUpload = ({
  onUpload,
  accept  = '.pdf',
  maxSize = 10,
  label   = 'Subir archivo',
  onNotify,
}) => {
  const [preview,   setPreview]   = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef(null);

  const processFile = (file) => {
    if (!file) return;
    if (file.size > maxSize * 1024 * 1024) {
      const msg = `Archivo demasiado grande. Máximo ${maxSize} MB`;
      onNotify ? onNotify(msg, 'error') : alert(msg);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = {
        name:       file.name,
        type:       file.type,
        size:       file.size,
        data:       reader.result,
        uploadedAt: new Date().toISOString(),
      };
      setPreview(result);
      onUpload(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{label}</p>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label} — haz clic o arrastra un archivo (máximo ${maxSize} MB)`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={[
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
          dragging
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50',
        ].join(' ')}
      >
        <Upload size={28} className={`mx-auto mb-2 ${dragging ? 'text-emerald-500' : 'text-slate-400'}`} aria-hidden="true" />
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-emerald-700">Haz clic</span> o arrastra el archivo aquí
        </p>
        <p className="text-xs text-slate-400 mt-1">Máximo {maxSize} MB · {accept}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => processFile(e.target.files[0])}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Preview */}
      {preview && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
          <FileText size={16} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm text-emerald-800 font-medium truncate flex-1">{preview.name}</span>
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setPreview(null)}
            aria-label="Quitar archivo"
            className="text-emerald-500 hover:text-rose-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
