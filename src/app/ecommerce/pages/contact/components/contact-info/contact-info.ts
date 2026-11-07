import { Component } from '@angular/core';

type ContactIcon = 'chat' | 'camera' | 'mail';

interface ContactChannel {
  readonly icon: ContactIcon;
  readonly label: string;
  readonly value: string;
  readonly href: string;
}

@Component({
  selector: 'app-contact-info',
  imports: [],
  templateUrl: './contact-info.html',
  styleUrl: './contact-info.css',
})
export class ContactInfo {
  protected readonly channels: readonly ContactChannel[] = [
    {
      icon: 'chat',
      label: 'WhatsApp',
      value: '+54 9 3704 344943',
      href: 'https://wa.me/5493704344943',
    },
    {
      icon: 'camera',
      label: 'Instagram',
      value: '@essence_vapes',
      href: 'https://www.instagram.com/essence_vapes/',
    },
    {
      icon: 'mail',
      label: 'Email',
      value: 'contacto@essencevapes.com.ar',
      href: 'mailto:contacto@essencevapes.com.ar',
    },
  ];
}
