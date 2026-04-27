import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarraSuperiorEscom } from './barra-superior-escom';

describe('BarraSuperiorEscom', () => {
  let component: BarraSuperiorEscom;
  let fixture: ComponentFixture<BarraSuperiorEscom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarraSuperiorEscom],
    }).compileComponents();

    fixture = TestBed.createComponent(BarraSuperiorEscom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
