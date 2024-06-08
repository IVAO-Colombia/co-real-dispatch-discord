const { SlashCommandBuilder } = require("discord.js");
const messages = require("../../messages.json");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("confirm-briefing")
    .setDescription(messages.commands.confirm.description)
    .addIntegerOption((option) =>
      option
        .setName("vid")
        .setDescription(
          messages.commands.confirm_briefing.options.vid_description
        )
        .setMaxValue(999999)
        .setRequired(true)
    )
    .addAttachmentOption((option) =>
      option
        .setName("briefing")
        .setDescription(
          messages.commands.confirm_briefing.options.file_description
        )
        .setRequired(true)
    ),
  async execute(interaction) {
    // interaction.guild is the object representing the Guild in which the command was run
    await interaction.reply(
      `This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`
    );
  },
};
