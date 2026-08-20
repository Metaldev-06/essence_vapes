import { Component } from '@angular/core';
import { ContactHeader } from './components/contact-header/contact-header';
import { ContactForm } from './components/contact-form/contact-form';
import { ContactInfo } from './components/contact-info/contact-info';

@Component({
  selector: 'app-contact',
  imports: [ContactHeader, ContactForm, ContactInfo],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export default class Contact {}
