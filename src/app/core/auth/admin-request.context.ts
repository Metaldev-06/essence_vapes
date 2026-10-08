import { HttpContextToken } from '@angular/common/http';

/**
 * Marks a request as belonging to the admin panel. `authInterceptor` (storefront) and
 * `adminAuthInterceptor` (admin) both read this to know which stored session - and whose
 * token - is allowed to attach to it, so a person can be logged in as a customer and as an
 * admin in the same browser without either session clobbering the other's requests.
 */
export const IS_ADMIN_REQUEST = new HttpContextToken<boolean>(() => false);
