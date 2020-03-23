import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TestapiComponent } from './testapi/testapi.component';


const routes: Routes = [
  { path: 'testapi', component: TestapiComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
