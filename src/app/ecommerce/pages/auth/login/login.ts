import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormField, email, form, required, schema } from '@angular/forms/signals';

import { AuthService } from '../../../../core/auth/auth.service';

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

/**
 * Storefront login page. Only ever admits `regular` users - `AuthService` rejects admin
 * credentials entered here, since the admin panel has its own separate auth flow.
 */
@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export default class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';

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
    const result = await this.authService.login(this.model());
    this.submitting.set(false);

    if (result.success) {
      void this.router.navigateByUrl(this.returnUrl);
    } else {
      this.error.set(result.message ?? 'No pudimos iniciar tu sesión');
    }
  }
}
