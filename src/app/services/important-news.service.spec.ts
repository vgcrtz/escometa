import { TestBed } from '@angular/core/testing';

import { ImportantNewsService } from './important-news.service';

describe('ImportantNewsService', () => {
  let service: ImportantNewsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImportantNewsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
