import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordComponent } from './word.component';

describe('WordComponent', () => {
  let component: WordComponent;
  let fixture: ComponentFixture<WordComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WordComponent]
    });
    fixture = TestBed.createComponent(WordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
