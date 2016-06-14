module.exports = class QuizPlayers {
	/**
	 * @returns {void}
	 */
	constructor() {
		/** @type {object} */
		this.players = {};
	}

	/**
	 * @returns {string[]}
	 */
	get nickList() {
		return Object.keys(this.players);
	}

	/**
	 * @returns {object[]}
	 */
	calculateRanking() {
		let ranking = this.nickList.sort(
			(a, b) => this.players[a].score - this.players[b].score
		);

		ranking.reverse();

		return ranking;
	}

	/**
	 * @returns {object[]}
	 */
	getRanking() {
		let ranking = this.calculateRanking();

		ranking = ranking.map((nick, index) => {
			return {
				nick: nick,
				position: index + 1,
				score: this.players[nick].score
			};
		});

		return ranking;
	};

	/**
	 * @returns {object}
	 */
	getWinner() {
		return this.calculateRanking()[0];
	};

	/**
	 * @param {string} nick
	 * @param {number} [score=1]
	 * @returns {object[]}
	 */
	increaseScore(nick, score = 1) {
		if (this.isPlayer(nick)) {
			this.players[nick].score += score;
		}
	};

	/**
	 * @param {string} nick
	 * @returns {boolean}
	 */
	isPlayer(nick) {
		return nick in this.players;
	};

	/**
	 * @param {string} nick
	 * @returns {boolean}
	 */
	isRevolting(nick) {
		return this.isPlayer(nick) && this.players[nick].isRevolting;
	};

	/**
	 * @param {string} nick
	 * @returns {void}
	 */
	addPlayer(nick) {
		this.players[nick] = { score: 0, isRevolting: false };
	};

	/**
	 * @param {string} nick
	 * @returns {void}
	 */
	removePlayer(nick) {
		if (this.isPlayer(nick)) {
			delete this.players[nick];
		}
	};

	/**
	 * @returns {void}
	 */
	removeAllPlayers() {
		this.players = {};
	};

	/**
	 * @param {string} oldnick
	 * @param {string} newnick
	 * @returns {void}
	 */
	updatePlayer(oldnick, newnick) {
		this.players[newnick] = this.players[oldnick];
		delete this.players[oldnick];
	};

	/**
	 * @param {string} nick
	 * @returns {void}
	 */
	setRevoltee(nick) {
		this.players[nick].isRevolting = true;
	};

	/**
	 * @returns {string[]}
	 */
	getRevoltees() {
		return this.nickList.filter(nick => {
			return this.players[nick].isRevolting;
		});
	};

	/**
	 * @returns {void}
	 */
	resetRevoltees() {
		this.nickList.forEach(nick => {
			this.players[nick].isRevolting = false;
		});
	};
};
