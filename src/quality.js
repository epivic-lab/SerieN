class QualityController {
  constructor({ profile = "high", windowSeconds = 3, slowFrame = 0.032, fastFrame = 0.02, slowWindows = 2, stableFastSeconds = 15, cooldownSeconds = 8 } = {}) {
    if (!["high", "low"].includes(profile)) throw new RangeError("Initial quality must be high or low");
    if (!(windowSeconds > 0 && fastFrame > 0 && slowFrame > fastFrame && slowWindows >= 1 && stableFastSeconds >= windowSeconds && cooldownSeconds >= 0)) throw new RangeError("Invalid quality policy");
    this.profile = profile;
    this.mode = "auto";
    this.policy = { windowSeconds, slowFrame, fastFrame, slowWindows, stableFastSeconds, cooldownSeconds };
    this._hidden = false;
    this._cooldown = 0;
    this._resetWindow();
  }
  _resetWindow() {
    this._seconds = 0;
    this._frames = 0;
    this._slowWindows = 0;
    this._fastSeconds = 0;
  }
  setMode(value) {
    if (!["auto", "high", "low", "cinema"].includes(value)) throw new RangeError("Unknown quality mode: " + value);
    this.mode = value;
    if (value !== "auto") this.profile = value;
    else if (this.profile === "cinema") this.profile = "high";
    this._cooldown = 0;
    this._resetWindow();
    return this.profile;
  }
  /** Notify with update(0, false) from visibilitychange; the first return frame is ignored. */
  update(dt, visible = true) {
    if (!visible) {
      this._hidden = true;
      this._resetWindow();
      return null;
    }
    if (this._hidden) {
      this._hidden = false;
      this._resetWindow();
      return null;
    }
    if (this.mode !== "auto" || !Number.isFinite(dt) || dt <= 0) return null;
    const elapsed = Math.min(dt, 0.25);
    this._cooldown = Math.max(0, this._cooldown - elapsed);
    this._seconds += elapsed;
    this._frames++;
    if (this._seconds + 1e-8 < this.policy.windowSeconds) return null;
    const duration = this._seconds, mean = duration / this._frames;
    this._seconds = 0;
    this._frames = 0;
    this._slowWindows = mean > this.policy.slowFrame ? this._slowWindows + 1 : 0;
    this._fastSeconds = mean < this.policy.fastFrame ? this._fastSeconds + duration : 0;
    if (this._cooldown > 0) return null;
    let next = null;
    if (this.profile === "high" && this._slowWindows >= this.policy.slowWindows) next = "low";
    if (this.profile === "low" && this._fastSeconds + 1e-8 >= this.policy.stableFastSeconds) next = "high";
    if (!next) return null;
    this.profile = next;
    this._resetWindow();
    this._cooldown = this.policy.cooldownSeconds;
    return next;
  }
}
export {
  QualityController
};
