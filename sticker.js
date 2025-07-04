const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const sharp = require('sharp');
const { writeFile, unlink, readFile } = require('fs/promises'); // Added readFile
const { Sticker } = require('wa-sticker-formatter')
const ffmpeg = require('fluent-ffmpeg');
const webp = require('webp-converter');

// Suppress webp-converter logging if possible, or use a version that allows it.
// For now, we'll proceed and address excessive logging if it becomes an issue.
// webp.set_logger_level(0); // Example, actual method might differ or not exist

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
            const inputFilePath = isVideo ? `${mediaKey}_input.mp4` : `${mediaKey}_input.jpg`;
            const tempOutputFilePath = isVideo ? `${mediaKey}_temp.webp` : `${mediaKey}_output.webp`; // webp for images too for consistency

            const downloadedBuffer = await downloadMediaMessage(message);
            await writeFile(inputFilePath, downloadedBuffer);

            let stickerBuffer;

            if (isVideo) {
                const animatedWebpPath = `${mediaKey}_animated.webp`;
                try {
                    await new Promise((resolve, reject) => {
                        ffmpeg(inputFilePath)
                            .duration(3) // Limit duration to 3 seconds
                            .size('512x512') // Set size
                            .autopad() // Add padding to maintain aspect ratio
                            .fps(10) // Set FPS to 10
                            .outputOptions([ // Options for animated WebP
                                '-vcodec libwebp',
                                '-lossless 0', // Can be 0 (lossless) or 1 (lossy)
                                '-qscale:v 75', // Quality for lossy (if lossless 0 not used or overridden)
                                '-loop 0', // Loop indefinitely
                                '-preset picture', // Preset for photo-like content
                                '-an', // No audio
                                '-vsync vfr' // Variable frame rate sync
                            ])
                            .toFormat('webp') // Output format
                            .save(animatedWebpPath)
                            .on('end', resolve)
                            .on('error', (err) => {
                                console.error('Error processing video for animated sticker:', err);
                                reject(err);
                            });
                    });
                    stickerBuffer = await readFile(animatedWebpPath);
                    await unlink(animatedWebpPath); // Clean up temp webp
                } catch (error) {
                    console.error("Failed to create animated sticker, sending static instead.", error);
                    // Fallback to static sticker if animation fails
                    const staticOutputPath = `${mediaKey}_static_fallback.png`;
                    await new Promise((resolve, reject) => {
                         ffmpeg(inputFilePath)
                            .screenshots({
                                timestamps: ['00:00:00.500'], // Try to get a frame not exactly at the start
                                filename: staticOutputPath,
                                folder: '.',
                                size: '512x512'
                            })
                            .on('end', resolve)
                            .on('error', reject);
                    });
                    stickerBuffer = await sharp(staticOutputPath).webp().toBuffer();
                    await unlink(staticOutputPath);
                }
            } else { // Static image
                stickerBuffer = await sharp(inputFilePath).resize(512, 512).webp().toBuffer();
            }

            if (stickerBuffer) {
                const sticker = new Sticker(stickerBuffer, {
                    pack: 'My Bot Stickers',
                    author: 'Bot',
                    type: isVideo ? 'default' : 'default' // 'default' or 'crop' for animated, 'full' or 'crop' for static
                });
                socket.sendMessage(message.key.remoteJid, await sticker.toMessage());
            }

            // Delete the input file
            await unlink(inputFilePath);
            // No tempOutputFilePath to delete for images if sharp directly buffers
            // animatedWebpPath is deleted above if created
        }
    });
}
open_assistant();