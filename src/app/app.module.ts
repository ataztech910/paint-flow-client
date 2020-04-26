import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { CanvasComponent } from './canvas/canvas.component';
import {SocketioService} from "./socketio.service";

@NgModule({
  declarations: [
    AppComponent,
    CanvasComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [SocketioService],
  bootstrap: [AppComponent]
})
export class AppModule { }
