export class InputManager {
  constructor() {
    this.keys = new Set();
    this.gamepadIndex = null;
    this.latestGamepad = null;
    this.onConnect = null;
    this.onDisconnect = null;
    this.onAnyGamepadChange = null;

    window.addEventListener('keydown', (event) => this.keys.add(event.code));
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.keys.clear());

    window.addEventListener('gamepadconnected', (event) => {
      this.gamepadIndex = event.gamepad.index;
      if (this.onConnect) this.onConnect(event.gamepad);
      if (this.onAnyGamepadChange) this.onAnyGamepadChange(true, event.gamepad);
    });

    window.addEventListener('gamepaddisconnected', (event) => {
      if (this.gamepadIndex === event.gamepad.index) {
        this.gamepadIndex = null;
        this.latestGamepad = null;
      }
      if (this.onDisconnect) this.onDisconnect(event.gamepad);
      if (this.onAnyGamepadChange) this.onAnyGamepadChange(false, event.gamepad);
    });
  }

  hasConnectedGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    return pads.some((pad) => !!pad?.connected);
  }

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = this.gamepadIndex != null ? pads[this.gamepadIndex] : pads.find(Boolean);
    this.latestGamepad = pad || null;
    if (pad) this.gamepadIndex = pad.index;
    return this.latestGamepad;
  }

  getAxis(axis) {
    const pad = this.latestGamepad;
    if (!pad) return 0;
    const value = pad.axes?.[axis] ?? 0;
    return Math.abs(value) < 0.15 ? 0 : value;
  }

  isPressed(code) {
    return this.keys.has(code);
  }

  buttonPressed(index) {
    const pad = this.latestGamepad;
    return !!pad?.buttons?.[index]?.pressed;
  }

  moveVector() {
    const x = this.getAxis(0) + (this.isPressed('ArrowRight') || this.isPressed('KeyD') ? 1 : 0) - (this.isPressed('ArrowLeft') || this.isPressed('KeyA') ? 1 : 0);
    const y = this.getAxis(1) + (this.isPressed('ArrowDown') || this.isPressed('KeyS') ? 1 : 0) - (this.isPressed('ArrowUp') || this.isPressed('KeyW') ? 1 : 0);
    const length = Math.hypot(x, y);
    if (!length) return { x: 0, y: 0 };
    return { x: x / Math.max(1, length), y: y / Math.max(1, length) };
  }

  isStartPressed() {
    return this.buttonPressed(0) || this.buttonPressed(9) || this.isPressed('Enter') || this.isPressed('Space');
  }

  isPausePressed() {
    return this.buttonPressed(9) || this.isPressed('KeyP');
  }
}
