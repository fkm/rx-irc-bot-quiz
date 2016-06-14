// NPM Dependencies
const assert = require('assert');
const { knuthShuffle } = require('knuth-shuffle');

module.exports = class QuizQuestion {
	/**
	 * @param {object} data
 	 * @returns {void}
	 */
	constructor(data) {
		assert.strictEqual(typeof data.question, 'string', 'No question provided.');
		assert.strictEqual(typeof data.answer,   'string', 'No answer provided.');

		/** @type {string} */
		this.question = data.question;
		/** @type {number} */
		this.hintsGiven = 0;

		if (/#.+#/.test(data.answer)) {
			this.answerString = data.answer.match(/#(.+)#/)[1];
			this.hintString = data.answer.replace(/#/g, '');
		} else {
			this.answerString = this.hintString = data.answer;
		}

		if (data.regexp !== undefined) {
			this.answerRegexp = new RegExp(data.regexp, 'i');
		} else {
			this.answerRegexp = new RegExp(this.answerString, 'i');
		}

		/** @type {object[]} */
		this.hintArray = knuthShuffle(this.hintString.split('').map(
			(character, index) => ({ index, character })
		));

		/** @type {string} */
		this.hintPlaceholder = '.'.repeat(this.hintArray.length);
	}

	/**
	 * @returns {void}
	 */
	addHint() {
		let hint = this.hintArray.pop();

		this.hintPlaceholder =
			this.hintPlaceholder.substring(0, hint.index) +
			hint.character +
			this.hintPlaceholder.substring(hint.index + 1);

		this.hintsGiven++;
	}

	/**
	 * @param {string} guess
 	 * @returns {void}
	 */
	checkGuess(guess) {
		return this.answerRegexp.test(guess);
	}
};
