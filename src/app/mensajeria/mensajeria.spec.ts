import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mensajeria } from './mensajeria';

describe('Mensajeria', () => {
  let component: Mensajeria;
  let fixture: ComponentFixture<Mensajeria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mensajeria],
    }).compileComponents();

    fixture = TestBed.createComponent(Mensajeria);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
