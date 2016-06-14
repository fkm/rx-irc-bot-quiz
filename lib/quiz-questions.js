// NPM Dependencies
const assert = require('assert');
const { knuthShuffle } = require('knuth-shuffle');

// Local Dependencies
const convertQuestions = require('./convert-questions');

/**
 * @param {string} filename
 * @returns {object[]}
 */
function getQuestions(filename) {
	let questions = Array.from(convertQuestions(filename));
	return knuthShuffle(questions);
}

module.exports = class QuizQuestions {
	/**
 	 * @returns {void}
	 */
	constructor() {
		this.total = 0;
		this.remaining = [];
		this.current = [];
		this.currentLimit = 0;
		this.filename = [];
	}

	/**
	 * @param {string} filename
	 * @param {number} [limit=10]
 	 * @returns {void}
	 */
	load(filename, limit = 10) {
		if (this.filename !== filename) {
			this.filename = filename;
			this.remaining = getQuestions(filename);
			this.total = this.remaining.length;
		} else if (this.remaining.length < limit) {
			this.remaining = getQuestions(filename);
		} else {
			this.remaining = this.remaining.concat(this.current);
		}
		this.current = this.remaining.splice(0, limit);
		this.currentLimit = limit;
	}

	/**
 	 * @returns {void}
	 */
	pop() {
		return this.current.pop();
	}
};
