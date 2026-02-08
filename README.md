# DEX Nova - WhatsApp MD User Bot

A powerful and feature-rich WhatsApp bot supporting multiple sessions, designed for seamless automation and enhanced user experience.

### Features

- **Multi-Session Support** – Manage multiple accounts effortlessly.
- **Customizable Responses** – Configure responses in different languages.
- **Automated Task Execution** – Perform actions without manual intervention.
- **Easy Deployment** – Multiple hosting options for quick setup.

### Supported Languages

This bot supports multiple languages for responses. Set your preferred language using the `BOT_LANG` variable in the `config.env` file.

**Available languages:**

- **bn** – Bengali  
- **en** – English  
- **es** – Spanish  
- **hi** – Hindi  
- **id** – Indonesian  
- **ur** – Urdu  
- **tr** – Turkish  
- **fr** – French  
- **ru** – Russian  
- **ar** – Arabic  
- **ml** – Malayalam  

To set the bot language to Hindi, add the following line to your `config.env` file:

```env
BOT_LANG=hi
Deployment Guide
1️⃣ Deploy on Koyeb / Render / Railway (Recommended)
Visit your custom dashboard to generate session and deploy:
Deploy Now  
2️⃣ Deploy on a VPS or PC (Ubuntu Example)
Manual Installation
Update System and Install Dependencies:
sudo apt update && sudo apt upgrade -y
sudo apt install git ffmpeg curl -y
Install Node.js (Version 20.x Recommended):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
Install Yarn and PM2 for Process Management:
sudo npm install -g yarn
yarn global add pm2
Clone the Repository and Install Dependencies:
git clone https://github.com/YOUR_USERNAME/dex-nova.git dex-nova
cd dex-nova
yarn install
�

Configure Environment Variables:
Create a config.env file and add your settings (example):
SESSION_ID=dexnova_sessionid
PREFIX=.
STICKER_PACKNAME=❤️,DEX Nova
ALWAYS_ONLINE=false
RMBG_KEY=null
BOT_LANG=en
WARN_LIMIT=3
FORCE_LOGOUT=false
MAX_UPLOAD=200
REJECT_CALL=false
SUDO=your_number_here
TZ=Asia/Kolkata
VPS=true
AUTO_STATUS_VIEW=true
SEND_READ=true
AJOIN=true
DISABLE_START_MESSAGE=false
PERSONAL_MESSAGE=null
Start the Bot Using PM2:
pm2 start . --name dex-nova --attach --time
To stop the bot:
pm2 stop dex-nova
Credits & Acknowledgments
Special thanks to the open-source community:
Original Baileys library by @adiwajshing
Inspired by various WhatsApp MD bot projects
🛠 Need Help?
For more information on environment variables, session pairing, and FAQs, visit:
Dashboard & Session Pairing
Frequently Asked Questions
Made with ❤️ by Dex
###
