import Circle from "./shape/Circle";
import Dot from "./shape/Dot";
import Line from "./shape/Line";
import Polygon from "./shape/Polygon";
import Rect from "./shape/Rect";

export type Point = [number, number];
export type AllShape = Rect | Polygon | Dot | Line | Circle;

/** 0 不创建，1 矩形，2 多边形，3 点，4 折线，5 圆 */
export enum OpType {
    NONE = 0,
    RECT = 1,
    POLYGON = 2,
    DOT = 3,
    LINE = 4,
    CIRCLE = 5
}
