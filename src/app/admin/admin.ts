import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Sidebar } from './layout/sidebar/sidebar';
import { Breadcrumbs } from './shared/breadcrumbs/breadcrumbs';
import { SessionExpiryModal } from './shared/session-expiry-modal/session-expiry-modal';

@Component({
  selector: 'app-admin',
  imports: [RouterOutlet, Sidebar, Breadcrumbs, SessionExpiryModal],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {}
