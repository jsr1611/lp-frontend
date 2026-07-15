import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordsComponent } from './words.component';
import { translateTestingImports, translateTestingProviders } from '../../testing/translate-testing';

describe('WordsComponent', () => {
  let component: WordsComponent;
  let fixture: ComponentFixture<WordsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WordsComponent],
      imports: [...translateTestingImports],
      providers: [...translateTestingProviders]
    });
    fixture = TestBed.createComponent(WordsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
