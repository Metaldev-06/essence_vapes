import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { CompareTray } from './shared/compare-tray/compare-tray';
import { VerifyEmailBanner } from './shared/verify-email-banner/verify-email-banner';
import { SessionExpiryModal } from './shared/session-expiry-modal/session-expiry-modal';

@Component({
  selector: 'app-ecommerce',
  imports: [RouterOutlet, Header, Footer, CompareTray, VerifyEmailBanner, SessionExpiryModal],
  templateUrl: './ecommerce.html',
  styleUrl: './ecommerce.css',
})
export class Ecommerce {}
