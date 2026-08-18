import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Product {
  readonly id: string;
  readonly brand: string;
  readonly name: string;
  readonly subtitle: string;
  readonly notes: readonly string[];
  readonly price: string;
  readonly oldPrice?: string;
  readonly badge?: string;
  readonly accentVar: string;
}

@Component({
  selector: 'app-featured-products',
  imports: [RouterLink],
  templateUrl: './featured-products.html',
  styleUrl: './featured-products.css',
})
export class FeaturedProducts {
  protected readonly products: readonly Product[] = [
    {
      id: 'sauvage-elixir',
      brand: 'Dior',
      name: 'Sauvage Elixir',
      subtitle: 'Extrait de Parfum · Amaderado',
      notes: ['Bergamota', 'Ambroxan', 'Madera'],
      price: '$8.500',
      badge: 'Top ventas',
      accentVar: 'var(--color-aurora-violet)',
    },
    {
      id: 'y-eau-de-parfum',
      brand: 'Yves Saint Laurent',
      name: 'Y Eau de Parfum',
      subtitle: 'Pour Homme · Aromático Fresco',
      notes: ['Manzana', 'Salvia', 'Cedro'],
      price: '$6.200',
      badge: 'Nuevo',
      accentVar: 'var(--color-aurora-cyan)',
    },
    {
      id: 'la-vie-est-belle',
      brand: 'Lancôme',
      name: 'La Vie Est Belle',
      subtitle: 'EDP · Floral Gourmand',
      notes: ['Iris', 'Pralinée', 'Vainilla'],
      price: '$7.900',
      badge: 'Exclusivo',
      accentVar: 'var(--color-aurora-teal)',
    },
    {
      id: 'n5-leau',
      brand: 'Chanel',
      name: "N°5 L'Eau",
      subtitle: 'EDP · Floral Aldehídico',
      notes: ['Aldeídos', 'Rosa', 'Sándalo'],
      price: '$11.500',
      oldPrice: '$13.200',
      badge: 'Últimas unidades',
      accentVar: 'var(--color-aurora-emerald)',
    },
  ];
}
