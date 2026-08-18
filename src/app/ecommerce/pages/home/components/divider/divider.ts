import { Component } from '@angular/core';

@Component({
  selector: 'app-divider',
  imports: [],
  templateUrl: './divider.html',
  styleUrl: './divider.css',
})
export class Divider {
  protected readonly brands = [
    'Dior',
    'Chanel',
    'Yves Saint Laurent',
    'Tom Ford',
    'Creed',
    'Lancôme',
    'Versace',
    'Giorgio Armani',
    'Paco Rabanne',
    'Carolina Herrera',
    'Thierry Mugler',
    'Dolce & Gabbana',
    'Jean Paul Gaultier',
    'Lattafa',
  ];
}
