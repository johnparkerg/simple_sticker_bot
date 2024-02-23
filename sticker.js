const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const sharp = require('sharp');
const { writeFile, unlink } = require('fs/promises');
const { Sticker } = require('wa-sticker-formatter');

async function open_assistant() {

    const auth = await useMultiFileAuthState('imsession');
    const socket = makeWASocket({
        printQRInTerminal: true,
        auth: auth.state
    });
    socket.ev.on("creds.update", auth.saveCreds);
    socket.ev.on("connection.update", ({ connection }) => {
        if (connection === "close") {
            open_assistant();
        }
    });
    socket.ev.on("messages.upsert", async ({ messages }) => {


        console.log(JSON.stringify(messages[0], null, 2));
        if (messages[0].key.fromMe) return;
        let message = messages[0];
        if (message.message?.extendedTextMessage?.text == "#s" && message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            message.message = message.message.extendedTextMessage.contextInfo.quotedMessage;
        }
        else if (message.message.imageMessage?.caption == "#s") {
            //
        }
        else {
            return;
        }
        const key = {
            remoteJid: message.key.remoteJid,
            id: message.id, // id of the message you want to read
            participant: undefined, // the ID of the user that sent the  message (undefined for individual chats)
        };
        // pass to readMessages function
        // can pass multiple keys to read multiple messages as well
        const messagex = await sock.readMessages([key]);
        console.log(messagex);
        if (message.message.imageMessage) {
            const outPutFilePath = message.key.id + "output.jpg";
            // download the message
            const buffer = await downloadMediaMessage(message);
            // save to file
            await writeFile(outPutFilePath, buffer);
            const image = await sharp(outPutFilePath).resize(200, 200).webp().toBuffer();
            // Convert image to sticker
            const sticker = new Sticker(image)
            // Send the sticker
            socket.sendMessage(message.key.remoteJid, await sticker.toMessage());
            // Delete the file
            await unlink(outPutFilePath);
        }
    });
}
open_assistant();