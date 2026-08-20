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
      value: '+54 9 11 0000-0000',
      href: 'https://wa.me/5491100000000',
    },
    {
      icon: 'camera',
      label: 'Instagram',
      value: '@essence_vapes',
      href: 'https://instagram.com/essence_vapes',
    },
    {
      icon: 'mail',
      label: 'Email',
      value: 'hola@essencevapes.com.ar',
      href: 'mailto:hola@essencevapes.com.ar',
    },
  ];
}
