import { MatPaginatorIntl } from '@angular/material/paginator';

// MatPaginator trae sus etiquetas (incluidas las de accesibilidad para
// lectores de pantalla, como "Next page") en ingles por defecto. Se
// reemplazan aqui en un solo lugar para que Historial y cualquier otra
// tabla paginada que se agregue despues queden en español automaticamente.
export function buildSpanishPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();

  intl.itemsPerPageLabel = 'Elementos por página:';
  intl.nextPageLabel = 'Página siguiente';
  intl.previousPageLabel = 'Página anterior';
  intl.firstPageLabel = 'Primera página';
  intl.lastPageLabel = 'Última página';

  intl.getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) return `0 de ${length}`;
    const start = page * pageSize;
    const end = Math.min(start + pageSize, length);
    return `${start + 1} – ${end} de ${length}`;
  };

  return intl;
}
