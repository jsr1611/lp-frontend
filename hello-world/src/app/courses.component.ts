import { Component } from "@angular/core";

@Component({
    selector: 'courses',
    template: `
      <h2>{{ getTitle() }}</h2>
      <ul >
        <li *ngFor="let item of courses">{{item}}</li>
      </ul>
    `
})
export class CoursesComponent{
  title = "List of courses";
  courses = ["course1","course2","course3"];

  getTitle() {
    return this.title;
    }
}
