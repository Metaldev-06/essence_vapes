import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { CompareTray } from './shared/compare-tray/compare-tray';
import { VerifyEmailBanner } from './shared/verify-email-banner/verify-email-banner';

@Component({
  selector: 'app-ecommerce',
  imports: [RouterOutlet, Header, Footer, CompareTray, VerifyEmailBanner],
  templateUrl: './ecommerce.html',
  styleUrl: './ecommerce.css',
})
export class Ecommerce {}
