import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowdetailsDialogComponent } from './showdetails-dialog.component';

describe('ShowdetailsDialogComponent', () => {
  let component: ShowdetailsDialogComponent;
  let fixture: ComponentFixture<ShowdetailsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShowdetailsDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowdetailsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
