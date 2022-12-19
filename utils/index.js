const fs = require('fs')
const path = require('path')

/**
 * @param {string} name
 */
exports.writeDatabase = (name, data) => {
	fs.writeFileSync(path.join(process.cwd(), 'database', `${name}.json`), typeof data === 'string' ? data : JSON.stringify(data))
}
