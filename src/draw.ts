import { AllShape, Point } from "./define";
import Circle from "./shape/Circle";
import Dot from "./shape/Dot";
import Line from "./shape/Line";
import Polygon from "./shape/Polygon";
import Rect from "./shape/Rect";

/**
     * 绘制矩形
     * @param shape 标注实例
     * @returns
     */
export function drawRect(shape: Rect) {
  if (shape.coor.length !== 2) return;
  const { strokeStyle, fillStyle, active, creating, coor, lineWidth } = shape;
  const [[x0, y0], [x1, y1]] = coor.map((a: Point) => a.map((b) => Math.round(b * this.scale)));
  this.ctx.save();
  this.ctx.lineWidth = lineWidth || this.lineWidth;
  this.ctx.fillStyle = fillStyle || this.fillStyle;
  this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
  const w = x1 - x0;
  const h = y1 - y0;
  if (!creating) this.ctx.fillRect(x0, y0, w, h);
  this.ctx.strokeRect(x0, y0, w, h);
  this.ctx.restore();
  this.drawLabel(coor[0], shape);
}

/**
* 绘制多边形
* @param shape 标注实例
*/
export function drawPolygon(shape: Polygon) {
  const { strokeStyle, fillStyle, active, creating, coor, lineWidth } = shape;
  this.ctx.save();
  this.ctx.lineJoin = 'round';
  this.ctx.lineWidth = lineWidth || this.lineWidth;
  this.ctx.fillStyle = fillStyle || this.fillStyle;
  this.ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
  this.ctx.beginPath();
  coor.forEach((el: Point, i) => {
      const [x, y] = el.map((a) => Math.round(a * this.scale));
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
  });
  if (creating) {
      const [x, y] = this.mouse || [];
      this.ctx.lineTo(x - this.originX, y - this.originY);
  } else if (coor.length > 2) {
    this.ctx.closePath();
  }
  this.ctx.fill();
  this.ctx.stroke();
  this.ctx.restore();
  this.drawLabel(coor[0], shape);
}

/**
* 绘制点
* @param shape 标注实例
*/
export function drawDot(shape: Dot) {
  const { strokeStyle, fillStyle, active, coor, lineWidth } = shape;
  const [x, y] = coor.map((a) => a * this.scale);
  this.ctx.save();
  this.ctx.lineWidth = lineWidth || this.lineWidth;
  this.ctx.fillStyle = fillStyle || this.ctrlFillStyle;
  this.ctx.strokeStyle = active ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
  this.ctx.beginPath();
  this.ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
  this.ctx.fill();
  this.ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
  this.ctx.stroke();
  this.ctx.restore();
  drawLabel.apply(this, [coor as Point, shape]);
}

/**
* 绘制圆
* @param shape 标注实例
*/
export function drawCirle(shape: Circle) {
  const ctx = this.ctx;
  const { strokeStyle, fillStyle, active, coor, label, creating, radius, ctrlsData, lineWidth } = shape;
  const [x, y] = coor.map((a) => a * this.scale);
  ctx.save();
  ctx.lineWidth = lineWidth || this.lineWidth;
  ctx.fillStyle = fillStyle || this.fillStyle;
  ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
  ctx.beginPath();
  ctx.arc(x, y, radius * this.scale, 0, 2 * Math.PI, true);
  ctx.fill();
  ctx.arc(x, y, radius * this.scale, 0, 2 * Math.PI, true);
  ctx.stroke();
  ctx.restore();
  this.drawLabel(ctrlsData[0] as Point, shape);
}

/**
* 绘制折线
* @param shape 标注实例
*/
export function drawLine(shape: Line) {
  const ctx = this.ctx;
  const { strokeStyle, active, creating, coor, lineWidth } = shape;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth || this.lineWidth;
  ctx.strokeStyle = (active || creating) ? this.activeStrokeStyle : (strokeStyle || this.strokeStyle);
  ctx.beginPath();
  coor.forEach((el: Point, i) => {
      const [x, y] = el.map((a) => Math.round(a * this.scale));
      if (i === 0) {
          ctx.moveTo(x, y);
      } else {
          ctx.lineTo(x, y);
      }
  });
  if (creating) {
      const [x, y] = this.mouse || [];
      ctx.lineTo(x - this.originX, y - this.originY);
  }
  ctx.stroke();
  ctx.restore();
  this.drawLabel(coor[0], shape);
}

/**
* 绘制控制点
* @param point 坐标
*/
export function drawCtrl(point: Point) {
  const ctx = this.ctx;
  const [x, y] = point.map((a) => a * this.scale);
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = this.ctrlFillStyle;
  ctx.strokeStyle = this.ctrlStrokeStyle;
  ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
  ctx.fill();
  ctx.arc(x, y, this.ctrlRadius, 0, 2 * Math.PI, true);
  ctx.stroke();
  ctx.restore();
}

/**
* 绘制控制点列表
* @param shape 标注实例
*/
export function drawCtrlList(shape: Rect | Polygon | Line) {
  shape.ctrlsData.forEach((point, i) => {
      if (shape.type === 5) {
          if (i === 1) this.drawCtrl(point);
      } else {
          this.drawCtrl(point);
      }
  });
}

/**
* 绘制label
* @param point 位置
* @param label 文本
*/
export function drawLabel(point: Point, shape: AllShape) {
  const { label = '', labelFillStyle = '', labelFont = '', textFillStyle = '', hideLabel, labelUp, lineWidth } = shape;
  const isHideLabel = typeof hideLabel === 'boolean' ? hideLabel : this.hideLabel;
  const isLabelUp = typeof labelUp === 'boolean' ? labelUp : this.labelUp;
  const currLineWidth = lineWidth || this.lineWidth;

  if (label.length && !isHideLabel) {
      this.ctx.font = labelFont || this.labelFont;
      const textPaddingLeft = 4;
      const textPaddingTop = 4;
      const newText = label.length < this.labelMaxLen + 1 ? label : `${label.slice(0, this.labelMaxLen)}...`;
      const text = this.ctx.measureText(newText);
      const font = parseInt(this.ctx.font) - 4;
      const labelWidth = text.width + textPaddingLeft * 2;
      const labelHeight = font + textPaddingTop * 2;
      const [x, y] = point.map((a) => a * this.scale);
      const toleft = (this.IMAGE_ORIGIN_WIDTH - point[0]) < labelWidth / this.scale;
      const toTop = (this.IMAGE_ORIGIN_HEIGHT - point[1]) < labelHeight / this.scale;
      const toTop2 = point[1] > labelHeight / this.scale;
      const isup = isLabelUp ? toTop2 : toTop;
      this.ctx.save();
      this.ctx.fillStyle = labelFillStyle || this.labelFillStyle;
      this.ctx.fillRect(toleft ? (x - text.width - textPaddingLeft - currLineWidth / 2) : (x + currLineWidth / 2), isup ? (y - labelHeight - currLineWidth / 2) : (y + currLineWidth / 2), labelWidth, labelHeight);
      this.ctx.fillStyle = textFillStyle || this.textFillStyle;
      this.ctx.fillText(newText, toleft ? (x - text.width) : (x + textPaddingLeft + currLineWidth / 2), isup ? (y - labelHeight + font + textPaddingTop) : (y + font + textPaddingTop + currLineWidth / 2), 180);
      this.ctx.restore();
  }
}
