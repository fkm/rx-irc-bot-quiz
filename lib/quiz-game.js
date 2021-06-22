// NPM Dependencies
const assert = require('assert');
const colors = require('irc-colors');

// Local Dependencies
const QuizPlayers = require('./quiz-players');
const QuizQuestion = require('./quiz-question');
const QuizQuestions = require('./quiz-questions');
const QuizHelp = require('./quiz-help');

let defaults = {
	prefix: '[Qz] ',
	startDelay: 10000,
	questionDelay: 5000,
	hintInterval: 5000,
	moderated: true,
	hintsUseCache: false,
};

module.exports = class QuizGame {
	/**
	 * @param {Client} client
	 * @param {object} options
	 * @param {string} options.prefix='[Qz] '
	 * @param {number} options.startDelay=10000
	 * @param {number} options.questionDelay=5000
	 * @param {number} options.hintInterval=5000
	 * @param {boolean} options.moderated=true
	 * @param {boolean} options.hintsUseCache=false
 	 * @returns {void}
	 */
	constructor(client, options) {
		assert.strictEqual(typeof options.channel, 'string');

		/** @type {Client} */
		this.client = client;
		/** @type {object} */
		this.settings = { ...defaults, ...options };

		/** @type {QuizPlayers} */
		this.players = new QuizPlayers();
		/** @type {QuizQuestions} */
		this.questions = new QuizQuestions();
		/** @type {QuizHelp} */
		this.help = new QuizHelp({ useCache: this.settings.hintsUseCache });

		/** @type {boolean} */
		this.gameActive = false;
		/** @type {number} */
		this.startTimeoutId = null;
		/** @type {QuizQuestion} */
		this.currentChallenge = null;
		/** @type {number} */
		this.challengeTimeoutId = null;
		/** @type {number} */
		this.hintIntervalId = null;
	}

	/**
	 * @param {string} nick
 	 * @returns {void}
	 */
	addPlayer(nick) {
		if (!this.players.isPlayer(nick)) {
			if (this.gameActive) {
				this.notify(nick, `Game is already running.`);
			} else {
				if (this.settings.moderated) {
					this.sendModes(this.settings.channel, '+v', nick);
				}

				this.tellToChannel(`Player ${nick} has joined the game.`);
				this.players.addPlayer(nick);

				if (this.players.nickList.length === 2) {
					this.tellToChannel('Enough players found for new game.');
					this.beginGame();
				} else if (this.players.nickList.length > 2) {
					this.tellToChannel('Additional player joined the game.');
					this.beginGame();
				}
			}
		}
	}

	/**
	 * @param {string} nick
	 * @returns {void}
	 */
	removePlayer(nick) {
		if (this.players.isPlayer(nick)) {
			if (this.settings.moderated) {
				this.sendModes(this.settings.channel, '-v', nick);
			}

			this.tellToChannel(`Player ${nick} has quit the game.`);
			this.players.removePlayer(nick);

			if (this.players.nickList.length === 1) {
				clearTimeout(this.startTimeoutId);

				if (this.gameActive) {
					this.finishChallenge();
					this.endGame(`Last man standing.`);
				}
			}
		}
	}

	/**
	 * @param {string} oldnick
	 * @param {string} newnick
	 * @returns {void}
	 */
	updatePlayer(oldnick, newnick) {
		if (this.players.isPlayer(oldnick)) {
			this.players.updatePlayer(oldnick, newnick);
		}
	}

	/**
	 * @returns {void}
	 */
	beginGame() {
		this.tellToChannel(`Game starting in ${this.settings.startDelay / 1000} seconds.`);

		clearTimeout(this.startTimeoutId);
		this.startTimeoutId = setTimeout(() => {
			let title = colors.inverse(` GAME STARTS `);

			this.gameActive = true;

			this.questions.load('de-quake', 10);

			if (this.settings.moderated) {
				this.sendModes(this.settings.channel, '+m');
			}

			this.tellToChannel(title);
			this.tellToChannel(
				'Total questions: ' + this.questions.total + '; ' +
				'Using: ' + this.questions.current.length + '; ' +
				'Remaining: ' + this.questions.remaining.length
			);
			this.tellToChannel('Players: ' + this.players.nickList.join(', '));

			this.nextChallenge();
		}, this.settings.startDelay);
	}

	/**
	 * @param {string} reason
	 * @returns {void}
	 */
	endGame(reason) {
		let title = colors.inverse(` GAME OVER `);

		clearTimeout(this.startTimeoutId);
		clearInterval(this.hintIntervalId);

		if (this.gameActive) {
			this.tellToChannel(`${title} ${reason}`);

			this.tellScore();
			this.gameActive = false;

			this.tellToChannel(`Thank you for playing.`);

			if (this.settings.moderated) {
				this.sendModes(this.settings.channel, '-m');

				this.players.nickList.forEach(nick => {
					this.sendModes(this.settings.channel, '-v', nick);
				});
			}

			this.players.removeAllPlayers();
		}
	}

	//   ____ _           _ _
	//  / ___| |__   __ _| | | ___ _ __   __ _  ___
	// | |   | '_ \ / _` | | |/ _ \ '_ \ / _` |/ _ \
	// | |___| | | | (_| | | |  __/ | | | (_| |  __/
	//  \____|_| |_|\__,_|_|_|\___|_| |_|\__, |\___|
	//                                   |___/
	//

	/**
	 * @returns {void}
	 */
	nextChallenge() {
		if (this.gameActive) {
			if (this.currentChallenge !== null) {
				// Finish current challenge first.
			} else if (this.challengeTimeoutId !== null) {
				// Next challenge already initialized.
			} else if (this.questions.current.length === 0) {
				this.endGame(`No more questions.`);
			} else {
				this.challengeTimeoutId = setTimeout(() => {
					let title = colors.inverse(` NEW QUESTION `);

					this.challengeTimeoutId = null;

					this.currentChallenge = new QuizQuestion(this.questions.pop());

					this.tellToChannel(`${title} ${this.questions.currentLimit - this.questions.current.length} / ${this.questions.currentLimit}`);
					this.tellToChannel(this.currentChallenge.question);
					this.tellToChannel(this.currentChallenge.hintPlaceholder);

					clearInterval(this.hintIntervalId);
					this.hintIntervalId = setInterval(
						() => this.giveHint(),
						this.settings.hintInterval
					);
				}, this.settings.questionDelay);
			}
		}
	}

	/**
	 * @param {string} winner
	 * @returns {void}
	 */
	finishChallenge(winner) {
		let title = colors.inverse(` QUESTION END `);

		clearInterval(this.hintIntervalId);

		this.players.resetRevoltees();

		let message;

		if (winner) {
			this.players.increaseScore(winner);
			message = `${winner} had the correct answer!`;
		} else {
			message = `The question went unanswered.`;
		}

		this.tellToChannel(`${title} ${message}`);
		this.tellToChannel(`Question: ${this.currentChallenge.question}`);
		this.tellToChannel(`Answer: ${this.currentChallenge.hintString}`);

		this.tellScore();

		this.currentChallenge = null;
	}

	/**
	 * @param {string} nick
	 * @returns {void}
	 */
	handleRevolt(nick) {
		if (this.currentChallenge !== null) {
			if (this.players.isRevolting(nick)) {
				this.notify(nick, `You are already revolting.`);
			} else if (this.currentChallenge.hintsGiven < 1) {
				this.tellToChannel(`Revolting is only possible after the first hint.`);
			} else {
				this.players.setRevoltee(nick);
				this.tellToChannel(`${nick} is revolting!`);

				if (this.players.getRevoltees().length > this.players.nickList.length / 2) {
					this.tellToChannel(`Revolt successful. The quiz master gives in.`);
					this.finishChallenge();
					this.nextChallenge();
				} else {
					this.tellToChannel(`The mob is negligible. The quiz master is not impressed.`)
				}
			}
		}
	}

	/**
	 * @param {string} nick
	 * @param {string} guess
	 * @returns {void}
	 */
	handleGuess(nick, guess) {
		if (this.currentChallenge !== null) {
			if (this.currentChallenge.checkGuess(guess)) {
				this.finishChallenge(nick);
				this.nextChallenge();
			}
		}
	}

	/**
	 * @returns {void}
	 */
	giveHint() {
		if (this.currentChallenge === null) {

		} else if (this.currentChallenge.hintArray.length < 2) {
			this.finishChallenge();
			this.nextChallenge();
		} else {
			this.currentChallenge.addHint();
			this.tellToChannel(this.currentChallenge.question);
			this.tellToChannel(this.currentChallenge.hintPlaceholder);
		}
	}

	//  _____     _ _
	// |_   _|_ _| | | __
	//   | |/ _` | | |/ /
	//   | | (_| | |   <
	//   |_|\__,_|_|_|\_\
	//

	/**
	 * @returns {void}
	 */
	sendModes() {
		let args = Array.from(arguments);
		let command = ['MODE', ...args].join(' ');

		this.client.rawOut$.next(command);
	}

	/**
	 * @param {string} message
	 * @returns {void}
	 */
	tellToChannel(message) {
		this.client.actionOut$.next({
			command: 'PRIVMSG',
			target: this.settings.channel,
			text: message,
			prefix: this.settings.prefix,
		});
	}

	/**
	* @param {string} target
	* @param {string} message
	 * @returns {void}
	 */
	notify(target, message) {
		this.client.actionOut$.next({
			command: 'NOTICE',
			target,
			text: message,
			prefix: this.settings.prefix,
		});
	}

	/**
	 * @param {string[]} multiline
	 * @returns {void}
	 */
	tellScore(multiline) {
		let title = colors.inverse(` SCORE `);
		let output = [];

		if (this.gameActive) {
			let ranking = this.players.getRanking().map(player => {
				return `${player.position}. ${player.nick} (${player.score})`;
			});

			if (multiline) {
				output.push(`${title}`);
				output.concat(ranking);
			} else {
				output.push(`${title} ${ranking.join(', ')}`);
			}
		} else {
			output.push(`${title} No active game.`);
		}

		this.tellToChannel(output);
	}

	/**
	 * @param {string} target
	 * @param {string} category
	 * @returns {void}
	 */
	tellHelp(target, category) {
		this.notify(target, this.help.getArray(category));
	}
};
