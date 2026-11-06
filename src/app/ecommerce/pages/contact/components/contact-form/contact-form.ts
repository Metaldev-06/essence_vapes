import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, minLength, required, schema } from '@angular/forms/signals';

import { ContactService } from '../../../../data/contact.service';

interface ContactModel {
  name: string;
  email: string;
  phone: string;
  reason: string;
  message: string;
}

function emptyModel(): ContactModel {
  return { name: '', email: '', phone: '', reason: 'consulta-general', message: '' };
}

const contactSchema = schema<ContactModel>((path) => {
  required(path.name, { message: 'Contanos tu nombre' });
  required(path.email, { message: 'Dejanos un email de contacto' });
  email(path.email, { message: 'Ingresá un email válido' });
  required(path.message, { message: 'Escribinos tu consulta' });
  minLength(path.message, 10, { message: 'Contanos un poco más (mínimo 10 caracteres)' });
});

@Component({
  selector: 'app-contact-form',
  imports: [FormField],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css',
})
export class ContactForm {
  private readonly contactService = inject(ContactService);

  protected readonly reasons = [
    { id: 'consulta-general', label: 'Consulta general' },
    { id: 'estado-pedido', label: 'Estado de un pedido' },
    { id: 'cambios-devoluciones', label: 'Cambios y devoluciones' },
    { id: 'trabaja-con-nosotros', label: 'Trabajá con nosotros' },
  ];

  private readonly model = signal(emptyModel());
  protected readonly contactForm = form(this.model, contactSchema);
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.contactForm().markAsTouched();
    if (!this.contactForm().valid()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const { name, email: emailValue, phone, reason, message } = this.model();
    const result = await this.contactService.send({
      name,
      email: emailValue,
      phone: phone || undefined,
      reason,
      message,
    });
    this.submitting.set(false);

    if (result.success) {
      this.submitted.set(true);
    } else {
      this.error.set(result.message);
    }
  }

  protected sendAnother(): void {
    this.model.set(emptyModel());
    this.submitted.set(false);
    this.error.set(null);
  }
}
