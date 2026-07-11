const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');

/**
 * Builds a modal form based on an activity's field_schema.
 * Note: all fields become text inputs (even "select" type ones),
 * with the placeholder showing valid options. Native select menus
 * inside modals currently have more limited support.
 */
function buildSessionModal(activity) {
    const modal = new ModalBuilder()
        .setCustomId(`mpb_session_modal_${activity.id}`)
        .setTitle(`New request: ${activity.display_name}`.slice(0, 45));

    const fields = activity.field_schema.fields || [];

    // Discord modals allow up to 5 components
    for (const field of fields.slice(0, 5)) {
        const input = new TextInputBuilder()
            .setCustomId(field.key)
            .setLabel(field.label.slice(0, 45))
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        if (field.type === 'select' && Array.isArray(field.options)) {
            input.setPlaceholder(`e.g. ${field.options.join(' / ')}`.slice(0, 100));
        } else if (field.placeholder) {
            input.setPlaceholder(field.placeholder.slice(0, 100));
        }

        modal.addComponents(new ActionRowBuilder().addComponents(input));
    }

    return modal;
}

module.exports = { buildSessionModal };
