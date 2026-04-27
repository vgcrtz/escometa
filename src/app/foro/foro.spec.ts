import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Foro } from './foro';

describe('Foro', () => {
  let component: Foro;
  let fixture: ComponentFixture<Foro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Foro],
    }).compileComponents();

    fixture = TestBed.createComponent(Foro);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
