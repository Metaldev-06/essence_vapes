/**
 * Variación porcentual de un KPI contra el período anterior - función pura, sin Angular, para
 * poder testearla directo (ver tarea, punto 12: "probá escenarios con períodos sin ventas").
 * `null` = sin comparación posible (período anterior en cero y el actual no) - mostrar eso como
 * "Nuevo"/sin dato es más honesto que un porcentaje inventado (técnicamente sería +Infinity%).
 */
export const percentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
};
