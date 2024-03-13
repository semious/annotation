import Rect from './shape/Rect';
import Polygon from './shape/Polygon';
import Dot from './shape/Dot';
import EventBus from './util/EventBus';
import Line from './shape/Line';
import Circle from './shape/Circle';
import pkg from '../package.json';
import { isNested } from "./tools";
import Magnify from "./util/magnify"
import { drawCirle, drawCtrlList, drawDot, drawLine, drawPolygon, drawRect } from './draw';
import { AllShape, OpType, Point } from './define';
import { handelDblclick, handelKeyup, handelMouseMove, handelMouseUp, handleContextmenu, handleLoad, handleMouseDown, handleMousewheel, mergeEvent } from './event';



export default class Annotation extends EventBus {
    /** 当前版本 */
    version = pkg.version;
    /** 只读模式，画布不允许任何交互 */
    lock: boolean = false;
    /** 只读模式，仅支持查看 */
    readonly: boolean = false;
    /** 最小矩形宽度 */
    MIN_WIDTH = 10;
    /** 最小矩形高度 */
    MIN_HEIGHT = 10;
    /** 最小圆形半径 */
    MIN_RADIUS = 3;
    /** 边线颜色 */
    strokeStyle = '#0f0';
    /** 填充颜色 */
    fillStyle = 'rgba(0, 0, 255,0.1)';
    /** 边线宽度 */
    lineWidth = 1;
    /** 当前选中的标注边线颜色 */
    activeStrokeStyle = '#f00';
    /** 当前选中的标注填充颜色 */
    activeFillStyle = 'rgba(255, 0, 0,0.1)';
    /** 控制点边线颜色 */
    ctrlStrokeStyle = '#000';
    /** 控制点填充颜色 */
    ctrlFillStyle = '#fff';
    /** 控制点半径 */
    ctrlRadius = 5;
    /** 是否隐藏标签 */
    hideLabel = true;
    /** 标签背景填充颜色 */
    labelFillStyle = '#fff';
    /** 标签字体 */
    labelFont = '10px sans-serif';
    /** 标签文字颜色 */
    textFillStyle = '#000';
    /** 标签字符最大长度，超出使用省略号 */
    labelMaxLen = 10;
    /** 画布宽度 */
    WIDTH = 0;
    /** 画布高度 */
    HEIGHT = 0;

    canvas: HTMLCanvasElement;

    ctx: CanvasRenderingContext2D;

    magnify: Magnify;

    /** 所有标注数据 */
    dataset: AllShape[] = [];

    offScreen: HTMLCanvasElement;

    offScreenCtx: CanvasRenderingContext2D;
    /** 记录锚点距离 */
    remember: number[][];
    /** 记录鼠标位置 */
    mouse: Point;
    /** 记录背景图鼠标位移 */
    rememberOrigin: number[] = [0, 0];
    /** 0 不创建，1 矩形，2 多边形，3 点，4 折线，5 圆 */
    createType = OpType.NONE; //
    /** 控制点索引 */
    ctrlIndex = -1;
    /** 背景图片 */
    image: HTMLImageElement = new Image();
    /** 图片原始宽度 */
    IMAGE_ORIGIN_WIDTH: number;
    /** 图片缩放宽度 */
    IMAGE_WIDTH = 0;
    /** 图片原始高度 */
    IMAGE_ORIGIN_HEIGHT = 0;
    /** 图片缩放高度 */
    IMAGE_HEIGHT = 0;
    /** 原点x */
    originX = 0;
    /** 原点y */
    originY = 0;
    /** 缩放步长 */
    scaleStep = 0;
    /** 滚动缩放 */
    scrollZoom = false;

    fitZoomScale = 1;

