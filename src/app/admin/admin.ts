import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Sidebar } from './layout/sidebar/sidebar';
import { Breadcrumbs } from './shared/breadcrumbs/breadcrumbs';

@Component({
  selector: 'app-admin',
  imports: [RouterOutlet, Sidebar, Breadcrumbs],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {}
