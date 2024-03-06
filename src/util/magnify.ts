export default class Magnify {
  sourceCanvas: HTMLCanvasElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  ctx: CanvasRenderingContext2D;

  constructor(el: HTMLCanvasElement | string, canvas: HTMLCanvasElement) {
    const container = typeof el === 'string' ? document.querySelector(el) : el;
    if (container instanceof HTMLCanvasElement) {
      this.canvas = container;
      this.context = container.getContext('2d');
      this.sourceCanvas = canvas;
    } else {
      console.warn('HTMLCanvasElement is required!');
    }
  }

  magnify(sourceX: number, sourceY: number) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(
      this.sourceCanvas,
      sourceX,
      sourceY,
      90,
      90,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }
}
