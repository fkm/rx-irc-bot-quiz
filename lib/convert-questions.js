// Node Dependencies
const fs = require('fs');
const path = require('path');

/** Delimiter string between metadata and questions. */
const HEADING_END = '<!========================================================!>';

/**
 * @param {string} filename
 * @returns {object[]}
 */
module.exports = function convertQuestions(filename) {
	let questions = [{},]

	let data = fs.readFileSync(path.join(__dirname, 'questions', filename + '.txt'), 'utf-8');
	let lines = data.toString().split(HEADING_END)[1].split('\n');

	lines.forEach(line => {
		if (/^\w+:\s+.+/.test(line)) {
			let [, key, value] = line.match(/^(\w+):\s+(.+)/);

			questions[questions.length - 1][key.toLowerCase()] = value;
		} else {
			questions.push({});
		}
	});

	questions = questions.filter(question => Object.keys(question).length > 0);

	return questions;
};
