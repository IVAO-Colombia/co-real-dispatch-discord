const fs = require("node:fs");
const { openAsBlob } = require("node:fs");
const path = require("node:path");
const messages = require("./messages.json");
const config = require("./config.json");

const {
  Client,
  Events,
  GatewayIntentBits,
  Collection,
  ActivityType,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const dotenv = require("dotenv");
const { request } = require("undici");
const { log } = require("node:console");
const { data } = require("./commands/admin/briefing");
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  client.user.setPresence({
    status: "dnd",
  });
  client.user.setActivity("Proximo Evento...", {
    type: ActivityType.Competing,
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  var hub;
  var aircraft;
  var airline;
  var vid;
  var briefing;
  if (interaction.commandName == "confirm-booking") {
    vid = interaction.options.getInteger("vid");

    const { body, statusCode, headers } = await request(
      `${process.env.IVAO_EVENT_URL}/api/pilot/booking/${vid}`,
      {
        method: "GET",
        headers: {
          Authorization: `${process.env.IVAO_EVENT_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (statusCode === 200) {
      const booking = await body.json();

      hub = booking.data.hub;
      airline = booking.data.airline;
      aircraft = booking.data.aircraft;

      // Add role by hub
      switch (hub) {
        case "SKBO":
          interaction.member.roles.add(config.roles.skbo_rank);
          break;
        case "SKRG":
          interaction.member.roles.add(config.roles.skrg_rank);
          break;
        case "SKBQ":
          interaction.member.roles.add(config.roles.skbq_rank);
          break;
      }

      // Create embed
      let confirmBookingEmbed = new EmbedBuilder()
        .setColor("#0D2C99")
        .setAuthor({
          name: interaction.member.nickname,
          iconURL: interaction.client.user.avatarURL(),
        })
        .setDescription(
          messages.system.commands.confirm_booking.description_embed
        )
        .setFields(
          { name: "HUB", value: `${hub}`, inline: true },
          { name: "Aircraft", value: `${aircraft}`, inline: true },
          { name: "Airline", value: `${airline}`, inline: true }
        );

      // Send embed
      await interaction.reply({ embeds: [confirmBookingEmbed] });
    } else if (statusCode === 404) {
      await interaction.reply({
        content: messages.system.errors.vid_not_found,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `${messages.system.errors.system_error}... Code: ${statusCode}`,
        ephemeral: true,
      });
    }
  }
  if (interaction.commandName == "confirm-briefing") {
    // Get data
    vid = interaction.options.getInteger("vid");
    briefing = await interaction.options.getAttachment("briefing");

    const urlBriefing = briefing.toJSON();

    const response = await fetch(urlBriefing.attachment);
    const buffer = await response.arrayBuffer();
    const briefingFile = new Blob([buffer], { type: briefing.contentType });

    // Create and set form
    const form = new FormData();
    form.append("documents", briefingFile, `${vid}briefing`);

    // Make a request
    const res = await fetch(
      `${process.env.IVAO_EVENT_URL}/api/pilot/booking/${vid}`,
      {
        method: "POST",
        body: form,
        headers: {
          Authorization: `${process.env.IVAO_EVENT_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    // View response from Web service
    if (res.status === 200) {
      const confirmBriefing = await res.json();

      const confirmBriefingEmbed = new EmbedBuilder()
        .setAuthor({ name: interaction.member.nickname })
        .setColor("Random")
        .setDescription(
          `The user ${confirmBriefing.data.pilot.first_name} (${confirmBriefing.data.pilot.vid}), was updated`
        )
        .setFields(
          {
            name: "Pilot VID:",
            value: confirmBriefing.data.pilot.vid,
            inline: true,
          },
          {
            name: "File:",
            value: `[${confirmBriefing.data.pilot.vid} Briefing file](${confirmBriefing.data.briefing})`,
            inline: true,
          },
          {
            name: "Airport HUB",
            value: confirmBriefing.data.hub,
            inline: true,
          }
        )
        .setTimestamp();
      return await interaction.reply({
        embeds: [confirmBriefingEmbed],
      });
    } else if (res.status === 404) {
      await interaction.reply({
        content: messages.system.errors.vid_not_found,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `${messages.system.errors.system_error}... Code: ${res.status}`,
        ephemeral: true,
      });
    }
  }
});

client.login(process.env.discord_token);
