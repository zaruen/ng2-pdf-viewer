/**
 * Created by vadimdez on 21/06/16.
 */
import {
  Component, Input, Output, ElementRef, EventEmitter, OnInit
} from '@angular/core';
import 'pdfjs-dist/build/pdf.combined';

@Component({
  selector: 'pdf-viewer',
  template: `<div class="ng2-pdf-viewer-container" [ngClass]="{'ng2-pdf-viewer--zoom': zoom < 1}"></div>`,
  styles: [`
    .ng2-pdf-viewer--zoom {
        overflow-x: scroll;
    }`
  ]
})

export class PdfViewerComponent extends OnInit {
  private _showAll: boolean = false;
  private _originalSize: boolean = true;
  private _src: any;
  private _pdf: any;
  private _page: number = 1;
  private _zoom: number = 1;
  private wasInvalidPage: boolean = false;
  private _rotation: number = 0;
  private isInitialised: boolean = false;
  private lastLoaded: string;
  @Input('after-load-complete') afterLoadComplete: Function;

  constructor(private element: ElementRef) {
    super();
  }

  ngOnInit() {
    this.main();
    this.isInitialised = true;
  }

  @Input()
  set src(_src) {
    this._src = _src;

    if (this.isInitialised) {
      this.main();
    }
  }

  @Input()
  set page(_page) {
    _page = parseInt(_page, 10);

    if (!this._pdf) {
      this._page = _page;
      return;
    }

    if (this.isValidPageNumber(_page)) {
      this._page = _page;
      this.renderPage(_page);
      this.wasInvalidPage = false;
    } else if (isNaN(_page)) {
      this.pageChange.emit(null);
    } else if (!this.wasInvalidPage) {
      this.wasInvalidPage = true;
      this.pageChange.emit(this._page);
    }
  }

  @Output() pageChange: EventEmitter<number> = new EventEmitter<number>(true);

  @Input('original-size')
  set originalSize(originalSize: boolean) {
    this._originalSize = originalSize;

    if (this._pdf) {
      this.main();
    }
  }

  @Input('show-all')
  set showAll(value: boolean) {
    this._showAll = value;

    if (this._pdf) {
      this.main();
    }
  }

  @Input('zoom')
  set zoom(value: number) {
    if (value <= 0) {
      return;
    }

    this._zoom = value;

    if (this._pdf) {
      this.main();
    }
  }

  get zoom() {
    return this._zoom;
  }

  @Input('rotation')
  set rotation(value: number) {
    if (!(typeof value === 'number' && value % 90 === 0)) {
      console.warn('Invalid pages rotation angle.');
      return;
    }

    this._rotation = value;

    if (this._pdf) {
      this.main();
    }
  }

  private main() {
    if (this._pdf && this.lastLoaded === this._src) {
      return this.onRender();
    }

    this.loadPDF(this._src);
  }

  private loadPDF(src) {
    (<any>window).PDFJS.getDocument(src).then((pdf: any) => {
      this._pdf = pdf;
      this.lastLoaded = src;

      if (this.afterLoadComplete && typeof this.afterLoadComplete === 'function') {
        this.afterLoadComplete(pdf);
      }

      this.onRender();
    });
  }

  private onRender() {
    if (!this.isValidPageNumber(this._page)) {
      this._page = 1;
    }

    if (!this._showAll) {
      return this.renderPage(this._page);
    }

    this.renderMultiplePages();
  }

  private renderMultiplePages() {
    let container = this.element.nativeElement.querySelector('div');
    let page = 1;
    const renderPageFn = (page: number) => () => this.renderPage(page);

    this.removeAllChildNodes(container);

    let d = this.renderPage(page++);

    for (page; page <= this._pdf.numPages; page++) {
      d = d.then(renderPageFn(page));
    }
  }

  private isValidPageNumber(page: number) {
    return this._pdf.numPages >= page && page >= 1;
  }

  private renderPage(page: number) {
    return this._pdf.getPage(page).then((page: any) => {
      let viewport = page.getViewport(this._zoom, this._rotation);
      let container = this.element.nativeElement.querySelector('div');
      let canvas: HTMLCanvasElement = document.createElement('canvas');

      if (!this._originalSize) {
        viewport = page.getViewport(this.element.nativeElement.offsetWidth / viewport.width, this._rotation);
      }

      if (!this._showAll) {
        this.removeAllChildNodes(container);
      }

      container.appendChild(canvas);

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      page.render({
        canvasContext: canvas.getContext('2d'),
        viewport: viewport
      });
    });
  }

  private removeAllChildNodes(element: HTMLElement) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
}