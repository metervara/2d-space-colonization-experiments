/**
 * Simple 2D vector class for mathematical operations
 */
export default class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Add another vector to this one
   * @param {Vec2} v - Vector to add
   * @param {boolean} returnNew - If true, return a new Vec2 instead of modifying this one
   * @returns {Vec2}
   */
  add(v, returnNew = false) {
    if (returnNew) {
      return new Vec2(this.x + v.x, this.y + v.y);
    }
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * Subtract another vector from this one
   * @param {Vec2} v - Vector to subtract
   * @param {boolean} returnNew - If true, return a new Vec2 instead of modifying this one
   * @returns {Vec2}
   */
  subtract(v, returnNew = false) {
    if (returnNew) {
      return new Vec2(this.x - v.x, this.y - v.y);
    }
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * Multiply this vector by a scalar or another vector
   * @param {number|Vec2} v - Scalar or vector to multiply by
   * @param {boolean} returnNew - If true, return a new Vec2 instead of modifying this one
   * @returns {Vec2}
   */
  multiply(v, returnNew = false) {
    const mx = typeof v === 'number' ? v : v.x;
    const my = typeof v === 'number' ? v : v.y;
    
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
  divide(v, returnNew = false) {
    const dx = typeof v === 'number' ? v : v.x;
    const dy = typeof v === 'number' ? v : v.y;
    
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
  distance(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
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
