import { createSseParser, reconnectDelayMs } from './notifications-stream.helper';

const frame = (event: object): string => `data: ${JSON.stringify(event)}\n\n`;

describe('createSseParser', () => {
  it('emite un evento completo', () => {
    const parse = createSseParser();
    expect(parse(frame({ type: 'ready' }))).toEqual([{ type: 'ready' }]);
  });

  it('espera al resto cuando un evento llega partido en dos lecturas', () => {
    const parse = createSseParser();
    const text = frame({ type: 'notifications.changed', unreadCount: 4 });

    expect(parse(text.slice(0, 15))).toEqual([]);
    expect(parse(text.slice(15))).toEqual([{ type: 'notifications.changed', unreadCount: 4 }]);
  });

  it('emite todos los eventos que llegan juntos en una sola lectura', () => {
    const parse = createSseParser();
    const events = parse(frame({ type: 'ready' }) + frame({ type: 'ping' }) + 'data: {"type":"notif');

    expect(events).toEqual([{ type: 'ready' }, { type: 'ping' }]);
  });

  it('acepta finales de línea CRLF y campos extra del protocolo', () => {
    const parse = createSseParser();
    const events = parse('id: 7\r\nevent: message\r\ndata: {"type":"ping"}\r\n\r\n');

    expect(events).toEqual([{ type: 'ping' }]);
  });

  it('ignora comentarios, bloques que no son JSON y JSON sin `type`', () => {
    const parse = createSseParser();
    const events = parse(': keep-alive\n\ndata: no-es-json\n\ndata: {"foo":1}\n\n' + frame({ type: 'ping' }));

    expect(events).toEqual([{ type: 'ping' }]);
  });
});

describe('reconnectDelayMs', () => {
  const noJitter = () => 0;

  it('crece con cada intento hasta un tope de 30 s', () => {
    const delays = [1, 2, 3, 4, 5, 6, 7, 50].map((attempt) => reconnectDelayMs(attempt, noJitter));

    expect(delays).toEqual([1_000, 2_000, 5_000, 10_000, 20_000, 30_000, 30_000, 30_000]);
  });

  it('trata un intento inválido (0 o negativo) como el primero', () => {
    expect(reconnectDelayMs(0, noJitter)).toBe(1_000);
    expect(reconnectDelayMs(-3, noJitter)).toBe(1_000);
  });

  it('suma como máximo un 30 % de azar', () => {
    expect(reconnectDelayMs(1, () => 1)).toBe(1_300);
    expect(reconnectDelayMs(6, () => 0.5)).toBe(34_500);
  });
});
