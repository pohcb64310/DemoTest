import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LinksService, Link } from './links.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private svc = inject(LinksService);

  urlInput = '';
  links = signal<Link[]>([]);
  created = signal<Link | null>(null);
  error = signal('');
  submitting = signal(false);

  ngOnInit(): void {
    this.loadLinks();
  }

  loadLinks(): void {
    this.svc.list().subscribe({
      next: (data) => this.links.set(data),
      error: () => {},
    });
  }

  shorten(): void {
    if (!/^https?:\/\/.+/.test(this.urlInput)) {
      this.error.set('URL must start with http:// or https://');
      return;
    }
    this.error.set('');
    this.created.set(null);
    this.submitting.set(true);
    this.svc.create(this.urlInput).subscribe({
      next: (link) => {
        this.created.set(link);
        this.urlInput = '';
        this.submitting.set(false);
        this.loadLinks();
      },
      error: (err) => {
        this.error.set(err.error?.error ?? 'Network error — is the backend running?');
        this.submitting.set(false);
      },
    });
  }
}
