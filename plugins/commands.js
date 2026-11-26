const { commandGroups, formatMenu, formatList } = require('../core/menu-design');
const { commands, Module } = require("../main");

const { VERSION } = require("../config");

const config = require("../config");

const { helpPrefix, commandName } = require("../core/plugins/registry");

const os = require("os");

const path = require("path");

const fs = require("fs");

const { uploadToImgbb } = require("./utils/upload");

const { bytesToSize } = require("./utils/misc");

const { setVar } = require("./manage");

const { getTotalUserCount } = require("../core/store");

const { parseAliveMessage, sendAliveMessage } = require("./utils/alive-parser");

const { getString } = require("./utils/lang");

const Lang = getString("commands");

// optional CAT_<USE> keys translate category names in .menu/.list

const category = (use) => Lang[`CAT_${use.toUpperCase()}`] || use;





const retrieveCommandDetails = (name) => {

  const foundCommand = commands.find(

    (cmd) => cmd.pattern && commandName(cmd) === name.toLowerCase()

  );

  if (!foundCommand) return null;

  return {

    name: name.toLowerCase(),

    ...foundCommand,

  };

};



Module(

  {

    pattern: "info ?(.*)",

    desc: Lang.INFO_DESC,

  },

  async (message, args) => {

    const requested = args[1]?.trim();

    if (!requested) {

      return await message.sendReply(

        Lang.INFO_NEED.format(helpPrefix())

      );

    }



    const commandDetails = retrieveCommandDetails(requested);

    if (!commandDetails) {

      return await message.sendReply(

        Lang.INFO_NOT_FOUND.format(requested)

      );

    }



    let infoMessage = Lang.INFO_HEADER;

    infoMessage += Lang.INFO_COMMAND.format(commandDetails.name);

    infoMessage += Lang.INFO_DESCRIPTION.format(commandDetails.desc || Lang.NA);

    infoMessage += Lang.INFO_OWNER.format(commandDetails.fromMe ? Lang.YES : Lang.NO);

    if (commandDetails.use) infoMessage += Lang.INFO_TYPE.format(category(commandDetails.use));

    if (commandDetails.usage)

      infoMessage += Lang.INFO_USAGE.format(`${helpPrefix()}${commandDetails.name} ${commandDetails.usage}`);

    if (commandDetails.warn)

      infoMessage += Lang.INFO_WARNING.format(commandDetails.warn);



    await message.sendReply(infoMessage);

  }

);



Module(

  {

    pattern: "list ?(.*)",

    excludeFromCommands: true,

  },

  async (message, args) => {

    const groups = commandGroups(commands, commandName, category);
    const pages = formatList(groups, helpPrefix(), args[1] || '');
    for (const page of pages) await message.sendReply(page);

  }

);



async function parseAlive(message, aliveMessage) {

  if (!aliveMessage) {

    const defaultAliveMessage = Lang.DEFAULT_ALIVE;

    return await message.sendReply(defaultAliveMessage);

  }



  if (aliveMessage.includes("$")) {

    const parsedMessage = await parseAliveMessage(aliveMessage, message);

    if (parsedMessage) {

      await sendAliveMessage(message, parsedMessage);

    } else {

      await message.sendReply(aliveMessage);

    }

  } else {

    await message.sendReply(aliveMessage);

  }

}



Module(

  {

    pattern: "alive",

    desc: Lang.ALIVE_DESC,

  },

  async (message, match) => {

    await parseAlive(message, config.ALIVE);

  }

);



