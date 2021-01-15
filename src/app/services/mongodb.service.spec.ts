import { TestBed } from '@angular/core/testing';

import { MongodbService } from './mongodb.service';

describe('MongodbService', () => {
  let service: MongodbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MongodbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
