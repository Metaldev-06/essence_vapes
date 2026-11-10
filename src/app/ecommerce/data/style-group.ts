import { FLAVOR_STYLE_OPTIONS } from './flavor-styles';
import type { ProductCategory, ProductStyleOption } from './product.model';
import { SCENT_STYLE_OPTIONS } from './scent-styles';

export type StyleGroup = 'fragrance' | 'flavor' | 'none';

/** Perfumes/decants use the fragrance vocabulary (`ScentStyle`); vapes/esencias use flavors (`FlavorStyle`). */
export function styleGroupForCategory(category: ProductCategory | 'todos' | ''): StyleGroup {
  if (category === 'perfumes' || category === 'decants') return 'fragrance';
  if (category === 'vapes' || category === 'esencias') return 'flavor';
  return 'none';
}

export function styleOptionsForGroup(group: StyleGroup): readonly ProductStyleOption[] {
  switch (group) {
    case 'fragrance':
      return SCENT_STYLE_OPTIONS;
    case 'flavor':
      return FLAVOR_STYLE_OPTIONS;
    case 'none':
      return [];
  }
}