    private timer: any;
    /** 最小touch双击时间 */
    dblTouch = 300;
    /** 记录touch双击开始时间 */
    dblTouchStore = 0; //
    /** 这个选项可以帮助浏览器进行内部优化 */
    alpha = true;
    /** 专注模式 */
    focusMode = false;
    /** 记录当前事件 */
    private evt: MouseEvent | TouchEvent | KeyboardEvent;
    /** 触控缩放时记录上一次两点距离 */
    scaleTouchStore = 0;
    /** 当前是否为双指触控 */
    isTouch2 = false;
    isMobile = navigator.userAgent.includes('Mobile');
    /** 向上展示label */
    labelUp = false;
    handleLoad: (e: Event) => void;
    handleContextmenu: (e: MouseEvent) => void;
    handleMousewheel: (e: WheelEvent) => void;
    handleMouseDown: (e: MouseEvent | TouchEvent) => void;
    handelMouseMove: (e: MouseEvent | TouchEvent) => void;
    handelMouseUp: (e: MouseEvent | TouchEvent) => void;
    handelDblclick: (e: MouseEvent | TouchEvent) => void;
    handelKeyup: (e: KeyboardEvent) => void;
    /**
     * @param el Valid CSS selector string, or DOM
     * @param magnifyEl magnify Canvas ID
     */
    constructor(el: HTMLCanvasElement | string, imgSrc?: string, magnifyEl?: string,) {
        super();
        this.handleLoad = handleLoad.bind(this);
        this.handleContextmenu = handleContextmenu.bind(this);
        this.handleMousewheel = handleMousewheel.bind(this);
        this.handleMouseDown = handleMouseDown.bind(this);
        this.handelMouseMove = handelMouseMove.bind(this);
        this.handelMouseUp = handelMouseUp.bind(this);
        this.handelDblclick = handelDblclick.bind(this);
        this.handelKeyup = handelKeyup.bind(this);
        const container = typeof el === 'string' ? document.querySelector(el) : el;
        if (container instanceof HTMLCanvasElement) {
            this.canvas = container;
            this.offScreen = document.createElement('canvas');
            this.initSetting();
            this.initEvents();
            magnifyEl && (this.magnify = new Magnify(magnifyEl, container))
            imgSrc && this.setImage(imgSrc)
        } else {
            console.warn('HTMLCanvasElement is required!');
        }
    }

    /** 当前当前选中的标注 */
    get activeShape() {
        return this.dataset.find(x => x.active) || {} as any;
    }

    /** 当前缩放比例 */
    get scale() {
        if (this.IMAGE_ORIGIN_WIDTH && this.IMAGE_WIDTH) {
            return this.IMAGE_WIDTH / this.IMAGE_ORIGIN_WIDTH;
        }
        return 1;
    }

    /** 图片最小边尺寸 */
    get imageMin() {
        return Math.min(this.IMAGE_WIDTH, this.IMAGE_HEIGHT);
    }

    /** 图片原始最大边尺寸 */
    get imageOriginMax() {
        return Math.max(this.IMAGE_ORIGIN_WIDTH, this.IMAGE_ORIGIN_HEIGHT);
    }

    

