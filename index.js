require('./utils/cron')
const { default: WASocket, fetchLatestBaileysVersion, DisconnectReason, useMultiFileAuthState, fetchLatestWaWebVersion } = require('@adiwajshing/baileys')
const Pino = require('pino')
const { sessionName } = require('./config.json')
const { Boom } = require('@hapi/boom')
const store = require('./store')
const { existsSync, watchFile } = require('fs')
const path = require('path')
let messageHandler = require('./handler/message')

existsSync('./store/baileys_store.json') && store.readFromFile('./store/baileys_store.json')
setInterval(() => {
	store.writeToFile('./store/baileys_store.json')
}, 10000)

watchFile('./handler/message.js', () => {
	const dir = path.resolve('./handler/message.js')
	if (dir in require.cache) {
		delete require.cache[dir]
		messageHandler = require('./handler/message')
		console.log(`reloaded message.js`)
	}
})

const connect = async () => {
	const { state, saveCreds } = await useMultiFileAuthState(path.resolve(`${sessionName}-session`), Pino({ level: 'silent' }))
	let { version, isLatest } = await fetchLatestWaWebVersion().catch(() => fetchLatestBaileysVersion())

	console.log(`Using: ${version}, newer: ${isLatest}`)
	const sock = WASocket({
		printQRInTerminal: true,
		auth: state,
		logger: Pino({ level: 'silent' }),
		version,
	})
	store.bind(sock.ev)

	sock.ev.on('chats.set', () => {
		console.log('got chats', store.chats.all().length)
	})

	sock.ev.on('contacts.set', () => {
		console.log('got contacts', Object.values(store.contacts).length)
	})

	sock.ev.on('creds.update', saveCreds)
	sock.ev.on('connection.update', async (up) => {
		const { lastDisconnect, connection } = up
		if (connection) {
			console.log('Connection Status: ', connection)
		}

		if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
			console.log('Reconnecting...')
			connect()
		} else if (connection === 'close' && lastDisconnect?.error?.output?.statusCode === 401) {
			console.error('Session expired or replaced, please scan QR Code again...')
		}
	})

	// messages.upsert
	sock.ev.on('messages.upsert', ({ messages, type }) => {
		if (type !== 'notify') return
		messageHandler(sock, messages[0])
	})

	process.on('uncaughtException', (err) => {
		console.error(err?.message)
	})
}
connect()
