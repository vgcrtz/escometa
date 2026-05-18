import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TituloSesion } from './titulo-sesion';

describe('TituloSesion', () => {
  let component: TituloSesion;
  let fixture: ComponentFixture<TituloSesion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TituloSesion],
    }).compileComponents();

    fixture = TestBed.createComponent(TituloSesion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