Module(

  {

    pattern: "setalive ?(.*)",

    fromMe: true,

    desc: Lang.SETALIVE_DESC,

    usage: Lang.SETALIVE_USAGE,

    excludeFromCommands: true,

  },

  async (message, match) => {

    if (!match[1]) {

      return await message.sendReply(Lang.SETALIVE_SETUP.replaceAll("{p}", helpPrefix()));

    }



    const input = match[1].toLowerCase();



    if (input === "help") {

      const helpText = Lang.SETALIVE_HELP;



      return await message.sendReply(helpText);

    }



    if (input === "get") {

      const current = config.ALIVE;

      if (!current) {

        return await message.sendReply(

          Lang.ALIVE_NONE

        );

      }

      return await message.sendReply(

        Lang.ALIVE_CURRENT.format(current).replaceAll("{p}", helpPrefix())

      );

    }



    if (input === "del" || input === "delete") {

      await setVar("ALIVE", "");

      return await message.sendReply(

        Lang.ALIVE_DELETED

      );

    }



    const aliveMessage = match[1];

    if (aliveMessage.length > 2000) {

      return await message.sendReply(

        Lang.ALIVE_TOO_LONG

      );

    }



    await setVar("ALIVE", aliveMessage);

    return await message.sendReply(

      Lang.ALIVE_SET.format(aliveMessage).replaceAll("{p}", helpPrefix())

    );

  }

);



