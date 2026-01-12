"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const Light = {
  BackgroundColor: "rgba(255,255,255,1)",
  AttractorColor: "rgba(0,0,0,.5)",
  BranchColor: "rgba(0,0,0,1)",
  TipColor: "rgba(255,0,0,1)",
  AttractionZoneColor: "rgba(0,255,0,.002)",
  KillZoneColor: "rgba(255,0,0,.4)",
  InfluenceLinesColor: "rgba(0,0,255,1)",
  BoundsFillColor: "rgba(0,0,0,.1)",
  BoundsBorderColor: "rgba(0,0,0,.1)",
  ObstacleFillColor: "rgba(0,0,0,.7)"
};
const Dark = {
  BackgroundColor: "rgba(0,0,0,.9)",
  AttractorColor: "rgba(255,255,255,.5)",
  BranchColor: "rgba(255,255,255,1)",
  TipColor: "rgba(0,255,255,1)",
  AttractionZoneColor: "rgba(255,255,255,.002)",
  KillZoneColor: "rgba(255,0,0,.4)",
  InfluenceLinesColor: "rgba(255,255,255,.2)",
  BoundsFillColor: "rgba(255,255,255,0)",
  BoundsBorderColor: "rgba(255,255,255,.05)",
  ObstacleFillColor: "rgba(255,255,255,.2)"
};
const Realistic = {
  BackgroundColor: "rgba(255,255,255,1)",
  AttractorColor: "rgba(255,255,255,1)",
  BranchColor: "rgba(255,255,255,.6)",
  // BranchColor: 'rgba(0,0,0,.2)',
  TipColor: "rgba(255,0,0,1)",
  AttractionZoneColor: "rgba(0,255,0,.002)",
  KillZoneColor: "rgba(255,0,0,.4)",
  InfluenceLinesColor: "rgba(0,0,255,1)",
  BoundsFillColor: "rgba(61,166,12,1)",
  BoundsBorderColor: "rgba(255,255,255,1)",
  ObstacleFillColor: "rgba(255,255,255,1)"
};
const Custom = {
  BackgroundColor: "rgb(242,242,242)",
  AttractorColor: "rgba(255,255,255,.6)",
  BranchColor: "rgba(255,255,255,1)",
  InfluenceLinesColor: "rgba(255,255,255,.3)",
  // BoundsFillColor: 'rgb(61,85,136)',
  // BoundsBorderColor: 'rgb(61,85,136)'
  BoundsFillColor: "rgb(210, 81, 94)",
  BoundsBorderColor: "rgb(210, 81, 94)"
};
const ColorPresets = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Custom,
  Dark,
  Light,
  Realistic
}, Symbol.toStringTag, { value: "Module" }));
const Defaults = {
  /**
    Simulation configurations
  */
  VenationType: "Open",
  // venation can be "Open" or "Closed"
  SegmentLength: 5,
  // length of each branch segment. Smaller numbers mean smoother lines, but more computation cost
  AttractionDistance: 30,
  // radius of influence (d_i) around each attractor that attracts nodes
  KillDistance: 5,
  // distance (d_k) between attractors and nodes when branches are ended
  IsPaused: false,
  // initial pause/unpause state
  EnableCanalization: true,
  // turns on/off auxin flux canalization (line segment thickening)
  EnableOpacityBlending: true,
  // turns on/off opacity
  /**
    Rendering configurations
  */
  // Visibility toggles
  ShowAttractors: false,
  // toggled with 'a'
  ShowNodes: true,
  // toggled with 'n'
  ShowTips: false,
  // toggled with 't'
  ShowAttractionZones: false,
  // toggled with 'z'
  ShowKillZones: false,
  // toggled with 'k'
  ShowInfluenceLines: false,
  // toggled with 'i'
  ShowBounds: false,
  // toggled with 'b'
  ShowObstacles: false,
  // toggled with 'o'
  // Modes
  RenderMode: "Lines",
  // draw branch segments as "Lines" or "Dots"
  // Colors
  Colors: Dark,
  // Line thicknesses
  BranchThickness: 1.5,
  TipThickness: 2,
  BoundsBorderThickness: 1
};
const ARRAY_TYPES = [
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array
];
const VERSION = 1;
const HEADER_SIZE = 8;
class KDBush {
  /**
   * Creates an index from raw `ArrayBuffer` data.
   * @param {ArrayBuffer} data
   */
  static from(data) {
    if (!(data instanceof ArrayBuffer)) {
      throw new Error("Data must be an instance of ArrayBuffer.");
    }
    const [magic, versionAndType] = new Uint8Array(data, 0, 2);
    if (magic !== 219) {
      throw new Error("Data does not appear to be in a KDBush format.");
    }
    const version = versionAndType >> 4;
    if (version !== VERSION) {
      throw new Error(`Got v${version} data when expected v${VERSION}.`);
    }
    const ArrayType = ARRAY_TYPES[versionAndType & 15];
    if (!ArrayType) {
      throw new Error("Unrecognized array type.");
    }
    const [nodeSize] = new Uint16Array(data, 2, 1);
    const [numItems] = new Uint32Array(data, 4, 1);
    return new KDBush(numItems, nodeSize, ArrayType, data);
  }
  /**
   * Creates an index that will hold a given number of items.
   * @param {number} numItems
   * @param {number} [nodeSize=64] Size of the KD-tree node (64 by default).
   * @param {TypedArrayConstructor} [ArrayType=Float64Array] The array type used for coordinates storage (`Float64Array` by default).
   * @param {ArrayBuffer} [data] (For internal use only)
   */
  constructor(numItems, nodeSize = 64, ArrayType = Float64Array, data) {
    if (isNaN(numItems) || numItems < 0) throw new Error(`Unpexpected numItems value: ${numItems}.`);
    this.numItems = +numItems;
    this.nodeSize = Math.min(Math.max(+nodeSize, 2), 65535);
    this.ArrayType = ArrayType;
    this.IndexArrayType = numItems < 65536 ? Uint16Array : Uint32Array;
    const arrayTypeIndex = ARRAY_TYPES.indexOf(this.ArrayType);
    const coordsByteSize = numItems * 2 * this.ArrayType.BYTES_PER_ELEMENT;
    const idsByteSize = numItems * this.IndexArrayType.BYTES_PER_ELEMENT;
    const padCoords = (8 - idsByteSize % 8) % 8;
    if (arrayTypeIndex < 0) {
      throw new Error(`Unexpected typed array class: ${ArrayType}.`);
    }
    if (data && data instanceof ArrayBuffer) {
      this.data = data;
      this.ids = new this.IndexArrayType(this.data, HEADER_SIZE, numItems);
      this.coords = new this.ArrayType(this.data, HEADER_SIZE + idsByteSize + padCoords, numItems * 2);
      this._pos = numItems * 2;
      this._finished = true;
    } else {
      this.data = new ArrayBuffer(HEADER_SIZE + coordsByteSize + idsByteSize + padCoords);
      this.ids = new this.IndexArrayType(this.data, HEADER_SIZE, numItems);
      this.coords = new this.ArrayType(this.data, HEADER_SIZE + idsByteSize + padCoords, numItems * 2);
      this._pos = 0;
      this._finished = false;
      new Uint8Array(this.data, 0, 2).set([219, (VERSION << 4) + arrayTypeIndex]);
      new Uint16Array(this.data, 2, 1)[0] = nodeSize;
      new Uint32Array(this.data, 4, 1)[0] = numItems;
    }
  }
  /**
   * Add a point to the index.
   * @param {number} x
   * @param {number} y
   * @returns {number} An incremental index associated with the added item (starting from `0`).
   */
  add(x, y2) {
    const index = this._pos >> 1;
    this.ids[index] = index;
    this.coords[this._pos++] = x;
    this.coords[this._pos++] = y2;
    return index;
  }
  /**
   * Perform indexing of the added points.
   */
  finish() {
    const numAdded = this._pos >> 1;
    if (numAdded !== this.numItems) {
      throw new Error(`Added ${numAdded} items when expected ${this.numItems}.`);
    }
    sort(this.ids, this.coords, this.nodeSize, 0, this.numItems - 1, 0);
    this._finished = true;
    return this;
  }
  /**
   * Search the index for items within a given bounding box.
   * @param {number} minX
   * @param {number} minY
   * @param {number} maxX
   * @param {number} maxY
   * @returns {number[]} An array of indices correponding to the found items.
   */
  range(minX, minY, maxX, maxY) {
    if (!this._finished) throw new Error("Data not yet indexed - call index.finish().");
    const { ids, coords, nodeSize } = this;
    const stack = [0, ids.length - 1, 0];
    const result = [];
    while (stack.length) {
      const axis = stack.pop() || 0;
      const right = stack.pop() || 0;
      const left = stack.pop() || 0;
      if (right - left <= nodeSize) {
        for (let i2 = left; i2 <= right; i2++) {
          const x2 = coords[2 * i2];
          const y3 = coords[2 * i2 + 1];
          if (x2 >= minX && x2 <= maxX && y3 >= minY && y3 <= maxY) result.push(ids[i2]);
        }
        continue;
      }
      const m2 = left + right >> 1;
      const x = coords[2 * m2];
      const y2 = coords[2 * m2 + 1];
      if (x >= minX && x <= maxX && y2 >= minY && y2 <= maxY) result.push(ids[m2]);
      if (axis === 0 ? minX <= x : minY <= y2) {
        stack.push(left);
        stack.push(m2 - 1);
        stack.push(1 - axis);
      }
      if (axis === 0 ? maxX >= x : maxY >= y2) {
        stack.push(m2 + 1);
        stack.push(right);
        stack.push(1 - axis);
      }
    }
    return result;
  }
  /**
   * Search the index for items within a given radius.
   * @param {number} qx
   * @param {number} qy
   * @param {number} r Query radius.
   * @returns {number[]} An array of indices correponding to the found items.
   */
  within(qx, qy, r2) {
    if (!this._finished) throw new Error("Data not yet indexed - call index.finish().");
    const { ids, coords, nodeSize } = this;
    const stack = [0, ids.length - 1, 0];
    const result = [];
    const r22 = r2 * r2;
    while (stack.length) {
      const axis = stack.pop() || 0;
      const right = stack.pop() || 0;
      const left = stack.pop() || 0;
      if (right - left <= nodeSize) {
        for (let i2 = left; i2 <= right; i2++) {
          if (sqDist(coords[2 * i2], coords[2 * i2 + 1], qx, qy) <= r22) result.push(ids[i2]);
        }
        continue;
      }
      const m2 = left + right >> 1;
      const x = coords[2 * m2];
      const y2 = coords[2 * m2 + 1];
      if (sqDist(x, y2, qx, qy) <= r22) result.push(ids[m2]);
      if (axis === 0 ? qx - r2 <= x : qy - r2 <= y2) {
        stack.push(left);
        stack.push(m2 - 1);
        stack.push(1 - axis);
      }
      if (axis === 0 ? qx + r2 >= x : qy + r2 >= y2) {
        stack.push(m2 + 1);
        stack.push(right);
        stack.push(1 - axis);
      }
    }
    return result;
  }
}
function sort(ids, coords, nodeSize, left, right, axis) {
  if (right - left <= nodeSize) return;
  const m2 = left + right >> 1;
  select(ids, coords, m2, left, right, axis);
  sort(ids, coords, nodeSize, left, m2 - 1, 1 - axis);
  sort(ids, coords, nodeSize, m2 + 1, right, 1 - axis);
}
function select(ids, coords, k, left, right, axis) {
  while (right > left) {
    if (right - left > 600) {
      const n2 = right - left + 1;
      const m2 = k - left + 1;
      const z = Math.log(n2);
      const s2 = 0.5 * Math.exp(2 * z / 3);
      const sd = 0.5 * Math.sqrt(z * s2 * (n2 - s2) / n2) * (m2 - n2 / 2 < 0 ? -1 : 1);
      const newLeft = Math.max(left, Math.floor(k - m2 * s2 / n2 + sd));
      const newRight = Math.min(right, Math.floor(k + (n2 - m2) * s2 / n2 + sd));
      select(ids, coords, k, newLeft, newRight, axis);
    }
    const t2 = coords[2 * k + axis];
    let i2 = left;
    let j = right;
    swapItem(ids, coords, left, k);
    if (coords[2 * right + axis] > t2) swapItem(ids, coords, left, right);
    while (i2 < j) {
      swapItem(ids, coords, i2, j);
      i2++;
      j--;
      while (coords[2 * i2 + axis] < t2) i2++;
      while (coords[2 * j + axis] > t2) j--;
    }
    if (coords[2 * left + axis] === t2) swapItem(ids, coords, left, j);
    else {
      j++;
      swapItem(ids, coords, j, right);
    }
    if (j <= k) left = j + 1;
    if (k <= j) right = j - 1;
  }
}
function swapItem(ids, coords, i2, j) {
  swap(ids, i2, j);
  swap(coords, 2 * i2, 2 * j);
  swap(coords, 2 * i2 + 1, 2 * j + 1);
}
function swap(arr, i2, j) {
  const tmp = arr[i2];
  arr[i2] = arr[j];
  arr[j] = tmp;
}
function sqDist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
class Vec2 {
  constructor(x = 0, y2 = 0) {
    this.x = x;
    this.y = y2;
  }
  /**
   * Add another vector to this one
   * @param {Vec2} v - Vector to add
   * @param {boolean} returnNew - If true, return a new Vec2 instead of modifying this one
   * @returns {Vec2}
   */
  add(v2, returnNew = false) {
    if (returnNew) {
      return new Vec2(this.x + v2.x, this.y + v2.y);
    }
    this.x += v2.x;
    this.y += v2.y;
    return this;
  }
  /**
   * Subtract another vector from this one
   * @param {Vec2} v - Vector to subtract
   * @param {boolean} returnNew - If true, return a new Vec2 instead of modifying this one
   * @returns {Vec2}
   */
  subtract(v2, returnNew = false) {
    if (returnNew) {
      return new Vec2(this.x - v2.x, this.y - v2.y);
    }
    this.x -= v2.x;
    this.y -= v2.y;
    return this;
  }
  /**
   * Multiply this vector by a scalar or another vector
   * @param {number|Vec2} v - Scalar or vector to multiply by
   * @param {boolean} returnNew - If true, return a new Vec2 instead of modifying this one
   * @returns {Vec2}
   */
  multiply(v2, returnNew = false) {
    const mx = typeof v2 === "number" ? v2 : v2.x;
    const my = typeof v2 === "number" ? v2 : v2.y;
    if (returnNew) {
      return new Vec2(this.x * mx, this.y * my);
    }
    this.x *= mx;
    this.y *= my;
    return this;
  }
  /**
   * Divide this vector by a scalar or another vector
   * @param {number|Vec2} v - Scalar or vector to divide by
   * @param {boolean} returnNew - If true, return a new Vec2 instead of modifying this one
   * @returns {Vec2}
   */
  divide(v2, returnNew = false) {
    const dx = typeof v2 === "number" ? v2 : v2.x;
    const dy = typeof v2 === "number" ? v2 : v2.y;
    if (returnNew) {
      return new Vec2(this.x / dx, this.y / dy);
    }
    this.x /= dx;
    this.y /= dy;
    return this;
  }
  /**
   * Get the length (magnitude) of this vector
   * @returns {number}
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  /**
   * Normalize this vector (make it unit length)
   * @param {boolean} returnNew - If true, return a new Vec2 instead of modifying this one
   * @returns {Vec2}
   */
  normalize(returnNew = false) {
    const len = this.length();
    if (len === 0) {
      return returnNew ? new Vec2(0, 0) : this;
    }
    if (returnNew) {
      return new Vec2(this.x / len, this.y / len);
    }
    this.x /= len;
    this.y /= len;
    return this;
  }
  /**
   * Calculate distance to another vector
   * @param {Vec2} v - Vector to calculate distance to
   * @returns {number}
   */
  distance(v2) {
    const dx = this.x - v2.x;
    const dy = this.y - v2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  /**
   * Clone this vector
   * @returns {Vec2}
   */
  clone() {
    return new Vec2(this.x, this.y);
  }
}
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var FileSaver_min$1 = { exports: {} };
var FileSaver_min = FileSaver_min$1.exports;
var hasRequiredFileSaver_min;
function requireFileSaver_min() {
  if (hasRequiredFileSaver_min) return FileSaver_min$1.exports;
  hasRequiredFileSaver_min = 1;
  (function(module2, exports$1) {
    (function(a2, b) {
      b();
    })(FileSaver_min, function() {
      function b(a3, b2) {
        return "undefined" == typeof b2 ? b2 = { autoBom: false } : "object" != typeof b2 && (console.warn("Deprecated: Expected third argument to be a object"), b2 = { autoBom: !b2 }), b2.autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a3.type) ? new Blob(["\uFEFF", a3], { type: a3.type }) : a3;
      }
      function c2(a3, b2, c3) {
        var d2 = new XMLHttpRequest();
        d2.open("GET", a3), d2.responseType = "blob", d2.onload = function() {
          g(d2.response, b2, c3);
        }, d2.onerror = function() {
          console.error("could not download file");
        }, d2.send();
      }
      function d(a3) {
        var b2 = new XMLHttpRequest();
        b2.open("HEAD", a3, false);
        try {
          b2.send();
        } catch (a4) {
        }
        return 200 <= b2.status && 299 >= b2.status;
      }
      function e2(a3) {
        try {
          a3.dispatchEvent(new MouseEvent("click"));
        } catch (c3) {
          var b2 = document.createEvent("MouseEvents");
          b2.initMouseEvent("click", true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null), a3.dispatchEvent(b2);
        }
      }
      var f2 = "object" == typeof window && window.window === window ? window : "object" == typeof self && self.self === self ? self : "object" == typeof commonjsGlobal && commonjsGlobal.global === commonjsGlobal ? commonjsGlobal : void 0, a2 = f2.navigator && /Macintosh/.test(navigator.userAgent) && /AppleWebKit/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent), g = f2.saveAs || ("object" != typeof window || window !== f2 ? function() {
      } : "download" in HTMLAnchorElement.prototype && !a2 ? function(b2, g2, h2) {
        var i2 = f2.URL || f2.webkitURL, j = document.createElement("a");
        g2 = g2 || b2.name || "download", j.download = g2, j.rel = "noopener", "string" == typeof b2 ? (j.href = b2, j.origin === location.origin ? e2(j) : d(j.href) ? c2(b2, g2, h2) : e2(j, j.target = "_blank")) : (j.href = i2.createObjectURL(b2), setTimeout(function() {
          i2.revokeObjectURL(j.href);
        }, 4e4), setTimeout(function() {
          e2(j);
        }, 0));
      } : "msSaveOrOpenBlob" in navigator ? function(f3, g2, h2) {
        if (g2 = g2 || f3.name || "download", "string" != typeof f3) navigator.msSaveOrOpenBlob(b(f3, h2), g2);
        else if (d(f3)) c2(f3, g2, h2);
        else {
          var i2 = document.createElement("a");
          i2.href = f3, i2.target = "_blank", setTimeout(function() {
            e2(i2);
          });
        }
      } : function(b2, d2, e3, g2) {
        if (g2 = g2 || open("", "_blank"), g2 && (g2.document.title = g2.document.body.innerText = "downloading..."), "string" == typeof b2) return c2(b2, d2, e3);
        var h2 = "application/octet-stream" === b2.type, i2 = /constructor/i.test(f2.HTMLElement) || f2.safari, j = /CriOS\/[\d]+/.test(navigator.userAgent);
        if ((j || h2 && i2 || a2) && "undefined" != typeof FileReader) {
          var k = new FileReader();
          k.onloadend = function() {
            var a3 = k.result;
            a3 = j ? a3 : a3.replace(/^data:[^;]*;/, "data:attachment/file;"), g2 ? g2.location.href = a3 : location = a3, g2 = null;
          }, k.readAsDataURL(b2);
        } else {
          var l2 = f2.URL || f2.webkitURL, m2 = l2.createObjectURL(b2);
          g2 ? g2.location = m2 : location.href = m2, g2 = null, setTimeout(function() {
            l2.revokeObjectURL(m2);
          }, 4e4);
        }
      });
      f2.saveAs = g.saveAs = g, module2.exports = g;
    });
  })(FileSaver_min$1);
  return FileSaver_min$1.exports;
}
var FileSaver_minExports = requireFileSaver_min();
var _extends = Object.assign || function(target) {
  for (var i2 = 1; i2 < arguments.length; i2++) {
    var source = arguments[i2];
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};
function _objectWithoutProperties(obj, keys) {
  var target = {};
  for (var i2 in obj) {
    if (keys.indexOf(i2) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i2)) continue;
    target[i2] = obj[i2];
  }
  return target;
}
var toPoints = function toPoints2(_ref) {
  var type = _ref.type, props = _objectWithoutProperties(_ref, ["type"]);
  switch (type) {
    case "circle":
      return getPointsFromCircle(props);
    case "ellipse":
      return getPointsFromEllipse(props);
    case "line":
      return getPointsFromLine(props);
    case "path":
      return getPointsFromPath(props);
    case "polygon":
      return getPointsFromPolygon(props);
    case "polyline":
      return getPointsFromPolyline(props);
    case "rect":
      return getPointsFromRect(props);
    case "g":
      return getPointsFromG(props);
    default:
      throw new Error("Not a valid shape type");
  }
};
var getPointsFromCircle = function getPointsFromCircle2(_ref2) {
  var cx = _ref2.cx, cy = _ref2.cy, r2 = _ref2.r;
  return [{ x: cx, y: cy - r2, moveTo: true }, { x: cx, y: cy + r2, curve: { type: "arc", rx: r2, ry: r2, sweepFlag: 1 } }, { x: cx, y: cy - r2, curve: { type: "arc", rx: r2, ry: r2, sweepFlag: 1 } }];
};
var getPointsFromEllipse = function getPointsFromEllipse2(_ref3) {
  var cx = _ref3.cx, cy = _ref3.cy, rx = _ref3.rx, ry = _ref3.ry;
  return [{ x: cx, y: cy - ry, moveTo: true }, { x: cx, y: cy + ry, curve: { type: "arc", rx, ry, sweepFlag: 1 } }, { x: cx, y: cy - ry, curve: { type: "arc", rx, ry, sweepFlag: 1 } }];
};
var getPointsFromLine = function getPointsFromLine2(_ref4) {
  var x1 = _ref4.x1, x2 = _ref4.x2, y1 = _ref4.y1, y2 = _ref4.y2;
  return [{ x: x1, y: y1, moveTo: true }, { x: x2, y: y2 }];
};
var validCommands = /[MmLlHhVvCcSsQqTtAaZz]/g;
var commandLengths = {
  A: 7,
  C: 6,
  H: 1,
  L: 2,
  M: 2,
  Q: 4,
  S: 4,
  T: 2,
  V: 1,
  Z: 0
};
var relativeCommands = ["a", "c", "h", "l", "m", "q", "s", "t", "v"];
var isRelative = function isRelative2(command) {
  return relativeCommands.indexOf(command) !== -1;
};
var optionalArcKeys = ["xAxisRotation", "largeArcFlag", "sweepFlag"];
var getCommands = function getCommands2(d) {
  return d.match(validCommands);
};
var getParams = function getParams2(d) {
  return d.split(validCommands).map(function(v2) {
    return v2.replace(/[0-9]+-/g, function(m2) {
      return m2.slice(0, -1) + " -";
    });
  }).map(function(v2) {
    return v2.replace(/\.[0-9]+/g, function(m2) {
      return m2 + " ";
    });
  }).map(function(v2) {
    return v2.trim();
  }).filter(function(v2) {
    return v2.length > 0;
  }).map(function(v2) {
    return v2.split(/[ ,]+/).map(parseFloat).filter(function(n2) {
      return !isNaN(n2);
    });
  });
};
var getPointsFromPath = function getPointsFromPath2(_ref5) {
  var d = _ref5.d;
  var commands = getCommands(d);
  var params = getParams(d);
  var points = [];
  var moveTo = void 0;
  for (var i2 = 0, l2 = commands.length; i2 < l2; i2++) {
    var command = commands[i2];
    var upperCaseCommand = command.toUpperCase();
    var commandLength = commandLengths[upperCaseCommand];
    var relative = isRelative(command);
    if (commandLength > 0) {
      var commandParams = params.shift();
      var iterations = commandParams.length / commandLength;
      for (var j = 0; j < iterations; j++) {
        var prevPoint = points[points.length - 1] || { x: 0, y: 0 };
        switch (upperCaseCommand) {
          case "M":
            var x = (relative ? prevPoint.x : 0) + commandParams.shift();
            var y2 = (relative ? prevPoint.y : 0) + commandParams.shift();
            if (j === 0) {
              moveTo = { x, y: y2 };
              points.push({ x, y: y2, moveTo: true });
            } else {
              points.push({ x, y: y2 });
            }
            break;
          case "L":
            points.push({
              x: (relative ? prevPoint.x : 0) + commandParams.shift(),
              y: (relative ? prevPoint.y : 0) + commandParams.shift()
            });
            break;
          case "H":
            points.push({
              x: (relative ? prevPoint.x : 0) + commandParams.shift(),
              y: prevPoint.y
            });
            break;
          case "V":
            points.push({
              x: prevPoint.x,
              y: (relative ? prevPoint.y : 0) + commandParams.shift()
            });
            break;
          case "A":
            points.push({
              curve: {
                type: "arc",
                rx: commandParams.shift(),
                ry: commandParams.shift(),
                xAxisRotation: commandParams.shift(),
                largeArcFlag: commandParams.shift(),
                sweepFlag: commandParams.shift()
              },
              x: (relative ? prevPoint.x : 0) + commandParams.shift(),
              y: (relative ? prevPoint.y : 0) + commandParams.shift()
            });
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = void 0;
            try {
              for (var _iterator = optionalArcKeys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var k = _step.value;
                if (points[points.length - 1]["curve"][k] === 0) {
                  delete points[points.length - 1]["curve"][k];
                }
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }
            break;
          case "C":
            points.push({
              curve: {
                type: "cubic",
                x1: (relative ? prevPoint.x : 0) + commandParams.shift(),
                y1: (relative ? prevPoint.y : 0) + commandParams.shift(),
                x2: (relative ? prevPoint.x : 0) + commandParams.shift(),
                y2: (relative ? prevPoint.y : 0) + commandParams.shift()
              },
              x: (relative ? prevPoint.x : 0) + commandParams.shift(),
              y: (relative ? prevPoint.y : 0) + commandParams.shift()
            });
            break;
          case "S":
            var sx2 = (relative ? prevPoint.x : 0) + commandParams.shift();
            var sy2 = (relative ? prevPoint.y : 0) + commandParams.shift();
            var sx = (relative ? prevPoint.x : 0) + commandParams.shift();
            var sy = (relative ? prevPoint.y : 0) + commandParams.shift();
            var diff = {};
            var sx1 = void 0;
            var sy1 = void 0;
            if (prevPoint.curve && prevPoint.curve.type === "cubic") {
              diff.x = Math.abs(prevPoint.x - prevPoint.curve.x2);
              diff.y = Math.abs(prevPoint.y - prevPoint.curve.y2);
              sx1 = prevPoint.x < prevPoint.curve.x2 ? prevPoint.x - diff.x : prevPoint.x + diff.x;
              sy1 = prevPoint.y < prevPoint.curve.y2 ? prevPoint.y - diff.y : prevPoint.y + diff.y;
            } else {
              diff.x = Math.abs(sx - sx2);
              diff.y = Math.abs(sy - sy2);
              sx1 = prevPoint.x;
              sy1 = prevPoint.y;
            }
            points.push({ curve: { type: "cubic", x1: sx1, y1: sy1, x2: sx2, y2: sy2 }, x: sx, y: sy });
            break;
          case "Q":
            points.push({
              curve: {
                type: "quadratic",
                x1: (relative ? prevPoint.x : 0) + commandParams.shift(),
                y1: (relative ? prevPoint.y : 0) + commandParams.shift()
              },
              x: (relative ? prevPoint.x : 0) + commandParams.shift(),
              y: (relative ? prevPoint.y : 0) + commandParams.shift()
            });
            break;
          case "T":
            var tx = (relative ? prevPoint.x : 0) + commandParams.shift();
            var ty = (relative ? prevPoint.y : 0) + commandParams.shift();
            var tx1 = void 0;
            var ty1 = void 0;
            if (prevPoint.curve && prevPoint.curve.type === "quadratic") {
              var _diff = {
                x: Math.abs(prevPoint.x - prevPoint.curve.x1),
                y: Math.abs(prevPoint.y - prevPoint.curve.y1)
              };
              tx1 = prevPoint.x < prevPoint.curve.x1 ? prevPoint.x - _diff.x : prevPoint.x + _diff.x;
              ty1 = prevPoint.y < prevPoint.curve.y1 ? prevPoint.y - _diff.y : prevPoint.y + _diff.y;
            } else {
              tx1 = prevPoint.x;
              ty1 = prevPoint.y;
            }
            points.push({ curve: { type: "quadratic", x1: tx1, y1: ty1 }, x: tx, y: ty });
            break;
        }
      }
    } else {
      var _prevPoint = points[points.length - 1] || { x: 0, y: 0 };
      if (_prevPoint.x !== moveTo.x || _prevPoint.y !== moveTo.y) {
        points.push({ x: moveTo.x, y: moveTo.y });
      }
    }
  }
  return points;
};
var getPointsFromPolygon = function getPointsFromPolygon2(_ref6) {
  var points = _ref6.points;
  return getPointsFromPoints({ closed: true, points });
};
var getPointsFromPolyline = function getPointsFromPolyline2(_ref7) {
  var points = _ref7.points;
  return getPointsFromPoints({ closed: false, points });
};
var getPointsFromPoints = function getPointsFromPoints2(_ref8) {
  var closed = _ref8.closed, points = _ref8.points;
  var numbers = points.split(/[\s,]+/).map(function(n2) {
    return parseFloat(n2);
  });
  var p2 = numbers.reduce(function(arr, point, i2) {
    if (i2 % 2 === 0) {
      arr.push({ x: point });
    } else {
      arr[(i2 - 1) / 2].y = point;
    }
    return arr;
  }, []);
  if (closed) {
    p2.push(_extends({}, p2[0]));
  }
  p2[0].moveTo = true;
  return p2;
};
var getPointsFromRect = function getPointsFromRect2(_ref9) {
  var height = _ref9.height, rx = _ref9.rx, ry = _ref9.ry, width = _ref9.width, x = _ref9.x, y2 = _ref9.y;
  if (rx || ry) {
    return getPointsFromRectWithCornerRadius({
      height,
      rx: rx || ry,
      ry: ry || rx,
      width,
      x,
      y: y2
    });
  }
  return getPointsFromBasicRect({ height, width, x, y: y2 });
};
var getPointsFromBasicRect = function getPointsFromBasicRect2(_ref10) {
  var height = _ref10.height, width = _ref10.width, x = _ref10.x, y2 = _ref10.y;
  return [{ x, y: y2, moveTo: true }, { x: x + width, y: y2 }, { x: x + width, y: y2 + height }, { x, y: y2 + height }, { x, y: y2 }];
};
var getPointsFromRectWithCornerRadius = function getPointsFromRectWithCornerRadius2(_ref11) {
  var height = _ref11.height, rx = _ref11.rx, ry = _ref11.ry, width = _ref11.width, x = _ref11.x, y2 = _ref11.y;
  var curve = { type: "arc", rx, ry, sweepFlag: 1 };
  return [{ x: x + rx, y: y2, moveTo: true }, { x: x + width - rx, y: y2 }, { x: x + width, y: y2 + ry, curve }, { x: x + width, y: y2 + height - ry }, { x: x + width - rx, y: y2 + height, curve }, { x: x + rx, y: y2 + height }, { x, y: y2 + height - ry, curve }, { x, y: y2 + ry }, { x: x + rx, y: y2, curve }];
};
var getPointsFromG = function getPointsFromG2(_ref12) {
  var shapes = _ref12.shapes;
  return shapes.map(function(s2) {
    return toPoints(s2);
  });
};
var pointsToD = function pointsToD2(p2) {
  var d = "";
  var i2 = 0;
  var firstPoint = void 0;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = void 0;
  try {
    for (var _iterator = p2[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var point = _step.value;
      var _point$curve = point.curve, curve = _point$curve === void 0 ? false : _point$curve, moveTo = point.moveTo, x = point.x, y2 = point.y;
      var isFirstPoint = i2 === 0 || moveTo;
      var isLastPoint = i2 === p2.length - 1 || p2[i2 + 1].moveTo;
      var prevPoint = i2 === 0 ? null : p2[i2 - 1];
      if (isFirstPoint) {
        firstPoint = point;
        if (!isLastPoint) {
          d += "M" + x + "," + y2;
        }
      } else if (curve) {
        switch (curve.type) {
          case "arc":
            var _point$curve2 = point.curve, _point$curve2$largeAr = _point$curve2.largeArcFlag, largeArcFlag = _point$curve2$largeAr === void 0 ? 0 : _point$curve2$largeAr, rx = _point$curve2.rx, ry = _point$curve2.ry, _point$curve2$sweepFl = _point$curve2.sweepFlag, sweepFlag = _point$curve2$sweepFl === void 0 ? 0 : _point$curve2$sweepFl, _point$curve2$xAxisRo = _point$curve2.xAxisRotation, xAxisRotation = _point$curve2$xAxisRo === void 0 ? 0 : _point$curve2$xAxisRo;
            d += "A" + rx + "," + ry + "," + xAxisRotation + "," + largeArcFlag + "," + sweepFlag + "," + x + "," + y2;
            break;
          case "cubic":
            var _point$curve3 = point.curve, cx1 = _point$curve3.x1, cy1 = _point$curve3.y1, cx2 = _point$curve3.x2, cy2 = _point$curve3.y2;
            d += "C" + cx1 + "," + cy1 + "," + cx2 + "," + cy2 + "," + x + "," + y2;
            break;
          case "quadratic":
            var _point$curve4 = point.curve, qx1 = _point$curve4.x1, qy1 = _point$curve4.y1;
            d += "Q" + qx1 + "," + qy1 + "," + x + "," + y2;
            break;
        }
        if (isLastPoint && x === firstPoint.x && y2 === firstPoint.y) {
          d += "Z";
        }
      } else if (isLastPoint && x === firstPoint.x && y2 === firstPoint.y) {
        d += "Z";
      } else if (x !== prevPoint.x && y2 !== prevPoint.y) {
        d += "L" + x + "," + y2;
      } else if (x !== prevPoint.x) {
        d += "H" + x;
      } else if (y2 !== prevPoint.y) {
        d += "V" + y2;
      }
      i2++;
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }
  return d;
};
var toPath = function toPath2(s2) {
  var isPoints = Array.isArray(s2);
  var isGroup = isPoints ? Array.isArray(s2[0]) : s2.type === "g";
  var points = isPoints ? s2 : isGroup ? s2.shapes.map(function(shp) {
    return toPoints(shp);
  }) : toPoints(s2);
  if (isGroup) {
    return points.map(function(p2) {
      return pointsToD(p2);
    });
  }
  return pointsToD(points);
};
function random(min, max) {
  if (max === void 0) {
    max = min;
    min = 0;
  }
  if (typeof min !== "number" || typeof max !== "number") {
    throw new TypeError("Expected all arguments to be numbers");
  }
  return Math.random() * (max - min) + min;
}
function map(value, originalLower, originalUpper, newLower, newUpper) {
  return newLower + (newUpper - newLower) * ((value - originalLower) / (originalUpper - originalLower));
}
function getCircleOfPoints(cx, cy, radius, resolution) {
  let angle, x, y2;
  let points = [];
  for (let i2 = 0; i2 < resolution; i2++) {
    angle = 2 * Math.PI * i2 / resolution;
    x = cx + Math.floor(radius * Math.cos(angle));
    y2 = cy + Math.floor(radius * Math.sin(angle));
    points.push([x, y2]);
  }
  return points;
}
function exportSVG(network) {
  let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", "http://www.w3.org/2000/svg");
  svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("width", window.innerWidth);
  svg.setAttribute("height", window.innerHeight);
  svg.setAttribute("viewBox", "0 0 " + window.innerWidth + " " + window.innerHeight);
  if (network.settings.ShowBranches) {
    let nodeLinesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (let node of network.nodes) {
      if (node.parent != null) {
        let lineNode = `
          <line
            x1="${node.parent.position.x}"
            y1="${node.parent.position.y}"
            x2="${node.position.x}"
            y2="${node.position.y}"
            stroke="black"
          />
        `;
        nodeLinesGroup.innerHTML += lineNode;
      }
    }
    svg.appendChild(nodeLinesGroup);
  }
  if (network.settings.ShowBounds) {
    if (network.bounds.length > 0) {
      let boundsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      for (let bound of network.bounds) {
        boundsGroup.appendChild(
          getPathElFromPoints(bound.polygon)
        );
      }
      svg.appendChild(boundsGroup);
    }
  }
  if (network.settings.ShowObstacles) {
    if (network.obstacles.length > 0) {
      let obstaclesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      for (let obstacle of network.obstacles) {
        obstaclesGroup.appendChild(
          getPathElFromPoints(obstacle.polygon)
        );
      }
      svg.appendChild(obstaclesGroup);
    }
  }
  const svgDoctype = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
  const serializedSvg = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgDoctype, serializedSvg], { type: "image/svg+xml;" });
  FileSaver_minExports.saveAs(blob, "venation-" + Date.now() + ".svg");
}
function getPathElFromPoints(points) {
  let pointsString = "";
  for (let [index, point] of points.entries()) {
    pointsString += point[0] + "," + point[1];
    if (index < points.length - 1) {
      pointsString += " ";
    }
  }
  pointsString += " " + points[0][0] + "," + points[0][1];
  let d = toPath({
    type: "polyline",
    points: pointsString
  });
  let pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathEl.setAttribute("d", d);
  pathEl.setAttribute("style", "fill: none; stroke: black; stroke-width: 1");
  return pathEl;
}
const Utilities = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  exportSVG,
  getCircleOfPoints,
  map,
  random
}, Symbol.toStringTag, { value: "Module" }));
class Network {
  constructor(ctx, settings) {
    this.ctx = ctx;
    this.settings = Object.assign({}, Defaults, settings);
    this.attractors = [];
    this.nodes = [];
    this.nodesIndex;
    this.bounds = [];
    this.obstacles = [];
    this.buildSpatialIndices();
  }
  update() {
    if (this.settings.IsPaused) {
      return;
    }
    for (let [attractorID, attractor] of this.attractors.entries()) {
      switch (this.settings.VenationType) {
        // For open venation, only associate this attractor with its closest node
        case "Open":
          let closestNode = this.getClosestNode(attractor, this.getNodesInAttractionZone(attractor));
          if (closestNode != null) {
            closestNode.influencedBy.push(attractorID);
            attractor.influencingNodes = [closestNode];
          }
          break;
        // For closed venation, associate this attractor with all nodes in its relative neighborhood
        case "Closed":
          let neighborhoodNodes = this.getRelativeNeighborNodes(attractor);
          let nodesInKillZone = this.getNodesInKillZone(attractor);
          let nodesToGrow = neighborhoodNodes.filter((neighborNode) => {
            return !nodesInKillZone.includes(neighborNode);
          });
          attractor.influencingNodes = neighborhoodNodes;
          if (nodesToGrow.length > 0) {
            attractor.fresh = false;
            for (let node of nodesToGrow) {
              node.influencedBy.push(attractorID);
            }
          }
          break;
      }
    }
    for (let node of this.nodes) {
      if (node.influencedBy.length > 0) {
        let averageDirection = this.getAverageDirection(node, node.influencedBy.map((id) => this.attractors[id]));
        let nextNode = node.getNextNode(averageDirection);
        let isInsideAnyBounds = false;
        let isInsideAnyObstacle = false;
        if (this.bounds != void 0 && this.bounds.length > 0) {
          for (let bound of this.bounds) {
            if (bound.contains(nextNode.position.x, nextNode.position.y)) {
              isInsideAnyBounds = true;
            }
          }
        }
        if (this.obstacles != void 0 && this.obstacles.length > 0) {
          for (let obstacle of this.obstacles) {
            if (obstacle.contains(nextNode.position.x, nextNode.position.y)) {
              isInsideAnyObstacle = true;
            }
          }
        }
        if ((isInsideAnyBounds || this.bounds.length === 0) && (!isInsideAnyObstacle || this.obstacles.length === 0)) {
          this.nodes.push(nextNode);
        }
      }
      node.influencedBy = [];
      if (node.isTip && this.settings.EnableCanalization) {
        let currentNode = node;
        while (currentNode.parent != null) {
          if (currentNode.parent.thickness < currentNode.thickness + 0.07) {
            currentNode.parent.thickness = currentNode.thickness + 0.03;
          }
          currentNode = currentNode.parent;
        }
      }
    }
    for (let [attractorID, attractor] of this.attractors.entries()) {
      switch (this.settings.VenationType) {
        // For open venation, remove the attractor as soon as any node reaches it
        case "Open":
          if (attractor.reached) {
            this.attractors.splice(attractorID, 1);
          }
          break;
        // For closed venation, remove the attractor only when all associated nodes have reached it
        case "Closed":
          if (attractor.influencingNodes.length > 0 && !attractor.fresh) {
            let allNodesReached = true;
            for (let node of attractor.influencingNodes) {
              if (node.position.distance(attractor.position) > this.settings.KillDistance) {
                allNodesReached = false;
              }
            }
            if (allNodesReached) {
              this.attractors.splice(attractorID, 1);
            }
          }
          break;
      }
    }
    this.buildSpatialIndices();
  }
  draw() {
    this.drawBackground();
    this.drawBounds();
    this.drawObstacles();
    this.drawattractors();
    this.drawNodes();
  }
  drawBackground() {
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.ctx.beginPath();
    this.ctx.fillStyle = this.settings.Colors.BackgroundColor;
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }
  drawBounds() {
    if (this.settings.ShowBounds && this.bounds != void 0) {
      for (let bound of this.bounds) {
        bound.draw();
      }
    }
  }
  drawObstacles() {
    if (this.settings.ShowObstacles && this.obstacles != void 0) {
      for (let obstacle of this.obstacles) {
        obstacle.draw();
      }
    }
  }
  drawNodes() {
    if (this.settings.ShowNodes) {
      for (let node of this.nodes) {
        node.draw();
      }
    }
  }
  drawattractors() {
    for (let attractor of this.attractors) {
      attractor.draw();
      if (this.settings.ShowInfluenceLines && attractor.influencingNodes.length > 0) {
        for (let node of attractor.influencingNodes) {
          this.ctx.beginPath();
          this.ctx.moveTo(attractor.position.x, attractor.position.y);
          this.ctx.lineTo(node.position.x, node.position.y);
          this.ctx.strokeStyle = this.settings.Colors.InfluenceLinesColor;
          this.ctx.stroke();
        }
      }
    }
  }
  getRelativeNeighborNodes(attractor) {
    let fail;
    let nearbyNodes = this.getNodesInAttractionZone(attractor);
    let relativeNeighbors = [];
    let attractorToP0, attractorToP1, p0ToP1;
    for (let p0 of nearbyNodes) {
      fail = false;
      attractorToP0 = p0.position.subtract(attractor.position, true);
      for (let p1 of nearbyNodes) {
        if (p0 === p1) {
          continue;
        }
        attractorToP1 = p1.position.subtract(attractor.position, true);
        if (attractorToP1.length() > attractorToP0.length()) {
          continue;
        }
        p0ToP1 = p1.position.subtract(p0.position, true);
        if (attractorToP0.length() > p0ToP1.length()) {
          fail = true;
          break;
        }
      }
      if (!fail) {
        relativeNeighbors.push(p0);
      }
    }
    return relativeNeighbors;
  }
  getNodesInAttractionZone(attractor) {
    return this.nodesIndex.within(
      attractor.position.x,
      attractor.position.y,
      this.settings.AttractionDistance
    ).map(
      (id) => this.nodes[id]
    );
  }
  getNodesInKillZone(attractor) {
    return this.nodesIndex.within(
      attractor.position.x,
      attractor.position.y,
      this.settings.KillDistance
    ).map(
      (id) => this.nodes[id]
    );
  }
  getClosestNode(attractor, nearbyNodes) {
    let closestNode = null, record = this.settings.AttractionDistance;
    for (let node of nearbyNodes) {
      let distance = node.position.distance(attractor.position);
      if (distance < this.settings.KillDistance) {
        attractor.reached = true;
        closestNode = null;
      } else if (distance < record) {
        closestNode = node;
        record = distance;
      }
    }
    return closestNode;
  }
  getAverageDirection(node, nearbyattractors) {
    let averageDirection = new Vec2(0, 0);
    for (let attractor of nearbyattractors) {
      averageDirection.add(
        attractor.position.subtract(node.position, true).normalize()
      );
    }
    averageDirection.add(new Vec2(random(-0.1, 0.1), random(-0.1, 0.1))).normalize();
    averageDirection.divide(node.influencedBy.length).normalize();
    return averageDirection;
  }
  addNode(node) {
    let isInsideAnyBounds = false;
    let isInsideAnyObstacle = false;
    if (this.bounds != void 0 && this.bounds.length > 0) {
      for (let bound of this.bounds) {
        if (bound.contains(node.position.x, node.position.y)) {
          isInsideAnyBounds = true;
        }
      }
    }
    if (this.obstacles != void 0 && this.obstacles.length > 0) {
      for (let obstacle of this.obstacles) {
        if (obstacle.contains(node.position.x, node.position.y)) {
          isInsideAnyObstacle = true;
        }
      }
    }
    if ((isInsideAnyBounds || this.bounds.length === 0) && (!isInsideAnyObstacle || this.obstacles.length === 0)) {
      this.nodes.push(node);
      this.buildSpatialIndices();
    }
  }
  reset() {
    this.nodes = [];
    this.attractors = [];
    this.buildSpatialIndices();
  }
  buildSpatialIndices() {
    this.nodesIndex = new KDBush(this.nodes.length);
    for (const node of this.nodes) {
      this.nodesIndex.add(node.position.x, node.position.y);
    }
    this.nodesIndex.finish();
  }
  toggleNodes() {
    this.settings.ShowNodes = !this.settings.ShowNodes;
  }
  toggleTips() {
    this.settings.ShowTips = !this.settings.ShowTips;
    for (let node of this.nodes) {
      node.settings.ShowTips = !node.settings.ShowTips;
    }
  }
  toggleAttractors() {
    this.settings.ShowAttractors = !this.settings.ShowAttractors;
    for (let attractor of this.attractors) {
      attractor.settings.ShowAttractors = !attractor.settings.ShowAttractors;
    }
  }
  toggleAttractionZones() {
    this.settings.ShowAttractionZones = !this.settings.ShowAttractionZones;
    for (let attractor of this.attractors) {
      attractor.settings.ShowAttractionZones = !attractor.settings.ShowAttractionZones;
    }
  }
  toggleKillZones() {
    this.settings.ShowKillZones = !this.settings.ShowKillZones;
    for (let attractor of this.attractors) {
      attractor.settings.ShowKillZones = !attractor.settings.ShowKillZones;
    }
  }
  toggleInfluenceLines() {
    this.settings.ShowInfluenceLines = !this.settings.ShowInfluenceLines;
  }
  toggleBounds() {
    this.settings.ShowBounds = !this.settings.ShowBounds;
  }
  toggleObstacles() {
    this.settings.ShowObstacles = !this.settings.ShowObstacles;
  }
  toggleCanalization() {
    this.settings.EnableCanalization = !this.settings.EnableCanalization;
    if (!this.settings.EnableCanalization) {
      for (let node of this.nodes) {
        node.thickness = 0;
      }
    }
  }
  toggleOpacityBlending() {
    this.settings.EnableOpacityBlending = !this.settings.EnableOpacityBlending;
    for (let node of this.nodes) {
      node.settings.EnableOpacityBlending = this.settings.EnableOpacityBlending;
    }
  }
  togglePause() {
    this.settings.IsPaused = !this.settings.IsPaused;
  }
}
class Node {
  constructor(parent, position, isTip, ctx, settings, color = void 0) {
    this.parent = parent;
    this.position = position;
    this.isTip = isTip;
    this.ctx = ctx;
    this.settings = Object.assign({}, Defaults, settings);
    this.color = color;
    this.influencedBy = [];
    this.thickness = 0;
  }
  draw() {
    if (this.parent != null) {
      if (this.settings.EnableOpacityBlending) {
        this.ctx.globalAlpha = this.thickness / 3 + 0.2;
      }
      if (this.settings.RenderMode == "Lines") {
        this.ctx.beginPath();
        this.ctx.moveTo(this.position.x, this.position.y);
        this.ctx.lineTo(this.parent.position.x, this.parent.position.y);
        if (this.isTip && this.settings.ShowTips) {
          this.ctx.strokeStyle = this.settings.Colors.TipColor;
          this.ctx.lineWidth = this.settings.TipThickness;
        } else {
          if (this.color != void 0) {
            this.ctx.strokeStyle = this.color;
          } else {
            this.ctx.strokeStyle = this.settings.Colors.BranchColor;
          }
          this.ctx.lineWidth = this.settings.BranchThickness + this.thickness;
        }
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
      } else if (this.settings.RenderMode == "Dots") {
        this.ctx.beginPath();
        this.ctx.ellipse(
          this.position.x,
          this.position.y,
          1 + this.thickness / 2,
          1 + this.thickness / 2,
          0,
          0,
          Math.PI * 2
        );
        if (this.isTip && this.settings.ShowTips) {
          this.ctx.fillStyle = this.settings.Colors.TipColor;
        } else {
          this.ctx.fillStyle = this.settings.Colors.BranchColor;
        }
        this.ctx.fill();
      }
      if (this.settings.EnableOpacityBlending) {
        this.ctx.globalAlpha = 1;
      }
    }
  }
  // Create a new node in the provided direction and a pre-defined distance (SegmentLength)
  getNextNode(averageAttractorDirection) {
    this.isTip = false;
    this.nextPosition = this.position.add(averageAttractorDirection.multiply(this.settings.SegmentLength), true);
    return new Node(
      this,
      this.nextPosition,
      true,
      this.ctx,
      this.settings,
      this.color
    );
  }
}
class Attractor {
  constructor(position, ctx, settings = {}) {
    this.position = position;
    this.ctx = ctx;
    this.settings = Object.assign({}, Defaults, settings);
    this.influencingNodes = [];
    this.fresh = true;
  }
  draw() {
    if (this.settings.ShowAttractionZones) {
      this.ctx.beginPath();
      this.ctx.ellipse(this.position.x, this.position.y, this.settings.AttractionDistance, this.settings.AttractionDistance, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = this.settings.Colors.AttractionZoneColor;
      this.ctx.fill();
    }
    if (this.settings.ShowKillZones) {
      this.ctx.beginPath();
      this.ctx.ellipse(this.position.x, this.position.y, this.settings.KillDistance, this.settings.KillDistance, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = this.settings.Colors.KillZoneColor;
      this.ctx.fill();
    }
    if (this.settings.ShowAttractors) {
      this.ctx.beginPath();
      this.ctx.ellipse(this.position.x, this.position.y, 1, 1, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = this.settings.Colors.AttractorColor;
      this.ctx.fill();
    }
  }
}
var pointInPolygon = { exports: {} };
var flat;
var hasRequiredFlat;
function requireFlat() {
  if (hasRequiredFlat) return flat;
  hasRequiredFlat = 1;
  flat = function pointInPolygonFlat(point, vs, start, end) {
    var x = point[0], y2 = point[1];
    var inside2 = false;
    if (start === void 0) start = 0;
    if (end === void 0) end = vs.length;
    var len = (end - start) / 2;
    for (var i2 = 0, j = len - 1; i2 < len; j = i2++) {
      var xi = vs[start + i2 * 2 + 0], yi = vs[start + i2 * 2 + 1];
      var xj = vs[start + j * 2 + 0], yj = vs[start + j * 2 + 1];
      var intersect = yi > y2 !== yj > y2 && x < (xj - xi) * (y2 - yi) / (yj - yi) + xi;
      if (intersect) inside2 = !inside2;
    }
    return inside2;
  };
  return flat;
}
var nested;
var hasRequiredNested;
function requireNested() {
  if (hasRequiredNested) return nested;
  hasRequiredNested = 1;
  nested = function pointInPolygonNested(point, vs, start, end) {
    var x = point[0], y2 = point[1];
    var inside2 = false;
    if (start === void 0) start = 0;
    if (end === void 0) end = vs.length;
    var len = end - start;
    for (var i2 = 0, j = len - 1; i2 < len; j = i2++) {
      var xi = vs[i2 + start][0], yi = vs[i2 + start][1];
      var xj = vs[j + start][0], yj = vs[j + start][1];
      var intersect = yi > y2 !== yj > y2 && x < (xj - xi) * (y2 - yi) / (yj - yi) + xi;
      if (intersect) inside2 = !inside2;
    }
    return inside2;
  };
  return nested;
}
var hasRequiredPointInPolygon;
function requirePointInPolygon() {
  if (hasRequiredPointInPolygon) return pointInPolygon.exports;
  hasRequiredPointInPolygon = 1;
  var pointInPolygonFlat = requireFlat();
  var pointInPolygonNested = requireNested();
  pointInPolygon.exports = function pointInPolygon2(point, vs, start, end) {
    if (vs.length > 0 && Array.isArray(vs[0])) {
      return pointInPolygonNested(point, vs, start, end);
    } else {
      return pointInPolygonFlat(point, vs, start, end);
    }
  };
  pointInPolygon.exports.nested = pointInPolygonNested;
  pointInPolygon.exports.flat = pointInPolygonFlat;
  return pointInPolygon.exports;
}
var pointInPolygonExports = requirePointInPolygon();
const inside = /* @__PURE__ */ getDefaultExportFromCjs(pointInPolygonExports);
class Path {
  constructor(polygon, type, ctx, settings) {
    this.polygon = polygon;
    this.ctx = ctx;
    this.type = type;
    this.transformedPolygon = polygon;
    this.origin = { x: 0, y: 0 };
    this.scale = 1;
    this.width = -1;
    this.height = -1;
    this.isCentered = false;
    this.settings = Object.assign({}, Defaults, settings);
    this.calculateDimensions();
  }
  // Check if provided coordinates are inside polygon defined by this Path
  contains(x, y2) {
    return inside([x, y2], this.transformedPolygon);
  }
  // Relative translation
  moveBy(x, y2) {
    this.origin.x += x;
    this.origin.y += y2;
    this.createTransformedPolygon();
  }
  // Absolute translation
  moveTo(x, y2) {
    if (this.isCentered) {
      this.origin.x = x - this.width / 2;
      this.origin.y = y2 - this.height / 2;
    } else {
      this.origin.x = x;
      this.origin.y = y2;
    }
    this.createTransformedPolygon();
  }
  setScale(factor) {
    this.scale *= factor;
    this.createTransformedPolygon();
    this.calculateDimensions();
    if (this.isCentered) {
      this.moveTo(window.innerWidth / 2, window.innerHeight / 2);
    }
  }
  // Calculate total path length by adding up all line segment lengths (distances between polygon points)
  getTotalLength() {
    let totalLength = 0;
    for (let i2 = 1; i2 < this.polygon.length; i2++) {
      totalLength += new Vec2(
        this.polygon[i2][0] * this.scale,
        this.polygon[i2][1] * this.scale
      ).distance(
        new Vec2(
          this.polygon[i2 - 1][0] * this.scale,
          this.polygon[i2 - 1][1] * this.scale
        )
      );
    }
    return totalLength;
  }
  // Calculates the real width and height of the transformed polygon
  calculateDimensions() {
    let leftMostCoordinate = this.transformedPolygon[0][0], rightMostCoordinate = this.transformedPolygon[0][0], topMostCoordinate = this.transformedPolygon[0][1], bottomMostCoordinate = this.transformedPolygon[0][1];
    for (let i2 = 0; i2 < this.transformedPolygon.length; i2++) {
      if (this.transformedPolygon[i2][0] < leftMostCoordinate) {
        leftMostCoordinate = this.transformedPolygon[i2][0];
      } else if (this.transformedPolygon[i2][0] > rightMostCoordinate) {
        rightMostCoordinate = this.transformedPolygon[i2][0];
      }
      if (this.transformedPolygon[i2][1] < topMostCoordinate) {
        topMostCoordinate = this.transformedPolygon[i2][1];
      } else if (this.transformedPolygon[i2][1] > bottomMostCoordinate) {
        bottomMostCoordinate = this.transformedPolygon[i2][1];
      }
    }
    this.width = Math.abs(rightMostCoordinate - leftMostCoordinate);
    this.height = Math.abs(bottomMostCoordinate - topMostCoordinate);
  }
  // Create coordinates for the "transformed" version of this path, taking into consideration translation and scaling
  createTransformedPolygon() {
    this.transformedPolygon = [];
    for (let i2 = 0; i2 < this.polygon.length; i2++) {
      this.transformedPolygon.push(
        [
          this.polygon[i2][0] * this.scale + this.origin.x,
          this.polygon[i2][1] * this.scale + this.origin.y
        ]
      );
    }
  }
  draw() {
    if (this.settings.ShowBounds && this.type == "Bounds" || this.settings.ShowObstacles && this.type == "Obstacles") {
      this.ctx.beginPath();
      this.ctx.moveTo(this.transformedPolygon[0][0], this.transformedPolygon[0][1]);
      for (let i2 = 0; i2 < this.transformedPolygon.length; i2++) {
        this.ctx.lineTo(this.transformedPolygon[i2][0], this.transformedPolygon[i2][1]);
      }
      switch (this.type) {
        case "Bounds":
          this.ctx.strokeStyle = this.settings.Colors.BoundsBorderColor;
          this.ctx.lineWidth = this.settings.BoundsBorderThickness;
          this.ctx.fillStyle = this.settings.Colors.BoundsFillColor;
          this.ctx.stroke();
          this.ctx.lineWidth = 1;
          break;
        case "Obstacle":
          this.ctx.fillStyle = this.settings.Colors.ObstacleFillColor;
          break;
      }
      this.ctx.fill();
    }
  }
}
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
var t = function(r2, e2) {
  return (t = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(t2, r3) {
    t2.__proto__ = r3;
  } || function(t2, r3) {
    for (var e3 in r3) Object.prototype.hasOwnProperty.call(r3, e3) && (t2[e3] = r3[e3]);
  })(r2, e2);
};
function r(r2, e2) {
  if ("function" != typeof e2 && null !== e2) throw new TypeError("Class extends value " + String(e2) + " is not a constructor or null");
  function i2() {
    this.constructor = r2;
  }
  t(r2, e2), r2.prototype = null === e2 ? Object.create(e2) : (i2.prototype = e2.prototype, new i2());
}
function e(t2) {
  var r2 = "";
  Array.isArray(t2) || (t2 = [t2]);
  for (var e2 = 0; e2 < t2.length; e2++) {
    var i2 = t2[e2];
    if (i2.type === _.CLOSE_PATH) r2 += "z";
    else if (i2.type === _.HORIZ_LINE_TO) r2 += (i2.relative ? "h" : "H") + i2.x;
    else if (i2.type === _.VERT_LINE_TO) r2 += (i2.relative ? "v" : "V") + i2.y;
    else if (i2.type === _.MOVE_TO) r2 += (i2.relative ? "m" : "M") + i2.x + " " + i2.y;
    else if (i2.type === _.LINE_TO) r2 += (i2.relative ? "l" : "L") + i2.x + " " + i2.y;
    else if (i2.type === _.CURVE_TO) r2 += (i2.relative ? "c" : "C") + i2.x1 + " " + i2.y1 + " " + i2.x2 + " " + i2.y2 + " " + i2.x + " " + i2.y;
    else if (i2.type === _.SMOOTH_CURVE_TO) r2 += (i2.relative ? "s" : "S") + i2.x2 + " " + i2.y2 + " " + i2.x + " " + i2.y;
    else if (i2.type === _.QUAD_TO) r2 += (i2.relative ? "q" : "Q") + i2.x1 + " " + i2.y1 + " " + i2.x + " " + i2.y;
    else if (i2.type === _.SMOOTH_QUAD_TO) r2 += (i2.relative ? "t" : "T") + i2.x + " " + i2.y;
    else {
      if (i2.type !== _.ARC) throw new Error('Unexpected command type "' + i2.type + '" at index ' + e2 + ".");
      r2 += (i2.relative ? "a" : "A") + i2.rX + " " + i2.rY + " " + i2.xRot + " " + +i2.lArcFlag + " " + +i2.sweepFlag + " " + i2.x + " " + i2.y;
    }
  }
  return r2;
}
function i(t2, r2) {
  var e2 = t2[0], i2 = t2[1];
  return [e2 * Math.cos(r2) - i2 * Math.sin(r2), e2 * Math.sin(r2) + i2 * Math.cos(r2)];
}
function a() {
  for (var t2 = [], r2 = 0; r2 < arguments.length; r2++) t2[r2] = arguments[r2];
  for (var e2 = 0; e2 < t2.length; e2++) if ("number" != typeof t2[e2]) throw new Error("assertNumbers arguments[" + e2 + "] is not a number. " + typeof t2[e2] + " == typeof " + t2[e2]);
  return true;
}
var n = Math.PI;
function o(t2, r2, e2) {
  t2.lArcFlag = 0 === t2.lArcFlag ? 0 : 1, t2.sweepFlag = 0 === t2.sweepFlag ? 0 : 1;
  var a2 = t2.rX, o2 = t2.rY, s2 = t2.x, u2 = t2.y;
  a2 = Math.abs(t2.rX), o2 = Math.abs(t2.rY);
  var h2 = i([(r2 - s2) / 2, (e2 - u2) / 2], -t2.xRot / 180 * n), c2 = h2[0], y2 = h2[1], p2 = Math.pow(c2, 2) / Math.pow(a2, 2) + Math.pow(y2, 2) / Math.pow(o2, 2);
  1 < p2 && (a2 *= Math.sqrt(p2), o2 *= Math.sqrt(p2)), t2.rX = a2, t2.rY = o2;
  var m2 = Math.pow(a2, 2) * Math.pow(y2, 2) + Math.pow(o2, 2) * Math.pow(c2, 2), O2 = (t2.lArcFlag !== t2.sweepFlag ? 1 : -1) * Math.sqrt(Math.max(0, (Math.pow(a2, 2) * Math.pow(o2, 2) - m2) / m2)), l2 = a2 * y2 / o2 * O2, T2 = -o2 * c2 / a2 * O2, v2 = i([l2, T2], t2.xRot / 180 * n);
  t2.cX = v2[0] + (r2 + s2) / 2, t2.cY = v2[1] + (e2 + u2) / 2, t2.phi1 = Math.atan2((y2 - T2) / o2, (c2 - l2) / a2), t2.phi2 = Math.atan2((-y2 - T2) / o2, (-c2 - l2) / a2), 0 === t2.sweepFlag && t2.phi2 > t2.phi1 && (t2.phi2 -= 2 * n), 1 === t2.sweepFlag && t2.phi2 < t2.phi1 && (t2.phi2 += 2 * n), t2.phi1 *= 180 / n, t2.phi2 *= 180 / n;
}
function s(t2, r2, e2) {
  a(t2, r2, e2);
  var i2 = t2 * t2 + r2 * r2 - e2 * e2;
  if (0 > i2) return [];
  if (0 === i2) return [[t2 * e2 / (t2 * t2 + r2 * r2), r2 * e2 / (t2 * t2 + r2 * r2)]];
  var n2 = Math.sqrt(i2);
  return [[(t2 * e2 + r2 * n2) / (t2 * t2 + r2 * r2), (r2 * e2 - t2 * n2) / (t2 * t2 + r2 * r2)], [(t2 * e2 - r2 * n2) / (t2 * t2 + r2 * r2), (r2 * e2 + t2 * n2) / (t2 * t2 + r2 * r2)]];
}
var u, h = Math.PI / 180;
function c(t2, r2, e2) {
  return (1 - e2) * t2 + e2 * r2;
}
function y(t2, r2, e2, i2) {
  return t2 + Math.cos(i2 / 180 * n) * r2 + Math.sin(i2 / 180 * n) * e2;
}
function p(t2, r2, e2, i2) {
  var a2 = 1e-6, n2 = r2 - t2, o2 = e2 - r2, s2 = 3 * n2 + 3 * (i2 - e2) - 6 * o2, u2 = 6 * (o2 - n2), h2 = 3 * n2;
  return Math.abs(s2) < a2 ? [-h2 / u2] : (function(t3, r3, e3) {
    var i3 = t3 * t3 / 4 - r3;
    if (i3 < -e3) return [];
    if (i3 <= e3) return [-t3 / 2];
    var a3 = Math.sqrt(i3);
    return [-t3 / 2 - a3, -t3 / 2 + a3];
  })(u2 / s2, h2 / s2, a2);
}
function m(t2, r2, e2, i2, a2) {
  var n2 = 1 - a2;
  return t2 * (n2 * n2 * n2) + r2 * (3 * n2 * n2 * a2) + e2 * (3 * n2 * a2 * a2) + i2 * (a2 * a2 * a2);
}
!(function(t2) {
  function r2() {
    return u2((function(t3, r3, e3) {
      return t3.relative && (void 0 !== t3.x1 && (t3.x1 += r3), void 0 !== t3.y1 && (t3.y1 += e3), void 0 !== t3.x2 && (t3.x2 += r3), void 0 !== t3.y2 && (t3.y2 += e3), void 0 !== t3.x && (t3.x += r3), void 0 !== t3.y && (t3.y += e3), t3.relative = false), t3;
    }));
  }
  function e2() {
    var t3 = NaN, r3 = NaN, e3 = NaN, i2 = NaN;
    return u2((function(a2, n3, o2) {
      return a2.type & _.SMOOTH_CURVE_TO && (a2.type = _.CURVE_TO, t3 = isNaN(t3) ? n3 : t3, r3 = isNaN(r3) ? o2 : r3, a2.x1 = a2.relative ? n3 - t3 : 2 * n3 - t3, a2.y1 = a2.relative ? o2 - r3 : 2 * o2 - r3), a2.type & _.CURVE_TO ? (t3 = a2.relative ? n3 + a2.x2 : a2.x2, r3 = a2.relative ? o2 + a2.y2 : a2.y2) : (t3 = NaN, r3 = NaN), a2.type & _.SMOOTH_QUAD_TO && (a2.type = _.QUAD_TO, e3 = isNaN(e3) ? n3 : e3, i2 = isNaN(i2) ? o2 : i2, a2.x1 = a2.relative ? n3 - e3 : 2 * n3 - e3, a2.y1 = a2.relative ? o2 - i2 : 2 * o2 - i2), a2.type & _.QUAD_TO ? (e3 = a2.relative ? n3 + a2.x1 : a2.x1, i2 = a2.relative ? o2 + a2.y1 : a2.y1) : (e3 = NaN, i2 = NaN), a2;
    }));
  }
  function n2() {
    var t3 = NaN, r3 = NaN;
    return u2((function(e3, i2, a2) {
      if (e3.type & _.SMOOTH_QUAD_TO && (e3.type = _.QUAD_TO, t3 = isNaN(t3) ? i2 : t3, r3 = isNaN(r3) ? a2 : r3, e3.x1 = e3.relative ? i2 - t3 : 2 * i2 - t3, e3.y1 = e3.relative ? a2 - r3 : 2 * a2 - r3), e3.type & _.QUAD_TO) {
        t3 = e3.relative ? i2 + e3.x1 : e3.x1, r3 = e3.relative ? a2 + e3.y1 : e3.y1;
        var n3 = e3.x1, o2 = e3.y1;
        e3.type = _.CURVE_TO, e3.x1 = ((e3.relative ? 0 : i2) + 2 * n3) / 3, e3.y1 = ((e3.relative ? 0 : a2) + 2 * o2) / 3, e3.x2 = (e3.x + 2 * n3) / 3, e3.y2 = (e3.y + 2 * o2) / 3;
      } else t3 = NaN, r3 = NaN;
      return e3;
    }));
  }
  function u2(t3) {
    var r3 = 0, e3 = 0, i2 = NaN, a2 = NaN;
    return function(n3) {
      if (isNaN(i2) && !(n3.type & _.MOVE_TO)) throw new Error("path must start with moveto");
      var o2 = t3(n3, r3, e3, i2, a2);
      return n3.type & _.CLOSE_PATH && (r3 = i2, e3 = a2), void 0 !== n3.x && (r3 = n3.relative ? r3 + n3.x : n3.x), void 0 !== n3.y && (e3 = n3.relative ? e3 + n3.y : n3.y), n3.type & _.MOVE_TO && (i2 = r3, a2 = e3), o2;
    };
  }
  function O2(t3, r3, e3, i2, n3, o2) {
    return a(t3, r3, e3, i2, n3, o2), u2((function(a2, s2, u3, h2) {
      var c2 = a2.x1, y2 = a2.x2, p2 = a2.relative && !isNaN(h2), m2 = void 0 !== a2.x ? a2.x : p2 ? 0 : s2, O3 = void 0 !== a2.y ? a2.y : p2 ? 0 : u3;
      function l3(t4) {
        return t4 * t4;
      }
      a2.type & _.HORIZ_LINE_TO && 0 !== r3 && (a2.type = _.LINE_TO, a2.y = a2.relative ? 0 : u3), a2.type & _.VERT_LINE_TO && 0 !== e3 && (a2.type = _.LINE_TO, a2.x = a2.relative ? 0 : s2), void 0 !== a2.x && (a2.x = a2.x * t3 + O3 * e3 + (p2 ? 0 : n3)), void 0 !== a2.y && (a2.y = m2 * r3 + a2.y * i2 + (p2 ? 0 : o2)), void 0 !== a2.x1 && (a2.x1 = a2.x1 * t3 + a2.y1 * e3 + (p2 ? 0 : n3)), void 0 !== a2.y1 && (a2.y1 = c2 * r3 + a2.y1 * i2 + (p2 ? 0 : o2)), void 0 !== a2.x2 && (a2.x2 = a2.x2 * t3 + a2.y2 * e3 + (p2 ? 0 : n3)), void 0 !== a2.y2 && (a2.y2 = y2 * r3 + a2.y2 * i2 + (p2 ? 0 : o2));
      var T2 = t3 * i2 - r3 * e3;
      if (void 0 !== a2.xRot && (1 !== t3 || 0 !== r3 || 0 !== e3 || 1 !== i2)) if (0 === T2) delete a2.rX, delete a2.rY, delete a2.xRot, delete a2.lArcFlag, delete a2.sweepFlag, a2.type = _.LINE_TO;
      else {
        var v2 = a2.xRot * Math.PI / 180, f2 = Math.sin(v2), N2 = Math.cos(v2), x = 1 / l3(a2.rX), d = 1 / l3(a2.rY), E = l3(N2) * x + l3(f2) * d, A = 2 * f2 * N2 * (x - d), C = l3(f2) * x + l3(N2) * d, M = E * i2 * i2 - A * r3 * i2 + C * r3 * r3, R = A * (t3 * i2 + r3 * e3) - 2 * (E * e3 * i2 + C * t3 * r3), g = E * e3 * e3 - A * t3 * e3 + C * t3 * t3, I = (Math.atan2(R, M - g) + Math.PI) % Math.PI / 2, S = Math.sin(I), L = Math.cos(I);
        a2.rX = Math.abs(T2) / Math.sqrt(M * l3(L) + R * S * L + g * l3(S)), a2.rY = Math.abs(T2) / Math.sqrt(M * l3(S) - R * S * L + g * l3(L)), a2.xRot = 180 * I / Math.PI;
      }
      return void 0 !== a2.sweepFlag && 0 > T2 && (a2.sweepFlag = +!a2.sweepFlag), a2;
    }));
  }
  function l2() {
    return function(t3) {
      var r3 = {};
      for (var e3 in t3) r3[e3] = t3[e3];
      return r3;
    };
  }
  t2.ROUND = function(t3) {
    function r3(r4) {
      return Math.round(r4 * t3) / t3;
    }
    return void 0 === t3 && (t3 = 1e13), a(t3), function(t4) {
      return void 0 !== t4.x1 && (t4.x1 = r3(t4.x1)), void 0 !== t4.y1 && (t4.y1 = r3(t4.y1)), void 0 !== t4.x2 && (t4.x2 = r3(t4.x2)), void 0 !== t4.y2 && (t4.y2 = r3(t4.y2)), void 0 !== t4.x && (t4.x = r3(t4.x)), void 0 !== t4.y && (t4.y = r3(t4.y)), void 0 !== t4.rX && (t4.rX = r3(t4.rX)), void 0 !== t4.rY && (t4.rY = r3(t4.rY)), t4;
    };
  }, t2.TO_ABS = r2, t2.TO_REL = function() {
    return u2((function(t3, r3, e3) {
      return t3.relative || (void 0 !== t3.x1 && (t3.x1 -= r3), void 0 !== t3.y1 && (t3.y1 -= e3), void 0 !== t3.x2 && (t3.x2 -= r3), void 0 !== t3.y2 && (t3.y2 -= e3), void 0 !== t3.x && (t3.x -= r3), void 0 !== t3.y && (t3.y -= e3), t3.relative = true), t3;
    }));
  }, t2.NORMALIZE_HVZ = function(t3, r3, e3) {
    return void 0 === t3 && (t3 = true), void 0 === r3 && (r3 = true), void 0 === e3 && (e3 = true), u2((function(i2, a2, n3, o2, s2) {
      if (isNaN(o2) && !(i2.type & _.MOVE_TO)) throw new Error("path must start with moveto");
      return r3 && i2.type & _.HORIZ_LINE_TO && (i2.type = _.LINE_TO, i2.y = i2.relative ? 0 : n3), e3 && i2.type & _.VERT_LINE_TO && (i2.type = _.LINE_TO, i2.x = i2.relative ? 0 : a2), t3 && i2.type & _.CLOSE_PATH && (i2.type = _.LINE_TO, i2.x = i2.relative ? o2 - a2 : o2, i2.y = i2.relative ? s2 - n3 : s2), i2.type & _.ARC && (0 === i2.rX || 0 === i2.rY) && (i2.type = _.LINE_TO, delete i2.rX, delete i2.rY, delete i2.xRot, delete i2.lArcFlag, delete i2.sweepFlag), i2;
    }));
  }, t2.NORMALIZE_ST = e2, t2.QT_TO_C = n2, t2.INFO = u2, t2.SANITIZE = function(t3) {
    void 0 === t3 && (t3 = 0), a(t3);
    var r3 = NaN, e3 = NaN, i2 = NaN, n3 = NaN;
    return u2((function(a2, o2, s2, u3, h2) {
      var c2 = Math.abs, y2 = false, p2 = 0, m2 = 0;
      if (a2.type & _.SMOOTH_CURVE_TO && (p2 = isNaN(r3) ? 0 : o2 - r3, m2 = isNaN(e3) ? 0 : s2 - e3), a2.type & (_.CURVE_TO | _.SMOOTH_CURVE_TO) ? (r3 = a2.relative ? o2 + a2.x2 : a2.x2, e3 = a2.relative ? s2 + a2.y2 : a2.y2) : (r3 = NaN, e3 = NaN), a2.type & _.SMOOTH_QUAD_TO ? (i2 = isNaN(i2) ? o2 : 2 * o2 - i2, n3 = isNaN(n3) ? s2 : 2 * s2 - n3) : a2.type & _.QUAD_TO ? (i2 = a2.relative ? o2 + a2.x1 : a2.x1, n3 = a2.relative ? s2 + a2.y1 : a2.y2) : (i2 = NaN, n3 = NaN), a2.type & _.LINE_COMMANDS || a2.type & _.ARC && (0 === a2.rX || 0 === a2.rY || !a2.lArcFlag) || a2.type & _.CURVE_TO || a2.type & _.SMOOTH_CURVE_TO || a2.type & _.QUAD_TO || a2.type & _.SMOOTH_QUAD_TO) {
        var O3 = void 0 === a2.x ? 0 : a2.relative ? a2.x : a2.x - o2, l3 = void 0 === a2.y ? 0 : a2.relative ? a2.y : a2.y - s2;
        p2 = isNaN(i2) ? void 0 === a2.x1 ? p2 : a2.relative ? a2.x : a2.x1 - o2 : i2 - o2, m2 = isNaN(n3) ? void 0 === a2.y1 ? m2 : a2.relative ? a2.y : a2.y1 - s2 : n3 - s2;
        var T2 = void 0 === a2.x2 ? 0 : a2.relative ? a2.x : a2.x2 - o2, v2 = void 0 === a2.y2 ? 0 : a2.relative ? a2.y : a2.y2 - s2;
        c2(O3) <= t3 && c2(l3) <= t3 && c2(p2) <= t3 && c2(m2) <= t3 && c2(T2) <= t3 && c2(v2) <= t3 && (y2 = true);
      }
      return a2.type & _.CLOSE_PATH && c2(o2 - u3) <= t3 && c2(s2 - h2) <= t3 && (y2 = true), y2 ? [] : a2;
    }));
  }, t2.MATRIX = O2, t2.ROTATE = function(t3, r3, e3) {
    void 0 === r3 && (r3 = 0), void 0 === e3 && (e3 = 0), a(t3, r3, e3);
    var i2 = Math.sin(t3), n3 = Math.cos(t3);
    return O2(n3, i2, -i2, n3, r3 - r3 * n3 + e3 * i2, e3 - r3 * i2 - e3 * n3);
  }, t2.TRANSLATE = function(t3, r3) {
    return void 0 === r3 && (r3 = 0), a(t3, r3), O2(1, 0, 0, 1, t3, r3);
  }, t2.SCALE = function(t3, r3) {
    return void 0 === r3 && (r3 = t3), a(t3, r3), O2(t3, 0, 0, r3, 0, 0);
  }, t2.SKEW_X = function(t3) {
    return a(t3), O2(1, 0, Math.atan(t3), 1, 0, 0);
  }, t2.SKEW_Y = function(t3) {
    return a(t3), O2(1, Math.atan(t3), 0, 1, 0, 0);
  }, t2.X_AXIS_SYMMETRY = function(t3) {
    return void 0 === t3 && (t3 = 0), a(t3), O2(-1, 0, 0, 1, t3, 0);
  }, t2.Y_AXIS_SYMMETRY = function(t3) {
    return void 0 === t3 && (t3 = 0), a(t3), O2(1, 0, 0, -1, 0, t3);
  }, t2.A_TO_C = function() {
    return u2((function(t3, r3, e3) {
      return _.ARC === t3.type ? (function(t4, r4, e4) {
        var a2, n3, s2, u3;
        t4.cX || o(t4, r4, e4);
        for (var y2 = Math.min(t4.phi1, t4.phi2), p2 = Math.max(t4.phi1, t4.phi2) - y2, m2 = Math.ceil(p2 / 90), O3 = new Array(m2), l3 = r4, T2 = e4, v2 = 0; v2 < m2; v2++) {
          var f2 = c(t4.phi1, t4.phi2, v2 / m2), N2 = c(t4.phi1, t4.phi2, (v2 + 1) / m2), x = N2 - f2, d = 4 / 3 * Math.tan(x * h / 4), E = [Math.cos(f2 * h) - d * Math.sin(f2 * h), Math.sin(f2 * h) + d * Math.cos(f2 * h)], A = E[0], C = E[1], M = [Math.cos(N2 * h), Math.sin(N2 * h)], R = M[0], g = M[1], I = [R + d * Math.sin(N2 * h), g - d * Math.cos(N2 * h)], S = I[0], L = I[1];
          O3[v2] = { relative: t4.relative, type: _.CURVE_TO };
          var H = function(r5, e5) {
            var a3 = i([r5 * t4.rX, e5 * t4.rY], t4.xRot), n4 = a3[0], o2 = a3[1];
            return [t4.cX + n4, t4.cY + o2];
          };
          a2 = H(A, C), O3[v2].x1 = a2[0], O3[v2].y1 = a2[1], n3 = H(S, L), O3[v2].x2 = n3[0], O3[v2].y2 = n3[1], s2 = H(R, g), O3[v2].x = s2[0], O3[v2].y = s2[1], t4.relative && (O3[v2].x1 -= l3, O3[v2].y1 -= T2, O3[v2].x2 -= l3, O3[v2].y2 -= T2, O3[v2].x -= l3, O3[v2].y -= T2), l3 = (u3 = [O3[v2].x, O3[v2].y])[0], T2 = u3[1];
        }
        return O3;
      })(t3, t3.relative ? 0 : r3, t3.relative ? 0 : e3) : t3;
    }));
  }, t2.ANNOTATE_ARCS = function() {
    return u2((function(t3, r3, e3) {
      return t3.relative && (r3 = 0, e3 = 0), _.ARC === t3.type && o(t3, r3, e3), t3;
    }));
  }, t2.CLONE = l2, t2.CALCULATE_BOUNDS = function() {
    var t3 = function(t4) {
      var r3 = {};
      for (var e3 in t4) r3[e3] = t4[e3];
      return r3;
    }, i2 = r2(), a2 = n2(), h2 = e2(), c2 = u2((function(r3, e3, n3) {
      var u3 = h2(a2(i2(t3(r3))));
      function O3(t4) {
        t4 > c2.maxX && (c2.maxX = t4), t4 < c2.minX && (c2.minX = t4);
      }
      function l3(t4) {
        t4 > c2.maxY && (c2.maxY = t4), t4 < c2.minY && (c2.minY = t4);
      }
      if (u3.type & _.DRAWING_COMMANDS && (O3(e3), l3(n3)), u3.type & _.HORIZ_LINE_TO && O3(u3.x), u3.type & _.VERT_LINE_TO && l3(u3.y), u3.type & _.LINE_TO && (O3(u3.x), l3(u3.y)), u3.type & _.CURVE_TO) {
        O3(u3.x), l3(u3.y);
        for (var T2 = 0, v2 = p(e3, u3.x1, u3.x2, u3.x); T2 < v2.length; T2++) {
          0 < (w = v2[T2]) && 1 > w && O3(m(e3, u3.x1, u3.x2, u3.x, w));
        }
        for (var f2 = 0, N2 = p(n3, u3.y1, u3.y2, u3.y); f2 < N2.length; f2++) {
          0 < (w = N2[f2]) && 1 > w && l3(m(n3, u3.y1, u3.y2, u3.y, w));
        }
      }
      if (u3.type & _.ARC) {
        O3(u3.x), l3(u3.y), o(u3, e3, n3);
        for (var x = u3.xRot / 180 * Math.PI, d = Math.cos(x) * u3.rX, E = Math.sin(x) * u3.rX, A = -Math.sin(x) * u3.rY, C = Math.cos(x) * u3.rY, M = u3.phi1 < u3.phi2 ? [u3.phi1, u3.phi2] : -180 > u3.phi2 ? [u3.phi2 + 360, u3.phi1 + 360] : [u3.phi2, u3.phi1], R = M[0], g = M[1], I = function(t4) {
          var r4 = t4[0], e4 = t4[1], i3 = 180 * Math.atan2(e4, r4) / Math.PI;
          return i3 < R ? i3 + 360 : i3;
        }, S = 0, L = s(A, -d, 0).map(I); S < L.length; S++) {
          (w = L[S]) > R && w < g && O3(y(u3.cX, d, A, w));
        }
        for (var H = 0, U = s(C, -E, 0).map(I); H < U.length; H++) {
          var w;
          (w = U[H]) > R && w < g && l3(y(u3.cY, E, C, w));
        }
      }
      return r3;
    }));
    return c2.minX = 1 / 0, c2.maxX = -1 / 0, c2.minY = 1 / 0, c2.maxY = -1 / 0, c2;
  };
})(u || (u = {}));
var O, l = (function() {
  function t2() {
  }
  return t2.prototype.round = function(t3) {
    return this.transform(u.ROUND(t3));
  }, t2.prototype.toAbs = function() {
    return this.transform(u.TO_ABS());
  }, t2.prototype.toRel = function() {
    return this.transform(u.TO_REL());
  }, t2.prototype.normalizeHVZ = function(t3, r2, e2) {
    return this.transform(u.NORMALIZE_HVZ(t3, r2, e2));
  }, t2.prototype.normalizeST = function() {
    return this.transform(u.NORMALIZE_ST());
  }, t2.prototype.qtToC = function() {
    return this.transform(u.QT_TO_C());
  }, t2.prototype.aToC = function() {
    return this.transform(u.A_TO_C());
  }, t2.prototype.sanitize = function(t3) {
    return this.transform(u.SANITIZE(t3));
  }, t2.prototype.translate = function(t3, r2) {
    return this.transform(u.TRANSLATE(t3, r2));
  }, t2.prototype.scale = function(t3, r2) {
    return this.transform(u.SCALE(t3, r2));
  }, t2.prototype.rotate = function(t3, r2, e2) {
    return this.transform(u.ROTATE(t3, r2, e2));
  }, t2.prototype.matrix = function(t3, r2, e2, i2, a2, n2) {
    return this.transform(u.MATRIX(t3, r2, e2, i2, a2, n2));
  }, t2.prototype.skewX = function(t3) {
    return this.transform(u.SKEW_X(t3));
  }, t2.prototype.skewY = function(t3) {
    return this.transform(u.SKEW_Y(t3));
  }, t2.prototype.xSymmetry = function(t3) {
    return this.transform(u.X_AXIS_SYMMETRY(t3));
  }, t2.prototype.ySymmetry = function(t3) {
    return this.transform(u.Y_AXIS_SYMMETRY(t3));
  }, t2.prototype.annotateArcs = function() {
    return this.transform(u.ANNOTATE_ARCS());
  }, t2;
})(), T = function(t2) {
  return " " === t2 || "	" === t2 || "\r" === t2 || "\n" === t2;
}, v = function(t2) {
  return "0".charCodeAt(0) <= t2.charCodeAt(0) && t2.charCodeAt(0) <= "9".charCodeAt(0);
}, f = (function(t2) {
  function e2() {
    var r2 = t2.call(this) || this;
    return r2.curNumber = "", r2.curCommandType = -1, r2.curCommandRelative = false, r2.canParseCommandOrComma = true, r2.curNumberHasExp = false, r2.curNumberHasExpDigits = false, r2.curNumberHasDecimal = false, r2.curArgs = [], r2;
  }
  return r(e2, t2), e2.prototype.finish = function(t3) {
    if (void 0 === t3 && (t3 = []), this.parse(" ", t3), 0 !== this.curArgs.length || !this.canParseCommandOrComma) throw new SyntaxError("Unterminated command at the path end.");
    return t3;
  }, e2.prototype.parse = function(t3, r2) {
    var e3 = this;
    void 0 === r2 && (r2 = []);
    for (var i2 = function(t4) {
      r2.push(t4), e3.curArgs.length = 0, e3.canParseCommandOrComma = true;
    }, a2 = 0; a2 < t3.length; a2++) {
      var n2 = t3[a2], o2 = !(this.curCommandType !== _.ARC || 3 !== this.curArgs.length && 4 !== this.curArgs.length || 1 !== this.curNumber.length || "0" !== this.curNumber && "1" !== this.curNumber), s2 = v(n2) && ("0" === this.curNumber && "0" === n2 || o2);
      if (!v(n2) || s2) if ("e" !== n2 && "E" !== n2) if ("-" !== n2 && "+" !== n2 || !this.curNumberHasExp || this.curNumberHasExpDigits) if ("." !== n2 || this.curNumberHasExp || this.curNumberHasDecimal || o2) {
        if (this.curNumber && -1 !== this.curCommandType) {
          var u2 = Number(this.curNumber);
          if (isNaN(u2)) throw new SyntaxError("Invalid number ending at " + a2);
          if (this.curCommandType === _.ARC) {
            if (0 === this.curArgs.length || 1 === this.curArgs.length) {
              if (0 > u2) throw new SyntaxError('Expected positive number, got "' + u2 + '" at index "' + a2 + '"');
            } else if ((3 === this.curArgs.length || 4 === this.curArgs.length) && "0" !== this.curNumber && "1" !== this.curNumber) throw new SyntaxError('Expected a flag, got "' + this.curNumber + '" at index "' + a2 + '"');
          }
          this.curArgs.push(u2), this.curArgs.length === N[this.curCommandType] && (_.HORIZ_LINE_TO === this.curCommandType ? i2({ type: _.HORIZ_LINE_TO, relative: this.curCommandRelative, x: u2 }) : _.VERT_LINE_TO === this.curCommandType ? i2({ type: _.VERT_LINE_TO, relative: this.curCommandRelative, y: u2 }) : this.curCommandType === _.MOVE_TO || this.curCommandType === _.LINE_TO || this.curCommandType === _.SMOOTH_QUAD_TO ? (i2({ type: this.curCommandType, relative: this.curCommandRelative, x: this.curArgs[0], y: this.curArgs[1] }), _.MOVE_TO === this.curCommandType && (this.curCommandType = _.LINE_TO)) : this.curCommandType === _.CURVE_TO ? i2({ type: _.CURVE_TO, relative: this.curCommandRelative, x1: this.curArgs[0], y1: this.curArgs[1], x2: this.curArgs[2], y2: this.curArgs[3], x: this.curArgs[4], y: this.curArgs[5] }) : this.curCommandType === _.SMOOTH_CURVE_TO ? i2({ type: _.SMOOTH_CURVE_TO, relative: this.curCommandRelative, x2: this.curArgs[0], y2: this.curArgs[1], x: this.curArgs[2], y: this.curArgs[3] }) : this.curCommandType === _.QUAD_TO ? i2({ type: _.QUAD_TO, relative: this.curCommandRelative, x1: this.curArgs[0], y1: this.curArgs[1], x: this.curArgs[2], y: this.curArgs[3] }) : this.curCommandType === _.ARC && i2({ type: _.ARC, relative: this.curCommandRelative, rX: this.curArgs[0], rY: this.curArgs[1], xRot: this.curArgs[2], lArcFlag: this.curArgs[3], sweepFlag: this.curArgs[4], x: this.curArgs[5], y: this.curArgs[6] })), this.curNumber = "", this.curNumberHasExpDigits = false, this.curNumberHasExp = false, this.curNumberHasDecimal = false, this.canParseCommandOrComma = true;
        }
        if (!T(n2)) if ("," === n2 && this.canParseCommandOrComma) this.canParseCommandOrComma = false;
        else if ("+" !== n2 && "-" !== n2 && "." !== n2) if (s2) this.curNumber = n2, this.curNumberHasDecimal = false;
        else {
          if (0 !== this.curArgs.length) throw new SyntaxError("Unterminated command at index " + a2 + ".");
          if (!this.canParseCommandOrComma) throw new SyntaxError('Unexpected character "' + n2 + '" at index ' + a2 + ". Command cannot follow comma");
          if (this.canParseCommandOrComma = false, "z" !== n2 && "Z" !== n2) if ("h" === n2 || "H" === n2) this.curCommandType = _.HORIZ_LINE_TO, this.curCommandRelative = "h" === n2;
          else if ("v" === n2 || "V" === n2) this.curCommandType = _.VERT_LINE_TO, this.curCommandRelative = "v" === n2;
          else if ("m" === n2 || "M" === n2) this.curCommandType = _.MOVE_TO, this.curCommandRelative = "m" === n2;
          else if ("l" === n2 || "L" === n2) this.curCommandType = _.LINE_TO, this.curCommandRelative = "l" === n2;
          else if ("c" === n2 || "C" === n2) this.curCommandType = _.CURVE_TO, this.curCommandRelative = "c" === n2;
          else if ("s" === n2 || "S" === n2) this.curCommandType = _.SMOOTH_CURVE_TO, this.curCommandRelative = "s" === n2;
          else if ("q" === n2 || "Q" === n2) this.curCommandType = _.QUAD_TO, this.curCommandRelative = "q" === n2;
          else if ("t" === n2 || "T" === n2) this.curCommandType = _.SMOOTH_QUAD_TO, this.curCommandRelative = "t" === n2;
          else {
            if ("a" !== n2 && "A" !== n2) throw new SyntaxError('Unexpected character "' + n2 + '" at index ' + a2 + ".");
            this.curCommandType = _.ARC, this.curCommandRelative = "a" === n2;
          }
          else r2.push({ type: _.CLOSE_PATH }), this.canParseCommandOrComma = true, this.curCommandType = -1;
        }
        else this.curNumber = n2, this.curNumberHasDecimal = "." === n2;
      } else this.curNumber += n2, this.curNumberHasDecimal = true;
      else this.curNumber += n2;
      else this.curNumber += n2, this.curNumberHasExp = true;
      else this.curNumber += n2, this.curNumberHasExpDigits = this.curNumberHasExp;
    }
    return r2;
  }, e2.prototype.transform = function(t3) {
    return Object.create(this, { parse: { value: function(r2, e3) {
      void 0 === e3 && (e3 = []);
      for (var i2 = 0, a2 = Object.getPrototypeOf(this).parse.call(this, r2); i2 < a2.length; i2++) {
        var n2 = a2[i2], o2 = t3(n2);
        Array.isArray(o2) ? e3.push.apply(e3, o2) : e3.push(o2);
      }
      return e3;
    } } });
  }, e2;
})(l), _ = (function(t2) {
  function i2(r2) {
    var e2 = t2.call(this) || this;
    return e2.commands = "string" == typeof r2 ? i2.parse(r2) : r2, e2;
  }
  return r(i2, t2), i2.prototype.encode = function() {
    return i2.encode(this.commands);
  }, i2.prototype.getBounds = function() {
    var t3 = u.CALCULATE_BOUNDS();
    return this.transform(t3), t3;
  }, i2.prototype.transform = function(t3) {
    for (var r2 = [], e2 = 0, i3 = this.commands; e2 < i3.length; e2++) {
      var a2 = t3(i3[e2]);
      Array.isArray(a2) ? r2.push.apply(r2, a2) : r2.push(a2);
    }
    return this.commands = r2, this;
  }, i2.encode = function(t3) {
    return e(t3);
  }, i2.parse = function(t3) {
    var r2 = new f(), e2 = [];
    return r2.parse(t3, e2), r2.finish(e2), e2;
  }, i2.CLOSE_PATH = 1, i2.MOVE_TO = 2, i2.HORIZ_LINE_TO = 4, i2.VERT_LINE_TO = 8, i2.LINE_TO = 16, i2.CURVE_TO = 32, i2.SMOOTH_CURVE_TO = 64, i2.QUAD_TO = 128, i2.SMOOTH_QUAD_TO = 256, i2.ARC = 512, i2.LINE_COMMANDS = i2.LINE_TO | i2.HORIZ_LINE_TO | i2.VERT_LINE_TO, i2.DRAWING_COMMANDS = i2.HORIZ_LINE_TO | i2.VERT_LINE_TO | i2.LINE_TO | i2.CURVE_TO | i2.SMOOTH_CURVE_TO | i2.QUAD_TO | i2.SMOOTH_QUAD_TO | i2.ARC, i2;
})(l), N = ((O = {})[_.MOVE_TO] = 2, O[_.LINE_TO] = 2, O[_.HORIZ_LINE_TO] = 1, O[_.VERT_LINE_TO] = 1, O[_.CLOSE_PATH] = 0, O[_.QUAD_TO] = 4, O[_.SMOOTH_QUAD_TO] = 2, O[_.CURVE_TO] = 6, O[_.SMOOTH_CURVE_TO] = 4, O[_.ARC] = 7, O);
class SVGLoader {
  constructor() {
  }
  static load(svgString) {
    let parser = new DOMParser();
    let svgNode = parser.parseFromString(svgString, "image/svg+xml");
    let inputPaths = svgNode.querySelectorAll("path"), paths = [];
    for (let inputPath of inputPaths) {
      let pathData = new _(inputPath.getAttribute("d")), points = [];
      let previousCoords = {
        x: 0,
        y: 0
      };
      for (let [index, command] of pathData.commands.entries()) {
        switch (command.type) {
          // Move ('M') and line ('L') commands have both X and Y
          case _.MOVE_TO:
          case _.LINE_TO:
            points.push([command.x, command.y]);
            break;
          // Horizontal line ('H') commands only have X, using previous command's Y
          case _.HORIZ_LINE_TO:
            points.push([command.x, previousCoords.y]);
            break;
          // Vertical line ('V') commands only have Y, using previous command's X
          case _.VERT_LINE_TO:
            points.push([previousCoords.x, command.y]);
            break;
          // ClosePath ('Z') commands are a naive indication that the current path can be processed and added to the world
          case _.CLOSE_PATH:
            paths.push(points);
            points = [];
            break;
        }
        if (index == pathData.commands.length - 1 && command.type != _.CLOSE_PATH) {
          paths.push(points);
          points = [];
        }
        if (command.hasOwnProperty("x")) {
          previousCoords.x = command.x;
        }
        if (command.hasOwnProperty("y")) {
          previousCoords.y = command.y;
        }
      }
    }
    return paths;
  }
}
const SQRT3 = /* @__PURE__ */ Math.sqrt(3);
const F2 = 0.5 * (SQRT3 - 1);
const G2 = (3 - SQRT3) / 6;
const fastFloor = (x) => Math.floor(x) | 0;
const grad2 = /* @__PURE__ */ new Float64Array([
  1,
  1,
  -1,
  1,
  1,
  -1,
  -1,
  -1,
  1,
  0,
  -1,
  0,
  1,
  0,
  -1,
  0,
  0,
  1,
  0,
  -1,
  0,
  1,
  0,
  -1
]);
function createNoise2D(random2 = Math.random) {
  const perm = buildPermutationTable(random2);
  const permGrad2x = new Float64Array(perm).map((v2) => grad2[v2 % 12 * 2]);
  const permGrad2y = new Float64Array(perm).map((v2) => grad2[v2 % 12 * 2 + 1]);
  return function noise2D(x, y2) {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    const s2 = (x + y2) * F2;
    const i2 = fastFloor(x + s2);
    const j = fastFloor(y2 + s2);
    const t2 = (i2 + j) * G2;
    const X0 = i2 - t2;
    const Y0 = j - t2;
    const x0 = x - X0;
    const y0 = y2 - Y0;
    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y22 = y0 - 1 + 2 * G2;
    const ii = i2 & 255;
    const jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = ii + perm[jj];
      const g0x = permGrad2x[gi0];
      const g0y = permGrad2y[gi0];
      t0 *= t0;
      n0 = t0 * t0 * (g0x * x0 + g0y * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = ii + i1 + perm[jj + j1];
      const g1x = permGrad2x[gi1];
      const g1y = permGrad2y[gi1];
      t1 *= t1;
      n1 = t1 * t1 * (g1x * x1 + g1y * y1);
    }
    let t22 = 0.5 - x2 * x2 - y22 * y22;
    if (t22 >= 0) {
      const gi2 = ii + 1 + perm[jj + 1];
      const g2x = permGrad2x[gi2];
      const g2y = permGrad2y[gi2];
      t22 *= t22;
      n2 = t22 * t22 * (g2x * x2 + g2y * y22);
    }
    return 70 * (n0 + n1 + n2);
  };
}
function buildPermutationTable(random2) {
  const tableSize = 512;
  const p2 = new Uint8Array(tableSize);
  for (let i2 = 0; i2 < tableSize / 2; i2++) {
    p2[i2] = i2;
  }
  for (let i2 = 0; i2 < tableSize / 2 - 1; i2++) {
    const r2 = i2 + ~~(random2() * (256 - i2));
    const aux = p2[i2];
    p2[i2] = p2[r2];
    p2[r2] = aux;
  }
  for (let i2 = 256; i2 < tableSize; i2++) {
    p2[i2] = p2[i2 - 256];
  }
  return p2;
}
function getRandomAttractors(numAttractors, ctx, bounds = void 0, obstacles = void 0) {
  let attractors = [];
  let x, y2;
  let isInsideAnyBounds, isInsideAnyObstacle;
  for (let i2 = 0; i2 < numAttractors; i2++) {
    x = random(window.innerWidth);
    y2 = random(window.innerHeight);
    isInsideAnyBounds = false;
    isInsideAnyObstacle = false;
    if (bounds != void 0 && bounds.length > 0) {
      for (let bound of bounds) {
        if (bound.contains(x, y2)) {
          isInsideAnyBounds = true;
        }
      }
    }
    if (obstacles != void 0 && obstacles.length > 0) {
      for (let obstacle of obstacles) {
        if (obstacle.contains(x, y2)) {
          isInsideAnyObstacle = true;
        }
      }
    }
    if ((isInsideAnyBounds || bounds === void 0) && (!isInsideAnyObstacle || obstacles === void 0)) {
      attractors.push(
        new Attractor(
          new Vec2(x, y2),
          ctx
        )
      );
    }
  }
  return attractors;
}
function getGridOfAttractors(numRows, numColumns, ctx, jitterRange = 0, bounds = void 0, obstacles = void 0) {
  let attractors = [];
  let x, y2;
  let isInsideAnyBounds, isInsideAnyObstacle, isOnScreen;
  for (let i2 = 0; i2 <= numRows; i2++) {
    for (let j = 0; j <= numColumns; j++) {
      x = window.innerWidth / numColumns * j + random(-jitterRange, jitterRange);
      y2 = window.innerHeight / numRows * i2 + random(-jitterRange, jitterRange);
      isInsideAnyBounds = false;
      isInsideAnyObstacle = false;
      isOnScreen = false;
      if (x > 0 && x < window.innerWidth && y2 > 0 && y2 < window.innerHeight) {
        isOnScreen = true;
      }
      if (bounds != void 0 && bounds.length > 0) {
        for (let bound of bounds) {
          if (bound.contains(x, y2)) {
            isInsideAnyBounds = true;
          }
        }
      }
      if (obstacles != void 0 && obstacles.length > 0) {
        for (let obstacle of obstacles) {
          if (obstacle.contains(x, y2)) {
            isInsideAnyObstacle = true;
          }
        }
      }
      if (isOnScreen && (isInsideAnyBounds || bounds === void 0) && (!isInsideAnyObstacle || obstacles === void 0)) {
        attractors.push(
          new Attractor(
            new Vec2(x, y2),
            ctx
          )
        );
      }
    }
  }
  return attractors;
}
function getPhyllotaxisAttractors(ctx) {
  let attractors = [];
  let numCircles = 5e3, golden_ratio = (Math.sqrt(5) + 1) / 2 - 1, golden_angle = golden_ratio * (2 * Math.PI), circle_rad = window.innerWidth / 2;
  for (let i2 = 0; i2 < numCircles; i2++) {
    let ratio = i2 / numCircles, angle = i2 * golden_angle, spiral_rad = ratio * circle_rad;
    attractors.push(
      new Attractor(
        new Vec2(
          window.innerWidth / 2 + Math.cos(angle) * spiral_rad,
          window.innerHeight / 2 + Math.sin(angle) * spiral_rad
        ),
        ctx
      )
    );
  }
  return attractors;
}
function getWaveOfAttractors(ctx) {
  let attractors = [];
  let numRows = 70;
  let numColumns = 100;
  let rowSpacing = window.innerHeight / numRows;
  let colSpacing = window.innerWidth / numColumns;
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numColumns; col++) {
      attractors.push(
        new Attractor(
          new Vec2(
            col * colSpacing + Math.sin(map(col, 0, numColumns, 0, Math.PI * 2)) * 200,
            row * rowSpacing + Math.sin(map(row, 0, numRows, 0, Math.PI * 2)) * 50
          ),
          ctx
        )
      );
    }
  }
  return attractors;
}
function applyNoise(attractors) {
  const noise2D = createNoise2D();
  for (let attractor of attractors) {
    attractor.position.x += noise2D(attractor.position.x, attractor.position.y) * 10;
    attractor.position.y += noise2D(attractor.position.x, attractor.position.y) * 10;
  }
  return attractors;
}
const AttractorPatterns = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  applyNoise,
  getGridOfAttractors,
  getPhyllotaxisAttractors,
  getRandomAttractors,
  getWaveOfAttractors
}, Symbol.toStringTag, { value: "Module" }));
function setupKeyListeners(network) {
  document.addEventListener("keypress", (e2) => {
    switch (e2.key) {
      // Space = pause/unpause
      case " ":
        network.togglePause();
        break;
      // b = toggle branch visibility
      case "b":
        network.toggleBranches();
        break;
      // a = toggle attractor visibility
      case "a":
        network.toggleAttractors();
        break;
      // z = toggle attraction zone visibility
      case "z":
        network.toggleAttractionZones();
        break;
      // t = toggle tip visibility
      case "t":
        network.toggleTips();
        break;
      // k = toggle kill zone visibility
      case "k":
        network.toggleKillZones();
        break;
      // i = toggle influence lines visibility
      case "i":
        network.toggleInfluenceLines();
        break;
      // b = toggle bounds visibility
      case "b":
        network.toggleBounds();
        break;
      // o = toggle obstacles visibility
      case "o":
        network.toggleObstacles();
        break;
      // e = export an SVG file of all visible geometry
      case "e":
        exportSVG(network);
        break;
      // c = toggle auxin flux canalization
      case "c":
        network.toggleCanalization();
        break;
      // p = toggle opacity blending
      case "p":
        network.toggleOpacityBlending();
        break;
    }
  });
}
exports.Attractor = Attractor;
exports.AttractorPatterns = AttractorPatterns;
exports.ColorPresets = ColorPresets;
exports.Defaults = Defaults;
exports.Network = Network;
exports.Node = Node;
exports.Path = Path;
exports.SVGLoader = SVGLoader;
exports.Utilities = Utilities;
exports.Vec2 = Vec2;
exports.setupKeyListeners = setupKeyListeners;
//# sourceMappingURL=index.cjs.map
