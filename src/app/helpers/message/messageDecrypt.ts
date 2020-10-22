import {
    decryptMIMEMessage,
    decryptMessageLegacy,
    OpenPGPKey,
    OpenPGPSignature,
    verifyMessage as pmcryptoVerifyMessage,
    createCleartextMessage,
    DecryptResultPmcrypto
} from 'pmcrypto';
import { Attachment, Message } from 'proton-shared/lib/interfaces/mail/Message';
import { VERIFICATION_STATUS } from 'proton-shared/lib/mail/constants';
import { getDate, getSender, isMIME } from 'proton-shared/lib/mail/messages';
import { c } from 'ttag';

import { MessageErrors } from '../../models/message';
import { convert } from '../attachment/attachmentConverter';
import { AttachmentsCache } from '../../containers/AttachmentProvider';
import { MIME_TYPES } from 'proton-shared/lib/constants';

const { NOT_VERIFIED } = VERIFICATION_STATUS;

const decryptMimeMessage = async (message: Message, privateKeys: OpenPGPKey[], attachmentsCache: AttachmentsCache) => {
    const headerFilename = c('Encrypted Headers').t`Encrypted Headers filename`;
    const sender = getSender(message)?.Address;

    let result: ReturnType<typeof decryptMIMEMessage>;

    try {
        // Don't listen to TS, this await is needed
        result = await decryptMIMEMessage({
            message: message?.Body,
            messageDate: getDate(message),
            privateKeys,
            publicKeys: [], // mandatory, even empty unless there is an error in openpgp
            headerFilename,
            sender
        });
    } catch (error) {
        return {
            decryptedBody: '',
            Attachments: [],
            verified: NOT_VERIFIED,
            errors: {
                decryption: [error]
            }
        };
    }

    const { body: decryptedBody = c('Message empty').t`Message content is empty`, mimetype = MIME_TYPES.PLAINTEXT } =
        (await result.getBody()) || {};

    const verified = await result.verify();
    const errors = await result.errors();
    const [signature] = (result as any).signatures;

    const Attachments = convert(message, await result.getAttachments(), verified, attachmentsCache);
    const decryptedSubject = await result.getEncryptedSubject();

    return {
        decryptedBody,
        Attachments,
        decryptedSubject,
        signature,
        mimetype: mimetype as MIME_TYPES,
        errors: errors?.length ? { decryption: errors } : undefined
    };
};

const decryptLegacyMessage = async (message: Message, privateKeys: OpenPGPKey[]) => {
    let result: DecryptResultPmcrypto;

    try {
        result = await decryptMessageLegacy({
            message: message?.Body,
            messageDate: getDate(message),
            privateKeys,
            publicKeys: []
        });
    } catch (error) {
        return {
            decryptedBody: '',
            errors: {
                decryption: error
            }
        };
    }

    const {
        data,
        signatures: [signature]
    } = result;

    return { decryptedBody: data, signature };
};

/**
 * Decrypt a message body of any kind: plaintext/html multipart/simple
 * Willingly not dealing with public keys and signature verification
 * It will be done separately when public keys will be ready
 */
export const decryptMessage = async (
    message: Message,
    privateKeys: OpenPGPKey[],
    attachmentsCache: AttachmentsCache
): Promise<{
    decryptedBody: string;
    Attachments?: Attachment[];
    decryptedSubject?: string;
    signature?: OpenPGPSignature;
    errors?: MessageErrors;
    mimetype?: MIME_TYPES;
}> => {
    if (isMIME(message)) {
        return decryptMimeMessage(message, privateKeys, attachmentsCache);
    } else {
        return decryptLegacyMessage(message, privateKeys);
    }
};

export const verifyMessage = async (
    message: Message,
    publicKeys: OpenPGPKey[]
): Promise<{
    verified: VERIFICATION_STATUS;
    signature?: OpenPGPSignature;
    verificationErrors?: Error[];
}> => {
    let result;

    try {
        result = await pmcryptoVerifyMessage({
            message: createCleartextMessage(message?.Body),
            date: getDate(message),
            publicKeys: publicKeys
        });
    } catch (error) {
        return {
            verified: NOT_VERIFIED,
            verificationErrors: [error]
        };
    }

    return result;
};
