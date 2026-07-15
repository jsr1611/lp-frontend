import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddWordComponent } from './add-word.component';
import { translateTestingImports, translateTestingProviders } from '../../testing/translate-testing';

describe('AddWordComponent', () => {
  let component: AddWordComponent;
  let fixture: ComponentFixture<AddWordComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddWordComponent],
      imports: [...translateTestingImports],
      providers: [...translateTestingProviders]
    });
    fixture = TestBed.createComponent(AddWordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
