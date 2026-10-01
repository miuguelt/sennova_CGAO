import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useAsyncSave } from '../hooks/useAsyncSave';
import useClickOutside from '../hooks/useClickOutside';

describe('useAsyncSave', () => {
  afterEach(cleanup);

  it('devuelve el resultado y notifica éxito después del guardado', async () => {
    const handler = vi.fn().mockResolvedValue({ id: 'registro-1' });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAsyncSave(handler, { onSuccess }));
    let response;

    await act(async () => {
      response = await result.current.save('dato');
    });

    expect(handler).toHaveBeenCalledWith('dato');
    expect(onSuccess).toHaveBeenCalledWith({ id: 'registro-1' });
    expect(response).toEqual({ success: true, result: { id: 'registro-1' } });
    expect(result.current.saving).toBe(false);
    expect(result.current.error).toBe('');
  });

  it.each([
    [new Error('No fue posible guardar'), 'No fue posible guardar'],
    [{ detail: 'Validación rechazada' }, 'Validación rechazada'],
    [{ detail: { code: 'fallo' } }, 'Error al guardar. Intenta nuevamente.'],
    [{}, 'Error al guardar. Intenta nuevamente.'],
  ])('expone errores útiles y siempre termina el estado de guardado', async (failure, message) => {
    const handler = vi.fn().mockRejectedValue(failure);
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncSave(handler, { onError }));
    let response;

    await act(async () => {
      response = await result.current.save();
    });

    expect(response).toEqual({ success: false, error: message });
    expect(result.current.error).toBe(message);
    expect(result.current.saving).toBe(false);
    expect(onError).toHaveBeenCalledWith(message, failure);
  });
});

vi.mock('../api/mensajes', () => ({
  MensajesAPI: {
    connectStream: vi.fn(),
    notificarTyping: vi.fn(),
    subirAdjunto: vi.fn(),
    eliminarAdjunto: vi.fn(),
  },
}));

import { MensajesAPI } from '../api/mensajes';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import { useTypingPulse } from '../hooks/useTypingPulse';
import { useMessageAttachments } from '../hooks/useMessageAttachments';
import { DATA_REFRESH_EVENT, subscribeToDataRefresh } from '../utils/dataRefresh';

