import * as io from 'socket.io-client';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SocketioService {
  private url = 'https://paint-flow.herokuapp.com';
  socket;
  constructor() {
    this.setupSocketConnection();
  }
  setupSocketConnection() {
    this.socket = io(this.url);
  }
}
