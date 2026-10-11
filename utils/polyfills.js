// Serverless / Node.js runtime polyfills for PDF and canvas dependencies
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrix {
    constructor(init) {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0;
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0;
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0;
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1;
      this.is2D = true;
      this.isIdentity = true;
      if (Array.isArray(init) && init.length >= 6) {
        this.a = init[0]; this.b = init[1]; this.c = init[2];
        this.d = init[3]; this.e = init[4]; this.f = init[5];
        this.m11 = this.a; this.m12 = this.b; this.m21 = this.c; this.m22 = this.d;
        this.m41 = this.e; this.m42 = this.f;
      }
    }
    translate(tx = 0, ty = 0) { return this; }
    scale(sx = 1, sy = 1) { return this; }
    multiply(other) { return this; }
    multiplySelf(other) { return this; }
    preMultiplySelf(other) { return this; }
    invertSelf() { return this; }
    inverse() { return new DOMMatrix(); }
    transformPoint(point) { return point; }
    setMatrixValue() { return this; }
    toFloat32Array() { return new Float32Array(16); }
    toFloat64Array() { return new Float64Array(16); }
  }
  globalThis.DOMMatrix = DOMMatrix;
  global.DOMMatrix = DOMMatrix;
}

if (typeof globalThis.Path2D === 'undefined') {
  class Path2D {
    constructor() {}
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  }
  globalThis.Path2D = Path2D;
  global.Path2D = Path2D;
}

module.exports = {};
