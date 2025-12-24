import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GithubService {
    private api = 'https://api.github.com';

    private get headers() {
        const token = sessionStorage.getItem('github_token');
        return {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json'
        };
    }

    async getRepos() {
        const res = await fetch(`${this.api}/user/repos?per_page=100`, {
            headers: this.headers
        });
        return res.json();
    }

    async getCurrentUser() {
        const res = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${sessionStorage.getItem('github_token')}`,
                Accept: 'application/vnd.github+json'
            }
        });

        if (!res.ok) {
            throw new Error('Invalid GitHub token');
        }

        return res.json();
    }

    updateVisibility(owner: string, repo: string, isPrivate: boolean) {
        return fetch(`${this.api}/repos/${owner}/${repo}`, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify({ private: isPrivate })
        });
    }

    deleteRepo(owner: string, repo: string) {
        return fetch(`${this.api}/repos/${owner}/${repo}`, {
            method: 'DELETE',
            headers: this.headers
        });
    }
}
