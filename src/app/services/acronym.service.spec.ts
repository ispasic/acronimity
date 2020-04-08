import { TestBed } from '@angular/core/testing';

import { AcronymService } from './acronym.service';

describe('AcronymService', () => {
  let service: AcronymService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AcronymService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
