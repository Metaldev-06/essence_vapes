/**
 * Mismo listado que el backend (`vape-restricted-phrases.helper.ts`) - acá es solo para dar
 * feedback inmediato en el form admin; la validación que realmente bloquea el guardado corre
 * en el servidor, que nunca confía en este chequeo del cliente.
 */
const RESTRICTED_PHRASES = [
  'seguro',
  'saludable',
  'sin riesgo',
  'inofensivo',
  'ayuda a dejar de fumar',
  'recomendado por médicos',
  'libre de riesgos',
];

export function findRestrictedVapePhrase(...texts: Array<string | undefined | null>): string | null {
  const haystack = texts
    .filter((text): text is string => typeof text === 'string')
    .join(' ')
    .toLowerCase();

  return RESTRICTED_PHRASES.find((phrase) => haystack.includes(phrase)) ?? null;
}
