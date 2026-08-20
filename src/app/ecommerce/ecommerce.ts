import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';

@Component({
  selector: 'app-ecommerce',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './ecommerce.html',
  styleUrl: './ecommerce.css',
})
export class Ecommerce {}
