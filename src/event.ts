import { AllShape, OpType, Point } from "./define";
import Circle from "./shape/Circle";
import Dot from "./shape/Dot";
import Line from "./shape/Line";
import Polygon from "./shape/Polygon";
import Rect from "./shape/Rect";

/** 合成事件 */
export function mergeEvent(e: TouchEvent | MouseEvent) {
  let mouseX = 0;
  let mouseY = 0;
  let mouseCX = 0;
  let mouseCY = 0;
  if (this.isMobile) {
    const { clientX, clientY } = (e as TouchEvent).touches[0];
    const target = e.target as HTMLCanvasElement;
    const { left, top } = target.getBoundingClientRect();
    mouseX = Math.round(clientX - left);
    mouseY = Math.round(clientY - top);
    if ((e as TouchEvent).touches.length === 2) {
      const { clientX: clientX1 = 0, clientY: clientY1 = 0 } = (e as TouchEvent).touches[1] || {};
      mouseCX = Math.round(Math.abs((clientX1 - clientX) / 2 + clientX) - left);
      mouseCY = Math.round(Math.abs((clientY1 - clientY) / 2 + clientY) - top);
    }
  } else {
    mouseX = (e as MouseEvent).offsetX;
    mouseY = (e as MouseEvent).offsetY;
  }
  return { ...e, mouseX, mouseY, mouseCX, mouseCY };
}

export function syncMousePoint(e: MouseEvent | TouchEvent) {
  const { mouseX, mouseY, mouseCX, mouseCY } = mergeEvent.call(this,e);
  this.mouse = this.isMobile && (e as TouchEvent).touches.length === 2 ? [mouseCX, mouseCY] : [mouseX, mouseY];
  console.log('this.mouse :>> ', this.mouse);
}

export function handleLoad() {
  this.emit('load', this.image.src);
  this.IMAGE_ORIGIN_WIDTH = this.IMAGE_WIDTH = this.image.width;
  this.IMAGE_ORIGIN_HEIGHT = this.IMAGE_HEIGHT = this.image.height;
  this.fitZoom();
}

export function handleContextmenu(e: MouseEvent) {
  e.preventDefault();
  console.log('this :>> ', this);
  // console.log('contextmenu :>> ', e);
  console.log('this.scale :>> ', this.scale);
  console.log('this.fitZoomScale :>> ', this.fitZoomScale);
  this.evt = e;
  if (this.lock) return;
  const { mouseX, mouseY } = mergeEvent.call(this, e);
  this.mouse = [mouseX, mouseY];
  syncMousePoint.call(this, e);
  if (Math.abs(this.scale - this.fitZoomScale) > 0.01) {
    this.fitZoom();
  } else {
    // this.setScale(true, true, false, 2);
    this.zoom(2);
    // this.setScale(true, true, false);
    console.log('this.scale :>> ', this.scale);
  }
}

export function handleMousewheel(e: WheelEvent) {
  e.stopPropagation();
  this.evt = e;
  if (this.lock || !this.scrollZoom) return;
  const { mouseX, mouseY } = mergeEvent.call(this, e);
  this.mouse = [mouseX, mouseY];
  console.log('e.deltaY :>> ', e.deltaY);
  this.setScale(e.deltaY < 0, true);
}

