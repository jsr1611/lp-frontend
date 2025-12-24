import { Component, OnInit } from '@angular/core';
import { GithubService } from 'src/app/services/GithubService';

@Component({
  selector: 'app-github-repo-manager',
  standalone: false,
  // imports: [],
  templateUrl: './github-repo-manager.component.html',
  styleUrl: './github-repo-manager.component.css'
})
export class GithubRepoManagerComponent implements OnInit {
  token = '';
  repos: any[] = [];
  actions = new Map<string, any>();
  loading = false;
  currentUsername = '';
  ALL = 'all';
  SELF = 'self';
  GITHUB_TOKEN = 'github_token';
  SHOW_SELF = 'show_self';
  showRepos = this.ALL;
  showSelf = false;
  constructor(private github: GithubService) { }

  ngOnInit(): void {
    this.token = sessionStorage.getItem(this.GITHUB_TOKEN) || '';
    this.showRepos = sessionStorage.getItem(this.SHOW_SELF) || this.ALL
    this.showSelf = this.showRepos == this.SELF;
  }

  saveToken() {
    sessionStorage.setItem('github_token', this.token);
    this.loadRepos();
  }

  saveShowOnlySelf(event: Event) {
    this.showRepos = (event.target as HTMLInputElement).checked === true ? this.SELF : this.ALL;
    sessionStorage.setItem('show_self', this.showRepos);
    this.showSelf = this.showRepos == this.SELF;
  }


  async loadRepos() {
    this.loading = true;
    if (this.currentUsername == '') {
      const user = await this.github.getCurrentUser();
      this.currentUsername = user.login;
    }
    this.repos = await this.github.getRepos();
    console.log('show only self, cur user name: ', this.showRepos, this.currentUsername);

    if (this.showRepos == this.SELF && this.currentUsername.length > 3) {
      console.log('logging only self repos...');

      this.repos = this.repos.filter(item => item.owner?.login == this.currentUsername)
    }
    this.loading = false;
  }

  toggleAction(repo: any, action: string) {
    const key = repo.full_name;
    const current = this.actions.get(key) || {};
    current[action] = !current[action];
    this.actions.set(key, current);
  }
  async save() {
    for (const repo of this.repos) {
      const action = this.actions.get(repo.full_name);
      if (!action) continue;

      if (action.delete) {
        const confirmed = prompt(
          `Type "${repo.name}" to DELETE this repository`
        );
        if (confirmed !== repo.name) continue;
        await this.github.deleteRepo(repo.owner.login, repo.name);
      }

      if (action.makePrivate) {
        await this.github.updateVisibility(repo.owner.login, repo.name, true);
      }

      if (action.makePublic) {
        await this.github.updateVisibility(repo.owner.login, repo.name, false);
      }
    }

    alert('Actions completed');
    this.cancel();
  }

  cancel() {
    this.actions.clear();
    sessionStorage.removeItem('github_token');
  }

}
