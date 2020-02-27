import markdownit from 'markdown-it';

import { templateBuilder } from './message/messageSignature';
import { MailSettings } from '../models/utils';
import { toText } from './parserHtml';

const SIGNATURE_PLACEHOLDER = '--protonSignature--';

const OPTIONS = {
    breaks: true,
    linkify: true
};

const FAKE_BODY = document.createElement('body');
const md = markdownit('default', OPTIONS);

/**
 * This function generates a random string that is not included in the input text.
 * This is used to be able to insert and remove placeholders in new lines, so markdown will treat those newlines
 * as not empty. Therefore we need the placeholders to be unique, to not remove parts of the text when we
 * remove the placeholders.
 *
 * To ensure the placeholder is unique we try a random string, which should be with > 99% chance unique,
 * but if it's not unique, we'll retry to make the function always behave correctly.
 * @param text
 * @returns {string}
 */
const generatePlaceHolder = (text: string) => {
    let placeholder = '';
    do {
        placeholder =
            Math.random()
                .toString(36)
                .substring(3) +
            Math.random()
                .toString(36)
                .substring(3);
    } while (text.includes(placeholder));
    return placeholder;
};

/**
 * Fills a given text with newlines with placeholders that can be removed later.
 * For instance the following input:
 * "
 *
 *
 * "
 * is turned into
 * "
 * placeholder
 * "
 * The input is not turned into
 * "placeholder
 * placeholder
 * placeholder"
 * as we expect the first new line to come from an non empty new line, and the last new line is followed by a non
 * empty new line. This is how addNewLinePlaceholders uses this function.
 */
const newLineIntoPlaceholder = (match: string, placeholder: string) =>
    match.replace(/(\r\n|\n)/g, (match) => match + placeholder).replace(new RegExp(placeholder + '$', 'g'), '');

/**
 * Turns any empty lines into lines filled with the specified placeholder
 * to trick the markdown converter into keeping
 * those empty lines.
 */
const addNewLinePlaceholders = (text: string, placeholder: string) => {
    const startingNewline = text.startsWith('\n') ? text : `\n${text}`;
    const textWPlaceholder = startingNewline.replace(/((\r\n|\n)\s*(\r\n|\n))+/g, (match) =>
        newLineIntoPlaceholder(match, placeholder)
    );
    // don't remove empty new lines before '>'
    const noEmptyLines = textWPlaceholder.replace(/^\n/g, '');

    // add an empty line (otherwise markdownit doesnt end the blockquote) if it comes after a `>`
    return noEmptyLines.replace(/(>[^\r\n]*(?:\r\n|\n))(\s*[^>])/g, (match, line1, line2) => `${line1}\n${line2}`);
};

const removeNewLinePlaceholder = (html: string, placeholder: string) => html.replace(new RegExp(placeholder, 'g'), '');

/**
 * Escapes backslashes from the input text with another backslash.
 */
const escapeBackslash = (text = '') => text.replace(/\\/g, '\\\\');

/**
 * Replace the signature by a temp hash, we replace it only
 * if the content is the same.
 */
const replaceSignature = (input: string, signature: string, mailSettings: MailSettings) => {
    const signatureTemplate = templateBuilder(signature, mailSettings, false, true);
    const signatureText = toText(signatureTemplate, false)
        .replace(/\u200B/g, '')
        .trim();
    return input.replace(signatureText, SIGNATURE_PLACEHOLDER);
};

/**
 * Replace the hash by the signature inside the message formated as HTML
 * We prevent too many lines to be added as we already have a correct message
 */
const attachSignature = (input: string, signature: string, plaintext: string, mailSettings: MailSettings) => {
    const signatureTemplate = templateBuilder(
        signature,
        mailSettings,
        false,
        !plaintext.startsWith(SIGNATURE_PLACEHOLDER)
    );
    return input.replace(SIGNATURE_PLACEHOLDER, signatureTemplate);
};

export const textToHtml = (input = '', signature: string, mailSettings: MailSettings) => {
    const text = replaceSignature(input, signature, mailSettings);

    // We want empty new lines to behave as if they were not empty (this is non-standard markdown behaviour)
    // It's more logical though for users that don't know about markdown.
    const placeholder = generatePlaceHolder(text);
    // We don't want to treat backslash as a markdown escape since it removes backslashes. So escape all backslashes with a backslash.
    const html = removeNewLinePlaceholder(
        md.render(addNewLinePlaceholders(escapeBackslash(text), placeholder)),
        placeholder
    );

    FAKE_BODY.innerHTML = html;
    [...FAKE_BODY.querySelectorAll('p')].forEach((element) => {
        const div = document.createElement('div');
        div.innerHTML = element.innerHTML;
        element.parentNode?.replaceChild(div, element);
    });

    return attachSignature(FAKE_BODY.innerHTML, signature, text, mailSettings);
};