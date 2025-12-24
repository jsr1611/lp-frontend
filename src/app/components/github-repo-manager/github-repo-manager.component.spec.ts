import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GithubRepoManagerComponent } from './github-repo-manager.component';

describe('GithubRepoManagerComponent', () => {
  let component: GithubRepoManagerComponent;
  let fixture: ComponentFixture<GithubRepoManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GithubRepoManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GithubRepoManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