export function handleMouseDown(e: MouseEvent | TouchEvent) {
  e.stopPropagation();
  this.evt = e;
  if (this.lock) return;
  const { mouseX, mouseY, mouseCX, mouseCY } = mergeEvent.call(this, e);
  const offsetX = Math.round(mouseX / this.scale);
  const offsetY = Math.round(mouseY / this.scale);
  this.mouse = this.isMobile && (e as TouchEvent).touches.length === 2 ? [mouseCX, mouseCY] : [mouseX, mouseY];
  this.rememberOrigin = [mouseX - this.originX, mouseY - this.originY];
  if ((!this.isMobile && (e as MouseEvent).buttons === 1) || (this.isMobile && (e as TouchEvent).touches.length === 1)) { // 鼠标左键
    const ctrls = this.activeShape.ctrlsData || [];
    this.ctrlIndex = ctrls.findIndex((coor: Point) => this.isPointInCircle(this.mouse, coor, this.ctrlRadius));
    if (this.ctrlIndex > -1) { // 点击到控制点
      const [x0, y0] = ctrls[this.ctrlIndex];
      this.remember = [[offsetX - x0, offsetY - y0]];
    } else if (this.isInBackground(e)) {
      if (this.activeShape.creating && !this.readonly) { // 创建中
        if ([2, 4].includes(this.activeShape.type)) {
          const [x, y] = this.activeShape.coor[this.activeShape.coor.length - 1];
          if (x !== offsetX && y !== offsetY) {
            const nx = Math.round(offsetX - this.originX / this.scale);
            const ny = Math.round(offsetY - this.originY / this.scale);
            this.activeShape.coor.push([nx, ny]);
          }
        }
      } else if (this.createType !== OpType.NONE && !this.readonly) { // 开始创建
        let newShape;
        const nx = Math.round(offsetX - this.originX / this.scale);
        const ny = Math.round(offsetY - this.originY / this.scale);
        const curPoint: Point = [nx, ny];
        switch (this.createType) {
          case OpType.RECT:
            newShape = new Rect({ coor: [curPoint, curPoint] }, this.dataset.length);
            newShape.creating = true;
            break;
          case OpType.POLYGON:
            newShape = new Polygon({ coor: [curPoint] }, this.dataset.length);
            newShape.creating = true;
            break;
          case OpType.DOT:
            newShape = new Dot({ coor: curPoint }, this.dataset.length);
            this.emit('add', newShape);
            break;
          case OpType.LINE:
            newShape = new Line({ coor: [curPoint] }, this.dataset.length);
            newShape.creating = true;
            break;
          case OpType.CIRCLE:
            newShape = new Circle({ coor: curPoint }, this.dataset.length);
            newShape.creating = true;
            break;
          default:
            break;
        }
        this.dataset.forEach((sp: AllShape) => { sp.active = false; });
        newShape.active = true;
        this.dataset.push(newShape);
      } else {
        // 是否点击到形状
        const [hitShapeIndex, hitShape] = this.hitOnShape(this.mouse);
        if (hitShapeIndex > -1) {
          hitShape.dragging = true;
          this.dataset.forEach((item: any, i: number) => item.active = i === hitShapeIndex);
          this.dataset.splice(hitShapeIndex, 1);
          this.dataset.push(hitShape);
          if (!this.readonly) {
            this.remember = [];
            if ([3, 5].includes(hitShape.type)) {
              const [x, y] = hitShape.coor;
              this.remember = [[offsetX - x, offsetY - y]];
            } else {
              hitShape.coor.forEach((pt: any) => {
                this.remember.push([offsetX - pt[0], offsetY - pt[1]]);
              });
            }
          }
          this.emit('select', hitShape);
        } else {
          this.activeShape.active = false;
          this.dataset.sort((a: AllShape, b: AllShape) => a.index - b.index);
          this.emit('select', null);
        }
      }
      this.update();
    }
  }
}

