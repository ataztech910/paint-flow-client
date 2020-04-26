import { Component, OnInit } from '@angular/core';
import {fromEvent, merge, Observable, Subject} from 'rxjs';
import {bufferWhen, map, pairwise, switchMap, takeUntil} from 'rxjs/operators';
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
  // readonly scale = window.devicePixelRatio;
  readonly tmpCanvasName = 'tmp_canvas';
  lineWidth = 5;
  io: SocketioService;
  private tmpCanvas: HTMLCanvasElement;
  private tmpCtx: any;
  private ctx: any;
  constructor(drawSocketService: SocketioService) {
    this.io = new SocketioService();
    const socketListen = Observable.create((observer) => {
      this.io.socket.on('drawing', (message) => {
        observer.next(message);
      });
    });
    socketListen.subscribe( data => {
      this.drawMe(this.tmpCtx, this.tmpCanvas, data.res, this.ctx);
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
          takeUntil(mouseUp),
          pairwise(),
          map((e: [MouseEvent, MouseEvent]) => (this.updateCoordinates(e))),
        );
      })
    );
  }
  updateCoordinates(res) {
    const rect = this.tmpCanvas.getBoundingClientRect();
    const prevPos = {
      x: res[0].clientX - rect.left,
      y: res[0].clientY - rect.top
    };
    const currentPos = {
      x: res[1].clientX - rect.left,
      y: res[1].clientY - rect.top
    };
    return {
      prevPos,
      currentPos
    };
    // {
    //   x: e.touches ? e.touches[0].pageX : e.offsetX,
    //     y: e.touches ? e.touches[0].pageY : e.offsetY,
    // }
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
      points = res;
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
    context.beginPath();
    if (points.prevPos) {
      context.moveTo(points.prevPos.x, points.prevPos.y);
      context.lineTo(points.currentPos.x, points.currentPos.y);
      context.stroke();
    }
    if (realContext) {
      return this.clearCanvas(context, canvas, realContext);
    }
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
