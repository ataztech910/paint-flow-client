import { Component, OnInit } from '@angular/core';
import {fromEvent, merge, Observable, Subject} from 'rxjs';
import {bufferWhen, map, switchMap, takeUntil, throttle, throttleTime} from 'rxjs/operators';
import {SocketioService} from '../socketio.service';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent implements OnInit {
  readonly limit = 2550;
  readonly lineCap = 'round';
  readonly maxWidth = 1024;
  readonly maxHeight = 768;
  readonly scale = window.devicePixelRatio;
  readonly tmpCanvasName = 'tmp_canvas';
  lineWidth = 5;
  io: SocketioService;
  private tmpCanvas: HTMLCanvasElement;
  private tmpCtx: any;
  private ctx: any;
  constructor(drawSocketService: SocketioService) {
    this.io = new SocketioService();
   // this.io.socket.on('drawing', this.onDrawingEvent);
    const socketListen = Observable.create((observer) => {
      this.io.socket.on('drawing', (message) => {
        observer.next(message);
      });
    });
    let points = [];
    socketListen.subscribe( data => {
      points.push(data.res);
      points = this.drawMe(this.tmpCtx, this.tmpCanvas, points, this.ctx);
    });
  }
  initCanvas(create = false) {
    return create ? document.createElement('canvas') : document.querySelector('canvas');
  }
  initSketch() {
    return document.querySelector('#sketch');
  }
  initContext(canvas) {
    return canvas.getContext('2d');
  }
  initStream(mouseDown, mouseMove, mouseUp) {
    return mouseDown.pipe(
      switchMap(() => {
        return mouseMove.pipe(
          throttleTime(10),
          map((e: any) => ({
            x: e.touches ? e.touches[0].pageX : e.offsetX,
            y: e.touches ? e.touches[0].pageY : e.offsetY,
          })),
          takeUntil(mouseUp)
        );
      })
    );
  }
  initBuffer(limitOfCount, mouseUp) {
    return  new Subject().pipe(
      bufferWhen(() => merge(limitOfCount, mouseUp)),
    ) as Subject<any>;
  }
  initMouseEvents(context, canvas, realContext) {
    let points = [];
    const mouseMove = fromEvent(canvas, 'mousemove');
    const touchMove = fromEvent(canvas, 'touchmove', {passive: true});
    const mouseDown = fromEvent(canvas, 'mousedown');
    const touchDown = fromEvent(canvas, 'touchstart', {passive: true});
    const mouseUp = fromEvent(canvas, 'mouseup');
    const touchEnd = fromEvent(canvas, 'touchend');
    const mergeEventsStart = merge(mouseDown, touchDown);
    const mergeEventsMove = merge(mouseMove, touchMove);
    const mergeEventsUp = merge(mouseUp, touchEnd);
    const limitOfCount = new Subject();
    const stream = this.initStream(mergeEventsStart, mergeEventsMove, mergeEventsUp);
    const dataBuffer = this.initBuffer(limitOfCount, mergeEventsUp);
    dataBuffer.subscribe(() => {
      points = this.clearCanvas(context, canvas, realContext);
    });
    mouseUp.subscribe(() => {
      points = this.clearCanvas(context, canvas, realContext);
    });
    stream.subscribe(res => {
      points.push(res);
      this.io.socket.emit('drawing', {
        res
      });
      this.drawMe(context, canvas, points);
      if (points.length % this.limit === 0) {
        limitOfCount.next(true);
      }
      dataBuffer.next(res);
    });
  }
  drawMe(context, canvas, points, realContext = false) {
    if (!this.checkPointsArray(context, points.length, points[0])) {
      this.clearCanvas(context, canvas); // TODO implicit return.
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      let i = 0;
      for (i = 1; i < points.length - 2; i++) {
        const c = (points[i].x + points[i + 1].x) / 2;
        const d = (points[i].y + points[i + 1].y) / 2;
        context.quadraticCurveTo(points[i].x, points[i].y, c, d);
      }
      context.quadraticCurveTo(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
      context.stroke();
    }
    if (realContext) {
      return this.clearCanvas(context, canvas, realContext);
    }
  }
  checkPointsArray(context, size, point) {
    if (size < 3) {
      context.beginPath();
      context.arc(point.x, point.y, context.lineWidth / 2, 0, Math.PI * 2, !0);
      context.fill();
      context.closePath();
      return true;
    }
    return false;
  }
  clearCanvas(context, canvas, realContext = null) {
    if (realContext !== null) { realContext.drawImage(canvas, 0, 0); }
    context.clearRect(0, 0, canvas.width, canvas.height);
    return [];
  }
  ngOnInit(): void {
    const canvas = this.initCanvas(false);
    canvas.width = this.maxWidth;
    canvas.height = this.maxHeight;
    this.ctx = this.initContext(canvas);
    // ctx.scale(this.scale, this.scale);
    const sketch = this.initSketch();
    this.tmpCanvas = this.initCanvas(true);
    this.tmpCtx = this.initContext(this.tmpCanvas);
    this.tmpCanvas.id = this.tmpCanvasName;
    this.tmpCanvas.width = canvas.width;
    this.tmpCanvas.height = canvas.height;
    this.tmpCanvas.style.position = 'absolute';
    this.tmpCanvas.style.left = '0px';
    this.tmpCanvas.style.right = '0';
    this.tmpCanvas.style.bottom = '0';
    this.tmpCanvas.style.top = '0';
    this.tmpCanvas.style.cursor = 'crosshair';
    this.tmpCtx.lineJoin = this.tmpCtx.lineCap = this.lineCap;
    this.tmpCtx.lineWidth = this.lineWidth;
    sketch.appendChild(this.tmpCanvas);
    this.initMouseEvents(this.tmpCtx, this.tmpCanvas, this.ctx);
  }
}
