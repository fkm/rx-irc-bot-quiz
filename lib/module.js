// NPM Dependencies
const { merge } = require('rxjs');
const { filter, map, partition } = require('rxjs/operators');
const assert = require('assert');

// Local Dependencies
const QuizGame = require('./quiz-game');
const { version } = require('../package.json');

let defaults = {};

module.exports = class QuizModule {
	/**
	 * @param {ClientWrapper} client
	 * @param {object} options
	 * @param {string} options.channel
	 * @param {number} options.startDelay
	 * @param {number} options.questionDelay
	 * @param {number} options.hintInterval
	 * @param {boolean} options.moderated
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

		let part$ = client.part$.pipe(
			filter(message => message.channel === this.settings.channel),
			map(message => ({ sender: message.nick })),
		);

		let quit$ = client.messageIn$.pipe(
			filter(message => message.command === 'QUIT'),
			map(message => ({ sender: message.prefix.split('!')[0] })),
		);

		let nick$ = client.nick$.pipe(
			filter(message => this.game.players.isPlayer(message.oldNick))
		);

		let channel$ = client.privmsg$.pipe(
			filter(message => message.target === this.settings.channel)
		);

		let bangHelp$ = channel$.pipe(
			filter(message => message.text.startsWith('!help'))
		);

		let bangScore$ = channel$.pipe(
			filter(message => message.text.startsWith('!score'))
		);

		let [player$, spectator$] = channel$.pipe(
			partition(message => this.game.players.isPlayer(message.sender))
		);

		let bangPlay$ = spectator$.pipe(
			filter(message => message.text.startsWith('!play'))
		);

		let guess$ = player$.pipe(
			filter(message => message.text.charAt(0) !== '!')
		);

		let bangQuit$ = player$.pipe(
			filter(message => message.text.startsWith('!quit'))
		);

		let bangRevolt$ = player$.pipe(
			filter(message => message.text.startsWith('!revolt'))
		);

		let goner$ = merge(bangQuit$, part$, quit$);

		let playerGone$ = goner$.pipe(
			filter(message => this.game.players.isPlayer(message.sender))
		);

		//  ____        _                   _       _   _
		// / ___| _   _| |__  ___  ___ _ __(_)_ __ | |_(_) ___  _ __  ___
		// \___ \| | | | '_ \/ __|/ __| '__| | '_ \| __| |/ _ \| '_ \/ __|
		//  ___) | |_| | |_) \__ \ (__| |  | | |_) | |_| | (_) | | | \__ \
		// |____/ \__,_|_.__/|___/\___|_|  |_| .__/ \__|_|\___/|_| |_|___/
		//                                   |_|
		//

		bangScore$.subscribe(message => this.game.tellScore());
		bangHelp$.subscribe(message => this.game.tellHelp(message.sender, message.text.substring(6)));
		bangPlay$.subscribe(message => this.game.addPlayer(message.sender));
		playerGone$.subscribe(message => this.game.removePlayer(message.sender));
		nick$.subscribe(message => this.game.updatePlayer(message.oldNick, message.newNick));
		guess$.subscribe(message => this.game.handleGuess(message.sender, message.text));
		bangRevolt$.subscribe(message => this.game.handleRevolt(message.sender));
	}
};