Module(

  {

    pattern: "menu",

    use: "utility",

    desc: Lang.MENU_DESC,

  },

  async (message, match) => {

    const groups = commandGroups(commands, commandName, category);
    const handlerPrefix = helpPrefix();
    const used = bytesToSize(os.freemem());

    const total = bytesToSize(os.totalmem());

    const totalUsers = await getTotalUserCount();

    const infoParts = config.BOT_INFO.split(";");

    const botName = infoParts[0] || Lang.MY_BOT;

    const botOwner = infoParts[1] || Lang.NA;

    const botVersion = VERSION;

    let botImageLink = infoParts[2] || "";

    if (botImageLink === "default") {

      botImageLink = path.join(__dirname, "utils", "images", "default.png");

    }



    const seconds = Math.floor(process.uptime());
    const uptime = `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
    const menu = formatMenu({ groups, prefix: handlerPrefix, name: botName, owner: botOwner,
      user: message.senderName, mode: config.MODE, version: botVersion, uptime,
      ram: `${used} / ${total}`, users: totalUsers });
    try {

      if (

        botImageLink === path.join(__dirname, "utils", "images", "default.png")

      ) {

        await message.client.sendMessage(message.jid, {

          image: fs.readFileSync(botImageLink),

          caption: menu,

        });

      } else {

        await message.client.sendMessage(message.jid, {

          image: { url: botImageLink },

          caption: menu,

        });

      }

    } catch (error) {

      console.error("Error sending menu:", error);

      await message.client.sendMessage(message.jid, {

        text: menu,

      });

    }

  }

);

Module(

  {

    pattern: "games ?(.*)",

    desc: Lang.GAMES_DESC,

  },

  async (message, args) => {

    const gameCommands = commands.filter(

      (cmd) => cmd.use === "game" && cmd.pattern

    );

    if (!gameCommands.length) {

      return await message.sendReply(Lang.NO_GAMES);

    }

    const handlerPrefix = helpPrefix();

    let response = Lang.GAMES_HEADER;

    gameCommands.forEach((cmd) => {

      const name = commandName(cmd);

      if (name) {

        response += Lang.INFO_COMMAND.format(handlerPrefix + name);

        response += Lang.INFO_DESCRIPTION.format(cmd.desc || Lang.NA);

        if (cmd.use) response += Lang.INFO_TYPE.format(category(cmd.use));

        if (cmd.usage) response += Lang.INFO_USAGE.format(cmd.usage);

        if (cmd.warn) response += Lang.INFO_WARNING.format(cmd.warn);

        response += "\n";

      }

    });

    await message.sendReply(response);

  }

);



Module(

  {

    pattern: "setinfo ?(.*)",

    fromMe: true,

    desc: Lang.SETINFO_DESC,

    use: "settings",

  },

  async (message, match) => {

    const infoText = Lang.SETINFO.replaceAll("{p}", helpPrefix());



    return await message.sendReply(infoText);

  }

);



Module(

  {

    pattern: "setname ?(.*)",

    fromMe: true,

    desc: Lang.SETNAME_DESC,

    use: "settings",

  },

  async (message, match) => {

    const name = match[1]?.trim();

    if (!name)

      return await message.sendReply(Lang.SETNAME_NEED.format(helpPrefix()));

    const parts = config.BOT_INFO.split(";");

    parts[0] = name;

    await setVar("BOT_INFO", parts.join(";"));

    return await message.sendReply(

      Lang.SETNAME_DONE.format(name)

    );

  }

);



Module(

  {

    pattern: "setowner ?(.*)",

    fromMe: true,

    desc: Lang.SETOWNER_DESC,

    use: "settings",

  },

  async (message, match) => {

    const owner = match[1]?.trim();

    if (!owner)

      return await message.sendReply(Lang.SETOWNER_NEED.format(helpPrefix()));

    const parts = config.BOT_INFO.split(";");

    parts[1] = owner;

    await setVar("BOT_INFO", parts.join(";"));

    return await message.sendReply(

      Lang.SETOWNER_DONE.format(owner)

    );

  }

);



Module(

  {

    pattern: "setimage",

    fromMe: true,

    desc: Lang.SETIMAGE_DESC,

    use: "settings",

  },

  async (message, match) => {

    if (!message.reply_message || !message.reply_message.image) {

      return await message.sendReply(Lang.SETIMAGE_NEED.format(helpPrefix()));

    }



    try {

      const downloadedFile = await message.reply_message.download();



      const uploadRes = await uploadToImgbb(downloadedFile);



      try {

        fs.unlinkSync(downloadedFile);

      } catch (e) {

        console.log("Failed to delete temp file:", downloadedFile);

      }



      const url = uploadRes.url || uploadRes.display_url;

      if (!url) {

        return await message.sendReply(Lang.UPLOAD_FAILED);

      }



      const parts = config.BOT_INFO.split(";");

      parts[2] = url;

      await setVar("BOT_INFO", parts.join(";"));

      return await message.sendReply(

        Lang.SETIMAGE_DONE.format(url)

      );

    } catch (error) {

      console.error("Error setting image:", error);

      return await message.sendReply(

        Lang.SETIMAGE_FAILED

      );

    }

  }

);

Module(

  {

    pattern: "testalive",

    fromMe: true,

    desc: Lang.TESTALIVE_DESC,

    usage: ".testalive",

    use: "utility",

  },

  async (message, match) => {

    const aliveMessage = config.ALIVE;



    if (!aliveMessage) {

      return await message.sendReply(

        Lang.TEST_DEFAULT

      );

    }



    await message.sendReply(Lang.TESTING);

    await parseAlive(message, aliveMessage);

  }

);



Module(

  {

    pattern: "mem",

    fromMe: true,

    desc: Lang.MEM_DESC,

    use: "system",

  },

  async (message) => {

    const mb = (n) => (n / 1024 / 1024).toFixed(1) + " MB";

    const m = process.memoryUsage();

    const { CustomAuthState } = require("../core/auth");

    const sessions = Object.entries(CustomAuthState.getStats())

      .map(([, s], i) => `  session ${i + 1}: ${s.keys} keys, ${s.pendingWrites} pending`)

      .join("\n");

    const handles =

      typeof process._getActiveHandles === "function"

        ? process._getActiveHandles().length

        : "n/a";

    await message.sendReply(

      "```" +

        `rss        : ${mb(m.rss)}\n` +

        `heap used  : ${mb(m.heapUsed)} / ${mb(m.heapTotal)}\n` +

        `external   : ${mb(m.external)}\n` +

        `buffers    : ${mb(m.arrayBuffers)}\n` +

        `uptime     : ${Math.round(process.uptime() / 60)} min\n` +

        `handles    : ${handles}\n` +

        `sessions   :\n${sessions || "  none"}` +

        "```",

    );

  },

);
