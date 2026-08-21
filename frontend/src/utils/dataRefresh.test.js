import { describe, expect, it, vi } from 'vitest';
import { DATA_REFRESH_EVENT, emitDataRefresh } from './dataRefresh';

describe('data refresh events', () => {
  it('notifies the application after a confirmed mutation', () => {
    const listener = vi.fn();
    window.addEventListener(DATA_REFRESH_EVENT, listener);

    emitDataRefresh({ endpoint: '/proyectos/12', method: 'PUT' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toMatchObject({
      endpoint: '/proyectos/12',
      method: 'PUT',
    });

    window.removeEventListener(DATA_REFRESH_EVENT, listener);
  });
});
