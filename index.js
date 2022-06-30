const { default: WASocket, fetchLatestBaileysVersion, DisconnectReason, useMultiFileAuthState } = require('@adiwajshing/baileys')
const Pino = require('pino')
const { sessionName } = require('./config.json')
const { Boom } = require('@hapi/boom')
const store = require('./store')
const { existsSync } = require('fs')
const path = require('path')
const messageHandler = require('./handler/message')

existsSync('./store/baileys_store.json') && store.readFromFile('./store/baileys_store.json')
setInterval(() => {
    store.writeToFile('./store/baileys_store.json')
}, 10000)

const connect = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(path.resolve(`${sessionName}-session`), Pino({ level: 'silent' }))
    let { version, isLatest } = await fetchLatestBaileysVersion()

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

        if (connection === 'close') {
            let reason = new Boom(lastDisconnect.error).output.statusCode
            if (reason === DisconnectReason.badSession) {
                console.log(`Bad Session File, Please Delete ${sessionName}-session and Scan Again`)
                sock.logout()
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log('Connection closed, reconnecting....')
                connect()
            } else if (reason === DisconnectReason.connectionLost) {
                console.log('Connection Lost from Server, reconnecting...')
                connect()
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log('Connection Replaced, Another New Session Opened, Please Close Current Session First')
                sock.logout()
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(`Device Logged Out, Please Delete ${sessionName}-session and Scan Again.`)
                sock.logout()
            } else if (reason === DisconnectReason.restartRequired) {
                console.log('Restart Required, Restarting...')
                connect()
            } else if (reason === DisconnectReason.timedOut) {
                console.log('Connection TimedOut, Reconnecting...')
                connect()
            } else {
                sock.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`)
            }
        }
    })

    // messages.upsert
    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type !== 'notify') return
        messageHandler(sock, messages[0])
    })
}
connect()
