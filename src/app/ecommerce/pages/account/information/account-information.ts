import { Component, inject, signal } from '@angular/core';
import { FormField, form, minLength, required, schema } from '@angular/forms/signals';

import { AuthService } from '../../../../core/auth/auth.service';

interface ProfileModel {
  fullName: string;
  phone: string;
  birthDate: string;
}

const profileSchema = schema<ProfileModel>((path) => {
  required(path.fullName, { message: 'Ingresá tu nombre' });
  minLength(path.fullName, 3, { message: 'Mínimo 3 caracteres' });
});

/** `/cuenta/informacion-personal` - datos básicos del perfil + estado de verificación del email. */
@Component({
  selector: 'app-account-information',
  imports: [FormField],
  templateUrl: './account-information.html',
  styleUrl: './account-information.css',
})
export default class AccountInformation {
  protected readonly authService = inject(AuthService);

  private readonly profileModelSignal = signal<ProfileModel>({
    fullName: this.authService.user()?.fullName ?? '',
    phone: this.authService.user()?.phone ?? '',
    birthDate: this.authService.user()?.birthDate ?? '',
  });
  protected readonly profileForm = form(this.profileModelSignal, profileSchema);
  protected readonly savingProfile = signal(false);
  protected readonly profileMessage = signal<string | null>(null);
  protected readonly profileError = signal<string | null>(null);

  protected readonly resendingVerification = signal(false);
  protected readonly verificationMessage = signal<string | null>(null);

  protected async saveProfile(event: Event): Promise<void> {
    event.preventDefault();
    this.profileForm().markAsTouched();
    if (!this.profileForm().valid()) return;

    const { fullName, phone, birthDate } = this.profileModelSignal();

    this.savingProfile.set(true);
    this.profileError.set(null);
    this.profileMessage.set(null);
    const result = await this.authService.updateProfile({
      fullName,
      phone: phone.trim() ? phone.trim() : null,
      birthDate: birthDate ? birthDate : null,
    });
    this.savingProfile.set(false);

    if (result.success) {
      this.profileMessage.set('Guardamos tus cambios.');
    } else {
      this.profileError.set(result.message ?? 'No pudimos guardar los cambios');
    }
  }

  protected async resendVerification(): Promise<void> {
    this.resendingVerification.set(true);
    this.verificationMessage.set(null);
    const result = await this.authService.resendEmailVerification();
    this.resendingVerification.set(false);
    this.verificationMessage.set(
      result.success ? 'Te enviamos un correo de verificación.' : result.message ?? 'No pudimos enviarlo',
    );
  }
}
