import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { CartService } from '../../../core/cart/cart.service';
import { OrdersService } from '../../../core/orders/orders.service';

/**
 * `/checkout` - shell del wizard (dirección → resumen → pago → resultado), protegido por
 * `authOnlyGuard` (ver `ecommerce.routes.ts`, igual que `/cuenta`). Cada paso vive en su propia
 * ruta hija y pone su propio encabezado "Paso X de 4" - este componente solo valida que haya
 * algo para comprar antes de dejar entrar al flujo.
 */
@Component({
  selector: 'app-checkout',
  imports: [RouterOutlet],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export default class Checkout implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Entrar directo a /checkout con el carrito vacío (link compartido, refresh en el paso de
    // pago sin haber creado una orden todavía, etc.) no tiene nada que mostrar - mandar de
    // vuelta al carrito en vez de dejar pasos rotos. PERO el carrito queda vacío a propósito en
    // cuanto se crea la orden (paso "resumen") - "Completar el pago" desde una orden pendiente en
    // /cuenta/pedidos/:id navega directo a /checkout/pago con el carrito ya vacío legítimamente,
    // así que un `currentOrder` ya seteado (ver `AccountOrderDetail.goToPayment`) también cuenta
    // como "hay algo para mostrar acá", no solo el carrito. Bug real hit en vivo 2026-11-11: sin
    // este chequeo, reintentar el pago de un pedido viejo expulsaba al carrito con un parpadeo.
    const hasSomethingToCheckout =
      this.cartService.lines().length > 0 || this.ordersService.currentOrder() !== null;
    if (!hasSomethingToCheckout && !this.router.url.includes('/checkout/resultado')) {
      void this.router.navigateByUrl('/carrito');
    }
  }
}