export function handelMouseMove(e: MouseEvent | TouchEvent) {
  // const dpr = window.devicePixelRatio || 1;
  e.stopPropagation();
  this.evt = e;
  if (this.lock) return;
  const { mouseX, mouseY, mouseCX, mouseCY } = mergeEvent.call(this, e);
  const offsetX = Math.round(mouseX / this.scale);
  const offsetY = Math.round(mouseY / this.scale);
  this.mouse = this.isMobile && (e as TouchEvent).touches.length === 2 ? [mouseCX, mouseCY] : [mouseX, mouseY];
  // console.log('this.offset :>>', mouseX, mouseY)
  // console.log('this.mouse :>> ', this.mouse);
  // console.log('this.magnify :>> ', this.magnify);
  // console.log('this.canvas.width :>> ', this.canvas.width);
  // if (this.magnify) {
  //     this.magnify.magnify((mouseX - 20) * dpr, (mouseY - 20) * dpr);
  // }

  if (((!this.isMobile && (e as MouseEvent).buttons === 1) || (this.isMobile && (e as TouchEvent).touches.length === 1)) && this.activeShape.type) {
    if (this.ctrlIndex > -1 && (this.isInBackground(e) || this.activeShape.type === 5)) {
      const [[x, y]] = this.remember;
      // resize矩形
      if (this.activeShape.type === 1) {
        const [[x0, y0], [x1, y1]] = this.activeShape.coor;
        let coor: Point[] = [];
        switch (this.ctrlIndex) {
          case 0:
            coor = [[offsetX - x, offsetY - y], [x1, y1]];
            break;
          case 1:
            coor = [[x0, offsetY - y], [x1, y1]];
            break;
          case 2:
            coor = [[x0, offsetY - y], [offsetX - x, y1]];
            break;
          case 3:
            coor = [[x0, y0], [offsetX - x, y1]];
            break;
          case 4:
            coor = [[x0, y0], [offsetX - x, offsetY - y]];
            break;
          case 5:
            coor = [[x0, y0], [x1, offsetY - y]];
            break;
          case 6:
            coor = [[offsetX - x, y0], [x1, offsetY - y]];
            break;
          case 7:
            coor = [[offsetX - x, y0], [x1, y1]];
            break;
          default:
            break;
        }
        let [[a0, b0], [a1, b1]] = coor;
        if (
          a0 < 0 ||
          a1 < 0 ||
          b0 < 0 ||
          b1 < 0 ||
          a1 > this.IMAGE_ORIGIN_WIDTH ||
          b1 > this.IMAGE_ORIGIN_HEIGHT
        ) {
          // 偶然触发 超出边界处理
          a0 < 0 && (a0 = 0);
          a1 < 0 && (a1 = 0);
          b0 < 0 && (b0 = 0);
          b1 < 0 && (b1 = 0);
          if (a1 > this.IMAGE_ORIGIN_WIDTH) {
            a1 = this.IMAGE_ORIGIN_WIDTH;
          }
          if (b1 > this.IMAGE_ORIGIN_HEIGHT) {
            b1 = this.IMAGE_ORIGIN_HEIGHT;
          }
        }

        if (a1 - a0 >= this.MIN_WIDTH && b1 - b0 >= this.MIN_HEIGHT) {
          this.activeShape.coor = [[a0, b0], [a1, b1]];
        } else {
          this.emit('warn', `Width cannot be less than ${this.MIN_WIDTH},Height cannot be less than${this.MIN_HEIGHT}。`);
        }
      } else if ([2, 4].includes(this.activeShape.type)) {
        const nx = Math.round(offsetX - this.originX / this.scale);
        const ny = Math.round(offsetY - this.originY / this.scale);
        const newPoint = [nx, ny];
        this.activeShape.coor.splice(this.ctrlIndex, 1, newPoint);
      } else if (this.activeShape.type === 5) {
        const nx = Math.round(offsetX - this.originX / this.scale);
        const newRadius = nx - this.activeShape.coor[0];
        if (newRadius >= this.MIN_RADIUS) this.activeShape.radius = newRadius;
      }
    } else if (this.activeShape.dragging && !this.readonly) { // 拖拽
      let coor = [];
      let noLimit = true;
      const w = this.IMAGE_ORIGIN_WIDTH || this.WIDTH;
      const h = this.IMAGE_ORIGIN_HEIGHT || this.HEIGHT;
      if ([3, 5].includes(this.activeShape.type)) {
        const [t1, t2] = this.remember[0];
        const x = offsetX - t1;
        const y = offsetY - t2;
        if (x < 0 || x > w || y < 0 || y > h) noLimit = false;
        coor = [x, y];
      } else {
        for (let i = 0; i < this.activeShape.coor.length; i++) {
          const tar = this.remember[i];
          const x = offsetX - tar[0];
          const y = offsetY - tar[1];
          if (x < 0 || x > w || y < 0 || y > h) noLimit = false;
          coor.push([x, y]);
        }
      }
      if (noLimit) this.activeShape.coor = coor;
    } else if (this.activeShape.creating && this.isInBackground(e)) {
      const x = Math.round(offsetX - this.originX / this.scale);
      const y = Math.round(offsetY - this.originY / this.scale);
      // 创建矩形
      if (this.activeShape.type === 1) {
        this.activeShape.coor.splice(1, 1, [x, y]);
      } else if (this.activeShape.type === 5) {
        const [x0, y0] = this.activeShape.coor;
        const r = Math.sqrt((x0 - x) ** 2 + (y0 - y) ** 2);
        this.activeShape.radius = r;
      }
    }
    this.update();
  } else if ([2, 4].includes(this.activeShape.type) && this.activeShape.creating) {
    // 多边形添加点
    this.update();
  } else if ((!this.isMobile && (e as MouseEvent).buttons === 2 && (e as MouseEvent).which === 3) || (this.isMobile && (e as TouchEvent).touches.length === 1 && !this.isTouch2)) {
    // 拖动背景
    this.originX = Math.round(mouseX - this.rememberOrigin[0]);
    this.originY = Math.round(mouseY - this.rememberOrigin[1]);
    this.update();
  } else if (this.isMobile && (e as TouchEvent).touches.length === 2) {
    this.isTouch2 = true;
    const touch0 = (e as TouchEvent).touches[0];
    const touch1 = (e as TouchEvent).touches[1];
    const cur = this.scaleTouchStore;
    this.scaleTouchStore = Math.abs((touch1.clientX - touch0.clientX) * (touch1.clientY - touch0.clientY));
    this.setScale(this.scaleTouchStore > cur, true);
  }



}

