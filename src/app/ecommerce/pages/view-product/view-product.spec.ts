import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import ViewProduct from './view-product';

describe('ViewProduct', () => {
  let component: ViewProduct;
  let fixture: ComponentFixture<ViewProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewProduct],
      // ViewProduct now injects SeoService (sets Schema.org Product/Offer data), which itself
      // injects Router/ActivatedRoute - needs a router provider to construct in isolation.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewProduct);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
