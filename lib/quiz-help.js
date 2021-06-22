// Node Dependencies
const fs = require('fs');
const path = require('path');

/**
 * @param {string} filename
 * @returns {string}
 */
function readFile(filename) {
	return fs.readFileSync(filename, 'utf-8').toString();
}

let defaults = {
	useCache: true,
};

module.exports = class QuizHelp {
	/**
	 * @param {object} options
	 * @param {boolean} options.useCache=true
	 * @returns {void}
	 */
	constructor(options) {
		/** @type {object} */
		this.settings = { ...defaults, ...options };

		this.cache = {};
	}

	/**
	 * @param {string} [category]
	 * @returns {string}
	 */
	get(category) {
		category = category && category.length > 0 ? category : 'index';

		let help;

		if (category in this.cache) {
			return this.cache[category];
		}

		try {
			if (/^[a-z]+$/i.test(category)) {
				let file_path = path.join(__dirname, 'help', `${category}.txt`);
				help = readFile(file_path).replace(/(\r?\n?)*$/, '');

				if (this.settings.useCache) {
					this.cache[category] = help;
				}
			} else {
				help = `Invalid category name. Only characters from A to Z are allowed.`;
			}
		} catch (error) {
			help = `Could not open help. ${error}`;
		}

		return help;
	}

	/**
	 * @param {string} [category]
	 * @returns {string}
	 */
	getArray(category) {
		return this.get(category).split('\n');
	}
};
