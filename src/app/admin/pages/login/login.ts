import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormField, email, form, required, schema } from '@angular/forms/signals';

import { AdminAuthService } from '../../data/admin-auth.service';

interface LoginModel {
  email: string;
  password: string;
}

function emptyLoginModel(): LoginModel {
  return { email: '', password: '' };
}

const loginSchema = schema<LoginModel>((path) => {
  required(path.email, { message: 'Ingresá tu email' });
  email(path.email, { message: 'Ingresá un email válido' });
  required(path.password, { message: 'Ingresá tu contraseña' });
});

/** Admin panel's own login page - entirely separate flow from the storefront's `/auth/login`. */
@Component({
  selector: 'app-admin-login',
  imports: [FormField],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export default class Login {
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/admin';

  private readonly model = signal<LoginModel>(emptyLoginModel());
  protected readonly loginForm = form(this.model, loginSchema);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.loginForm().markAsTouched();
    if (!this.loginForm().valid()) return;

    this.submitting.set(true);
    this.error.set(null);
    const result = await this.adminAuthService.login(this.model());
    this.submitting.set(false);

    if (result.success) {
      void this.router.navigateByUrl(this.returnUrl);
    } else {
      this.error.set(result.message ?? 'No pudimos iniciar sesión');
    }
  }
}
