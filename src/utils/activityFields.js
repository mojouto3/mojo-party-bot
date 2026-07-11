const {
    ModalBuilder,
    LabelBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js');

/**
 * Builds a modal form based on an activity's field_schema.
 *
 * "select" type fields become real Discord select menus (wrapped in a
 * Label component), so their values are always one of the canonical
 * options - never free text. This is what makes real matching/filtering
 * possible later: we can compare values exactly instead of guessing at
 * fuzzy text like "EU2" vs "eu2" vs "EU 2".
 *
 * All other field types (text, number, slots) become text inputs.
 */
function buildSessionModal(activity) {
    const modal = new ModalBuilder()
        .setCustomId(`mpb_session_modal_${activity.id}`)
        .setTitle(`New request: ${activity.display_name}`.slice(0, 45));

    const fields = activity.field_schema.fields || [];

    // Discord modals allow a limited number of top-level components
    for (const field of fields.slice(0, 5)) {
        const label = new LabelBuilder().setLabel(field.label.slice(0, 45));

        if (field.type === 'select' && Array.isArray(field.options)) {
            const select = new StringSelectMenuBuilder()
                .setCustomId(field.key)
                .setRequired(false)
                .setMinValues(0)
                .setMaxValues(1)
                .addOptions(
                    field.options.map(opt =>
                        new StringSelectMenuOptionBuilder().setLabel(opt).setValue(opt)
                    )
                );
            label.setStringSelectMenuComponent(select);
        } else {
            const input = new TextInputBuilder()
                .setCustomId(field.key)
                .setStyle(TextInputStyle.Short)
                .setRequired(false);
            if (field.placeholder) input.setPlaceholder(field.placeholder.slice(0, 100));
            label.setTextInputComponent(input);
        }

        modal.addLabelComponents(label);
    }

    return modal;
}

module.exports = { buildSessionModal };
