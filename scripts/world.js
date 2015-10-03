module.exports = function () {
  'use strict';
  var world;
  var MAP = { tw: 64, th: 48 },
    TILE = 1;

  var players = [],
    avatars = [], // render
    cells = [];

  var assets = require('./assets'),
    sceneFactory = require('./scene');

  var scene = sceneFactory($('#canvas'));

  var timestamp = function () {
    return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
  };

  var bound = function (x, min, max) {
    return Math.max(min, Math.min(max, x));
  };

  var tcell = function (tx, ty) { return cells[tx + (ty * MAP.tw)];};
  var ty = function (y) { return MAP.th - y;}; // little hack to show y position in 3d space instead of canvas space

  var overlap = function (x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(((x1 + w1 - 1) < x2) ||
    ((x2 + w2 - 1) < x1) ||
    ((y1 + h1 - 1) < y2) ||
    ((y2 + h2 - 1) < y1));
  };

  var renderPlayer = function (p, a, dt) {
    if (!a) return;
    a.position.set(p.x + (p.dx * dt), ty(p.y + (p.dy * dt)), 0);
  };
  var render = function (dt) {
    _.each(players, function (p, i) {
      renderPlayer(p, avatars[i], dt);
    });
  };

  var killPlayers = function () {
    _.each(players, function (p) {
      p.x = p.start.x;
      p.y = p.start.y;
      p.dx = p.dy = 0;
    });
  };

  var updateEntity = function (entity, dt) {
    var wasleft = entity.dx < 0,
      wasright = entity.dx > 0,
      falling = entity.falling,
      friction = entity.friction * (falling ? 0.5 : 1),
      accel = entity.accel * (falling ? 0.5 : 1);

    entity.ddx = 0;
    entity.ddy = entity.gravity;

    if (entity.left) {
      entity.ddx = entity.ddx - accel;
    }
    else if (wasleft) {
      entity.ddx = entity.ddx + friction;
    }

    if (entity.right) {
      entity.ddx = entity.ddx + accel;
    }
    else if (wasright) {
      entity.ddx = entity.ddx - friction;
    }

    if (entity.jump && !entity.jumping && !falling) {
      entity.ddy = entity.ddy - entity.impulse; // an instant big force impulse
      entity.jumping = true;
    }

    entity.x = entity.x + (dt * entity.dx);
    entity.y = entity.y + (dt * entity.dy);
    entity.dx = bound(entity.dx + (dt * entity.ddx), -entity.maxdx, entity.maxdx);
    entity.dy = bound(entity.dy + (dt * entity.ddy), -entity.maxdy, entity.maxdy);

    if ((wasleft && (entity.dx > 0)) ||
      (wasright && (entity.dx < 0))) {
      entity.dx = 0; // clamp at zero to prevent friction from making us jiggle side to side
    }

    var tx = Math.floor(entity.x),
      ty = Math.floor(entity.y),
      nx = entity.x % TILE,
      ny = entity.y % TILE,
      cell = tcell(tx, ty),
      cellright = tcell(tx + 1, ty),
      celldown = tcell(tx, ty + 1),
      celldiag = tcell(tx + 1, ty + 1);

    if (entity.dy > 0) {
      if ((celldown && !cell) ||
        (celldiag && !cellright && nx)) {
        entity.y = ty;
        entity.dy = 0;
        entity.falling = false;
        entity.jumping = false;
        ny = 0;
      }
    }
    else if (entity.dy < 0) {
      if ((cell && !celldown) ||
        (cellright && !celldiag && nx)) {
        entity.y = ty + 1;
        entity.dy = 0;
        cell = celldown;
        cellright = celldiag;
        ny = 0;
      }
    }

    if (entity.dx > 0) {
      if ((cellright && !cell) ||
        (celldiag && !celldown && ny)) {
        entity.x = tx;
        entity.dx = 0;
      }
    }
    else if (entity.dx < 0) {
      if ((cell && !cellright) ||
        (celldown && !celldiag && ny)) {
        entity.x = tx + 1;
        entity.dx = 0;
      }
    }

    entity.falling = ! (celldown || (nx && celldiag));

  };

  var fps = 60,
    step = 1 / fps;
  var dt = 0, now, last = timestamp();

  var ticks = 0;
  var update = function (dt) {
    $(world).trigger('world.update', ticks);
    ticks += 1;
    _.each(players, function (p) {
      updateEntity(p, dt);
    });
  };

  $(scene).on('scene.render', function () {
    now = timestamp();
    dt = dt + Math.min(1, (now - last) / 1000);
    while(dt > step) {
      dt = dt - step;
      update(step);
    }
    render(dt);
    last = now;

    if (avatars[0])
      scene.follow(avatars[0].position); // unsafe for tests only
  });

  world = {
    clear: function () {
      ticks = 0;
      killPlayers();
    },
    addPlayer: function (player) {
      players.push(player);
      avatars.push(assets.cubePlayer());
      scene.add(avatars[avatars.length - 1]);
    },
    addBlocks: function (blocks) {
      cells = blocks;
      var x, y, cell, cube;
      for (y = 0; y < MAP.th; y++) {
        for (x = 0; x < MAP.tw; x++) {
          cell = tcell(x, y);
          if (cell === 1) {
            cube = assets.cubeSolid();
          } else if (cell === 2) {
            cube = assets.cubeTarget();
          } else {
            cube = assets.cubeEmpty();
          }
          cube.position.set(x, ty(y), 0);
          scene.add(cube);
        }
      }
    }
  };
  return world;
}();
