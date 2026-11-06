import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'essence-vapes-age-verified';
const MIN_AGE = 18;

/**
 * Verificación de edad real (fecha de nacimiento, no un checkbox) para productos category=vapes
 * (Ley 26.687 y Disposición ANMAT 2543/2026). Se guarda en sessionStorage - se vuelve a pedir
 * en una pestaña/sesión nueva, nunca queda verificado para siempre en este navegador.
 */
@Injectable({ providedIn: 'root' })
export class AgeVerificationService {
  private readonly verifiedSignal = signal(this.readStored());
  readonly verified = this.verifiedSignal.asReadonly();

  /** Devuelve false (y no persiste nada) si la fecha indica menos de 18 años o es inválida. */
  verify(birthDateIso: string): boolean {
    const birthDate = new Date(birthDateIso);
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return false;
    if (this.calculateAge(birthDate) < MIN_AGE) return false;

    this.verifiedSignal.set(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* Private browsing o storage deshabilitado: no persiste entre páginas de esta pestaña. */
    }
    return true;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  }

  private readStored(): boolean {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
