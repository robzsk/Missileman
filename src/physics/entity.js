// adapted from
// http://gafferongames.com

var collision = require('./collision');

var stateFactory = function () {
  return {
    position: new THREE.Vector3(),
    momentum: new THREE.Vector3(),
    orientation: new THREE.Quaternion(),
    angularMomentum: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    angularVelocity: new THREE.Vector3(),
    spin: new THREE.Quaternion(),
    bodyToWorld: new THREE.Matrix4(),
    inertiaTensor: 1.0 / 6.0,
    inverseInertiaTensor: 1.0 / (1.0 / 6.0)
  };
};

var derivativeFactory = function () {
  return {
    velocity: new THREE.Vector3(),
    force: new THREE.Vector3(),
    spin: new THREE.Quaternion(),
    torque: new THREE.Vector3()
  };
};

module.exports = function () {
  'use strict';

  var current = stateFactory();

  var recalculate = function () {
    current.velocity.copy(current.momentum);
    current.angularVelocity.copy(current.angularMomentum).multiplyScalar(current.inverseInertiaTensor);
    current.orientation.normalize();
    current.spin.set(current.angularVelocity.x * 0.5, current.angularVelocity.y * 0.5, current.angularVelocity.z * 0.5, 0.0);
    current.spin.multiply(current.orientation);

    current.bodyToWorld.makeTranslation(current.position.x, current.position.y, 0);
    current.bodyToWorld.makeRotationFromQuaternion(current.orientation);
  };

  var addMultiplied = function (a, b, s) {
    a.x += b.x * s;
    a.y += b.y * s;
    a.z += b.z * s;
    if (typeof a.w === 'undefined') {
      return;
    }
    a.w += b.w * s;
  };

  var integrate = function (v, a, b, c, d, dt) {
    var ts = 1.0 / 6.0;
    v.x += ts * dt * (a.x + 2.0 * (b.x + c.x) + d.x);
    v.y += ts * dt * (a.y + 2.0 * (b.y + c.y) + d.y);
    v.z += ts * dt * (a.z + 2.0 * (b.z + c.z) + d.z);
    if (typeof v.w === 'undefined') {
      return;
    }
    v.w += ts * dt * (a.w + 2.0 * (b.w + c.w) + d.w);
  };

  var handleCollisions = function () {
    var pointToWorld = new THREE.Vector3();
    return function (state, force, torque, points, lines) {
      _.each(lines, function (l) {
        _.each(points, function (p) {
          pointToWorld.copy(p)
            .transformDirection(current.bodyToWorld)
            .multiply(p)
            .add(current.position);
          pointToWorld.r = p.r;
          collision.vsLine(state, force, torque, pointToWorld, l);
        });
      });
    };
  }();

  var forces = function (state, force, torque, points, lines) {
    force.set(0.0, 0.0, 0.0);
    torque.set(0.0, 0.0, 0.0);
    entity.forces(state, force, torque);
    handleCollisions(state, force, torque, points, lines);
    entity.control(state, force, torque);
  };

  var evaluate = function (state, points, lines, derivative, dt) {
    var output = derivativeFactory();
    if (typeof derivative !== 'undefined') {
      addMultiplied(state.position, derivative.velocity, dt);
      addMultiplied(state.momentum, derivative.force, dt);
      addMultiplied(state.orientation, derivative.spin, dt);
      addMultiplied(state.angularMomentum, derivative.torque, dt);
      recalculate();
    }
    output.velocity.copy(state.velocity);
    output.spin.copy(state.spin);
    forces(state, output.force, output.torque, points, lines);
    return output;
  };

  var rk4 = function (dt, state, points, lines) {
    var a = evaluate(state, points, lines),
      b = evaluate(state, points, lines, a, dt * 0.5),
      c = evaluate(state, points, lines, b, dt * 0.5),
      d = evaluate(state, points, lines, c, dt);

    integrate(state.position, a.velocity, b.velocity, c.velocity, d.velocity, dt);
    integrate(state.momentum, a.force, b.force, c.force, d.force, dt);
    integrate(state.orientation, a.spin, b.spin, c.spin, d.spin, dt);
    integrate(state.angularMomentum, a.torque, b.torque, c.torque, d.torque, dt);

    entity.limitMomentum(state);
    recalculate();
  // 		if(!springCollisions)
  // 			handleCollisionsPostHACK(points, lines, state);
  };

  var entity = {
    update: function (dt, points, lines) {
      rk4(dt, current, points, lines);
    },

    // override these
    forces: function (state, force, torque) {},
    control: function (state, force, torque) {},
    limitMomentum: function (state) {},

    setPosition: function (x, y) {
      current.position.set(x, y, 0);
    },
    position: function () {
      var p = new THREE.Vector3();
      return function () {
        return p.copy(current.position);
      };
    }(),
    orientation: function () {
      var q = new THREE.Quaternion();
      return function () {
        return q.copy(current.orientation);
      };
    }()

  };

  return entity;
};
