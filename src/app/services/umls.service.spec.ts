import { TestBed } from '@angular/core/testing';

import { UmlsService } from './umls.service';

describe('UmlsService', () => {
  let service: UmlsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UmlsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
