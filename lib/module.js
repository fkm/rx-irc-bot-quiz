// NPM Dependencies
const { merge } = require('rxjs');
const { filter, partition } = require('rxjs/operators');
const assert = require('assert');

// Local Dependencies
const QuizGame = require('./quiz-game');
const { version } = require('../package.json');

let defaults = {
	logLevel: 'error',
};

module.exports = class QuizModule {
	/**
	 * @param {ClientWrapper} client
	 * @param {object} options
	 * @param {string} options.channel
	 * @param {number} options.startDelay
	 * @param {number} options.questionDelay
	 * @param {number} options.hintInterval
	 * @param {boolean} options.moderated
	 * @param {string} options.logLevel='error'
	 */
	constructor(client, options) {
		assert.strictEqual(typeof options.channel, 'string');

		//  ____                            _   _
		// |  _ \ _ __ ___  _ __   ___ _ __| |_(_) ___  ___
		// | |_) | '__/ _ \| '_ \ / _ \ '__| __| |/ _ \/ __|
		// |  __/| | | (_) | |_) |  __/ |  | |_| |  __/\__ \
		// |_|   |_|  \___/| .__/ \___|_|   \__|_|\___||___/
		//                 |_|
		//

		/** @type {object} */
		this.settings = { ...defaults, ...options };
		/** @type {string} */
		this.version = version;
		/** @type {QuizGame} */
		this.game = new QuizGame(client, this.settings);

		//  ____  _
		// / ___|| |_ _ __ ___  __ _ _ __ ___  ___
		// \___ \| __| '__/ _ \/ _` | '_ ` _ \/ __|
		//  ___) | |_| | |  __/ (_| | | | | | \__ \
		// |____/ \__|_|  \___|\__,_|_| |_| |_|___/
		//

		let channelRaw$ = client.raw$.pipe(
			filter(message => message.args[0] === this.settings.channel || message.args[1] === this.settings.channel)
		);

		let part$ = channelRaw$.pipe(
			filter(message => message.command === 'PART')
		);

		let quit$ = client.raw$.pipe(
			filter(message => message.command === 'QUIT')
		);

		let nick$ = client.raw$.pipe(
			filter(message => message.command === 'NICK' && this.game.players.isPlayer(message.nick))
		);

		let channel$ = channelRaw$.pipe(
			filter(message => message.command === 'PRIVMSG')
		);

		let bangHelp$ = channel$.pipe(
			filter(message => message.args[1].startsWith('!help'))
		);

		let bangScore$ = channel$.pipe(
			filter(message => message.args[1].startsWith('!score'))
		);

		let [player$, spectator$] = channel$.pipe(
			partition(message => this.game.players.isPlayer(message.nick))
		);

		let bangPlay$ = spectator$.pipe(
			filter(message => message.args[1].startsWith('!play'))
		);

		let guess$ = player$.pipe(
			filter(message => message.args[1].charAt(0) !== '!')
		);

		let bangQuit$ = player$.pipe(
			filter(message => message.args[1].startsWith('!quit'))
		);

		let bangRevolt$ = player$.pipe(
			filter(message => message.args[1].startsWith('!revolt'))
		);

		let goner$ = merge(bangQuit$, part$, quit$);

		let playerGone$ = goner$.pipe(
			filter(message => this.game.players.isPlayer(message.nick))
		);

		//  ____        _                   _       _   _
		// / ___| _   _| |__  ___  ___ _ __(_)_ __ | |_(_) ___  _ __  ___
		// \___ \| | | | '_ \/ __|/ __| '__| | '_ \| __| |/ _ \| '_ \/ __|
		//  ___) | |_| | |_) \__ \ (__| |  | | |_) | |_| | (_) | | | \__ \
		// |____/ \__,_|_.__/|___/\___|_|  |_| .__/ \__|_|\___/|_| |_|___/
		//                                   |_|
		//

		bangScore$.subscribe(message => this.game.tellScore());
		bangHelp$.subscribe(message => this.game.tellHelp(message.nick, message.args[1].substring(6)));
		bangPlay$.subscribe(message => this.game.addPlayer(message.nick));
		playerGone$.subscribe(message => this.game.removePlayer(message.nick));
		nick$.subscribe(message => this.game.updatePlayer(message.nick, message.args[0]));
		guess$.subscribe(message => this.game.handleGuess(message.nick, message.args[1]));
		bangRevolt$.subscribe(message => this.game.handleRevolt(message.nick));
	}
};
