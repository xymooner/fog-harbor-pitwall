(() => {
  'use strict';

  const sectorDefinitions = [
    {
      colour: '#ff704e',
      path: 'M210 134 L63 149 Q43 151 46 138 Q47 133 56 125 L109 84 Q113 81 108 75 L100 67 Q95 60 101 55 Q107 50 116 53 L151 65 Q159 68 165 62 L182 42 Q188 36 197 39 L210 45',
    },
    {
      colour: '#b4daca',
      path: 'M210 45 L224 52 Q233 56 241 50 L284 22 Q293 16 301 22 L325 41 Q331 46 338 43 L354 33 Q361 29 368 34 L433 72 Q447 80 442 90 Q439 98 426 99 L400 101',
    },
    {
      colour: '#e3ddc7',
      path: 'M400 101 L372 103 Q363 103 360 97 L353 83 Q349 74 338 78 L325 84 Q316 88 319 100 L323 113 Q326 124 312 125 L210 134',
    },
  ];
  const sectors = sectorDefinitions.map(({colour, path}) => ({colour, path: new Path2D(path)}));
  const pitLane = new Path2D('M268 128.9 L251 137 Q248 139 242 140 L156 148 Q151 148.5 147 147 L129 142.3');

  function drawSectorLabel(ctx, label, x, y, anchorX, anchorY, colour) {
    const direction = anchorX > x ? 1 : -1;
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.62;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + direction * 11, y - 3);
    ctx.lineTo(x + direction * 19, y - 3);
    ctx.lineTo(anchorX, anchorY);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = 'bold 11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y);
  }

  function drawTimingLine(ctx, x, y, angle, isFinish) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (isFinish) {
      ctx.fillStyle = '#16201e';
      ctx.fillRect(-3.5, -9, 7, 18);
      for (let row = 0; row < 6; row += 1) {
        ctx.fillStyle = '#f7efdc';
        ctx.fillRect(row % 2 ? 0 : -3, row * 3 - 9, 3, 3);
      }
    } else {
      ctx.strokeStyle = '#15201f';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  window.drawCircuit = function drawCircuit(canvas, wetness = 0) {
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.round(bounds.width * pixelRatio);
    const height = Math.round(bounds.height * pixelRatio);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scale = Math.min(width / 490, height / 175);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate((width - scale * 490) / 2, (height - scale * 175) / 2);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Survey grid extends into the letterbox area when the host is taller.
    const bottom = height / scale;
    const right = width / scale;
    ctx.strokeStyle = 'rgba(188, 214, 199, 0.07)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = 245 % 24 - right; x < 490 + right; x += 24) {
      ctx.moveTo(x, -bottom);
      ctx.lineTo(x, 175 + bottom);
    }
    for (let y = 87.5 % 24 - bottom; y < 175 + bottom; y += 24) {
      ctx.moveTo(-right, y);
      ctx.lineTo(490 + right, y);
    }
    ctx.stroke();

    const wetFraction = Math.max(0, Math.min(100, Number(wetness) || 0)) / 100;
    const glow = ctx.createRadialGradient(260, 86, 10, 260, 86, 185);
    glow.addColorStop(0, 'rgba(147, 193, 179,' + (0.035 + 0.06 * wetFraction) + ')');
    glow.addColorStop(1, 'rgba(147, 193, 179, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 490, 175);

    // Pit entry and exit are drawn beneath the racing surface.
    ctx.strokeStyle = '#72877e';
    ctx.lineWidth = 1.4;
    ctx.stroke(pitLane);
    for (const sector of sectors) {
      ctx.strokeStyle = '#0c1413';
      ctx.lineWidth = 8;
      ctx.stroke(sector.path);
    }
    for (const sector of sectors) {
      ctx.strokeStyle = sector.colour;
      ctx.lineWidth = 4.4;
      ctx.stroke(sector.path);
    }

    drawTimingLine(ctx, 210, 45, 0.43, false);
    drawTimingLine(ctx, 400, 101, -0.08, false);
    drawTimingLine(ctx, 210, 134, -0.10, true);
    drawSectorLabel(ctx, 'S1', 113, 111, 95, 101, sectors[0].colour);
    drawSectorLabel(ctx, 'S2', 365, 13, 344, 36, sectors[1].colour);
    drawSectorLabel(ctx, 'S3', 381, 126, 361, 104, sectors[2].colour);

    ctx.font = '9px "IBM Plex Mono", ui-monospace, monospace';
    ctx.fillStyle = '#bdc9be';
    ctx.textAlign = 'center';
    ctx.fillText('S/F', 211, 156);
    ctx.restore();
  };
})();
