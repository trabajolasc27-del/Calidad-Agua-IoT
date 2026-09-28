import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // La prueba original (heredada del scaffold de `ng new`) buscaba un <h1>
  // con "Hello, frontend" que nunca existió en app.html (solo
  // <router-outlet />) -- quedó rota desde el inicio del proyecto sin que
  // nadie la hubiera corrido. Se reemplaza por una aserción real sobre lo
  // que el componente raíz efectivamente renderiza.
  it('should render the router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
