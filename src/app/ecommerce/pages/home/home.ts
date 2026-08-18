import { Component } from '@angular/core';

import { Hero } from './components/hero/hero';
import { Divider } from './components/divider/divider';
import { Categories } from './components/categories/categories';
import { Features } from './components/features/features';
import { FeaturedProducts } from './components/featured-products/featured-products';
import { DecantsBanner } from './components/decants-banner/decants-banner';
import { Finder } from './components/finder/finder';

@Component({
  selector: 'app-home',
  imports: [Hero, Divider, Categories, Features, FeaturedProducts, DecantsBanner, Finder],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export default class Home {}
