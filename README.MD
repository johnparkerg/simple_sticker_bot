# WhatsApp Sticker Bot

## Description

This project is a simple yet powerful Node.js-based sticker bot for WhatsApp, leveraging the `@whiskeysockets/baileys` library for WhatsApp Web API interactions and `sharp` for image processing. It listens for specific trigger messages and responds by converting images sent to it into stickers, automatically sending these back to the chat.

## Features

- **Automatic Sticker Conversion**:
    - Converts images sent with the `#s` trigger into static WebP stickers.
    - Converts videos sent with the `#s` trigger into animated WebP stickers (first 3 seconds, 10 FPS).
    - If animated sticker creation fails for a video, a static sticker from the video will be sent as a fallback.
- **QR Code Authentication**: Easy authentication process with WhatsApp Web using QR code scanning.
- **Reconnection Handling**: Automatically attempts to reconnect in case of connection loss.
- **Message Logging**: Logs incoming messages for debugging purposes.

## Prerequisites

Before you begin, ensure you have met the following requirements:
- Node.js installed on your machine (v14.x or later recommended).
- A WhatsApp account to authenticate with WhatsApp Web.

## Installation

To install the WhatsApp Sticker Bot, follow these steps:

1. Clone the repository to your local machine:
   ```bash
   git clone <repository-url>
   ```
2. Navigate into the project directory:
   ```bash
   cd <project-directory>
   ```
3. Install the required dependencies:
   ```bash
   npm install
   ```

## Usage

To start the bot, run the following command in your project directory:

```bash
node sticker.js
```

Follow the on-screen instructions to scan the QR code with your WhatsApp application to authenticate. 

### Keeping the Bot Running

To keep the bot running in the background, you can use `pm2`. If you haven't installed pm2 yet, install it globally using npm:

```bash
npm install -g pm2
```

Then, start the bot with pm2:

```bash
pm2 start sticker.js
```

## Contributing

Contributions to the WhatsApp Sticker Bot are welcome. If you have a suggestion that would make this better, please fork the repository and create a pull request. You can also simply open an issue with the tag "enhancement".

Don't forget to give the project a star! Thanks again!