import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordComponent } from './word.component';
import { translateTestingImports, translateTestingProviders } from '../../testing/translate-testing';

describe('WordComponent', () => {
  let component: WordComponent;
  let fixture: ComponentFixture<WordComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WordComponent],
      imports: [...translateTestingImports],
      providers: [...translateTestingProviders]
    });
    fixture = TestBed.createComponent(WordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
