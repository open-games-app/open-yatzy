export class DiceComponent {
  constructor(index, x, y, size, onTap) {
    this.index = index;
    this.x = x;
    this.y = y;
    this.size = size;
    this.onTap = onTap;

    this.visualValue = 1;
    this.targetValue = 1;
    this.held = false;

    this.rollTimer = 0.0;
    this.rotationTorque = 0.0;
    this.angle = 0.0;
    this.scaleFactor = 1.0;

    this._rollTickTimer = 0.0;
    this._springVelocity = 0.0;
    this._springK = 220.0;
    this._springDamping = 14.0;
  }

  roll(resultValue) {
    this.targetValue = resultValue;
    this.rollTimer = 0.8 + Math.random() * 0.4;
    this.rotationTorque = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 10);
    this.scaleFactor = 0.7;
    this._springVelocity = 0.0;
    this._rollTickTimer = 0.0;
  }

  triggerTapBounce() {
    this.scaleFactor = this.held ? 1.15 : 0.85;
    this._springVelocity = this.held ? 4.0 : -4.0;
  }

  update(dt) {
    if (this.rollTimer > 0) {
      this.rollTimer -= dt;
      this.angle += this.rotationTorque * dt;
      this.rotationTorque *= Math.exp(-1.5 * dt);

      this._rollTickTimer += dt;
      if (this._rollTickTimer > 0.06) {
        this._rollTickTimer = 0.0;
        this.visualValue = Math.floor(Math.random() * 6) + 1;
      }

      if (this.rollTimer <= 0) {
        this.visualValue = this.targetValue;
        this.angle = 0;
        this.scaleFactor = 1.25;
        this._springVelocity = 5.0;
      }
    } else {
      // Spring elastic bounce back to scale 1.0
      const displacement = this.scaleFactor - 1.0;
      const springForce = -this._springK * displacement - this._springDamping * this._springVelocity;
      this._springVelocity += springForce * dt;
      this.scaleFactor += this._springVelocity * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    
    // Move to center of die
    ctx.translate(this.x, this.y);
    // Apply rotation
    ctx.rotate(this.angle);
    // Apply scale
    ctx.scale(this.scaleFactor, this.scaleFactor);

    const hs = this.size / 2;

    // 1. Drop shadow (draw shifted round rect)
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, 0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#0b0f19';
    ctx.beginPath();
    ctx.roundRect(-hs, -hs, this.size, this.size, 16);
    ctx.fill();
    ctx.restore();

    // 2. Gold Glow outline when held
    if (this.held) {
      ctx.save();
      ctx.shadowColor = 'rgba(251, 188, 5, 0.8)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#fbbc05';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.roundRect(-hs, -hs, this.size, this.size, 16);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Body (multi-color gradient based on index)
    const colors = [
      { start: '#4285F4', end: '#1D5ABF' }, // Index 0: Google Blue
      { start: '#EA4335', end: '#B32015' }, // Index 1: Google Red
      { start: '#FBBC05', end: '#C99200' }, // Index 2: Google Yellow
      { start: '#34A853', end: '#227336' }, // Index 3: Google Green
      { start: '#8B5CF6', end: '#6333C7' }  // Index 4: Google Violet/Purple
    ];
    
    const pair = colors[this.index % colors.length];
    const grad = ctx.createLinearGradient(-hs, -hs, hs, hs);
    grad.addColorStop(0, pair.start);
    grad.addColorStop(1, pair.end);
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-hs, -hs, this.size, this.size, 16);
    ctx.fill();

    // 4. Border stroke if not held
    if (!this.held) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-hs, -hs, this.size, this.size, 16);
      ctx.stroke();
    }

    // 5. Draw Pips
    this._drawPips(ctx, this.visualValue, this.size);

    ctx.restore();
  }

  _drawPips(ctx, value, size) {
    const radius = size * 0.085;
    const offset = size * 0.25;

    function drawPip(x, y) {
      // 3D depth shadow under pip
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(x, y + 1.5, radius, 0, Math.PI * 2);
      ctx.fill();

      // Main pip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    switch (value) {
      case 1:
        drawPip(0, 0);
        break;
      case 2:
        drawPip(-offset, -offset);
        drawPip(offset, offset);
        break;
      case 3:
        drawPip(-offset, -offset);
        drawPip(0, 0);
        drawPip(offset, offset);
        break;
      case 4:
        drawPip(-offset, -offset);
        drawPip(offset, -offset);
        drawPip(-offset, offset);
        drawPip(offset, offset);
        break;
      case 5:
        drawPip(-offset, -offset);
        drawPip(offset, -offset);
        drawPip(0, 0);
        drawPip(-offset, offset);
        drawPip(offset, offset);
        break;
      case 6:
        drawPip(-offset, -offset);
        drawPip(offset, -offset);
        drawPip(-offset, 0);
        drawPip(offset, 0);
        drawPip(-offset, offset);
        drawPip(offset, offset);
        break;
    }
  }

  isTapped(mx, my) {
    return mx >= this.x - this.size / 2 &&
           mx <= this.x + this.size / 2 &&
           my >= this.y - this.size / 2 &&
           my <= this.y + this.size / 2;
  }
}
