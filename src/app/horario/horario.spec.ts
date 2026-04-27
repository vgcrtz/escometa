import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Horario } from './horario';

describe('Horario', () => {
  let component: Horario;
  let fixture: ComponentFixture<Horario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Horario],
    }).compileComponents();

    fixture = TestBed.createComponent(Horario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
