import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * `/cuenta/pedidos` - placeholder a propósito: esta tienda todavía no tiene checkout, así que no
 * existe ningún pedido real que listar. No hay entidad `Order` en el backend todavía - crearla
 * ahora, sin un flujo de compra que la alimente, sería construir en el aire. Cuando se implemente
 * el checkout, esta página pasa a consumir el endpoint real.
 */
@Component({
  selector: 'app-account-orders',
  imports: [RouterLink],
  templateUrl: './account-orders.html',
  styleUrl: './account-orders.css',
})
export default class AccountOrders {}
