import { Routes } from '@angular/router';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { HomeComponent } from './components/home/home.component';
import { PlaceholderPageComponent } from './components/placeholder-page/placeholder-page.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: HomeComponent },
      {
        path: 'bible',
        component: PlaceholderPageComponent,
        data: { title: 'Bíblia' }
      },
      {
        path: 'statistics',
        component: PlaceholderPageComponent,
        data: { title: 'Estatísticas' }
      },
      {
        path: 'settings',
        component: PlaceholderPageComponent,
        data: { title: 'Ajustes' }
      }
    ]
  }
];
