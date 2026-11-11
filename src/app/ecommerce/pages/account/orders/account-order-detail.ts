import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { Order } from '../../../../core/orders/order.model';
import { orderStatusLabel, paymentStatusLabel } from '../../../../core/orders/order-status-labels';
import { OrdersService } from '../../../../core/orders/orders.service';

/** `/cuenta/pedidos/:id` - detalle de una compra propia (el backend ya garantiza que solo se
 *  puede ver la orden del usuario logueado, ver `OrdersService.findOneMine`). */
@Component({
  selector: 'app-account-order-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './account-order-detail.html',
  styleUrl: './account-order-detail.css',
})
export default class AccountOrderDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);

  protected readonly order = signal<Order | null>(null);
  protected readonly notFound = signal(false);
  protected readonly isLoading = signal(true);

  protected readonly orderStatusLabel = orderStatusLabel;
  protected readonly paymentStatusLabel = paymentStatusLabel;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.isLoading.set(false);
      return;
    }
    void this.load(id);
  }

  private async load(id: string): Promise<void> {
    const order = await this.ordersService.myOrder(id);
    this.order.set(order);
    this.notFound.set(!order);
    this.isLoading.set(false);
  }

  /** El paso de pago lee la orden "actual" de `OrdersService` - al volver desde "Mis compras"
   *  (no desde el wizard de checkout) hay que cargarla ahí explícitamente primero. */
  protected goToPayment(order: Order): void {
    this.ordersService.setCurrentOrder(order);
    void this.router.navigateByUrl('/checkout/pago');
  }
}
