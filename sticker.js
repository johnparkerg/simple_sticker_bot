const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const sharp = require('sharp');
const { writeFile, unlink } = require('fs/promises');
const { Sticker } = require('wa-sticker-formatter')
const ffmpeg = require('fluent-ffmpeg');

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
        if (message.message.imageMessage || message.message.videoMessage) {
            const isVideo = !!message.message.videoMessage;
            const mediaKey = message.key.id;
            const inputFile = isVideo ? `${mediaKey}_input.mp4` : `${mediaKey}_input.jpg`;
            const outputFile = `${mediaKey}_output.png`;

            // download the message
            const buffer = await downloadMediaMessage(message);
            // save to file
            await writeFile(inputFile, buffer);

            let imageBuffer;

            if (isVideo) {
                // Extract a frame from the video
                await new Promise((resolve, reject) => {
                    ffmpeg(inputFile)
                        .screenshots({
                            timestamps: ['00:00:01'],
                            filename: outputFile,
                            folder: '.',
                            size: '200x200'
                        })
                        .on('end', resolve)
                        .on('error', (err) => {
                            console.error('Error processing video:', err);
                            reject(err);
                        });
                });
                imageBuffer = await sharp(outputFile).webp().toBuffer();
            } else {
                imageBuffer = await sharp(inputFile).resize(200, 200).webp().toBuffer();
            }

            // Convert image to sticker
            const sticker = new Sticker(imageBuffer);
            // Send the sticker
            socket.sendMessage(message.key.remoteJid, await sticker.toMessage());

            // Delete the files
            await unlink(inputFile);
            if (isVideo) {
                await unlink(outputFile); // Only delete output if it was a video
            }
        }
    });
}
open_assistant();