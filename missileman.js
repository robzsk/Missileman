const log = require('electron').remote.getGlobal('console').log;

// this file is a work in progress and serves as a simple entry point for now
const application = () => {
	const replayData = require('./fixture/replay');
	const scene = require('./src/scene')(document.body);
	const assets = require('./src/assets');
	const world = require('./src/world')(scene);
	const levels = require('./src/levels');
	const createLoop = require('./src/engine').loop;
	const createInput = require('./src/engine').input;

	 // add fader before title
	const fader = require('./src/overlay/fader')(document.body);
	const title = require('./src/overlay/title')(document.body);
	const play = require('./src/overlay/play')(document.body);

	const replay = createInput({ replay: replayData });
	const playerInput = createInput({
			keys: { left: 37, right: 39, morph: 67 },
			gamepad: { index: 0 }, buttons: { left: 14, right: 15, morph: 1 },
	});

	const start = () => {

		// TODO: remove this
		let demo = true;

		let currentLevel = 0;
		// replays for the current level
		let replays = [];

		const loop = createLoop();
	  loop.on('update', (ticks, step) => {
			world.update(ticks, step);
			play.update();
		});
	  loop.on('render', world.render);

		const load = input => {
		  fader.fadeFromBlack();
			scene.clear();
			world.load(levels.load(currentLevel), assets, input);
			loop.reset();
		};

		world.on('player.lose', replay => {
			if (!demo) {
				replays.push(createInput({ replay }));
			} else {
				replays = [createInput({ replay })];
			}
			load(replays);
		});

		world.on('player.win', replay => {
			currentLevel += 1;
			replays = [playerInput];
			load(replays);
		});

		title.on('start', () => {
			demo = false;
			currentLevel = 0;
			replays = [playerInput];
			title.hide();
			play.show();
			setTimeout(() => {
				load(replays);
			}, 1);
		})

		play.on('quit', () => {
			demo = true;
			currentLevel = 0;
			replays = [replay];
			title.show();
			play.hide();
			setTimeout(() => {
				load(replays);
			});
		});

		title.show();
		load([replay]);

	};

	assets.load().then(start);
};

document.addEventListener('DOMContentLoaded', application);
