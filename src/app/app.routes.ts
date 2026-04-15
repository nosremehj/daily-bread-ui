import { Routes } from '@angular/router';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { BiblePageComponent } from './components/bible-page/bible-page.component';
import { PlaceholderPageComponent } from './components/placeholder-page/placeholder-page.component';
import { ProfilePageComponent } from './components/profile-page/profile-page.component';
import { ReadingPlansPageComponent } from './components/reading-plans-page/reading-plans-page.component';
import { RegisterComponent } from './components/register/register.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [guestGuard]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: HomeComponent },
      { path: 'reading-plans', component: ReadingPlansPageComponent },
      {
        path: 'bible',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'nvi' },
          { path: ':version/:book/:chapter', component: BiblePageComponent },
          { path: ':version', component: BiblePageComponent }
        ]
      },
      {
        path: 'statistics',
        component: PlaceholderPageComponent,
        data: { title: 'Estatísticas' }
      },
      {
        path: 'settings',
        component: ProfilePageComponent,
        data: { title: 'Ajustes' }
      }
    ]
  }
];
