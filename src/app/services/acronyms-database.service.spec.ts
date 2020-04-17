import { TestBed } from '@angular/core/testing';

import { AcronymsDatabaseService } from './acronyms-database.service';

describe('AcronymsDatabaseService', () => {
  let service: AcronymsDatabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AcronymsDatabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
