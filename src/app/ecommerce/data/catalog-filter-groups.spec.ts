import {
  brandGroupKey,
  capacitySuffixFor,
  capacityUnitForCategory,
  showsGenderFilter,
} from './catalog-filter-groups';

describe('showsGenderFilter', () => {
  it('is true only for perfumes and decants', () => {
    expect(showsGenderFilter('perfumes')).toBe(true);
    expect(showsGenderFilter('decants')).toBe(true);
    expect(showsGenderFilter('vapes')).toBe(false);
    expect(showsGenderFilter('esencias')).toBe(false);
    expect(showsGenderFilter('todos')).toBe(false);
  });
});

describe('capacityUnitForCategory', () => {
  it('is ml for perfumes, decants and esencias', () => {
    expect(capacityUnitForCategory('perfumes')).toBe('ml');
    expect(capacityUnitForCategory('decants')).toBe('ml');
    expect(capacityUnitForCategory('esencias')).toBe('ml');
  });

  it('is puffs for vapes', () => {
    expect(capacityUnitForCategory('vapes')).toBe('puffs');
  });

  it('is null for "todos" - no single unit to show', () => {
    expect(capacityUnitForCategory('todos')).toBeNull();
  });
});

describe('capacitySuffixFor', () => {
  it('renders ml with no leading space and puffs with one', () => {
    expect(capacitySuffixFor('ml')).toBe('ml');
    expect(capacitySuffixFor('puffs')).toBe(' puffs');
  });
});

describe('brandGroupKey', () => {
  it('groups perfumes and decants under the same key', () => {
    expect(brandGroupKey('perfumes')).toBe(brandGroupKey('decants'));
  });

  it('keeps vapes, esencias and "todos" as distinct keys', () => {
    const keys = new Set([
      brandGroupKey('perfumes'),
      brandGroupKey('vapes'),
      brandGroupKey('esencias'),
      brandGroupKey('todos'),
    ]);
    expect(keys.size).toBe(4);
  });
});
