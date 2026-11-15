import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { CV } from './cv-data';
import { CvData, CvProject } from 'src/app/models/cv';
import { CvService } from 'src/app/services/CvService';
import { AuthService } from 'src/app/services/AuthService';

@Component({
  selector: 'app-cv',
  templateUrl: './cv.component.html',
  styleUrls: ['./cv.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class CvComponent implements OnInit {
  private readonly api = inject(CvService);
  readonly auth = inject(AuthService);

  /** Starts with the built-in copy so the page never renders empty; replaced by the saved CV. */
  cv: CvData = CV;
  projects: CvProject[] = CV.projects;

  ngOnInit(): void {
    this.api.get().subscribe({
      next: cv => {
        this.cv = cv;
        // Once the CV is saved, projects come from the Projects list ("Show on CV")
        this.api.projects().subscribe({
          next: list => (this.projects = list.map(CvService.toCvProject)),
          error: () => {},
        });
      },
      error: () => {}, // not saved yet, or API down: keep the built-in copy
    });
  }

  print(): void {
    window.print();
  }
}