export function handelMouseUp(e: MouseEvent | TouchEvent) {
  e.stopPropagation();
  this.evt = e;
  if (this.lock) return;
  if (this.isMobile) {
    if ((e as TouchEvent).touches.length === 0) {
      this.isTouch2 = false;
    }
    if ((Date.now() - this.dblTouchStore) < this.dblTouch) {
      this.handelDblclick(e);
      return;
    }
    this.dblTouchStore = Date.now();
  }
  this.remember = [];
  if (this.activeShape.type) {
    this.activeShape.dragging = false;
    if (this.activeShape.creating) {
      if (this.activeShape.type === 1) {
        const [[x0, y0], [x1, y1]] = this.activeShape.coor;
        if (Math.abs(x0 - x1) < this.MIN_WIDTH || Math.abs(y0 - y1) < this.MIN_HEIGHT) {
          this.dataset.pop();
          this.emit('warn', `Width cannot be less than ${this.MIN_WIDTH},Height cannot be less than ${this.MIN_HEIGHT}`);
        } else {
          this.activeShape.coor = [[Math.min(x0, x1), Math.min(y0, y1)], [Math.max(x0, x1), Math.max(y0, y1)]];
          this.activeShape.creating = false;
          this.emit('add', this.activeShape);
        }
      } else if (this.activeShape.type === 5) {
        if (this.activeShape.radius < this.MIN_RADIUS) {
          this.dataset.pop();
          this.emit('warn', `Radius cannot be less than ${this.MIN_WIDTH}`);
        } else {
          this.activeShape.creating = false;
          this.emit('add', this.activeShape);
        }
      }
      this.update();
    }
  }
}

export function handelDblclick(e: MouseEvent | TouchEvent) {
  e.stopPropagation();
  this.evt = e;
  if (this.lock) return;
  if ([2, 4].includes(this.activeShape.type)) {
    if ((this.activeShape.type === 2 && this.activeShape.coor.length > 2) ||
      (this.activeShape.type === 4 && this.activeShape.coor.length > 1)
    ) {
      this.emit('add', this.activeShape);
      this.activeShape.creating = false;
      this.update();
    }
  }
}

export function handelKeyup(e: KeyboardEvent) {
  e.stopPropagation();
  console.log('e :>> ', e);
  this.evt = e;
  if (this.lock || document.activeElement !== document.body || this.readonly) return;
  if (this.activeShape.type) {
    if ([2, 4].includes(this.activeShape.type) && e.key === 'Escape') {
      if (this.activeShape.coor.length > 1 && this.activeShape.creating) {
        this.activeShape.coor.pop();
      } else {
        this.deleteByIndex(this.activeShape.index);
      }
      this.update();
    } else if (e.key === 'Backspace') {
      this.deleteByIndex(this.activeShape.index);
    }
  }
}
