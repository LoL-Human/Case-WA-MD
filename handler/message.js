const { WASocket, proto, getContentType, downloadContentFromMessage } = require('@adiwajshing/baileys')
const axios = require('axios').default
const moment = require('moment-timezone')
const FormData = require('form-data')
const chalk = require('chalk')

const { help } = require('../utils/message')

/**
 *
 * @param { string } text
 * @param { string } color
 */
const color = (text, color) => {
    return !color ? chalk.green(text) : chalk.keyword(color)(text)
}

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)]
}

/**
 * @param {WASocket} sock
 * @param {proto.IWebMessageInfo} msg
 */
module.exports = async (sock, msg) => {
    const { ownerNumber, ownerName, botName, apikey } = require('../config.json')

    const time = moment().tz('Asia/Jakarta').format('HH:mm:ss')
    if (msg.key && msg.key.remoteJid === 'status@broadcast') return
    if (!msg.message) return

    const type = getContentType(msg.message)
    const quotedType = getContentType(msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) || null
    if (type == 'ephemeralMessage') {
        msg.message = msg.message.ephemeralMessage.message
        msg.message = msg.message.ephemeralMessage.message.viewOnceMessage
    }
    if (type == 'viewOnceMessage') {
        msg.message = msg.message.viewOnceMessage.message
    }

    const botId = sock.user.id.includes(':') ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : sock.user.id

    const from = msg.key.remoteJid
    const body = type == 'conversation' ? msg.message?.conversation : msg.message[type]?.caption || msg.message[type]?.text || ''
    const responseMessage = type == 'listResponseMessage' ? msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '' : type == 'buttonsResponseMessage' ? msg.message?.buttonsResponseMessage?.selectedButtonId || '' : ''
    const isGroup = from.endsWith('@g.us')

    var sender = isGroup ? msg.key.participant : msg.key.remoteJid
    sender = sender.includes(':') ? sender.split(':')[0] + '@s.whatsapp.net' : sender
    const senderName = msg.pushName
    const senderNumber = sender.split('@')[0]

    const groupMetadata = isGroup ? await sock.groupMetadata(from) : null
    const groupName = groupMetadata?.subject || ''
    const groupMembers = groupMetadata?.participants || []
    const groupAdmins = groupMembers.filter((v) => v.admin).map((v) => v.id)

    const isCmd = /^[°•π÷×¶∆£¢€¥®™✓_=|~!?#$%^&.+-,\\\©^]/.test(body)
    const prefix = isCmd ? body[0] : ''
    const isGroupAdmins = groupAdmins.includes(sender)
    const isBotGroupAdmins = groupMetadata && groupAdmins.includes(botId)
    const isOwner = ownerNumber.includes(sender)

    let command = isCmd ? body.slice(1).trim().split(' ').shift().toLowerCase() : ''
    let responseId = msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId || msg.message?.buttonsResponseMessage?.selectedButtonId || null
    let args = body.trim().split(' ').slice(1)
    let full_args = body.replace(command, '').slice(1).trim()

    let mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    const isImage = type == 'imageMessage'
    const isVideo = type == 'videoMessage'
    const isAudio = type == 'audioMessage'
    const isSticker = type == 'stickerMessage'
    const isContact = type == 'contactMessage'
    const isLocation = type == 'locationMessage'

    const isQuoted = type == 'extendedTextMessage'
    const isQuotedImage = isQuoted && quotedType == 'imageMessage'
    const isQuotedVideo = isQuoted && quotedType == 'videoMessage'
    const isQuotedAudio = isQuoted && quotedType == 'audioMessage'
    const isQuotedSticker = isQuoted && quotedType == 'stickerMessage'
    const isQuotedContact = isQuoted && quotedType == 'contactMessage'
    const isQuotedLocation = isQuoted && quotedType == 'locationMessage'

    if (!isGroup && !isCmd) console.log(color(`[ ${time} ]`, 'white'), color('[ PRIVATE ]', 'aqua'), color(body.slice(0, 50), 'white'), 'from', color(senderNumber, 'yellow'))
    if (isGroup && !isCmd) console.log(color(`[ ${time} ]`, 'white'), color('[  GROUP  ]', 'aqua'), color(body.slice(0, 50), 'white'), 'from', color(senderNumber, 'yellow'), 'in', color(groupName, 'yellow'))
    if (!isGroup && isCmd) console.log(color(`[ ${time} ]`, 'white'), color('[ COMMAND ]', 'aqua'), color(body, 'white'), 'from', color(senderNumber, 'yellow'))
    if (isGroup && isCmd) console.log(color(`[ ${time} ]`, 'white'), color('[ COMMAND ]', 'aqua'), color(body, 'white'), 'from', color(senderNumber, 'yellow'), 'in', color(groupName, 'yellow'))

    const reply = async (text) => {
        return sock.sendMessage(from, { text: text.trim() }, { quoted: msg })
    }

    switch (command) {
        case 'owner':
            const vcard =
                'BEGIN:VCARD\n' + // metadata of the contact card
                'VERSION:3.0\n' +
                `FN:${ownerName}\n` + // full name
                `ORG:${botName};\n` + // the organization of the contact
                `TEL;type=MSG;type=CELL;type=VOICE;waid=${ownerNumber[ownerNumber.length - 1].split('@')[0]}:+${ownerNumber[ownerNumber.length - 1].split('@')[0]}\n` + // WhatsApp ID + phone number
                'END:VCARD'

            sock.sendMessage(from, {
                contacts: {
                    displayName: ownerName,
                    contacts: [{ vcard }],
                },
            })
            break
        case 'help':
            reply(help(prefix))
            break

        // Islami //
        case 'listsurah':
            axios
                .get(`https://api.lolhuman.xyz/api/quran?apikey=${apikey}`)
                .then(({ data }) => {
                    var text = 'List Surah:\n'
                    for (var x in data.result) {
                        text += `${x}. ${data.result[x]}\n`
                    }
                    reply(text)
                })
                .catch(console.error)
            break
        case 'alquran':
            if (args.length < 1) return reply(`Example: ${prefix + command} 18 or ${prefix + command} 18/10 or ${prefix + command} 18/1-10`)
            axios
                .get(`https://api.lolhuman.xyz/api/quran/${args[0]}?apikey=${apikey}`)
                .then(({ data }) => {
                    var ayat = data.result.ayat
                    var text = `QS. ${data.result.surah} : 1-${ayat.length}\n\n`
                    for (var x of ayat) {
                        text += `${x.arab}\n${x.ayat}. ${x.latin}\n${x.indonesia}\n\n`
                    }
                    text = text.replace(/<u>/g, '_').replace(/<\/u>/g, '_')
                    text = text.replace(/<strong>/g, '*').replace(/<\/strong>/g, '*')
                    reply(text)
                })
                .catch(console.error)
            break
        case 'alquranaudio':
            if (args.length == 0) return reply(`Example: ${prefix + command} 18 or ${prefix + command} 18/10`)
            sock.sendMessage(from, { audio: { url: `https://api.lolhuman.xyz/api/quran/audio/${args[0]}?apikey=${apikey}` }, mimetype: 'audio/mp4' })
            break
        case 'asmaulhusna':
            axios
                .get(`https://api.lolhuman.xyz/api/asmaulhusna?apikey=${apikey}`)
                .then(({ data }) => {
                    var text = `No : ${data.result.index}\n`
                    text += `Latin: ${data.result.latin}\n`
                    text += `Arab : ${data.result.ar}\n`
                    text += `Indonesia : ${data.result.id}\n`
                    text += `English : ${data.result.en}`
                    reply(text)
                })
                .catch(console.error)
            break
        case 'kisahnabi':
            if (args.length == 0) return reply(`Example: ${prefix + command} Muhammad`)
            axios
                .get(`https://api.lolhuman.xyz/api/kisahnabi/${full_args}?apikey=${apikey}`)
                .then(({ data }) => {
                    var text = `Name : ${data.result.name}\n`
                    text += `Lahir : ${data.result.thn_kelahiran}\n`
                    text += `Umur : ${data.result.age}\n`
                    text += `Tempat : ${data.result.place}\n`
                    text += `Story : \n${data.result.story}`
                    reply(text)
                })
                .catch(console.error)
            break
        case 'jadwalsholat':
            if (args.length == 0) return reply(`Example: ${prefix + command} Yogyakarta`)
            axios
                .get(`https://api.lolhuman.xyz/api/sholat/${daerah}?apikey=${apikey}`)
                .then(({ data }) => {
                    var text = `Wilayah : ${data.result.wilayah}\n`
                    text += `Tanggal : ${data.result.tanggal}\n`
                    text += `Sahur : ${data.result.sahur}\n`
                    text += `Imsak : ${data.result.imsak}\n`
                    text += `Subuh : ${data.result.subuh}\n`
                    text += `Terbit : ${data.result.terbit}\n`
                    text += `Dhuha : ${data.result.dhuha}\n`
                    text += `Dzuhur : ${data.result.dzuhur}\n`
                    text += `Ashar : ${data.result.ashar}\n`
                    text += `Maghrib : ${data.result.imsak}\n`
                    text += `Isya : ${data.result.isya}`
                    reply(text)
                })
                .catch(console.error)
            break

        // Downloader //
        case 'ytplay':
            if (args.length == 0) return await reply(`Example: ${prefix + command} melukis senja`)
            axios
                .get(`https://api.lolhuman.xyz/api/ytsearch?apikey=${apikey}&query=${full_args}`)
                .then(({ data }) => {
                    axios.get(`https://api.lolhuman.xyz/api/ytaudio2?apikey=${apikey}&url=https://www.youtube.com/watch?v=${data.result[0].videoId}`).then(({ data }) => {
                        var caption = `❖ Title    : *${data.result.title}*\n`
                        caption += `❖ Size     : *${data.result.size}*`
                        sock.sendMessage(from, { image: { url: data.result.thumbnail }, caption }).then(() => {
                            sock.sendMessage(from, { audio: { url: data.result.link }, mimetype: 'audio/mp4', fileName: `${data.result.title}.mp3`, ptt: true })
                        })
                    })
                })
                .catch(console.error)
            break
        case 'ytsearch':
            if (args.length == 0) return reply(`Example: ${prefix + command} Melukis Senja`)
            axios
                .get(`https://api.lolhuman.xyz/api/ytsearch?apikey=${apikey}&query=${full_args}`)
                .then(({ data }) => {
                    var text = ''
                    for (var x of data.result) {
                        text += `Title : ${x.title}\n`
                        text += `Views : ${x.views}\n`
                        text += `Published : ${x.published}\n`
                        text += `Thumbnail : ${x.thumbnail}\n`
                        text += `Link : https://www.youtube.com/watch?v=${x.videoId}\n\n`
                    }
                    reply(text)
                })
                .catch(console.error)
            break
        case 'ytmp3':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://www.youtube.com/watch?v=qZIQAk-BUEc`)
            axios
                .get(`https://api.lolhuman.xyz/api/ytaudio2?apikey=${apikey}&url=${args[0]}`)
                .then(({ data }) => {
                    var caption = `❖ Title    : *${data.result.title}*\n`
                    caption += `❖ Size     : *${data.result.size}*`
                    sock.sendMessage(from, { image: { url: data.result.thumbnail }, caption }).then(() => {
                        sock.sendMessage(from, { audio: { url: data.result.link }, mimetype: 'audio/mp4', fileName: `${data.result.title}.mp3`, ptt: true })
                    })
                })
                .catch(console.error)
            break
        case 'ytmp4':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://www.youtube.com/watch?v=qZIQAk-BUEc`)
            axios
                .get(`https://api.lolhuman.xyz/api/ytvideo2?apikey=${apikey}&url=${args[0]}`)
                .then(({ data }) => {
                    var caption = `❖ Title    : *${data.result.title}*\n`
                    caption += `❖ Size     : *${data.result.size}*`
                    sock.sendMessage(from, { image: { url: data.result.thumbnail }, caption }).then(() => {
                        sock.sendMessage(from, { audio: { url: data.result.link }, mimetype: 'video/mp4', fileName: `${data.result.title}.mp4` })
                    })
                })
                .catch(console.error)
            break
        case 'telesticker':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://t.me/addstickers/LINE_Menhera_chan_ENG`)
            axios.get(`https://api.lolhuman.xyz/api/telestick?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                sock.sendMessage(from, { sticker: { url: data.result.sticker.random() } })
            })
            break
        case 'tiktoknowm':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://vt.tiktok.com/ZSwWCk5o/`)
            axios.get(`https://api.lolhuman.xyz/api/tiktok?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                sock.sendMessage(from, { video: { url: data.result.link }, mimetype: 'video/mp4' })
            })
            break
        case 'tiktokmusic':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://vt.tiktok.com/ZSwWCk5o/`)
            sock.sendMessage(from, { audio: { url: `https://api.lolhuman.xyz/api/tiktokmusic?apikey=${apikey}&url=${args[0]}` }, mimetype: 'audio/mp4', fileName: `${data.result.title}.mp3`, ptt: true })
            break
        case 'spotify':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://open.spotify.com/track/0ZEYRVISCaqz5yamWZWzaA`)
            axios.get(`https://api.lolhuman.xyz/api/spotify?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                var caption = `Title : ${data.result.title}\n`
                caption += `Artists : ${data.result.artists}\n`
                caption += `Duration : ${data.result.duration}\n`
                caption += `Popularity : ${data.result.popularity}\n`
                caption += `Preview : ${data.result.preview_url}\n`
                sock.sendMessage(from, { image: { url: data.result.thumbnail }, caption }).then(() => {
                    sock.sendMessage(from, { audio: { url: data.result.link }, mimetype: 'audio/mp4', fileName: `${data.result.title}.mp3`, ptt: true })
                })
            })
            break
        case 'spotifysearch':
            if (args.length == 0) return reply(`Example: ${prefix + command} Melukis Senja`)
            axios.get(`https://api.lolhuman.xyz/api/spotifysearch?apikey=${apikey}&query=${full_args}`).then(({ data }) => {
                var text = ''
                for (var x of data.result) {
                    text += `Title : ${x.title}\n`
                    text += `Artists : ${x.artists}\n`
                    text += `Duration : ${x.duration}\n`
                    text += `Link : ${x.link}\n`
                    text += `Preview : ${x.preview_url}\n\n\n`
                }
                reply(text)
            })
            break
        case 'jooxplay':
            if (args.length == 0) return reply(`Example: ${prefix + command} Melukis Senja`)
            axios.get(`https://api.lolhuman.xyz/api/jooxplay?apikey=${apikey}&query=${full_args}`).then(({ data }) => {
                var caption = `Title : ${data.result.info.song}\n`
                caption += `Artists : ${data.result.info.singer}\n`
                caption += `Duration : ${data.result.info.duration}\n`
                caption += `Album : ${data.result.info.album}\n`
                caption += `Uploaded : ${data.result.info.date}\n`
                caption += `Lirik :\n ${data.result.lirik}\n`
                sock.sendMessage(from, { image: { url: data.result.image }, caption }).then(() => {
                    sock.sendMessage(from, { audio: { url: data.result.audio[0].link }, mimetype: 'audio/mp4', fileName: `${data.result.title}.mp3`, ptt: true })
                })
            })
            break
        case 'igdl':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://www.instagram.com/p/CJ8XKFmJ4al/?igshid=1acpcqo44kgkn`)
            axios.get(`https://api.lolhuman.xyz/api/instagram?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                var url = data.result
                if (url.includes('.mp4')) {
                    sock.sendMessage(from, { video: { url }, mimetype: 'video/mp4' })
                } else {
                    sock.sendMessage(from, { image: { url } })
                }
            })
            break
        case 'igdl2':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://www.instagram.com/p/CJ8XKFmJ4al/?igshid=1acpcqo44kgkn`)
            axios.get(`https://api.lolhuman.xyz/api/instagram2?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                for (var x of data.result) {
                    if (x.includes('.mp4')) {
                        sock.sendMessage(from, { video: { url: x }, mimetype: 'video/mp4' })
                    } else {
                        sock.sendMessage(from, { image: { url: x } })
                    }
                }
            })
            break
        case 'twtdl':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://twitter.com/gofoodindonesia/status/1229369819511709697`)
            axios.get(`https://api.lolhuman.xyz/api/twitter?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                sock.sendMessage(from, { video: { url: data.result.link[data.result.link.length - 1].link }, mimetype: 'video/mp4' })
            })
            break
        case 'fbdl':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://id-id.facebook.com/SamsungGulf/videos/video-bokeh/561108457758458/`)
            axios.get(`https://api.lolhuman.xyz/api/facebook?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                sock.sendMessage(from, { video: { url: data.result }, mimetype: 'video/mp4' })
            })
            break
        case 'zippyshare':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://www51.zippyshare.com/v/5W0TOBz1/file.html`)
            axios.get(`https://api.lolhuman.xyz/api/zippyshare?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                var text = `File Name : ${data.result.name_file}\n`
                text += `Size : ${data.result.size}\n`
                text += `Date Upload : ${data.result.date_upload}\n`
                text += `Download Url : ${data.result.download_url}`
                reply(text)
            })
            break
        case 'pinterest':
            if (args.length == 0) return reply(`Example: ${prefix + command} loli kawaii`)
            axios.get(`https://api.lolhuman.xyz/api/pinterest?apikey=${apikey}&query=${full_args}`).then(({ data }) => {
                sock.sendMessage(from, { image: { url: data.result } })
            })
            break
        case 'pinterest2':
            if (args.length == 0) return reply(`Example: ${prefix + command} loli kawaii`)
            axios.get(`https://api.lolhuman.xyz/api/pinterest2?apikey=${apikey}&query=${full_args}`).then(({ data }) => {
                for (var x of data.result.slice(0, 5)) {
                    sock.sendMessage(from, { image: { url: x } })
                }
            })
            break
        case 'pinterestdl':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://id.pinterest.com/pin/696580267364426905/`)
            axios.get(`https://api.lolhuman.xyz/api/pinterestdl?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                sock.sendMessage(from, { image: { url: data.result[0] } })
            })
            break
        case 'pixiv':
            if (args.length == 0) return reply(`Example: ${prefix + command} loli kawaii`)
            sock.sendMessage(from, { image: { url: `https://api.lolhuman.xyz/api/pixiv?apikey=${apikey}&query=${full_args}` } })
            break
        case 'pixivdl':
            if (args.length == 0) return reply(`Example: ${prefix + command} 63456028`)
            sock.sendMessage(from, { image: { url: `https://api.lolhuman.xyz/api/pixivdl/${args[0]}?apikey=${apikey}` } })
            break

        // AniManga //
        case 'character':
            if (args.length == 0) return reply(`Example: ${prefix + command} Miku Nakano`)
            axios.get(`https://api.lolhuman.xyz/api/character?apikey=${apikey}&query=${full_args}`).then(({ data }) => {
                var caption = `Id : ${data.result.id}\n`
                caption += `Name : ${data.result.name.full}\n`
                caption += `Native : ${data.result.name.native}\n`
                caption += `Favorites : ${data.result.favourites}\n`
                caption += `Media : \n`
                for (var x of data.result.media.nodes) {
                    caption += `- ${x.title.romaji} (${x.title.native})\n`
                }
                caption += `\nDescription : \n${data.result.description.replace(/__/g, '_')}`
                sock.sendMessage(from, { image: { url: data.result.image.large }, caption })
            })
            break
        case 'manga':
            if (args.length == 0) return reply(`Example: ${prefix + command} Gotoubun No Hanayome`)
            axios.get(`https://api.lolhuman.xyz/api/manga?apikey=${apikey}&query=${full_args}`).then(({ data }) => {
                var caption = `Id : ${data.result.id}\n`
                caption += `Id MAL : ${data.result.idMal}\n`
                caption += `Title : ${data.result.title.romaji}\n`
                caption += `English : ${data.result.title.english}\n`
                caption += `Native : ${data.result.title.native}\n`
                caption += `Format : ${data.result.format}\n`
                caption += `Chapters : ${data.result.chapters}\n`
                caption += `Volume : ${data.result.volumes}\n`
                caption += `Status : ${data.result.status}\n`
                caption += `Source : ${data.result.source}\n`
                caption += `Start Date : ${data.result.startDate.day} - ${data.result.startDate.month} - ${data.result.startDate.year}\n`
                caption += `End Date : ${data.result.endDate.day} - ${data.result.endDate.month} - ${data.result.endDate.year}\n`
                caption += `Genre : ${data.result.genres.join(', ')}\n`
                caption += `Synonyms : ${data.result.synonyms.join(', ')}\n`
                caption += `Score : ${data.result.averageScore}%\n`
                caption += `Characters : \n`
                for (var x of data.result.characters.nodes) {
                    caption += `- ${x.name.full} (${x.name.native})\n`
                }
                caption += `\nDescription : ${data.result.description}`
                sock.sendMessage(from, { image: { url: data.result.coverImage.large }, caption })
            })
            break
        case 'anime':
            if (args.length == 0) return reply(`Example: ${prefix + command} Gotoubun No Hanayome`)
            axios.get(`https://api.lolhuman.xyz/api/anime?apikey=${apikey}&query=${full_args}`).then(({ data }) => {
                var caption = `Id : ${data.result.id}\n`
                caption += `Id MAL : ${data.result.idMal}\n`
                caption += `Title : ${data.result.title.romaji}\n`
                caption += `English : ${data.result.title.english}\n`
                caption += `Native : ${data.result.title.native}\n`
                caption += `Format : ${data.result.format}\n`
                caption += `Episodes : ${data.result.episodes}\n`
                caption += `Duration : ${data.result.duration} mins.\n`
                caption += `Status : ${data.result.status}\n`
                caption += `Season : ${data.result.season}\n`
                caption += `Season Year : ${data.result.seasonYear}\n`
                caption += `Source : ${data.result.source}\n`
                caption += `Start Date : ${data.result.startDate.day} - ${data.result.startDate.month} - ${data.result.startDate.year}\n`
                caption += `End Date : ${data.result.endDate.day} - ${data.result.endDate.month} - ${data.result.endDate.year}\n`
                caption += `Genre : ${data.result.genres.join(', ')}\n`
                caption += `Synonyms : ${data.result.synonyms.join(', ')}\n`
                caption += `Score : ${data.result.averageScore}%\n`
                caption += `Characters : \n`
                for (var x of data.result.characters.nodes) {
                    caption += `- ${x.name.full} (${x.name.native})\n`
                }
                caption += `\nDescription : ${data.result.description}`
                sock.sendMessage(from, { image: { url: data.result.coverImage.large }, caption })
            })
            break
        case 'wait':
            if (!isImage && !isQuotedImage) return reply(`Kirim gambar dengan caption ${prefix + command} atau tag gambar yang sudah dikirim`)
            var mediaType = type
            if (isQuotedImage || isQuotedVideo) {
                mediaType = quotedType
                msg.message[mediaType] = msg.message.extendedTextMessage.contextInfo.quotedMessage[mediaType]
            }
            var stream = await downloadContentFromMessage(msg.message[mediaType], mediaType.replace('Message', ''))
            var form = new FormData()
            form.append('img', stream, 'tahu.jpg')
            axios.post(`https://api.lolhuman.xyz/api/wait?apikey=${apikey}`, form).then(({ data }) => {
                var caption = `Anilist id : ${data.result.anilist_id}\n`
                caption += `MAL id : ${data.result.mal_id}\n`
                caption += `Title Romaji : ${data.result.title_romaji}\n`
                caption += `Title Native : ${data.result.title_native}\n`
                caption += `Title English : ${data.result.title_english}\n`
                caption += `at : ${data.result.at}\n`
                caption += `Episode : ${data.result.episode}\n`
                caption += `Similarity : ${data.result.similarity}`
                sock.sendMessage(from, { video: { url: data.result.video }, mimetype: 'video/mp4', caption })
            })
            break
        case 'kusonime':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://kusonime.com/nanatsu-no-taizai-bd-batch-subtitle-indonesia/`)
            axios.get(`https://api.lolhuman.xyz/api/kusonime?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                var caption = `Title : ${data.result.title}\n`
                caption += `Japanese : ${data.result.japanese}\n`
                caption += `Genre : ${data.result.genre}\n`
                caption += `Seasons : ${data.result.seasons}\n`
                caption += `Producers : ${data.result.producers}\n`
                caption += `Type : ${data.result.type}\n`
                caption += `Status : ${data.result.status}\n`
                caption += `Total Episode : ${data.result.total_episode}\n`
                caption += `Score : ${data.result.score}\n`
                caption += `Duration : ${data.result.duration}\n`
                caption += `Released On : ${data.result.released_on}\n`
                caption += `Desc : ${data.result.desc}\n`
                for (var x in data.result.link_dl) {
                    caption += `\n${x}\n`
                    for (var y in link_dl[x]) {
                        caption += `${y} - ${link_dl[x][y]}\n`
                    }
                }
                sock.sendMessage(from, { image: { url: data.result.thumbnail }, caption })
            })
            break
        case 'kusonimesearch':
            if (args.length == 0) return reply(`Example: ${prefix + command} Gotoubun No Hanayome`)
            axios.get(`https://api.lolhuman.xyz/api/kusonimesearch?apikey=${apikey}&query=${full_args}`).then(({ data }) => {
                var caption = `Title : ${data.result.title}\n`
                caption += `Japanese : ${data.result.japanese}\n`
                caption += `Genre : ${data.result.genre}\n`
                caption += `Seasons : ${data.result.seasons}\n`
                caption += `Producers : ${data.result.producers}\n`
                caption += `Type : ${data.result.type}\n`
                caption += `Status : ${data.result.status}\n`
                caption += `Total Episode : ${data.result.total_episode}\n`
                caption += `Score : ${data.result.score}\n`
                caption += `Duration : ${data.result.duration}\n`
                caption += `Released On : ${data.result.released_on}\n`
                caption += `Desc : ${data.result.desc}\n`
                for (var x in data.result.link_dl) {
                    caption += `\n${x}\n`
                    for (var y in link_dl[x]) {
                        caption += `${y} - ${link_dl[x][y]}\n`
                    }
                }
                sock.sendMessage(from, { image: { url: data.result.thumbnail }, caption })
            })
            break
        case 'otakudesu':
            if (args.length == 0) return reply(`Example: ${prefix + command} https://otakudesu.tv/lengkap/pslcns-sub-indo/`)
            axios.get(`https://api.lolhuman.xyz/api/otakudesu?apikey=${apikey}&url=${args[0]}`).then(({ data }) => {
                var text = `Title : ${data.result.title}\n`
                text += `Japanese : ${data.result.japanese}\n`
                text += `Judul : ${data.result.judul}\n`
                text += `Type : ${data.result.type}\n`
                text += `Episode : ${data.result.episodes}\n`
                text += `Aired : ${data.result.aired}\n`
                text += `Producers : ${data.result.producers}\n`
                text += `Genre : ${data.result.genres}\n`
                text += `Duration : ${data.result.duration}\n`
                text += `Studios : ${data.result.status}\n`
                text += `Rating : ${data.result.rating}\n`
                text += `Credit : ${data.result.credit}\n`
                for (var x in data.result.link_dl) {
                    text += `\n\n*${data.result.link_dl[x].title}*\n`
                    for (var y in data.result.link_dl[x].link_dl) {
                        ini_info = data.result.link_dl[x].link_dl[y]
                        text += `\n\`\`\`Reso : \`\`\`${ini_info.reso}\n`
                        text += `\`\`\`Size : \`\`\`${ini_info.size}\n`
                        text += `\`\`\`Link : \`\`\`\n`
                        down_link = ini_info.link_dl
                        for (var z in down_link) {
                            text += `${z} - ${down_link[z]}\n`
                        }
                    }
                }
                reply(text)
            })
            break
        case 'otakudesusearch':
            if (args.length == 0) return reply(`Example: ${prefix + command} Gotoubun No Hanayome`)
            axios.get(`https://api.lolhuman.xyz/api/otakudesusearch?apikey=${apikey}&query=${full_args}`).then(({ data }) => {
                var text = `Title : ${data.result.title}\n`
                text += `Japanese : ${data.result.japanese}\n`
                text += `Judul : ${data.result.judul}\n`
                text += `Type : ${data.result.type}\n`
                text += `Episode : ${data.result.episodes}\n`
                text += `Aired : ${data.result.aired}\n`
                text += `Producers : ${data.result.producers}\n`
                text += `Genre : ${data.result.genres}\n`
                text += `Duration : ${data.result.duration}\n`
                text += `Studios : ${data.result.status}\n`
                text += `Rating : ${data.result.rating}\n`
                text += `Credit : ${data.result.credit}\n`
                for (var x in data.result.link_dl) {
                    text += `\n\n*${data.result.link_dl[x].title}*\n`
                    for (var y in data.result.link_dl[x].link_dl) {
                        var info = data.result.link_dl[x].link_dl[y]
                        text += `\n\`\`\`Reso : \`\`\`${info.reso}\n`
                        text += `\`\`\`Size : \`\`\`${info.size}\n`
                        text += `\`\`\`Link : \`\`\`\n`
                        var link = info.link_dl
                        for (var z in link) {
                            text += `${z} - ${link[z]}\n`
                        }
                    }
                }
                reply(text)
            })
            break

        case '1977':
        case 'aden':
        case 'brannan':
        case 'brooklyn':
        case 'clarendon':
        case 'gingham':
        case 'hudson':
        case 'inkwell':
        case 'earlybird':
        case 'kelvin':
        case 'lark':
        case 'lofi':
        case 'maven':
        case 'mayfair':
        case 'moon':
        case 'nashville':
        case 'perpetua':
        case 'reyes':
        case 'rise':
        case 'slumber':
        case 'stinson':
        case 'toaster':
        case 'valencia':
        case 'walden':
        case 'willow':
        case 'xpro2':
            if (!isImage && !isQuotedImage) return reply(`Kirim gambar dengan caption ${prefix + command} atau tag gambar yang sudah dikirim`)
            var mediaType = type
            if (isQuotedImage || isQuotedVideo) {
                mediaType = quotedType
                msg.message[mediaType] = msg.message.extendedTextMessage.contextInfo.quotedMessage[mediaType]
            }
            var stream = await downloadContentFromMessage(msg.message[mediaType], mediaType.replace('Message', ''))
            var form = new FormData()
            form.append('img', stream, 'tahu.jpg')
            axios.post(`https://api.lolhuman.xyz/api/filter/${command}?apikey=${apikey}`, form, { responseType: 'arraybuffer' }).then(({ data }) => {
                sock.sendMessage(from, { image: data })
            })
            break
        case 'pencil':
            if (((isMedia && !lol.message.videoMessage) || isQuotedImage) && args.length == 0) {
                const encmedia = isQuotedImage ? JSON.parse(JSON.stringify(lol).replace('quotedM', 'm')).message.extendedTextMessage.contextInfo : lol
                filePath = await lolhuman.downloadAndSaveMediaMessage(encmedia)
                file_name = getRandom('.jpg')
                request(
                    {
                        url: `https://api.lolhuman.xyz/api/editor/pencil?apikey=${apikey}`,
                        method: 'POST',
                        formData: {
                            img: fs.createReadStream(filePath),
                        },
                        encoding: 'binary',
                    },
                    async function (error, response, body) {
                        fs.unlinkSync(filePath)
                        fs.writeFileSync(file_name, body, 'binary')
                        ini_buff = fs.readFileSync(file_name)
                        await lolhuman.sendMessage(from, ini_buff, image, { quoted: lol }).then(() => {
                            fs.unlinkSync(file_name)
                        })
                    }
                )
            } else {
                reply(`Kirim gambar dengan caption ${prefix}sticker atau tag gambar yang sudah dikirim`)
            }
            break

        // Random Image //
        case 'art':
        case 'bts':
        case 'exo':
        case 'elf':
        case 'loli':
        case 'neko':
        case 'waifu':
        case 'shota':
        case 'husbu':
        case 'sagiri':
        case 'shinobu':
        case 'megumin':
        case 'wallnime':
            sock.sendMessage(from, { image: { url: `https://api.lolhuman.xyz/api/random/${command}?apikey=${apikey}` } })
            break

        case 'chiisaihentai':
        case 'trap':
        case 'blowjob':
        case 'yaoi':
        case 'ecchi':
        case 'hentai':
        case 'ahegao':
        case 'hololewd':
        case 'sideoppai':
        case 'animefeets':
        case 'animebooty':
        case 'animethighss':
        case 'hentaiparadise':
        case 'animearmpits':
        case 'hentaifemdom':
        case 'lewdanimegirls':
        case 'biganimetiddies':
        case 'animebellybutton':
        case 'hentai4everyone':
            sock.sendMessage(from, { image: { url: `https://api.lolhuman.xyz/api/random/nsfw/${command}?apikey=${apikey}` } })
            break

        case 'bj':
        case 'ero':
        case 'cum':
        case 'feet':
        case 'yuri':
        case 'trap':
        case 'lewd':
        case 'feed':
        case 'eron':
        case 'solo':
        case 'gasm':
        case 'poke':
        case 'anal':
        case 'holo':
        case 'tits':
        case 'kuni':
        case 'kiss':
        case 'erok':
        case 'smug':
        case 'baka':
        case 'solog':
        case 'feetg':
        case 'lewdk':
        case 'waifu':
        case 'pussy':
        case 'femdom':
        case 'cuddle':
        case 'hentai':
        case 'eroyuri':
        case 'cum_jpg':
        case 'blowjob':
        case 'erofeet':
        case 'holoero':
        case 'classic':
        case 'erokemo':
        case 'fox_girl':
        case 'futanari':
        case 'lewdkemo':
        case 'wallpaper':
        case 'pussy_jpg':
        case 'kemonomimi':
        case 'nsfw_avatar':
            sock.sendMessage(from, { image: { url: `https://api.lolhuman.xyz/api/random2/${command}?apikey=${apikey}` } })
            break

        // Textprome //
        case 'blackpink':
        case 'neon':
        case 'greenneon':
        case 'advanceglow':
        case 'futureneon':
        case 'sandwriting':
        case 'sandsummer':
        case 'sandengraved':
        case 'metaldark':
        case 'neonlight':
        case 'holographic':
        case 'text1917':
        case 'minion':
        case 'deluxesilver':
        case 'newyearcard':
        case 'bloodfrosted':
        case 'halloween':
        case 'jokerlogo':
        case 'fireworksparkle':
        case 'natureleaves':
        case 'bokeh':
        case 'toxic':
        case 'strawberry':
        case 'box3d':
        case 'roadwarning':
        case 'breakwall':
        case 'icecold':
        case 'luxury':
        case 'cloud':
        case 'summersand':
        case 'horrorblood':
        case 'thunder':
            if (args.length == 0) return reply(`Example: ${prefix + command} LoL Human`)
            sock.sendMessage(from, { image: { url: `https://api.lolhuman.xyz/api/textprome/${command}?apikey=${apikey}&text=${full_args}` } })
            break

        case 'pornhub':
        case 'glitch':
        case 'avenger':
        case 'space':
        case 'ninjalogo':
        case 'marvelstudio':
        case 'lionlogo':
        case 'wolflogo':
        case 'steel3d':
        case 'wallgravity':
            if (args.length == 0) return reply(`Example: ${prefix + command} LoL Human`)
            sock.sendMessage(from, { image: { url: `https://api.lolhuman.xyz/api/textprome2/${command}?apikey=${apikey}&text1=${args[0]}&text2=${args[1]}` } })
            break

        // Photo Oxy //
        case 'shadow':
        case 'cup':
        case 'cup1':
        case 'romance':
        case 'smoke':
        case 'burnpaper':
        case 'lovemessage':
        case 'undergrass':
        case 'love':
        case 'coffe':
        case 'woodheart':
        case 'woodenboard':
        case 'summer3d':
        case 'wolfmetal':
        case 'nature3d':
        case 'underwater':
        case 'golderrose':
        case 'summernature':
        case 'letterleaves':
        case 'glowingneon':
        case 'fallleaves':
        case 'flamming':
        case 'harrypotter':
        case 'carvedwood':
            if (args.length == 0) return reply(`Example: ${prefix + command} LoL Human`)
            sock.sendMessage(from, { image: { url: `https://api.lolhuman.xyz/api/photooxy1/${command}?apikey=${apikey}&text=${full_args}` } })
            break

        case 'tiktok':
        case 'arcade8bit':
        case 'battlefield4':
        case 'pubg':
            if (args.length == 0) return reply(`Example: ${prefix + command} LoL Human`)
            sock.sendMessage(from, { image: { url: `https://api.lolhuman.xyz/api/photooxy2/${command}?apikey=${apikey}&text1=${args[0]}&text2=${args[1]}` } })
            break

        // Ephoto 360 //
        case 'wetglass':
        case 'multicolor3d':
        case 'watercolor':
        case 'luxurygold':
        case 'galaxywallpaper':
        case 'lighttext':
        case 'beautifulflower':
        case 'puppycute':
        case 'royaltext':
        case 'heartshaped':
        case 'birthdaycake':
        case 'galaxystyle':
        case 'hologram3d':
        case 'greenneon':
        case 'glossychrome':
        case 'greenbush':
        case 'metallogo':
        case 'noeltext':
        case 'glittergold':
        case 'textcake':
        case 'starsnight':
        case 'wooden3d':
        case 'textbyname':
        case 'writegalacy':
        case 'galaxybat':
        case 'snow3d':
        case 'birthdayday':
        case 'goldplaybutton':
        case 'silverplaybutton':
        case 'freefire':
            if (args.length == 0) return reply(`Example: ${prefix + command} LoL Human`)
            sock.sendMessage(from, { image: { url: `https://api.lolhuman.xyz/api/ephoto1/${command}?apikey=${apikey}&text=${text}` } })
            break
        default:
            if (isCmd) {
                reply(`Sorry bro, command *${prefix}${command}* gk ada di list *${prefix}help*`)
            }
            break
    }
}
