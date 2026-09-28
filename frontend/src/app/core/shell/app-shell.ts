import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../auth.service';
import { NotificationsService } from '../notifications.service';
import { ROLE_LABELS, type UserRole } from '../models/profile.model';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles: UserRole[] | null; // null = visible para cualquier rol autenticado
}

// Los 4 accesos principales (Panel/Mapa/Historial/Alertas) son visibles
// para los 3 roles: las politicas RLS ya limitan lo que cada quien ve
// dentro de cada pantalla (p. ej. un tecnico solo ve sus dispositivos
// asignados), asi que ocultar la entrada de menu no aporta seguridad, solo
// confundiria a alguien que si tiene datos que consultar ahi.
const NAV_ITEMS: NavItem[] = [
  { label: 'Panel', icon: 'dashboard', path: '/panel', roles: null },
  { label: 'Mapa', icon: 'map', path: '/mapa', roles: null },
  { label: 'Historial', icon: 'history', path: '/historial', roles: null },
  { label: 'Alertas', icon: 'notifications_active', path: '/alertas', roles: null },
  { label: 'Dispositivos', icon: 'sensors', path: '/dispositivos', roles: null },
  {
    label: 'Mantenimiento',
    icon: 'build_circle',
    path: '/mantenimiento',
    roles: ['administrador', 'analista', 'tecnico_campo'],
  },
  { label: 'Reportes', icon: 'summarize', path: '/reportes', roles: ['administrador', 'analista'] },
  { label: 'Administración', icon: 'admin_panel_settings', path: '/administracion', roles: ['administrador'] },
];

/**
 * Marco visual compartido por toda pantalla autenticada: barra lateral
 * plegable en escritorio (se convierte en cajón deslizable sobre el
 * contenido en pantallas angostas, vía MatSidenav en modo 'over'),
 * encabezado compacto con campana de notificaciones y menú de usuario, y
 * un <router-outlet> para el contenido de cada pantalla.
 *
 * Por qué MatSidenav en vez de la barra horizontal anterior: con 8
 * secciones (antes eran 5) una barra horizontal ya no cabe sin recurrir a
 * scroll horizontal o menús anidados poco descubribles; una barra lateral
 * con icono+texto escala mejor y es el patrón que pidió explícitamente el
 * rediseño (plegable en escritorio, adaptable en móvil).
 */
@Component({
  selector: 'wq-app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell implements OnInit, OnDestroy {
  readonly roleLabels = ROLE_LABELS;

  readonly collapsed = signal(this.readCollapsedPreference());
  readonly isMobile = signal(false);
  readonly mobileOpen = signal(false);

  readonly sidenavMode = computed<'side' | 'over'>(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidenavOpened = computed(() => (this.isMobile() ? this.mobileOpen() : true));

  readonly items = computed(() => {
    const role = this.authService.role();
    return NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));
  });

  private breakpointSub?: { unsubscribe: () => void };

  constructor(
    protected readonly authService: AuthService,
    protected readonly notifications: NotificationsService,
    private readonly router: Router,
    private readonly breakpointObserver: BreakpointObserver,
  ) {}

  ngOnInit(): void {
    this.notifications.startWatching();
    // 760px deja el sidenav fijo en tablets en horizontal/vertical (768px de
    // ancho, uno de los anchos de prueba pedidos) y solo lo vuelve cajon
    // deslizable en telefonos, donde el espacio para un sidenav fijo ya no
    // alcanza.
    this.breakpointSub = this.breakpointObserver.observe('(max-width: 760px)').subscribe((state) => {
      this.isMobile.set(state.matches);
      if (!state.matches) this.mobileOpen.set(false);
    });
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();
    this.notifications.stopWatching();
  }

  toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
    try {
      localStorage.setItem('wq-sidenav-collapsed', this.collapsed() ? '1' : '0');
    } catch {
      // localStorage puede fallar en navegacion privada; no es critico, solo se pierde la preferencia.
    }
  }

  closeMobileNav(): void {
    if (this.isMobile()) this.mobileOpen.set(false);
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
    await this.router.navigateByUrl('/iniciar-sesion');
  }

  private readCollapsedPreference(): boolean {
    try {
      return localStorage.getItem('wq-sidenav-collapsed') === '1';
    } catch {
      return false;
    }
  }
}
