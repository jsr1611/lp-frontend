import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-downloader',
  templateUrl: './downloader.component.html',
  styleUrls: ['./downloader.component.css']
})
export class DownloaderComponent {
  videoUrl = '';
  convertToMp3 = false;
  status = 'Ready.';
  isSubmitting = false;

  get isValidUrl(): boolean {
    return this.isSupportedUrl(this.videoUrl);
  }

  onUrlChange(): void {
    if (!this.videoUrl) {
      this.status = 'Ready.';
      return;
    }

    this.status = this.isValidUrl ? 'Ready to download.' : 'Enter a valid YouTube URL.';
  }

  download(): void {
    if (!this.isValidUrl) {
      this.status = 'Enter a valid YouTube URL.';
      return;
    }

    this.isSubmitting = true;
    this.status = this.convertToMp3 ? 'Preparing MP3 download...' : 'Preparing MP4 download...';

    const downloadUrl = this.buildDownloadUrl(this.videoUrl, this.convertToMp3 ? 'mp3' : 'mp4');
    const popup = window.open(downloadUrl, '_blank', 'noopener');
    if (!popup) {
      window.location.href = downloadUrl;
    }

    this.isSubmitting = false;
    this.status = 'Download started. Keep this tab open.';
  }

  private buildDownloadUrl(url: string, format: 'mp3' | 'mp4'): string {
    const cleanedUrl = url.trim();
    const params = new URLSearchParams({ url: cleanedUrl, format });
    return `${environment.baseUrl_download}/download?${params.toString()}`;
  }

  private isSupportedUrl(value: string): boolean {
    try {
      const trimmed = value.trim();
      if (!trimmed) {
        return false;
      }

      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      return host === 'youtube.com'
        || host === 'www.youtube.com'
        || host === 'm.youtube.com'
        || host === 'youtu.be'
        || host === 'instagram.com'
        || host === 'www.instagram.com'
        || host === 'm.instagram.com';
    } catch {
      return false;
    }
  }
}
