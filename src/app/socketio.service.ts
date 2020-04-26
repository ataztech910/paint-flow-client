import * as io from 'socket.io-client';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SocketioService {
  private url = 'http://localhost:5000';
  socket;
  constructor() {
    this.setupSocketConnection();
  }
  setupSocketConnection() {
    this.socket = io(this.url);
  }
}
