import { TestBed } from '@angular/core/testing';

import { AbstractProcessingService } from './abstract-processing.service';

describe('AbstractProcessingService', () => {
  let service: AbstractProcessingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AbstractProcessingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
