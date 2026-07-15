import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { DownloaderComponent } from './downloader.component';
import { translateTestingImports, translateTestingProviders } from '../../testing/translate-testing';

describe('DownloaderComponent', () => {
  let component: DownloaderComponent;
  let fixture: ComponentFixture<DownloaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DownloaderComponent],
      imports: [...translateTestingImports, FormsModule, HttpClientTestingModule],
      providers: [...translateTestingProviders]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DownloaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
