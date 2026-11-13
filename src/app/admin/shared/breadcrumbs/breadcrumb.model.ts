/** Un tramo del breadcrumb de una ruta admin - sin `link`, es el tramo actual (no clickeable).
 *  Se declara por ruta en `admin.routes.ts` (`data.breadcrumbs`); "Dashboard" como raíz es
 *  siempre implícito, no hace falta repetirlo. */
export interface Breadcrumb {
  readonly label: string;
  readonly link?: string;
}