    /** 初始化配置 */
    initSetting() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.style.userSelect = 'none';
        this.ctx = this.ctx || this.canvas.getContext('2d', { alpha: this.alpha });
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.WIDTH = this.canvas.clientWidth;
        this.HEIGHT = this.canvas.clientHeight;
        // console.log('this.WIDTH :>> ', this.WIDTH);
        // console.log('this.HEIGHT :>> ', this.HEIGHT);
        this.canvas.width = this.WIDTH * dpr;
        this.canvas.height = this.HEIGHT * dpr;
        this.canvas.style.width = this.WIDTH + 'px';
        this.canvas.style.height = this.HEIGHT + 'px';
        this.offScreen.width = this.WIDTH;
        this.offScreen.height = this.HEIGHT;
        this.offScreenCtx = this.offScreenCtx || this.offScreen.getContext('2d', { willReadFrequently: true });
        this.ctx.scale(dpr, dpr);
    }

    /** 初始化事件 */
    initEvents() {
        this.image.addEventListener('load', this.handleLoad);
        this.canvas.addEventListener('touchstart', this.handleMouseDown);
        this.canvas.addEventListener('touchmove', this.handelMouseMove);
        this.canvas.addEventListener('touchend', this.handelMouseUp);
        this.canvas.addEventListener('contextmenu', this.handleContextmenu);
        this.canvas.addEventListener('mousewheel', this.handleMousewheel);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handelMouseMove);
        this.canvas.addEventListener('mouseup', this.handelMouseUp);
        this.canvas.addEventListener('dblclick', this.handelDblclick);
        document.body.addEventListener('keyup', this.handelKeyup, true);
    }

    /**
     * 添加/切换图片
     * @param url 图片链接
     */
    setImage(url: string) {
        this.image.src = url;
    }

    /**
     * 设置数据
     * @param data Array
     */
    setData(data: AllShape[]) {
        setTimeout(() => {
            const initdata: AllShape[] = [];
            data.forEach((item, index) => {
                if (Object.prototype.toString.call(item).includes('Object')) {
                    let shape: AllShape;
                    switch (item.type) {
                        case 1:
                            shape = new Rect(item, index);
                            break;
                        case 2:
                            shape = new Polygon(item, index);
                            break;
                        case 3:
                            shape = new Dot(item, index);
                            break;
                        case 4:
                            shape = new Line(item, index);
                            break;
                        case 5:
                            shape = new Circle(item, index);
                            break;
                        default:
                            console.warn('Invalid shape', item);
                            break;
                    }
                    [1, 2, 3, 4, 5].includes(item.type) && initdata.push(shape);
                } else {
                    console.warn('Shape must be an enumerable Object.', item);
                }
            });
            this.dataset = initdata;
            this.update();
        });
    }

    /**
     * 判断是否在标注实例上
     * @param mousePoint 点击位置
     * @returns
     */
    hitOnShape(mousePoint: Point): [number, AllShape] {
        let hitShapeIndex = -1;
        let hitShape: AllShape;
        for (let i = this.dataset.length - 1; i > -1; i--) {
            const shape = this.dataset[i];
            if (
                (shape.type === 3 && this.isPointInCircle(mousePoint, shape.coor as Point, this.ctrlRadius)) ||
                (shape.type === 5 && this.isPointInCircle(mousePoint, shape.coor as Point, (shape as Circle).radius * this.scale)) ||
                (shape.type === 1 && this.isPointInRect(mousePoint, (shape as Rect).coor)) ||
                (shape.type === 2 && this.isPointInPolygon(mousePoint, (shape as Polygon).coor)) ||
                (shape.type === 4 && this.isPointInLine(mousePoint, (shape as Line).coor))
            ) {
                if (this.focusMode && !shape.active) continue;
                hitShapeIndex = i;
                hitShape = shape;
                break;
            }
        }
        return [hitShapeIndex, hitShape];
    }

    /**
     * 判断鼠标是否在背景图内部
     * @param e MouseEvent
     * @returns 布尔值
     */
    isInBackground(e: MouseEvent | TouchEvent): boolean {
        const { mouseX, mouseY } = mergeEvent.call(this,e);
        return mouseX >= this.originX &&
            mouseY >= this.originY &&
            mouseX <= this.originX + this.IMAGE_ORIGIN_WIDTH * this.scale &&
            mouseY <= this.originY + this.IMAGE_ORIGIN_HEIGHT * this.scale;
    }

    /**
     * 判断是否在矩形内
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 布尔值
     */
    isPointInRect(point: Point, coor: Point[]): boolean {
        const [x, y] = point;
        const [[x0, y0], [x1, y1]] = coor.map((a) => a.map((b) => b * this.scale));
        return x0 + this.originX <= x &&
            x <= x1 + this.originX &&
            y0 + this.originY <= y &&
            y <= y1 + this.originY;
    }

    /**
     * 判断是否在多边形内
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 布尔值
     */
    isPointInPolygon(point: Point, coor: Point[]): boolean {
        this.offScreenCtx.save();
        this.offScreenCtx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        this.offScreenCtx.translate(this.originX, this.originY);
        this.offScreenCtx.beginPath();
        coor.forEach((pt, i) => {
            const [x, y] = pt.map((a) => Math.round(a * this.scale));
            if (i === 0) {
                this.offScreenCtx.moveTo(x, y);
            } else {
                this.offScreenCtx.lineTo(x, y);
            }
        });
        this.offScreenCtx.closePath();
        this.offScreenCtx.fill();
        const areaData = this.offScreenCtx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
        const index = (point[1] - 1) * this.WIDTH * 4 + point[0] * 4;
        this.offScreenCtx.restore();
        return areaData.data[index + 3] !== 0;
    }

    /**
     * 判断是否在圆内
     * @param point 坐标
     * @param center 圆心
     * @param r 半径
     * @param needScale 是否为圆形点击检测
     * @returns 布尔值
     */
    isPointInCircle(point: Point, center: Point, r: number): boolean {
        const [x, y] = point;
        const [x0, y0] = center.map((a) => a * this.scale);
        const distance = Math.sqrt((x0 + this.originX - x) ** 2 + (y0 + this.originY - y) ** 2);
        return distance <= r;
    }

    /**
     * 判断是否在折线内
     * @param point 坐标
     * @param coor 区域坐标
     * @returns 布尔值
     */
    isPointInLine(point: Point, coor: Point[]): boolean {
        this.offScreenCtx.save();
        this.offScreenCtx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
        this.offScreenCtx.translate(this.originX, this.originY);
        this.offScreenCtx.lineWidth = 5;
        this.offScreenCtx.beginPath();
        coor.forEach((pt, i) => {
            const [x, y] = pt.map((a) => Math.round(a * this.scale));
            if (i === 0) {
                this.offScreenCtx.moveTo(x, y);
            } else {
                this.offScreenCtx.lineTo(x, y);
            }
        });
        this.offScreenCtx.stroke();
        const areaData = this.offScreenCtx.getImageData(0, 0, this.WIDTH, this.HEIGHT);
        const index = (point[1] - 1) * this.WIDTH * 4 + point[0] * 4;
        this.offScreenCtx.restore();
        return areaData.data[index + 3] !== 0;
    }

    /**
       * 判断是图形是否属于嵌套关系 (目前只支持矩形和多边形)
       * @param shape1 标注实例
       * @param shape2 标注实例
       * @returns 布尔值
       */
    isNested(shape1: Rect | Polygon, shape2: Rect | Polygon): boolean {
        return isNested(shape1, shape2);
    }

    /**
     * 更新画布
     */
    update() {
        window.cancelAnimationFrame(this.timer);
        this.timer = window.requestAnimationFrame(() => {
            this.ctx.save();
            this.ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
            this.ctx.translate(this.originX, this.originY);
            if (this.IMAGE_WIDTH && this.IMAGE_HEIGHT) {
                this.ctx.drawImage(this.image, 0, 0, this.IMAGE_WIDTH, this.IMAGE_HEIGHT);
            }
            const renderList = this.focusMode ? (this.activeShape.type ? [this.activeShape] : []) : this.dataset;
            for (let i = 0; i < renderList.length; i++) {
                const shape = renderList[i];
                if (shape.hide) continue;
                switch (shape.type) {
                    case OpType.RECT:
                        drawRect.call(this, shape as Rect);
                        break;
                    case OpType.POLYGON:
                        drawPolygon.call(this, shape as Polygon);
                        break;
                    case OpType.DOT:
                        drawDot.call(this, shape as Dot);
                        break;
                    case OpType.LINE:
                        drawLine.call(this, shape as Line);
                        break;
                    case OpType.CIRCLE:
                        drawCirle.call(this, shape as Circle);
                        break;
                    default:
                        break;
                }
            }
            if ([1, 2, 4, 5].includes(this.activeShape.type) && !this.activeShape.hide) {
                drawCtrlList.call(this, this.activeShape);
            }
            this.ctx.restore();
            this.emit('updated', this.dataset);
        });
    }

    /**
     * 删除指定矩形
     * @param index number
     */
    deleteByIndex(index: number) {
        const num = this.dataset.findIndex((x: AllShape) => x.index === index);
        if (num > -1) {
            this.emit('delete', this.dataset[num]);
            this.dataset.splice(num, 1);
            this.dataset.forEach((item, i) => { item.index = i; });
            this.update();
        }
    }

    /**
     * 计算缩放步长
     */
    calcStep(flag = '') {
        if (this.IMAGE_WIDTH < this.WIDTH && this.IMAGE_HEIGHT < this.HEIGHT) {
            if (flag === '' || flag === 'b') {
                this.setScale(true, false, true);
                this.calcStep('b');
            }
        }
        if (this.IMAGE_WIDTH > this.WIDTH || this.IMAGE_HEIGHT > this.HEIGHT) {
            if (flag === '' || flag === 's') {
                this.setScale(false, false, true);
                this.calcStep('s');
            }
        }
    }

    /**
     * 缩放指定倍数
     */
    zoom(scale: number) {
        if (this.lock) return;
        const steps = 20 * scale;
        for (let i = 0; i < steps; i++) {
            this.setScale(true, true);
        }
    }

    /**
     * 缩放
     * @param type true放大5%，false缩小5%
     * @param center 缩放中心 center|mouse
     * @param pure 不绘制
     */
    setScale(type: boolean, byMouse = false, pure = false, ratio = 0.1) {
        if (this.lock) return;
        if ((!type && this.imageMin < 20) || (type && this.IMAGE_WIDTH > this.imageOriginMax * 100)) return;
        if (type) { this.scaleStep++; } else { this.scaleStep--; }
        let realToLeft = 0;
        let realToRight = 0;
        const [x, y] = this.mouse || [];
        if (byMouse) {
            realToLeft = (x - this.originX) / this.scale;
            realToRight = (y - this.originY) / this.scale;
        }
        const abs = Math.abs(this.scaleStep);
        const width = this.IMAGE_WIDTH;
        const upRatio = 1 + ratio;
        const downRatio = 1 - ratio;

        this.IMAGE_WIDTH = Math.round(this.IMAGE_ORIGIN_WIDTH * (this.scaleStep >= 0 ? upRatio : downRatio) ** abs);
        this.IMAGE_HEIGHT = Math.round(this.IMAGE_ORIGIN_HEIGHT * (this.scaleStep >= 0 ? upRatio : downRatio) ** abs);
        if (byMouse) {
            this.originX = x - realToLeft * this.scale;
            this.originY = y - realToRight * this.scale;
        } else {
            const scale = this.IMAGE_WIDTH / width;
            this.originX = this.WIDTH / 2 - (this.WIDTH / 2 - this.originX) * scale;
            this.originY = this.HEIGHT / 2 - (this.HEIGHT / 2 - this.originY) * scale;
        }
        if (!pure) {
            this.update();
            console.log('this.scale :>> ', this.scale);
        }
    }

    /**
     * 适配背景图
     */
    fitZoom() {
        this.calcStep();
        if (this.IMAGE_HEIGHT / this.IMAGE_WIDTH >= this.HEIGHT / this.WIDTH) {
            this.IMAGE_WIDTH = this.IMAGE_ORIGIN_WIDTH / (this.IMAGE_ORIGIN_HEIGHT / this.HEIGHT);
            this.IMAGE_HEIGHT = this.HEIGHT;
        } else {
            this.IMAGE_WIDTH = this.WIDTH;
            this.IMAGE_HEIGHT = this.IMAGE_ORIGIN_HEIGHT / (this.IMAGE_ORIGIN_WIDTH / this.WIDTH);
        }
        this.originX = (this.WIDTH - this.IMAGE_WIDTH) / 2;
        this.originY = (this.HEIGHT - this.IMAGE_HEIGHT) / 2;
        this.update();
        this.fitZoomScale = this.scale
        console.log('this.fitZoomValue :>> ', this.fitZoomScale);
    }

    /**
     * 设置专注模式
     * @param type {boolean}
     */
    setFocusMode(type: boolean) {
        this.focusMode = type;
        this.update();
    }

    /**
     * 销毁
     */
    destroy() {
        this.image.removeEventListener('load', this.handleLoad);
        this.canvas.removeEventListener('contextmenu', this.handleContextmenu);
        this.canvas.removeEventListener('mousewheel', this.handleMousewheel);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('touchend', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handelMouseMove);
        this.canvas.removeEventListener('touchmove', this.handelMouseMove);
        this.canvas.removeEventListener('mouseup', this.handelMouseUp);
        this.canvas.removeEventListener('touchend', this.handelMouseUp);
        this.canvas.removeEventListener('dblclick', this.handelDblclick);
        document.body.removeEventListener('keyup', this.handelKeyup, true);
        this.canvas.width = this.WIDTH;
        this.canvas.height = this.HEIGHT;
        this.canvas.style.width = null;
        this.canvas.style.height = null;
        this.canvas.style.userSelect = null;
    }

    /**
     * 重新设置画布大小
     */
    resize() {
        this.canvas.width = null;
        this.canvas.height = null;
        this.canvas.style.width = null;
        this.canvas.style.height = null;
        this.initSetting();
        this.update();
    }
}
