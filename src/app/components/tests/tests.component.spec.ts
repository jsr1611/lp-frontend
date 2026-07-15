import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestsComponent } from './tests.component';
import { translateTestingImports, translateTestingProviders } from '../../testing/translate-testing';

describe('TestsComponent', () => {
  let component: TestsComponent;
  let fixture: ComponentFixture<TestsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestsComponent],
      imports: [...translateTestingImports],
      providers: [...translateTestingProviders]
    });
    fixture = TestBed.createComponent(TestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
