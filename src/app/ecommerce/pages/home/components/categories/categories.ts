import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Category {
  readonly id: string;
  readonly name: string;
  readonly count: string;
  readonly icon: string;
  readonly variantClass: string;
}

@Component({
  selector: 'app-categories',
  imports: [RouterLink],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  protected readonly categories: readonly Category[] = [
    {
      id: 'perfumes',
      name: 'Perfumes',
      count: 'Fragancias originales',
      icon: '🌸',
      variantClass: 'category-card--main category-card--violet',
    },
    {
      id: 'decants',
      name: 'Decants',
      count: 'Desde 2ml',
      icon: '💧',
      variantClass: 'category-card--cyan',
    },
    {
      id: 'vapes',
      name: 'Vapes',
      count: 'Modelos disponibles',
      icon: '💨',
      variantClass: 'category-card--emerald',
    },
    {
      id: 'esencias',
      name: 'Esencias',
      count: 'Esencias seleccionadas',
      icon: '✨',
      variantClass: 'category-card--teal',
    },
  ];
}