describe('hooks de mensajería en estados alternos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('reintenta el canal SSE después de un fallo y limpia el temporizador al desmontar', async () => {
    let reportarFallo;
    let reportarConexionLista;
    const cerrar = vi.fn();
    MensajesAPI.connectStream.mockImplementation((_onEvent, onError, onOpen) => {
      reportarFallo = onError;
      reportarConexionLista = onOpen;
      return { close: cerrar };
    });
    const { result, unmount } = renderHook(() => useRealtimeChat({ currentUser: { id: 'u1' } }));

    expect(MensajesAPI.connectStream).toHaveBeenCalledTimes(1);
    act(() => reportarFallo(new Error('conexión caída')));
    expect(result.current.isConnected).toBe(false);
    expect(cerrar).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(MensajesAPI.connectStream).toHaveBeenCalledTimes(2);
    act(() => reportarConexionLista());
    expect(result.current.isConnected).toBe(true);

    unmount();
    expect(cerrar).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('distribuye todos los eventos SSE al callback correspondiente', () => {
    let entregarEvento;
    const handlers = {
      onNewMessage: vi.fn(),
      onMessagesDelivered: vi.fn(),
      onMessagesRead: vi.fn(),
      onTypingStatus: vi.fn(),
      onMessageDeleted: vi.fn(),
    };
    MensajesAPI.connectStream.mockImplementation((onEvent) => {
      entregarEvento = onEvent;
      return { close: vi.fn() };
    });
    const nuevoMensaje = vi.fn();
    window.addEventListener('sennova:mensaje_nuevo', nuevoMensaje);
    const leidos = vi.fn();
    window.addEventListener('sennova:mensajes_leidos', leidos);
    renderHook(() => useRealtimeChat({ currentUser: { id: 'u1' }, ...handlers }));
    const data = { id: 'm1' };

    act(() => {
      entregarEvento('connected', {});
      entregarEvento('mensaje_nuevo', data);
      entregarEvento('mensajes_entregados', data);
      entregarEvento('mensajes_leidos', data);
      entregarEvento('typing_status', data);
      entregarEvento('mensaje_eliminado', data);
      entregarEvento('evento_desconocido', data);
    });

    expect(handlers.onNewMessage).toHaveBeenCalledWith(data);
    expect(handlers.onMessagesDelivered).toHaveBeenCalledWith(data);
    expect(handlers.onMessagesRead).toHaveBeenCalledWith(data);
    expect(handlers.onTypingStatus).toHaveBeenCalledWith(data);
    expect(handlers.onMessageDeleted).toHaveBeenCalledWith(data);
    expect(nuevoMensaje).toHaveBeenCalledWith(expect.objectContaining({ detail: data }));
    expect(leidos).toHaveBeenCalledWith(expect.objectContaining({ detail: data }));
    window.removeEventListener('sennova:mensaje_nuevo', nuevoMensaje);
    window.removeEventListener('sennova:mensajes_leidos', leidos);
  });

  it('apaga el pulso después del silencio y maneja errores informativos', async () => {
    MensajesAPI.notificarTyping.mockResolvedValue(undefined);
    const { result, rerender, unmount } = renderHook(
      ({ destinatarioId }) => useTypingPulse(destinatarioId, { ventanaSilencioMs: 300 }),
      { initialProps: { destinatarioId: 'u2' } },
    );

    act(() => result.current.registrarPulsacion());
    act(() => result.current.registrarPulsacion());
    expect(MensajesAPI.notificarTyping).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(MensajesAPI.notificarTyping).toHaveBeenLastCalledWith('u2', false);

    MensajesAPI.notificarTyping.mockImplementationOnce(() => {
      throw new Error('servicio temporalmente fuera de línea');
    });
    act(() => result.current.registrarPulsacion());
    expect(() => result.current.detenerPulso()).not.toThrow();
    expect(MensajesAPI.notificarTyping).toHaveBeenLastCalledWith('u2', false);

    rerender({ destinatarioId: 'u3' });
    act(() => result.current.registrarPulsacion());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('absorbe el rechazo asíncrono del aviso de escritura', async () => {
    MensajesAPI.notificarTyping.mockRejectedValueOnce(new Error('evento no disponible'));
    const { result } = renderHook(() => useTypingPulse('u2'));

    act(() => result.current.registrarPulsacion());
    await act(async () => { await Promise.resolve(); });
    expect(MensajesAPI.notificarTyping).toHaveBeenCalledWith('u2', true);
    expect(() => result.current.detenerPulso()).not.toThrow();
  });

  it('invoca useClickOutside solo para clics externos y elimina el listener al desmontar', () => {
    const callback = vi.fn();
    const ClickOutsideFixture = () => {
      const ref = React.useRef(null);
      useClickOutside(ref, callback);
      return <div ref={ref}><button>Interior</button></div>;
    };
    const { unmount } = render(<ClickOutsideFixture />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Interior' }));
    expect(callback).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.body);
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();
    fireEvent.mouseDown(document.body);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('abre el selector de adjuntos y reinicia el input después de subir archivos', async () => {
    MensajesAPI.subirAdjunto.mockResolvedValue({ id: 'a1', nombre_archivo: 'evidencia.pdf' });
    const { result } = renderHook(() => useMessageAttachments());
    const click = vi.fn();
    const input = { click, value: 'seleccionado' };
    result.current.inputRef.current = input;

    act(() => result.current.abrirSelector());
    expect(click).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.agregarArchivos([new File(['acta'], 'evidencia.pdf')]);
    });
    expect(result.current.ids).toEqual(['a1']);
    expect(input.value).toBe('');
  });

  it('reporta cargas fallidas, permite quitar y limpiar adjuntos pendientes', async () => {
    const onNotify = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    MensajesAPI.subirAdjunto
      .mockResolvedValueOnce({ id: 'a-ok', nombre_archivo: 'acta.pdf' })
      .mockRejectedValueOnce(new Error('Servidor sin conexión'))
      .mockResolvedValueOnce({ id: 'a-later', nombre_archivo: 'anexo.pdf' });
    MensajesAPI.eliminarAdjunto.mockRejectedValue(new Error('No se pudo limpiar en el servidor'));
    const { result } = renderHook(() => useMessageAttachments({ onNotify }));
    const input = { value: 'seleccionado' };
    result.current.inputRef.current = input;

    await act(async () => { await result.current.agregarArchivos([
      new File(['acta'], 'acta.pdf'),
      new File(['anexo'], 'anexo.pdf'),
    ]); });
    expect(result.current.ids).toEqual(['a-ok']);
    expect(result.current.subiendo).toBe(false);
    expect(input.value).toBe('');
    expect(onNotify).toHaveBeenCalledWith('Servidor sin conexión', 'error');

    await act(async () => { await result.current.quitar({ id: 'a-ok' }); });
    expect(result.current.ids).toEqual([]);
    expect(MensajesAPI.eliminarAdjunto).toHaveBeenCalledWith('a-ok');
    expect(warn).toHaveBeenCalledWith('No se pudo descartar el adjunto en el servidor:', 'No se pudo limpiar en el servidor');

    await act(async () => { await result.current.agregarArchivos([new File(['anexo'], 'anexo.pdf')]); });
    expect(result.current.ids).toEqual(['a-later']);
    act(() => result.current.limpiar());
    expect(result.current.adjuntos).toEqual([]);
    result.current.inputRef.current = null;
    expect(() => act(() => result.current.abrirSelector())).not.toThrow();

    await act(async () => { await result.current.agregarArchivos([]); });
    expect(MensajesAPI.subirAdjunto).toHaveBeenCalledTimes(3);
  });

  it('devuelve una función de limpieza inocua si no existe window', () => {
    vi.stubGlobal('window', undefined);
    const limpiar = subscribeToDataRefresh(vi.fn());
    expect(() => limpiar()).not.toThrow();
    vi.unstubAllGlobals();
  });

  it('notifica al suscriptor y retira el listener al limpiar', () => {
    const listener = vi.fn();
    const limpiar = subscribeToDataRefresh(listener);
    const detail = { endpoint: '/productos', method: 'POST' };

    window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT, { detail }));
    expect(listener).toHaveBeenCalledWith(detail);
    limpiar();
    window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT, { detail }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
