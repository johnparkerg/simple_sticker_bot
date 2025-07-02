const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const sharp = require("sharp");
const { writeFile, unlink } = require("fs/promises");
const { Sticker } = require("wa-sticker-formatter");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

async function open_assistant() {
  const auth = await useMultiFileAuthState("imsession");
  const socket = makeWASocket({
    printQRInTerminal: true,
    auth: auth.state,
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
    if (
      message.message?.extendedTextMessage?.text == "#s" &&
      message.message?.extendedTextMessage?.contextInfo?.quotedMessage
    ) {
      message.message =
        message.message.extendedTextMessage.contextInfo.quotedMessage;
    } else if (
      message.message.imageMessage?.caption == "#s" ||
      message.message.videoMessage?.caption == "#s"
    ) {
      //
    } else {
      return;
    }

    // Handle image messages
    if (message.message.imageMessage) {
      const outPutFilePath = message.key.id + "output.jpg";
      // download the message
      const buffer = await downloadMediaMessage(message);
      // save to file
      await writeFile(outPutFilePath, buffer);
      const image = await sharp(outPutFilePath)
        .resize(200, 200)
        .webp()
        .toBuffer();
      // Convert image to sticker
      const sticker = new Sticker(image);
      // Send the sticker
      socket.sendMessage(message.key.remoteJid, await sticker.toMessage());
      // Delete the file
      await unlink(outPutFilePath);
    }

    // Handle video messages
    if (message.message.videoMessage) {
      const videoFilePath = message.key.id + "input.mp4";
      const outputFilePath = message.key.id + "output.webp";

      try {
        // download the video
        const buffer = await downloadMediaMessage(message);
        // save to file
        await writeFile(videoFilePath, buffer);

        // Convert video to animated WebP sticker
        await new Promise((resolve, reject) => {
          ffmpeg(videoFilePath)
            .inputOptions(["-loop 0"]) // Loop the video
            .outputOptions([
              "-vf",
              "scale=200:200:force_original_aspect_ratio=decrease,pad=200:200:(ow-iw)/2:(oh-ih)/2", // Resize to 200x200
              "-vcodec",
              "libwebp",
              "-lossless",
              "0",
              "-compression_level",
              "6",
              "-q:v",
              "50",
              "-loop",
              "0",
              "-preset",
              "default",
              "-an", // No audio
              "-vsync",
              "0",
            ])
            .output(outputFilePath)
            .on("end", resolve)
            .on("error", reject)
            .run();
        });

        // Read the converted WebP file
        const stickerBuffer = await require("fs").promises.readFile(
          outputFilePath,
        );

        // Convert to sticker
        const sticker = new Sticker(stickerBuffer, {
          pack: "Video Sticker",
          author: "Bot",
          type: "full",
          categories: ["🤖"],
          quality: 70,
          background: "transparent",
        });

        // Send the sticker
        socket.sendMessage(message.key.remoteJid, await sticker.toMessage());

        // Clean up files
        await unlink(videoFilePath);
        await unlink(outputFilePath);
      } catch (error) {
        console.error("Error processing video:", error);
        // Clean up files in case of error
        try {
          await unlink(videoFilePath);
          await unlink(outputFilePath);
        } catch (cleanupError) {
          console.error("Error cleaning up files:", cleanupError);
        }
      }
    }
  });
}
open_assistant();
