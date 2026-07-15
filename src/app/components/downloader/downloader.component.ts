import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { SecureService } from 'src/app/services/SercureService';

@Component({
    selector: 'app-downloader',
    templateUrl: './downloader.component.html',
    styleUrls: ['./downloader.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class DownloaderComponent {
  videoUrl = '';
  convertToMp3 = false;
  /** Holds a translation key, not text — the template pipes it through `translate`. */
  statusKey = 'downloader.status.ready';
  isSubmitting = false;

  constructor(private readonly secureService: SecureService) { }

  get isValidUrl(): boolean {
    return this.isSupportedUrl(this.videoUrl);
  }

  onUrlChange(): void {
    if (!this.videoUrl) {
      this.statusKey = 'downloader.status.ready';
      return;
    }

    this.statusKey = this.isValidUrl ? 'downloader.status.readyToDownload' : 'downloader.status.invalidUrl';
  }

  download(): void {
    if (!this.isValidUrl) {
      this.statusKey = 'downloader.status.invalidUrl';
      return;
    }

    this.isSubmitting = true;
    this.statusKey = this.convertToMp3 ? 'downloader.status.preparingMp3' : 'downloader.status.preparingMp4';


    const payload = {
      url: this.videoUrl.trim(),
      format: this.convertToMp3 ? 'mp3' : 'mp4',
    };

    this.secureService.download(payload)
      .subscribe({
        next: (response: HttpResponse<Blob>) => {
          this.saveBlob(response.body, this.getFilename(response));
          this.statusKey = 'downloader.status.started';
          this.isSubmitting = false;
        },
        error: () => {
          this.statusKey = 'downloader.status.failed';
          this.isSubmitting = false;
        },
      });
  }

  private saveBlob(blob: Blob | null, filename: string): void {
    if (!blob) {
      this.statusKey = 'downloader.status.emptyResponse';
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
