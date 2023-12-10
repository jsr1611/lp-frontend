import { Component, OnInit } from "@angular/core";
import { CoursesService } from "./courses.service";

@Component({
    selector: 'courses',
    templateUrl: './courses.component.html',
})
export class CoursesComponent{
  title = "List of courses";
  courses;
  authors;


    constructor(coursesService: CoursesService
      ){
        this.courses = coursesService.getCourses();
        this.authors = coursesService.getAuthors();
      }
    // Logic for calling an HTTP service


}
