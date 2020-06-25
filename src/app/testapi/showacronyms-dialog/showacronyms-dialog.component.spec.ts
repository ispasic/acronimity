import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowacronymsDialogComponent } from './showacronyms-dialog.component';

describe('ShowacronymsDialogComponent', () => {
  let component: ShowacronymsDialogComponent;
  let fixture: ComponentFixture<ShowacronymsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShowacronymsDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowacronymsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
