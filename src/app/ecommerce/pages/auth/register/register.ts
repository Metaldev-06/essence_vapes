import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormField,
  email,
  form,
  minLength,
  pattern,
  required,
  schema,
  validate,
} from '@angular/forms/signals';

import { AuthService } from '../../../../core/auth/auth.service';

interface RegisterModel {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function emptyRegisterModel(): RegisterModel {
  return { fullName: '', email: '', password: '', confirmPassword: '' };
}

// Mirrors the backend's RegisterUserDto password rule so users see the same requirement on both ends.
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/;

const registerSchema = schema<RegisterModel>((path) => {
  required(path.fullName, { message: 'Contanos tu nombre' });
  minLength(path.fullName, 3, { message: 'Mínimo 3 caracteres' });

  required(path.email, { message: 'Ingresá tu email' });
  email(path.email, { message: 'Ingresá un email válido' });

  required(path.password, { message: 'Creá una contraseña' });
  minLength(path.password, 8, { message: 'Mínimo 8 caracteres' });
  pattern(path.password, PASSWORD_PATTERN, {
    message: 'Necesita una mayúscula, una minúscula y un número',
  });

  required(path.confirmPassword, { message: 'Repetí la contraseña' });
  validate(path.confirmPassword, (ctx) =>
    ctx.value() === ctx.valueOf(path.password)
      ? undefined
      : { kind: 'mismatch', message: 'Las contraseñas no coinciden' },
  );
});

/** Storefront registration page. Backend always creates `regular` users through this endpoint. */
@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export default class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';

  private readonly model = signal<RegisterModel>(emptyRegisterModel());
  protected readonly registerForm = form(this.model, registerSchema);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.registerForm().markAsTouched();
    if (!this.registerForm().valid()) return;

    const { fullName, email: emailValue, password } = this.model();

    this.submitting.set(true);
    this.error.set(null);
    const result = await this.authService.register({ fullName, email: emailValue, password });
    this.submitting.set(false);

    if (result.success) {
      void this.router.navigateByUrl(this.returnUrl);
    } else {
      this.error.set(result.message ?? 'No pudimos crear tu cuenta');
    }
  }
}
