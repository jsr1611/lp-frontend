import { Component } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { SecureService } from 'src/app/services/SercureService';

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

  constructor(private readonly secureService: SecureService) { }

  get isValidUrl(): boolean {
    return this.isSupportedUrl(this.videoUrl);
  }

  onUrlChange(): void {
    if (!this.videoUrl) {
      this.status = 'Ready.';
      return;
    }

    this.status = this.isValidUrl ? 'Ready to download.' : 'Enter a valid YouTube or Instagram URL.';
  }

  download(): void {
    if (!this.isValidUrl) {
      this.status = 'Enter a valid YouTube or Instagram URL.';
      return;
    }

    this.isSubmitting = true;
    this.status = this.convertToMp3 ? 'Preparing MP3 download...' : 'Preparing MP4 download...';


    const payload = {
      url: this.videoUrl.trim(),
      format: this.convertToMp3 ? 'mp3' : 'mp4',
    };

    this.secureService.download(payload)
      .subscribe({
        next: (response: HttpResponse<Blob>) => {
          this.saveBlob(response.body, this.getFilename(response));
          this.status = 'Download started. Keep this tab open.';
          this.isSubmitting = false;
        },
        error: () => {
          this.status = 'Download failed. Please try again.';
          this.isSubmitting = false;
        },
      });
  }

  private saveBlob(blob: Blob | null, filename: string): void {
    if (!blob) {
      this.status = 'Download failed. Empty response.';
      return;
    }

    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.click();
    window.URL.revokeObjectURL(objectUrl);
  }

  private getFilename(response: HttpResponse<Blob>): string {
    const contentDisposition = response.headers.get('content-disposition') ?? '';
    const match = /filename\*?=(?:UTF-8''|")?([^\";\n]+)/i.exec(contentDisposition);
    if (match?.[1]) {
      return decodeURIComponent(match[1].replace(/\"/g, '').trim());
    }

    return this.convertToMp3 ? 'download.mp3' : 'download.mp4';
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
